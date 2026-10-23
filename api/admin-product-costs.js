import { admin, getAdminApp } from './_firebase-admin.js';

function parseMoney(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/[$\s]/g, '')
    .replace(/,/g, '.');

  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

async function requireAdmin(req) {
  getAdminApp();

  const authHeader = String(req.headers.authorization || '');
  const idToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!idToken) {
    const error = new Error('Token de autenticación no enviado.');
    error.status = 401;
    throw error;
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  const role = String(decoded?.role || '').trim().toLowerCase();

  if (role !== 'admin') {
    const error = new Error('Solo usuarios administradores pueden consultar costos.');
    error.status = 403;
    throw error;
  }

  return decoded;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    await requireAdmin(req);

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const range = process.env.GOOGLE_SHEETS_COST_RANGE || process.env.GOOGLE_SHEETS_ADMIN_RANGE || 'bd!A2:F5000';

    if (!apiKey || !sheetId) {
      return res.status(500).json({
        ok: false,
        error: 'Faltan variables de entorno de Google Sheets (GOOGLE_SHEETS_API_KEY / GOOGLE_SHEETS_ID).'
      });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const sheetsResponse = await fetch(url);

    if (!sheetsResponse.ok) {
      const text = await sheetsResponse.text();
      return res.status(sheetsResponse.status).json({ ok: false, error: 'Error en Google Sheets', details: text });
    }

    const data = await sheetsResponse.json();
    const values = Array.isArray(data.values) ? data.values : [];
    const products = values.map((row, index) => {
      const cost = parseMoney(row?.[5]);
      return {
        rowNumber: index + 2,
        nombre: String(row?.[0] || '').trim(),
        codigo_inventario: String(row?.[1] || '').trim(),
        bodega: String(row?.[2] || '').trim(),
        codigo_barras: String(row?.[3] || '').trim(),
        costo: cost,
        hasCost: cost !== null
      };
    }).filter(product => product.nombre || product.codigo_inventario || product.codigo_barras);

    return res.status(200).json({
      ok: true,
      range,
      totalRows: values.length,
      products,
      costedCount: products.filter(product => product.hasCost).length,
      missingCostCount: products.filter(product => !product.hasCost).length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('admin-product-costs error:', error);
    return res.status(error.status || 500).json({
      ok: false,
      error: String(error?.message || error || 'Error interno consultando costos.')
    });
  }
}
