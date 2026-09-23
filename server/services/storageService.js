import { storageBucket, firebaseEnabled } from '../config/firebase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicExports = path.join(__dirname, '..','..','public','exports');
if (!fs.existsSync(publicExports)) fs.mkdirSync(publicExports, { recursive: true });

export async function uploadFile(localPath, destName) {
  if (firebaseEnabled && storageBucket) {
    try {
      await storageBucket.upload(localPath, { destination: `sonixai/${destName}` });
      const file = storageBucket.file(`sonixai/${destName}`);
      const [url] = await file.getSignedUrl({ action:'read', expires: Date.now()+1000*60*60*24*7 });
      return url;
    } catch(e) { console.warn('[Storage] Firebase upload failed, fallback to local', e.message); }
  }
  // Local fallback: copy to public/exports for demo
  const dest = path.join(publicExports, destName);
  fs.copyFileSync(localPath, dest);
  return `/exports/${destName}`;
}
