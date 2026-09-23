import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { tmpFile } from '../utils/helpers.js';

// TemplateThumbnailProvider (deterministic, no AI)
const templates = {
  youtube: { w:1280, h:720, bg:'#0f172a', accent:'#7c3aed' },
  instagram: { w:1080, h:1080, bg:'#111827', accent:'#ec4899' },
  vertical: { w:1080, h:1920, bg:'#0a0a0f', accent:'#06b6d4' }
};

function hexToRgb(hex){ const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return {r,g,b}; }

function svgThumbnail({ title, subtitle, template='youtube', background, textColor }) {
  const t = templates[template] || templates.youtube;
  const bg = background || t.bg;
  const accent = t.accent;
  const tc = textColor || '#ffffff';
  const { w, h } = t;
  // SVG with gradient
  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.9"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.3"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="${w*0.04}" y="${h*0.06}" width="${w*0.92}" height="${h*0.88}" rx="24" fill="white" fill-opacity="0.06" stroke="white" stroke-opacity="0.1"/>
    <circle cx="${w*0.85}" cy="${h*0.2}" r="${w*0.06}" fill="white" fill-opacity="0.08"/>
    <circle cx="${w*0.15}" cy="${h*0.85}" r="${w*0.08}" fill="white" fill-opacity="0.06"/>
    <text x="${w/2}" y="${h*0.45}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${w*0.07}" font-weight="800" fill="${tc}" filter="url(#shadow)">${escapeXml(title.slice(0,32))}</text>
    ${subtitle ? `<text x="${w/2}" y="${h*0.55}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${w*0.03}" font-weight="500" fill="${tc}" fill-opacity="0.85">${escapeXml(subtitle.slice(0,48))}</text>`:''}
    <text x="${w/2}" y="${h*0.88}" text-anchor="middle" font-family="Inter, system-ui" font-size="${w*0.022}" fill="white" fill-opacity="0.7">SONIXAI • Write Once. Create Everywhere.</text>
  </svg>`;
  return { svg, w, h };
}
function escapeXml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export async function generateThumbnail({ title, subtitle='', template='youtube', background, textColor, format='png' }) {
  const { svg, w, h } = svgThumbnail({ title, subtitle, template, background, textColor });
  const out = tmpFile(format === 'jpeg' || format==='jpg' ? 'jpg' : 'png');
  const buf = Buffer.from(svg);
  let img = sharp(buf).resize(w, h);
  if (format==='jpeg' || format==='jpg') await img.jpeg({ quality:85 }).toFile(out);
  else await img.png().toFile(out);
  return { file: out, width:w, height:h, template };
}

export class TemplateThumbnailProvider {
  async generate(opts){ return generateThumbnail(opts); }
}
export class AIThumbnailProvider {
  // Optional - wraps template provider, never required
  constructor(inner){ this.inner = inner || new TemplateThumbnailProvider(); }
  async generate(opts){
    // If AI key present we could call external, but for free-first we just delegate
    return this.inner.generate(opts);
  }
}
export class ThumbnailService {
  constructor(provider){ this.provider = provider || new TemplateThumbnailProvider(); }
  async generate(opts){ return this.provider.generate(opts); }
}
