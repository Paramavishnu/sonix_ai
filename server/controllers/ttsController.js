import * as piper from '../services/piperService.js';
import { uploadFile } from '../services/storageService.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function tts(req,res) {
  const { text, language, voice, speed } = req.body;
  if (!text) return res.status(400).json({ success:false, error:'Text required' });
  const result = await piper.synthesize({ text, language, voice, speed });
  const dest = `tts-${uuidv4()}.mp3`;
  const url = await uploadFile(result.file, dest);
  // keep file for playback then cleanup later (leave in exports)
  res.json({ success:true, url, duration: result.duration, engine: result.engine, note: result.note || null });
}
export async function voices(req,res) {
  res.json({ success:true, voices: piper.listVoices() });
}
