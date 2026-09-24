import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

export function tmpFile(ext='tmp') { return path.join(tempDir, `${uuidv4()}.${ext}`); }

// Resolve ffmpeg/ffprobe correctly on both Windows (win32) and WSL (linux)
const isWin = process.platform === 'win32';
const WIN_FFMPEG_WSL = '/mnt/c/Users/Vishnu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const WIN_FFPROBE_WSL = '/mnt/c/Users/Vishnu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffprobe.exe';
const WIN_FFMPEG_WIN = 'C:\\Users\\Vishnu\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const WIN_FFPROBE_WIN = 'C:\\Users\\Vishnu\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe';

function normalizeCand(c){
  if(isWin && c.startsWith('/mnt/c/')) return c.replace('/mnt/c/', 'C:\\').replace(/\//g,'\\');
  if(!isWin && c.startsWith('C:\\')) return c.replace('C:\\','/mnt/c/').replace(/\\/g,'/');
  return c;
}
const CANDIDATE_FFMPEG = [
  process.env.FFMPEG_PATH,
  isWin ? WIN_FFMPEG_WIN : WIN_FFMPEG_WSL,
  !isWin ? WIN_FFMPEG_WSL : WIN_FFMPEG_WIN,
  '/usr/bin/ffmpeg','/usr/local/bin/ffmpeg',
  '/tmp/node/bin/ffmpeg','/tmp/ffmpeg-7.0.2-amd64-static/ffmpeg',
  'ffmpeg','ffmpeg.exe'
].filter(Boolean).map(normalizeCand);
const CANDIDATE_FFPROBE = [
  process.env.FFPROBE_PATH,
  isWin ? WIN_FFPROBE_WIN : WIN_FFPROBE_WSL,
  !isWin ? WIN_FFPROBE_WSL : WIN_FFPROBE_WIN,
  '/usr/bin/ffprobe','/usr/local/bin/ffprobe',
  '/tmp/node/bin/ffprobe','/tmp/ffmpeg-7.0.2-amd64-static/ffprobe',
  'ffprobe','ffprobe.exe'
].filter(Boolean).map(normalizeCand);

function pickBinary(candidates){
  for(const c of candidates){
    try{
      // Check existence for absolute paths
      if((c.includes('/') || c.includes('\\')) && c !== 'ffmpeg' && c !== 'ffmpeg.exe' && c!== 'ffprobe' && c!=='ffprobe.exe'){
        if(!fs.existsSync(c)) continue;
      }
      execSync(`"${c}" -version`,{stdio:'ignore'});
      return c;
    }catch{}
  }
  return candidates[candidates.length-1];
}
export const resolvedFfmpeg = pickBinary(CANDIDATE_FFMPEG);
export const resolvedFfprobe = pickBinary(CANDIDATE_FFPROBE);
export function ffmpegExists(){ try{ execSync(`"${resolvedFfmpeg}" -version`,{stdio:'ignore'}); return true;}catch{return false;}}

export function cleanup(paths=[]) {
  for (const p of paths) { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {} }
}

export function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export function estimateDuration(text, wpm=150) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((words / wpm) * 60));
}

export function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean) || [text];
}

export function platformConfig(platform) {
  const map = {
    youtube: { width:1920, height:1080, ratio:'16:9' },
    youtube_shorts: { width:1080, height:1920, ratio:'9:16' },
    instagram_reels: { width:1080, height:1920, ratio:'9:16' },
    instagram_square: { width:1080, height:1080, ratio:'1:1' },
    tiktok: { width:1080, height:1920, ratio:'9:16' }
  };
  return map[platform] || map.youtube;
}
