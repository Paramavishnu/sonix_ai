// Firebase frontend (optional) - falls back to local demo auth if not configured
export let firebaseEnabled = false;
let auth = null;

export async function initFirebase(){
  const cfg = window.__FIREBASE_CONFIG__;
  if(!cfg || !cfg.apiKey || cfg.apiKey==='demo'){
    console.log('[SonixAI] Firebase frontend not configured - demo local auth');
    return null;
  }
  try{
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const app = initializeApp(cfg);
    auth = getAuth(app);
    firebaseEnabled = true;
    return auth;
  }catch(e){ console.warn('Firebase init failed', e); return null; }
}

export function getAuthInstance(){ return auth; }

// Simple local demo auth helpers (used when Firebase not present)
export function demoLogin(email){
  localStorage.setItem('sonix_user', JSON.stringify({ email, uid:'demo-user' }));
  localStorage.setItem('sonix_token', 'demo-token');
}
export function demoUser(){
  try{ return JSON.parse(localStorage.getItem('sonix_user')); }catch{ return null; }
}
export function logout(){
  localStorage.removeItem('sonix_user'); localStorage.removeItem('sonix_token');
  location.href='/pages/login.html';
}
