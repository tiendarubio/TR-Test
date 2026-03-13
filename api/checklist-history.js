import { getDb } from './_firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { docId } = req.query || {};

    if (!docId) {
      return res.status(400).json({ ok: false, error: 'Falta docId' });
    }

    const db = getDb();
    const snap = await db
      .collection('tr_lista')
      .doc(String(docId))
      .collection('historial')
      .get();

    const dates = snap.docs
      .map(d => d.id)
      .filter(Boolean)
      .sort();

    return res.status(200).json({ ok: true, dates });
  } catch (err) {
    console.error('checklist-history error', err);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener el historial'
    });
  }
}
