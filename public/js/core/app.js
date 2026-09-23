export const $ = (s, r=document)=> r.querySelector(s);
export const $$ = (s, r=document)=> [...r.querySelectorAll(s)];
export function toast(msg, type='info', ms=3000){
  let el = document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  el.style.borderColor = type==='error' ? '#ef4444' : type==='success' ? '#10b981' : 'var(--border)';
  setTimeout(()=> el.classList.remove('show'), ms);
}
export function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); } }
export async function api(path, opts={}){
  const token = localStorage.getItem('sonix_token');
  const headers = { 'Content-Type':'application/json', ...(opts.headers||{}) };
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data;
}
export function estimateDuration(text){
  const w = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(w/150*60));
}
export function wordCount(text){ return text.trim()? text.trim().split(/\s+/).length : 0; }
export const platforms = {
  youtube:{label:'YouTube', width:1920,height:1080,ratio:'16:9'},
  youtube_shorts:{label:'YouTube Shorts', width:1080,height:1920,ratio:'9:16'},
  instagram_reels:{label:'Instagram Reels', width:1080,height:1920,ratio:'9:16'},
  instagram_square:{label:'Instagram Square', width:1080,height:1080,ratio:'1:1'},
  tiktok:{label:'TikTok', width:1080,height:1920,ratio:'9:16'}
};
export const templates = ['minimal','educational','corporate','cinematic','bold','social','quote','news'];
export const musicCats = ['calm','cinematic','corporate','energetic','lofi','inspirational','technology','ambient'];
export const sfxList = ['click','whoosh','pop','notification','transition','ambient','keyboard','success'];
export function setTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('sonix_theme', t);
}
export function initTheme(){
  const s = localStorage.getItem('sonix_theme') || 'dark';
  setTheme(s);
}
