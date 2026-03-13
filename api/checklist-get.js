import { getDb } from './_firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { docId, date } = req.query || {};

    if (!docId || !date) {
      return res.status(400).json({ ok: false, error: 'Faltan docId o date' });
    }

    const db = getDb();
    const ref = db
      .collection('tr_lista')
      .doc(String(docId))
      .collection('historial')
      .doc(String(date));

    const snap = await ref.get();
    return res.status(200).json({
      ok: true,
      data: snap.exists ? (snap.data() || {}) : {}
    });
  } catch (err) {
    console.error('checklist-get error', err);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo leer el checklist'
    });
  }
}
