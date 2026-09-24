import { execSync } from 'child_process';
import fs from 'fs';
import { existsSync } from 'fs';
import { resolvedFfmpeg, resolvedFfprobe } from '../utils/helpers.js';

export const ffmpegBin = resolvedFfmpeg;
export const ffprobeBin = resolvedFfprobe;

// WSL path quirk: ffmpeg.exe from Windows mount needs linux-style path quoted
function q(p){ return `"${p.replace(/"/g,'\\"')}"`; }

export function getDuration(file) {
  try {
    const out = execSync(`"${ffprobeBin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${q(file)}`, { encoding:'utf8' });
    return parseFloat(out) || 0;
  } catch { return 0; }
}

export function mixAudio({ voiceFile, musicFile, sfxFiles=[], musicVolume=0.3, out }) {
  if (!voiceFile) throw new Error('Voice file required');
  if (!existsSync(voiceFile)) throw new Error('Voice file not found: '+voiceFile);
  // If no music/sfx actually exist, just copy
  const hasMusic = musicFile && existsSync(musicFile);
  const validSfx = (sfxFiles||[]).filter(s=> s.file && existsSync(s.file));
  if (!hasMusic && validSfx.length===0) {
    if(hasMusic===false && musicFile) console.warn('[mixAudio] music not found, skipping:', musicFile);
    execSync(`"${ffmpegBin}" -y -i ${q(voiceFile)} -codec:a copy ${q(out)}`, { stdio:'ignore' });
    return;
  }
  let inputs = ` -i ${q(voiceFile)}`;
  const filterParts = [];
  let amixInputs = '[0:a]';
  let idx = 1;
  if (hasMusic) {
    inputs += ` -stream_loop -1 -i ${q(musicFile)}`;
    const vol = Math.max(0, Math.min(1, Number(musicVolume)||0.3));
    filterParts.push(`[${idx}:a]volume=${vol},afade=t=in:st=0:d=0.8,afade=t=out:st=0:d=0,apad[bg]`);
    amixInputs += '[bg]';
    idx++;
  } else if(musicFile) {
    console.warn('[mixAudio] music file missing, mixing without it:', musicFile);
  }
  validSfx.forEach((s, i) => {
    inputs += ` -i ${q(s.file)}`;
    const delayMs = Math.round((s.at||0)*1000);
    const vol = s.volume ?? 0.85;
    filterParts.push(`[${idx}:a]volume=${vol},adelay=${delayMs}|${delayMs}[s${i}]`);
    amixInputs += `[s${i}]`;
    idx++;
  });
  const totalInputs = 1 + (hasMusic?1:0) + validSfx.length;
  if (totalInputs > 1) {
    filterParts.push(`${amixInputs}amix=inputs=${totalInputs}:duration=first:dropout_transition=0:normalize=0:duration=first[mix]`);
    const cmd = `"${ffmpegBin}" -y${inputs} -filter_complex "${filterParts.join(';')}" -map "[mix]" -codec:a libmp3lame -qscale:a 2 ${q(out)}`;
    execSync(cmd, { stdio:'ignore' });
  } else {
    execSync(`"${ffmpegBin}" -y -i ${q(voiceFile)} -codec:a libmp3lame -qscale:a 2 ${q(out)}`, { stdio:'ignore'});
  }
}

export function makeVideo({ audioFile, template='minimal', platform='youtube', script, subtitlesFile, out, width, height, duration }) {
  const templateColors = {
    minimal: '0x0f172a',
    educational: '0x1e3a5f',
    corporate: '0x1a1a2e',
    cinematic: '0x0a0a0f',
    bold: '0xdc2626',
    social: '0x7c3aed',
    quote: '0x111827',
    news: '0x1e293b'
  };
  const bg = templateColors[template] || templateColors.minimal;
  const w = width || 1920, h = height || 1080;
  const dur = Math.max(1, duration || 5);
  // Use subtitles burn-in only if file exists and ffmpeg supports it; else plain color video
  const hasSubs = subtitlesFile && existsSync(subtitlesFile);
  // Prefer simple color+audio path which is reliable across ffmpeg 9 builds
  // We keep subtitles as optional; if burn-in fails we fallback to no subs but still produce video
  const baseCmd = hasSubs
    ? `"${ffmpegBin}" -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=${dur}:r=30" -i ${q(audioFile)} -vf "subtitles=${subtitlesFile.replace(/\\/g,'/').replace(/:/g,'\\:')}:force_style='Fontsize=28,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,Alignment=2,MarginV=60'" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest ${q(out)}`
    : `"${ffmpegBin}" -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=${dur}:r=30" -i ${q(audioFile)} -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest ${q(out)}`;
  // Alternative filter_complex variant for some builds
  const altCmd = `"${ffmpegBin}" -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=${dur}:r=30" -i ${q(audioFile)} -filter_complex "[0:v]format=yuv420p,scale=${w}:${h}[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest ${q(out)}`;
  try {
    execSync(baseCmd, { stdio:'ignore' });
  } catch(e) {
    try { execSync(altCmd, { stdio:'ignore' }); }
    catch(e2){
      // last fallback black
      execSync(`"${ffmpegBin}" -y -f lavfi -i "color=c=black:s=${w}x${h}:d=${dur}:r=30" -i ${q(audioFile)} -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest ${q(out)}`, { stdio:'ignore'});
    }
  }
}
