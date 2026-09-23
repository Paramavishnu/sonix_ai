export function formatTime(s){ const m=Math.floor(s/60), sec=Math.floor(s%60); return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
export function download(url, filename){ const a=document.createElement('a'); a.href=url; a.download=filename||'download'; a.click(); }
export function copyText(t){ navigator.clipboard.writeText(t); }
