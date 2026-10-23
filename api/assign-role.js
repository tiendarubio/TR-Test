import { admin, getAdminApp } from './_firebase-admin.js';

const STORE_ALIAS_MAP = {
  lista_sexta_calle: ['sexta', 'sexta_calle', 'sexta-calle', '6ta', 'sxta', 'sexta calle'],
  lista_avenida_morazan: ['morazan', 'morazán', 'avenida_morazan', 'avenida-morazan', 'avm', 'avenida morazan', 'avenida morazán'],
  lista_centro_comercial: ['centro', 'centro_comercial', 'centro-comercial', 'cc', 'centro comercial']
};


function parseEmailList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getEmailLocalPart(email) {
  return String(email || '').trim().toLowerCase().split('@')[0] || '';
}

function resolveStoreKey(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const localPart = getEmailLocalPart(normalized);

  const envMap = {
    lista_sexta_calle: parseEmailList(process.env.STORE_SEXTA_EMAILS),
    lista_avenida_morazan: parseEmailList(process.env.STORE_MORAZAN_EMAILS),
    lista_centro_comercial: parseEmailList(process.env.STORE_CENTRO_EMAILS)
  };

  for (const [storeKey, emails] of Object.entries(envMap)) {
    if (emails.includes(normalized)) {
      return storeKey;
    }
  }

  for (const [storeKey, aliases] of Object.entries(STORE_ALIAS_MAP)) {
    if (aliases.some((alias) => localPart.includes(alias))) {
      return storeKey;
    }
  }

  return null;
}

function resolveAccess(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const admins = parseEmailList(process.env.ROLE_ADMIN_EMAILS);
  const supervisors = parseEmailList(process.env.ROLE_SUPERVISOR_EMAILS);
  const operators = parseEmailList(process.env.ROLE_OPERATOR_EMAILS);

  if (!normalized) {
    return { role: 'sin_acceso', storeKey: null };
  }

  if (admins.includes(normalized)) {
    return { role: 'admin', storeKey: null };
  }

  if (supervisors.includes(normalized)) {
    return { role: 'supervisor', storeKey: null };
  }

  if (operators.includes(normalized)) {
    const storeKey = resolveStoreKey(normalized);
    if (!storeKey) {
      return { role: 'sin_acceso', storeKey: null };
    }
    return { role: 'operador', storeKey };
  }

  return { role: 'sin_acceso', storeKey: null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    getAdminApp();

    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!idToken) {
      return res.status(401).json({ ok: false, error: 'Token de autenticación no enviado.' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const userRecord = await admin.auth().getUser(decoded.uid);
    const email = String(userRecord.email || '').trim().toLowerCase();
    const access = resolveAccess(email);
    const role = access.role;
    const storeKey = access.storeKey || null;

    const currentClaims = userRecord.customClaims || {};
    const nextClaims = { ...currentClaims, role };

    if (storeKey) {
      nextClaims.storeKey = storeKey;
    } else if ('storeKey' in nextClaims) {
      delete nextClaims.storeKey;
    }

    if (currentClaims.role !== role || currentClaims.storeKey !== storeKey) {
      await admin.auth().setCustomUserClaims(userRecord.uid, nextClaims);
    }

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      role,
      storeKey,
      active: role !== 'sin_acceso',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({
      ok: true,
      uid: userRecord.uid,
      email,
      role,
      storeKey
    });
  } catch (error) {
    console.error('assign-role error:', error);
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error || 'No se pudo asignar el rol.')
    });
  }
}
