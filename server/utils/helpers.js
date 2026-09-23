import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

export function tmpFile(ext='tmp') { return path.join(tempDir, `${uuidv4()}.${ext}`); }

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
