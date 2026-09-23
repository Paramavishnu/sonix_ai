import { auth, firebaseEnabled } from '../config/firebase.js';

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!firebaseEnabled || !token) {
    req.user = { uid: 'demo-user', email: 'demo@sonixai.local' };
    return next();
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    // In demo mode allow fallback
    req.user = { uid: 'demo-user', email: 'demo@sonixai.local' };
    next();
  }
}

export function optionalAuth(req, res, next) {
  req.user = req.user || { uid: 'demo-user', email: 'demo@sonixai.local' };
  next();
}
