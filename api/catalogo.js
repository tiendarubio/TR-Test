export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Método no permitido.' });
    }

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || process.env.GOOGLE_SHEETS_CATALOG_RANGE || 'bd!A2:H5000';

    if (!apiKey || !sheetId) {
      return res.status(500).json({
        error: 'Faltan variables de entorno de Google Sheets.',
        missing: ['GOOGLE_SHEETS_API_KEY', 'GOOGLE_SHEETS_ID'].filter((name) => !process.env[name])
      });
    }

    const params = new URLSearchParams({ key: apiKey });
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?${params.toString()}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'Error en Google Sheets', details: text });
    }

    const data = await resp.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ values: data.values || [], range });
  } catch (err) {
    console.error('catalogo error', err);
    return res.status(500).json({ error: 'Error interno en /api/catalogo', details: String(err?.message || err) });
  }
}
