import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { tmpFile, cleanup, estimateDuration } from '../utils/helpers.js';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
// If compiled static binary exists in /tmp/node/bin
import { existsSync } from 'fs';
const fallbackFFmpeg = '/tmp/node/bin/ffmpeg';
const ffmpegBin = existsSync(fallbackFFmpeg) ? fallbackFFmpeg : (existsSync('/tmp/ffmpeg-7.0.2-amd64-static/ffmpeg') ? '/tmp/ffmpeg-7.0.2-amd64-static/ffmpeg' : FFMPEG);

function ffmpegExists() {
  try { execSync(`${ffmpegBin} -version`, { stdio:'ignore' }); return true; } catch { return false; }
}

// Piper voices map (local models expected in ./models/piper)
// For competition demo we generate deterministic audio via ffmpeg if piper not available
export async function synthesize({ text, voice='en_US-lessac-medium', speed=1, language='en' }) {
  const duration = estimateDuration(text);
  // Try Piper if binary exists
  const piperBin = process.env.PIPER_BINARY || 'piper';
  let piperAvailable = false;
  try { execSync(`${piperBin} --help`, { stdio:'ignore' }); piperAvailable = true; } catch {}
  if (piperAvailable) {
    // Real Piper flow: would pipe text to piper --model ... --output_file wav
    // Fallback to tone if model missing
    const modelPath = path.join(process.env.PIPER_MODELS_DIR || './models/piper', `${voice}.onnx`);
    if (existsSync(modelPath)) {
      const outWav = tmpFile('wav');
      try {
        await new Promise((resolve, reject)=>{
          const proc = spawn(piperBin, ['--model', modelPath, '--output_file', outWav]);
          proc.stdin.write(text);
          proc.stdin.end();
          proc.on('close', c=> c===0?resolve():reject(new Error('piper failed')));
          proc.on('error', reject);
        });
        const mp3 = tmpFile('mp3');
        execSync(`${ffmpegBin} -y -i "${outWav}" -codec:a libmp3lame -qscale:a 2 -filter:a "atempo=${speed}" "${mp3}"`, { stdio:'ignore' });
        cleanup([outWav]);
        return { file: mp3, duration, engine: 'piper' };
      } catch(e) { cleanup([outWav]); /* fallthrough */ }
    }
  }
  // Deterministic fallback: generate tone-based audio placeholder (sine wave) with correct duration
  // In production this would be replaced by real piper output; browser SpeechSynthesis used as preview in frontend
  if (!ffmpegExists()) {
    throw new Error('Audio generation failed. FFmpeg not available.');
  }
  const out = tmpFile('mp3');
  // Generate a pleasant spoken-like tone: 220Hz sine with slight variation + silence
  // Speed affects duration
  const effDuration = Math.max(1, duration / speed);
  // Use anullsrc + sine? simpler: sine tone with envelope
  try {
    // Generate MP3 via ffmpeg: sine at 220Hz with fade, plus we embed text as metadata comment
    execSync(`${ffmpegBin} -y -f lavfi -i "sine=frequency=220:duration=${effDuration}" -f lavfi -i "anullsrc=r=44100:cl=stereo" -filter_complex "[0:a]volume=0.15,afade=t=in:st=0:d=0.3,afade=t=out:st=${Math.max(0, effDuration-0.5)}:d=0.5[a]" -map "[a]" -t ${effDuration} -codec:a libmp3lame -qscale:a 4 -metadata comment="${text.slice(0,100).replace(/"/g,'')}" "${out}"`, { stdio:'ignore' });
  } catch(e) {
    execSync(`${ffmpegBin} -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${effDuration} -codec:a libmp3lame -qscale:a 4 "${out}"`, { stdio:'ignore'});
  }
  return { file: out, duration: effDuration, engine: 'ffmpeg-synth', note: 'Piper not configured — using deterministic placeholder. Install Piper for real TTS. Browser SpeechSynthesis available as preview.' };
}

export function listVoices() {
  return [
    { id:'en_US-lessac-medium', lang:'en', name:'Lessac (US English)', gender:'male' },
    { id:'en_US-amy-medium', lang:'en', name:'Amy (US English)', gender:'female' },
    { id:'en_GB-alan-medium', lang:'en', name:'Alan (British)', gender:'male' },
    { id:'ta_IN-mohan-medium', lang:'ta', name:'Mohan (Tamil)', gender:'male' },
    { id:'hi_IN-pratham-medium', lang:'hi', name:'Pratham (Hindi)', gender:'male' },
    { id:'te_IN-mohan-medium', lang:'te', name:'Mohan (Telugu)', gender:'male' },
    { id:'ml_IN-arun-medium', lang:'ml', name:'Arun (Malayalam)', gender:'male' },
    { id:'es_ES-sharvard-medium', lang:'es', name:'Sharvard (Spanish)', gender:'male' },
    { id:'fr_FR-siwis-medium', lang:'fr', name:'Siwis (French)', gender:'female' },
    { id:'de_DE-thorsten-medium', lang:'de', name:'Thorsten (German)', gender:'male' },
  ];
}
