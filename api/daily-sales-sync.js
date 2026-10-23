import { getAdminApp } from './_firebase-admin.js';
import { apiError, requireAppUser } from './_sales-auth.js';
import { SALES_STORES, parseSalesRows, elSalvadorDay } from './_sales-engine.js';

const keys = Object.keys(SALES_STORES);
const origin = 'TR-Lista/ventas-diarias';

async function syncStore(db, storeKey, apiKey, sheetId, day) {
  const name = SALES_STORES[storeKey];
  const range = `'${name}'!A1:M6000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { cache:'no-store', headers:{'Cache-Control':'no-cache'} });
  if (!response.ok) throw new Error(`Google Sheets (${name}): HTTP ${response.status} ${String(await response.text()).slice(0,180)}`);
  const values = (await response.json()).values || [];
  const parsed = parseSalesRows(values, day);
  if (parsed.day > elSalvadorDay()) throw new Error('La fecha de origen está en el futuro.');
  if (parsed.day < elSalvadorDay(-45)) throw new Error('La fecha de origen es anterior a 45 días.');
  const sourceRef = db.collection('sales_sources').doc(storeKey);
  const salesRef = db.collection('sales_daily').doc(`${storeKey}__${parsed.day}`);
  // Los metadatos evitan archivar una hoja no actualizada con la fecha del día siguiente.
  // La transacción previene duplicidades ante cron y sincronización manual concurrentes.
  const result = await db.runTransaction(async tx => {
    const [source, previous] = await Promise.all([tx.get(sourceRef), tx.get(salesRef)]);
    const meta = source.data() || {};
    const previousData = previous.data() || {};
    if (!parsed.declaredDate && meta.fingerprint === parsed.fingerprint && meta.day !== parsed.day) {
      return { status:'unchanged-source', day:parsed.day, rows:parsed.items.length, message:'La hoja es idéntica a la del último día archivado. No se asignó otra fecha.' };
    }
    if (previousData.fingerprint === parsed.fingerprint) {
      return { status:'already-saved', day:parsed.day, rows:parsed.items.length };
    }
    const now = new Date().toISOString();
    tx.set(salesRef, { storeKey, day:parsed.day, sourceSheet:name, fingerprint:parsed.fingerprint,
      sourceDateExplicit:!!parsed.declaredDate, items:parsed.items, itemCount:parsed.items.length,
      discardedRows:parsed.discarded, capturedAt:now, source:origin });
    // Corregir días antiguos no debe retroceder la referencia de último archivo.
    if (!meta.day || parsed.day >= meta.day) {
      tx.set(sourceRef, { storeKey, day:parsed.day, fingerprint:parsed.fingerprint,
        itemCount:parsed.items.length, capturedAt:now, sourceSheet:name }, { merge:true });
    }
    return { status: previous.exists ? 'updated' : 'saved', day:parsed.day, rows:parsed.items.length, discardedRows:parsed.discarded };
  });
  return { storeKey, sheet:name, ...result };
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (!['POST','GET'].includes(req.method)) return res.status(405).json({error:'Método no permitido'});
  try {
    const cronSecret = process.env.CRON_SECRET;
    const isCron = req.method==='GET' && !!cronSecret && req.headers.authorization === `Bearer ${cronSecret}`;
    if (!isCron) {
      if (req.method !== 'POST') return res.status(401).json({error:'Cron no autorizado.'});
      await requireAppUser(req,{adminOnly:true});
    }
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    // Importante: puede no ser el mismo libro que el catálogo.
    const sheetId = process.env.GOOGLE_SHEETS_SALES_ID || process.env.GOOGLE_SHEETS_ID;
    if (!apiKey || !sheetId) return res.status(503).json({ok:false,error:'Configura GOOGLE_SHEETS_API_KEY y GOOGLE_SHEETS_SALES_ID en Vercel.'});
    const inputDay = !isCron && req.body?.day;
    const day = inputDay || elSalvadorDay(-1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > elSalvadorDay() || day < elSalvadorDay(-45)) return res.status(400).json({ok:false,error:'Fecha inválida o fuera de rango (últimos 45 días).'});
    const db = getAdminApp().firestore();
    const requestedStore = !isCron && String(req.body?.storeKey || '');
    if (requestedStore && !keys.includes(requestedStore)) return res.status(400).json({ok:false,error:'Sucursal inválida.'});
    const selected = requestedStore ? [requestedStore] : keys;
    const results = await Promise.all(selected.map(async key => {
      try { return await syncStore(db,key,apiKey,sheetId,day); }
      catch (err) { console.error('Importación '+key,err); return {storeKey:key,sheet:SALES_STORES[key],status:'error',error:err.message}; }
    }));
    const failed = results.some(row=>row.status==='error');
    return res.status(failed ? 207 : 200).json({ok:!failed, attemptedDay:day, results});
  } catch(error) { return apiError(res,error); }
}
