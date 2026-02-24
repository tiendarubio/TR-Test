// api/estantes.js — Proxy a Google Sheets "estantes" (listas para wizard de inventario)
export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;

    if (!apiKey || !sheetId) {
      return res.status(500).json({ error: 'Faltan variables de entorno (GOOGLE_SHEETS_API_KEY / GOOGLE_SHEETS_ID)' });
    }

    const ranges = [
      'estantes!E2:E', // tipos
      'estantes!D2:D', // ubicaciones (almacén)
      'estantes!F2:F', // dependientes
      'estantes!A2:A', // estantes AVM
      'estantes!B2:B', // estantes Sexta Calle
      'estantes!C2:C'  // estantes Centro Comercial
    ];

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?` +
      `ranges=${ranges.map(r => encodeURIComponent(r)).join('&ranges=')}&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Error al consultar Google Sheets (estantes)', details: text });
    }

    const data = await response.json();
    const v = (i) => Array.isArray(data.valueRanges?.[i]?.values) ? data.valueRanges[i].values.flat().filter(Boolean) : [];

    return res.status(200).json({
      tipos: v(0),
      ubicaciones: v(1),
      dependientes: v(2),
      estantes_avm: v(3),
      estantes_sexta: v(4),
      estantes_cc: v(5)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno en /api/estantes' });
  }
}
