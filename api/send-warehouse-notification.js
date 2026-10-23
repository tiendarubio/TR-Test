import crypto from 'crypto';
import { admin, getAdminApp } from './_firebase-admin.js';

function tokenDocId(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getStoreName(body) {
  return String(body.storeName || body.store || 'Sucursal').trim() || 'Sucursal';
}

async function loadTargetTokens() {
  const db = admin.firestore();
  const snap = await db.collection('fcm_tokens')
    .where('active', '==', true)
    .where('role', 'in', ['supervisor', 'admin'])
    .limit(500)
    .get();

  return snap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(row => row.token)
    .map(row => ({ id: row.id || tokenDocId(row.token), token: row.token }));
}

async function deactivateInvalidTokens(targets, response) {
  const invalidCodes = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument'
  ]);

  const batch = admin.firestore().batch();
  let changed = 0;

  (response.responses || []).forEach((item, index) => {
    const code = item?.error?.code;
    if (!code || !invalidCodes.has(code)) return;
    const target = targets[index];
    if (!target?.id) return;
    batch.set(admin.firestore().collection('fcm_tokens').doc(target.id), {
      active: false,
      disabledAt: admin.firestore.FieldValue.serverTimestamp(),
      disabledReason: code
    }, { merge: true });
    changed += 1;
  });

  if (changed) await batch.commit();
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
    if (!['operador', 'supervisor', 'admin'].includes(role)) {
      return res.status(403).json({ ok: false, error: 'Usuario sin permisos para enviar notificaciones.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const requestId = String(body.requestId || '').trim();
    if (!requestId) return res.status(400).json({ ok: false, error: 'requestId no enviado.' });

    const storeName = getStoreName(body);
    const itemCount = Number(body.itemCount || 0);
    const requestCode = String(body.requestCode || '').trim() || requestId;
    const targets = await loadTargetTokens();
    if (!targets.length) return res.status(200).json({ ok: true, sent: 0, message: 'No hay tokens de bodega registrados.' });

    const title = 'Nueva solicitud a bodega';
    const messageBody = `${storeName} envió ${itemCount || 0} producto(s). Solicitud: ${requestCode}`;
    const appUrl = String(process.env.TR_LISTA_APP_URL || process.env.VERCEL_URL || '').trim();
    const link = appUrl
      ? (appUrl.startsWith('http') ? appUrl : `https://${appUrl}`) + `/?requestId=${encodeURIComponent(requestId)}`
      : `/?requestId=${encodeURIComponent(requestId)}`;

    const response = await admin.messaging().sendEachForMulticast({
      tokens: targets.map(t => t.token),
      notification: { title, body: messageBody },
      data: {
        type: 'warehouse_request',
        requestId,
        storeName,
        itemCount: String(itemCount || 0),
        status: String(body.status || 'enviado')
      },
      webpush: {
        fcmOptions: { link },
        notification: {
          title,
          body: messageBody,
          tag: `trlista-${requestId}`,
          icon: '/assets/img/trlogo.png',
          badge: '/assets/img/trlogo.png'
        }
      }
    });

    await deactivateInvalidTokens(targets, response);

    return res.status(200).json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount
    });
  } catch (error) {
    console.error('send-warehouse-notification error:', error);
    return res.status(500).json({ ok: false, error: String(error?.message || error || 'No se pudo enviar la notificación.') });
  }
}
