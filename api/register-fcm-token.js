import crypto from 'crypto';
import { admin, getAdminApp } from './_firebase-admin.js';

function tokenDocId(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    getAdminApp();

    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) return res.status(401).json({ ok: false, error: 'Token de autenticación no enviado.' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const role = String(decoded.role || '').trim().toLowerCase();
    if (role !== 'supervisor' && role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Solo bodega o admin pueden registrar notificaciones push.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = String(body.token || '').trim();
    if (!token) return res.status(400).json({ ok: false, error: 'Token FCM no enviado.' });

    const docId = tokenDocId(token);
    await admin.firestore().collection('fcm_tokens').doc(docId).set({
      token,
      uid: decoded.uid,
      email: String(decoded.email || '').trim().toLowerCase(),
      role,
      active: true,
      userAgent: String(body.userAgent || req.headers['user-agent'] || '').slice(0, 500),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('register-fcm-token error:', error);
    return res.status(500).json({ ok: false, error: String(error?.message || error || 'No se pudo registrar el token.') });
  }
}
