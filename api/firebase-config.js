// api/firebase-config.js — expone config pública de Firebase (desde variables de entorno de Vercel)
export default function handler(req, res) {
  try {
    const cfg = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    };

    if (!cfg.apiKey || !cfg.projectId) {
      return res.status(500).json({
        error: 'Faltan variables de entorno de Firebase (FIREBASE_*)'
      });
    }

    return res.status(200).json(cfg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno en /api/firebase-config' });
  }
}
