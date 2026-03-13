import { getDb } from './_firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const { docId, date, payload } = body;

    if (!docId || !date || !payload) {
      return res.status(400).json({ ok: false, error: 'Faltan datos para guardar' });
    }

    const db = getDb();
    const ref = db
      .collection('tr_lista')
      .doc(String(docId))
      .collection('historial')
      .doc(String(date));

    await ref.set(payload, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('checklist-save error', err);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo guardar el checklist'
    });
  }
}
