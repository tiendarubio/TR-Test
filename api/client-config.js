function env(name) {
  return String(process.env[name] || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  const firebaseConfig = {
    apiKey: env('FIREBASE_API_KEY'),
    authDomain: env('FIREBASE_AUTH_DOMAIN'),
    projectId: env('FIREBASE_PROJECT_ID'),
    storageBucket: env('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID'),
    appId: env('FIREBASE_APP_ID')
  };

  const missingFirebase = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({
    ok: missingFirebase.length === 0,
    firebaseConfig,
    missingFirebase,
    firebaseVapidKey: env('VITE_FIREBASE_VAPID_KEY')
  });
}
