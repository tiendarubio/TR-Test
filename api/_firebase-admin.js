import admin from 'firebase-admin';

function readRequiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error('Falta la variable de entorno ' + name + '.');
  return value;
}

function normalizePrivateKey(value) {
  let key = String(value || '').trim();
  // Acepta valores PEM directos, entrecomillados o JSON-escaped.
  if (key.startsWith('"') && key.endsWith('"')) {
    try { key = JSON.parse(key); }
    catch (_) { key = key.slice(1, -1); }
  }
  key = String(key).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  // No intentamos reconstruir credenciales truncadas o inválidas.
  if (!/^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----$/.test(key)) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY no tiene formato PEM válido. Revisa el valor completo en Vercel (BEGIN/END PRIVATE KEY y saltos de línea).');
  }
  return key;
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = readRequiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = readRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(readRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY'));

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

export { admin };
