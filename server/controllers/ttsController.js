import * as piper from '../services/piperService.js';
import { uploadFile } from '../services/storageService.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function tts(req,res) {
  const { text, language, voice, speed=1 } = req.body;
  if (!text || !String(text).trim()) return res.status(400).json({ success:false, error:'Text required' });
  if (String(text).length > 5000) return res.status(400).json({ success:false, error:'Text too long (max 5000 chars)' });
  const result = await piper.synthesize({ text, language, voice, speed: Number(speed)||1 });
  const dest = `tts-${uuidv4()}.mp3`;
  const url = await uploadFile(result.file, dest);
  res.json({ success:true, url, duration: result.duration, engine: result.engine, note: result.note || null });
}
export async function voices(req,res) {
  res.json({ success:true, voices: piper.listVoices() });
}
