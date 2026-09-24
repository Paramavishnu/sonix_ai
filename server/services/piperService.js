import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { tmpFile, cleanup, estimateDuration, resolvedFfmpeg, resolvedFfprobe } from '../utils/helpers.js';
import { existsSync } from 'fs';

const ffmpegBin = resolvedFfmpeg;
const ffprobeBin = resolvedFfprobe;

function ffmpegExists() {
  try { execSync(`"${ffmpegBin}" -version`, { stdio:'ignore' }); return true; } catch { return false; }
}

// Real piper location: Python Scripts/piper.exe on Windows host (works via WSL /mnt/c and Windows C:\)
const WINDOWS_PIPER = 'C:\\Users\\Vishnu\\AppData\\Local\\Programs\\Python\\Python314\\Scripts\\piper.exe';
const WSL_PIPER = '/mnt/c/Users/Vishnu/AppData/Local/Programs/Python/Python314/Scripts/piper.exe';
const candidates = [
  process.env.PIPER_BINARY,
  WSL_PIPER,
  WINDOWS_PIPER,
  '/usr/local/bin/piper','/usr/bin/piper','piper','piper.exe'
].filter(Boolean);

function isWindows(){ return process.platform === 'win32'; }
function normalizeForPlatform(p){
  if(isWindows() && p.startsWith('/mnt/c/')) return p.replace('/mnt/c/', 'C:\\').replace(/\//g,'\\');
  if(!isWindows() && p.startsWith('C:\\')) return p.replace('C:\\','/mnt/c/').replace(/\\/g,'/');
  return p;
}
function piperBinary(){
  for(const raw of candidates){
    const c = normalizeForPlatform(raw);
    try{
      // For Windows style path, existsSync needs platform-correct separator but Node on win32 handles both
      if(c.includes('/') || c.includes('\\')){
        const check = isWindows() ? c : c;
        // On win32, /mnt/c won't exist; on wsl, C:\ won't exist — try both forms
        if(!existsSync(c)){
          const alt = normalizeForPlatform(c === raw ? (isWindows()? WSL_PIPER : WINDOWS_PIPER) : raw);
          if(!existsSync(alt)) continue;
        }
      }
      execSync(`"${c}" --help`,{stdio:'ignore'});
      return c;
    }catch{}
  }
  return null;
}

export async function synthesize({ text, voice='en_US-lessac-medium', speed=1, language='en' }) {
  const rawDuration = estimateDuration(text);
  const speedVal = Math.max(0.5, Math.min(2, Number(speed)||1));
  const effDuration = Math.max(1, rawDuration / speedVal);
  // 1. Try real Piper if available and model exists
  const pb = piperBinary();
  if (pb) {
    // Resolve model path for both platforms
    const rawModelDir = process.env.PIPER_MODELS_DIR || './models/piper';
    // If running on win32, ./models/piper is relative to project root (Windows cwd) — works
    // If running on WSL, same
    let modelPath = path.join(rawModelDir, `${voice}.onnx`);
    // Also try absolute project path if relative not found
    if(!existsSync(modelPath)){
      const absAlt = path.join(path.dirname(new URL(import.meta.url).pathname), '..','..','models','piper', `${voice}.onnx`);
      // On Windows, pathname starts with /C:/ — normalize
      const winAbs = isWindows() ? absAlt.replace(/^\//,'').replace(/\//g,'\\').replace(/^\\C:\\/,'C:\\') : absAlt;
      if(existsSync(winAbs)) modelPath = winAbs;
      else if(existsSync(absAlt)) modelPath = absAlt;
    }
    if (existsSync(modelPath)) {
      const outWav = tmpFile('wav');
      try {
        await new Promise((resolve, reject)=>{
          const p = spawn(pb, ['--model', modelPath, '--output_file', outWav], { stdio:['pipe','ignore','pipe'] });
          let stderr='';
          if(p.stderr) p.stderr.on('data',d=> stderr+=d.toString());
          p.stdin.write(text);
          p.stdin.end();
          const t = setTimeout(()=> { try{p.kill();}catch{}; reject(new Error('piper timeout: '+stderr)); }, 20000);
          p.on('close', c=> { clearTimeout(t); c===0?resolve():reject(new Error('piper failed code '+c+': '+stderr)); });
          p.on('error', e=>{ clearTimeout(t); reject(e);});
        });
        if(existsSync(outWav) && fs.statSync(outWav).size>500){
          const mp3 = tmpFile('mp3');
          const atempo = speedVal;
          // Use actual wav duration if possible via ffprobe
          let actualDur = effDuration;
          try{ const out = execSync(`"${ffprobeBin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outWav}"`,{encoding:'utf8'}); const d=parseFloat(out); if(d>0) actualDur = d; }catch{}
          execSync(`"${ffmpegBin}" -y -i "${outWav}" -codec:a libmp3lame -qscale:a 2 -filter:a "atempo=${atempo}" "${mp3}"`, { stdio:'ignore' });
          cleanup([outWav]);
          return { file: mp3, duration: actualDur, engine: 'piper' };
        }
        cleanup([outWav]);
      } catch(e) { 
        console.warn('[piper] fallback to synth:', e.message);
        try{cleanup([outWav]);}catch{} /* fallback */ 
      }
    } else {
      console.warn('[piper] model not found:', modelPath);
    }
  } else {
    console.warn('[piper] binary not found, using synth');
  }
  // 2. Deterministic local fallback: generate pleasant voice-like audio (no paid API)
  if (!ffmpegExists()) {
    throw new Error('Audio generation failed. FFmpeg not available at '+ffmpegBin+' . Install ffmpeg or set FFMPEG_PATH');
  }
  const out = tmpFile('mp3');
  // Improved placeholder: mix two sine tones (220Hz base + 440Hz harmonic) with gentle volume variation to sound less robotic
  // Use amix of two sine sources so ffmpeg always produces valid MP3
  try {
    // Create a more natural sounding placeholder than pure tone: modulated sine via tremolo
    execSync(`"${ffmpegBin}" -y -f lavfi -i "sine=frequency=220:duration=${effDuration}" -f lavfi -i "sine=frequency=110:duration=${effDuration}" -filter_complex "[0:a]volume=0.12,afade=t=in:st=0:d=0.2,afade=t=out:st=${Math.max(0, effDuration-0.6)}:d=0.4[a0];[1:a]volume=0.06[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[mix]" -map "[mix]" -t ${effDuration} -codec:a libmp3lame -qscale:a 4 -metadata comment="${text.slice(0,80).replace(/"/g,'')}" "${out}"`, { stdio:'ignore' });
  } catch(e) {
    execSync(`"${ffmpegBin}" -y -f lavfi -i "sine=frequency=220:duration=${effDuration}" -filter_complex "[0:a]volume=0.15,afade=t=in:d=0.2,afade=t=out:st=${Math.max(0,effDuration-0.5)}:d=0.5[a]" -map "[a]" -t ${effDuration} -codec:a libmp3lame -qscale:a 4 "${out}"`, { stdio:'ignore'});
  }
  return { file: out, duration: effDuration, engine: 'ffmpeg-synth', note: 'Piper not configured — using local deterministic placeholder. Install Piper binary + voices for real TTS. Browser SpeechSynthesis available for preview.' };
}

export function listVoices() {
  // Detect available models on disk dynamically
  const dir = process.env.PIPER_MODELS_DIR || './models/piper';
  const fallback = [
    { id: 'en_US-lessac-medium', lang: 'en', name: 'Lessac (US English)', gender: 'male' },
    { id: 'en_US-amy-medium', lang: 'en', name: 'Amy (US English)', gender: 'female' },
    { id: 'en_GB-alan-medium', lang: 'en', name: 'Alan (British English)', gender: 'male' },
    { id: 'hi_IN-pratham-medium', lang: 'hi', name: 'Pratham (Hindi)', gender: 'male' }
  ];
  try{
    if(!existsSync(dir)) return fallback;
    const files = fs.readdirSync(dir).filter(f=>f.endsWith('.onnx'));
    if(!files.length) return fallback;
    return files.map(f=>{
      const id=f.replace('.onnx','');
      const lang=id.split('_')[0] || 'en';
      return { id, lang, name: id.replace(/_/g,' ').replace(/-/g,' '), gender:'unknown' };
    });
  }catch{ return fallback; }
}
