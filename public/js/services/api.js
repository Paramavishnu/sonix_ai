import { api } from '../core/app.js';
export const TTS = (body)=> api('/api/tts',{method:'POST', body:JSON.stringify(body)});
export const renderVideo = (body)=> api('/api/video/render',{method:'POST', body:JSON.stringify(body)});
export const thumbnail = (body)=> api('/api/thumbnail/generate',{method:'POST', body:JSON.stringify(body)});
export const translate = (body)=> api('/api/translate',{method:'POST', body:JSON.stringify(body)});
