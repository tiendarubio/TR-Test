// api/estantes.js — Proxy a Google Sheets para opciones del flujo "Iniciar inventario"
// Lee columnas del sheet "estantes":
//   A:A  Estantes AVM
//   B:B  Estantes Sexta Calle
//   C:C  Estantes Centro Comercial
//   D:D  Ubicaciones (Almacén)
//   E:E  Tipos de inventario
//   F:F  Dependientes

function uniqClean(list) {
  const out = [];
  const seen = new Set();
  for (const x of list) {
    const v = String(x || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;

    if (!apiKey || !sheetId) {
      return res.status(500).json({
        error: 'Faltan variables de entorno (GOOGLE_SHEETS_API_KEY / GOOGLE_SHEETS_ID).'
      });
    }

    const ranges = [
      'estantes!A2:A2000',
      'estantes!B2:B2000',
      'estantes!C2:C2000',
      'estantes!D2:D2000',
      'estantes!E2:E2000',
      'estantes!F2:F2000'
    ];

    const params = new URLSearchParams();
    ranges.forEach(r => params.append('ranges', r));
    params.set('majorDimension', 'COLUMNS');
    params.set('key', apiKey);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: 'Error al consultar Google Sheets (estantes)',
        details: text
      });
    }

    const data = await response.json();
    const valueRanges = Array.isArray(data.valueRanges) ? data.valueRanges : [];

    const col = (i) => {
      const vr = valueRanges[i];
      const vals = (vr && Array.isArray(vr.values) && vr.values[0]) ? vr.values[0] : [];
      return uniqClean(vals);
    };

    return res.status(200).json({
      estantes_avm: col(0),
      estantes_sexta: col(1),
      estantes_centro: col(2),
      ubicaciones: col(3),
      tipos: col(4),
      dependientes: col(5)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno en /api/estantes' });
  }
}
