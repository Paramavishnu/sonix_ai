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
    // support "calm" or "calm.mp3"
    const base = String(music).trim();
    const cand1 = path.join(__dirname,'..','..','public','assets','music', base);
    const cand2 = path.join(__dirname,'..','..','public','assets','music', base.replace(/\.mp3$/,'')+'.mp3');
    if(fs.existsSync(cand1) && fs.statSync(cand1).isFile()) musicFile=cand1;
    else if(fs.existsSync(cand2)) musicFile=cand2;
    else if(base) console.warn('[audio/mix] music not found:', base);
  }
  let sfxFiles=[];
  for(const s of (Array.isArray(sfx)?sfx:[])){
    const cand = path.join(sfxDir, s.id);
    let file = fs.existsSync(cand) && fs.statSync(cand).isFile() ? cand : fs.existsSync(cand+'.mp3') ? cand+'.mp3' : null;
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
