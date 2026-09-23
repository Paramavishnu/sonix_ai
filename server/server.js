import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit:'5mb' }));
app.use(express.urlencoded({ extended:true }));

// serve static frontend
app.use(express.static(path.join(__dirname, '..','public')));
app.use('/exports', express.static(path.join(__dirname, '..','public','exports')));

app.get('/health', (req,res)=> res.json({ success:true, message:'SonixAI running', mode: process.env.FIREBASE_PRIVATE_KEY ? 'firebase' : 'demo-local' }));
app.use('/api', apiRouter);

// SPA fallback for pages
app.get('*', (req,res)=>{
  if(req.path.startsWith('/api')) return res.status(404).json({ success:false, error:'Not found' });
  res.sendFile(path.join(__dirname, '..','public','index.html'));
});

app.use(errorHandler);

app.listen(PORT, ()=> {
  console.log(`[SonixAI] http://localhost:${PORT}`);
  console.log(`[SonixAI] Free-first local mode. FFmpeg: ${process.env.FFMPEG_PATH || 'ffmpeg'} | Piper: ${process.env.PIPER_BINARY || 'piper'}`);
  if(!process.env.FIREBASE_PRIVATE_KEY) console.log('[SonixAI] Demo mode: Firebase in-memory fallback active');
});
