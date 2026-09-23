import fs from 'fs';
import { tmpFile, splitSentences } from '../utils/helpers.js';

export function generateVTT(script, durationSec) {
  const sentences = splitSentences(script);
  const totalWords = script.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerSeg = sentences.map(s=> s.split(/\s+/).filter(Boolean).length);
  let cursor = 0;
  let vtt = 'WEBVTT\n\n';
  let srt = '';
  sentences.forEach((seg, i) => {
    const segWords = wordsPerSeg[i];
    const segDur = totalWords ? (segWords / totalWords) * durationSec : durationSec / sentences.length;
    const start = cursor;
    const end = Math.min(durationSec, cursor + segDur);
    const fmt = sec => {
      const h = String(Math.floor(sec/3600)).padStart(2,'0');
      const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
      const s = String(Math.floor(sec%60)).padStart(2,'0');
      const ms = String(Math.floor((sec%1)*1000)).padStart(3,'0');
      return `${h}:${m}:${s}.${ms}`;
    };
    const fmtSrt = sec => {
      const h = String(Math.floor(sec/3600)).padStart(2,'0');
      const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
      const s = String(Math.floor(sec%60)).padStart(2,'0');
      const ms = String(Math.floor((sec%1)*1000)).padStart(3,'0');
      return `${h}:${m}:${s},${ms}`;
    };
    vtt += `${fmt(start)} --> ${fmt(end)}\n${seg}\n\n`;
    srt += `${i+1}\n${fmtSrt(start)} --> ${fmtSrt(end)}\n${seg}\n\n`;
    cursor = end;
  });
  const vttPath = tmpFile('vtt');
  const srtPath = tmpFile('srt');
  fs.writeFileSync(vttPath, vtt);
  fs.writeFileSync(srtPath, srt);
  return { vttPath, srtPath, vtt, srt };
}
