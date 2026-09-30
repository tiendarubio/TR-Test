import admin from 'firebase-admin';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function privateKey(value) {
  return String(value || '').replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n').trim();
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: required('FIREBASE_PROJECT_ID'),
      clientEmail: required('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: privateKey(required('FIREBASE_ADMIN_PRIVATE_KEY'))
    })
  });
}

export async function requireUser(req, allowedRoles = []) {
  getAdminApp();
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    const err = new Error('Token de autenticación no enviado.');
    err.statusCode = 401;
    throw err;
  }
  const decoded = await admin.auth().verifyIdToken(token);
  const role = String(decoded.role || 'sin_acceso');
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    const err = new Error('No tienes permisos para realizar esta acción.');
    err.statusCode = 403;
    throw err;
  }
  return { ...decoded, role };
}

export { admin };
