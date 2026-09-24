import * as piper from '../services/piperService.js';
import { mixAudio, makeVideo, ffmpegBin } from '../services/ffmpegService.js';
import { generateVTT } from '../services/subtitleService.js';
import { uploadFile } from '../services/storageService.js';
import { tmpFile, cleanup, platformConfig } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function render(req,res){
  const { script, language='en', voice, speed=1, platform='youtube', template='minimal', music, musicVolume=0.3, sfx=[], subtitles=true, subtitleStyle } = req.body;
  if(!script) return res.status(400).json({success:false, error:'Script required'});
  const cfg = platformConfig(platform);
  // 1. TTS
  const tts = await piper.synthesize({ text: script, voice, speed, language });
  const duration = tts.duration;
  // 2. Optional mix with music/SFX
  let audioFile = tts.file;
  if(music || (sfx && sfx.length)){
     let musicFile=null;
     if(music){
       const base = String(music).trim();
       const cand1 = path.join(__dirname,'..','..','public','assets','music', base);
       const cand2 = path.join(__dirname,'..','..','public','assets','music', base.replace(/\.mp3$/,'')+'.mp3');
       if(fs.existsSync(cand1) && fs.statSync(cand1).isFile()) musicFile=cand1;
       else if(fs.existsSync(cand2)) musicFile=cand2;
     }
     const sfxDir = path.join(__dirname,'..','..','public','assets','sfx');
     const sfxFiles=[];
     for(const s of (Array.isArray(sfx)?sfx:[])){
       const cand = path.join(sfxDir, s.id);
       let file = fs.existsSync(cand) && fs.statSync(cand).isFile() ? cand : fs.existsSync(cand+'.mp3') ? cand+'.mp3' : null;
       if(file) sfxFiles.push({ file, at:s.at||0 });
     }
    if(musicFile || sfxFiles.length){
      const mixed = tmpFile('mp3');
      mixAudio({ voiceFile: tts.file, musicFile, sfxFiles, musicVolume, out: mixed });
      audioFile = mixed;
    }
  }
  // 3. Subtitles
  let subFile=null, vttUrl=null;
  let vttPaths=null;
  if(subtitles){
    vttPaths = generateVTT(script, duration);
    subFile = vttPaths.srtPath;
    // upload vtt for frontend preview
    const { uploadFile: uf } = await import('../services/storageService.js');
    vttUrl = await uf(vttPaths.vttPath, `sub-${uuidv4()}.vtt`);
  }
  // 4. Video
  const out = tmpFile('mp4');
  makeVideo({ audioFile, template, platform, script, subtitlesFile: subtitles?subFile:null, out, width: cfg.width, height: cfg.height, duration });
  const dest = `video-${uuidv4()}.mp4`;
  const url = await uploadFile(out, dest);
  cleanup([tts.file, audioFile!==tts.file?audioFile:null, vttPaths?.vttPath, vttPaths?.srtPath, out].filter(Boolean));
  res.json({ success:true, url, vttUrl, duration, width: cfg.width, height: cfg.height, ratio: cfg.ratio });
}
