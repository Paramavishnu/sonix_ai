import { execSync } from 'child_process';
import fs from 'fs';
import { existsSync } from 'fs';

const fallback = '/tmp/node/bin/ffmpeg';
const fallbackAlt = '/tmp/ffmpeg-7.0.2-amd64-static/ffmpeg';
export const ffmpegBin = existsSync(fallback) ? fallback : (existsSync(fallbackAlt) ? fallbackAlt : (process.env.FFMPEG_PATH || 'ffmpeg'));
export const ffprobeBin = existsSync('/tmp/node/bin/ffprobe') ? '/tmp/node/bin/ffprobe' : (existsSync('/tmp/ffmpeg-7.0.2-amd64-static/ffprobe') ? '/tmp/ffmpeg-7.0.2-amd64-static/ffprobe' : (process.env.FFPROBE_PATH || 'ffprobe'));

export function getDuration(file) {
  try {
    const out = execSync(`${ffprobeBin} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, { encoding:'utf8' });
    return parseFloat(out) || 0;
  } catch { return 0; }
}

export function mixAudio({ voiceFile, musicFile, sfxFiles=[], musicVolume=0.3, out }) {
  // voiceFile mandatory, music optional, sfx array of {file, at}
  if (!voiceFile) throw new Error('Voice file required');
  if (!musicFile && sfxFiles.length===0) {
    execSync(`${ffmpegBin} -y -i "${voiceFile}" -codec:a copy "${out}"`, { stdio:'ignore' });
    return;
  }
  // Build filter_complex mixing
  let inputs = ` -i "${voiceFile}"`;
  const filterParts = [];
  let amixInputs = '[0:a]';
  let idx = 1;
  if (musicFile) {
    inputs += ` -stream_loop -1 -i "${musicFile}"`;
    // music: lower volume, trim to voice duration, fade
    filterParts.push(`[${idx}:a]volume=${musicVolume},afade=t=in:st=0:d=1,afade=t=out:st=0:d=1,apad[bg]`);
    amixInputs += '[bg]';
    idx++;
  }
  // SFX: overlay at specific time via adelay
  sfxFiles.forEach((s, i) => {
    inputs += ` -i "${s.file}"`;
    const delayMs = Math.round((s.at||0)*1000);
    filterParts.push(`[${idx}:a]volume=${s.volume ?? 0.8},adelay=${delayMs}|${delayMs}[s${i}]`);
    amixInputs += `[s${i}]`;
    idx++;
  });
  const totalInputs = 1 + (musicFile?1:0) + sfxFiles.length;
  if (totalInputs > 1) {
    filterParts.push(`${amixInputs}amix=inputs=${totalInputs}:duration=first:dropout_transition=0:normalize=0[mix]`);
    const cmd = `${ffmpegBin} -y${inputs} -filter_complex "${filterParts.join(';')}" -map "[mix]" -codec:a libmp3lame -qscale:a 2 "${out}"`;
    execSync(cmd, { stdio:'ignore' });
  } else {
    execSync(`${ffmpegBin} -y -i "${voiceFile}" -codec:a libmp3lame -qscale:a 2 "${out}"`, { stdio:'ignore'});
  }
}

export function makeVideo({ audioFile, template='minimal', platform='youtube', script, subtitlesFile, out, width, height, duration }) {
  // Deterministic template backgrounds via lavfi color
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
  // Convert hex 0xRRGGBB to ffmpeg color 0xRRGGBB
  const w = width || 1920, h = height || 1080;
  const dur = duration || 5;
  // Build drawtext: script words centered, simple text
  // Escape text for ffmpeg
  const safeText = script.slice(0, 120).replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%');
  // Try to include subtitlesFile if exists via subtitles filter (requires font)
  let vf = `color=c=${bg}:s=${w}x${h}:d=${dur}:r=30,format=yuv420p`;
  // Add scaling text via drawtext if font available; fallback without text if fails
  // We'll add subtitles burn-in if file provided
  if (subtitlesFile && existsSync(subtitlesFile)) {
    vf += `,subtitles=${subtitlesFile}:force_style='Fontsize=28,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,Alignment=2,MarginV=60'`;
  }
  const cmdNoText = `${ffmpegBin} -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=${dur}:r=30" -i "${audioFile}" -filter_complex "[0:v]format=yuv420p,scale=${w}:${h}[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest "${out}"`;
  // Prefer with drawtext if ffmpeg has it
  try {
    execSync(cmdNoText, { stdio:'ignore' });
  } catch(e) {
    // Fallback simpler
    execSync(`${ffmpegBin} -y -f lavfi -i "color=c=black:s=${w}x${h}:d=${dur}:r=30" -i "${audioFile}" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest "${out}"`, { stdio:'ignore'});
  }
}
