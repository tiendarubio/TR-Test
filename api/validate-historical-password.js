export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const password = String(body.password || '').trim();
    const scope = String(body.scope || 'historical').trim().toLowerCase();

    if (!password) {
      return res.status(400).json({ ok: false, error: 'Debes enviar la contraseña.' });
    }

    const configs = {
      historical: {
        sheetId: process.env.GOOGLE_SHEETS_UNLOCK_SHEET_ID || process.env.GOOGLE_SHEETS_ID,
        range: process.env.GOOGLE_SHEETS_UNLOCK_RANGE || 'estantes!G2'
      },
      traslado: {
        sheetId:
          process.env.GOOGLE_SHEETS_TRASLADO_UNLOCK_SHEET_ID ||
          process.env.GOOGLE_SHEETS_UNLOCK_SHEET_ID ||
          process.env.GOOGLE_SHEETS_ID,
        range:
          process.env.GOOGLE_SHEETS_TRASLADO_UNLOCK_RANGE ||
          process.env.GOOGLE_SHEETS_UNLOCK_RANGE ||
          'estantes!G2'
      }
    };

    const selectedConfig = configs[scope] || configs.historical;
    const sheetId = selectedConfig.sheetId;
    const range = selectedConfig.range;

    if (!apiKey || !sheetId) {
      return res.status(500).json({
        ok: false,
        error: 'Faltan variables de entorno para validar la contraseña.'
      });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        ok: false,
        error: 'Error al consultar Google Sheets.',
        details: text
      });
    }

    const data = await response.json();
    const expectedPassword = String(data?.values?.[0]?.[0] || '').trim();

    if (!expectedPassword) {
      return res.status(500).json({
        ok: false,
        error: 'No se encontró contraseña en la celda configurada.'
      });
    }

    return res.status(200).json({
      ok: password === expectedPassword,
      scope
    });
  } catch (err) {
    console.error('validate-historical-password error', err);
    return res.status(500).json({
      ok: false,
      error: 'Error interno validando contraseña.'
    });
  }
}
