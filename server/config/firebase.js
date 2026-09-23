import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

let db = null;
let storageBucket = null;
let auth = null;
let firebaseEnabled = false;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    db = admin.firestore();
    auth = admin.auth();
    try { storageBucket = admin.storage().bucket(); } catch(e) { console.warn('[Firebase] Storage not configured'); }
    firebaseEnabled = true;
    console.log('[Firebase] Connected');
  } else {
    console.warn('[Firebase] Credentials missing - using in-memory fallback (FS quotas not used, demo mode active)');
  }
} catch (e) {
  console.warn('[Firebase] Init failed, fallback:', e.message);
}

export { db, auth, storageBucket, admin, firebaseEnabled };
