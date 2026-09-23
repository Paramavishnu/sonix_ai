import * as piper from '../services/piperService.js';
import { mixAudio } from '../services/ffmpegService.js';
import { uploadFile } from '../services/storageService.js';
import { tmpFile, cleanup } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sfxDir = path.join(__dirname, '..','..','public','assets','sfx');

export async function mix(req,res){
  const { text, voice, speed, language, music, musicVolume=0.3, sfx=[] } = req.body;
  if(!text) return res.status(400).json({success:false, error:'Text required'});
  const tts = await piper.synthesize({ text, voice, speed, language });
  let musicFile=null;
  if(music){
    const cand = path.join(__dirname,'..','..','public','assets','music', music);
    if(fs.existsSync(cand)) musicFile=cand;
  }
  let sfxFiles=[];
  for(const s of (Array.isArray(sfx)?s:[])){
    const cand = path.join(sfxDir, s.id);
    // support id like "click.mp3" or "click"
    let file = fs.existsSync(cand) ? cand : fs.existsSync(cand+'.mp3') ? cand+'.mp3' : null;
    if(file) sfxFiles.push({ file, at: s.at||0, volume: s.volume||0.8 });
  }
  const out = tmpFile('mp3');
  try{
    mixAudio({ voiceFile: tts.file, musicFile, sfxFiles, musicVolume, out });
  } catch(e){
    cleanup([tts.file]);
    throw e;
  }
  const dest = `mix-${uuidv4()}.mp3`;
  const url = await uploadFile(out, dest);
  cleanup([tts.file]); // out copied to exports
  res.json({ success:true, url, duration: tts.duration });
}
