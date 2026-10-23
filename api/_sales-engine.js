// Motor puro para ventas diarias y sugeridos. No realiza escrituras ni llamadas externas.
import { createHash } from 'node:crypto';

export const SALES_STORES = Object.freeze({
  lista_avenida_morazan: 'VENTAS-DIARIAS-MORAZAN',
  lista_centro_comercial: 'VENTAS-DIARIAS-COMERCIAL',
  lista_sexta_calle: 'VENTAS-DIARIAS-SEXTA'
});

export function normalizeCode(value) {
  const valueText = String(value ?? '').trim().toUpperCase();
  if (!valueText || /^(N\/A|NA|SIN C[OÓ]DIGO)$/.test(valueText)) return '';
  // Código numérico con ceros iniciales: mantenemos el original para mostrarlo.
  return /^\d+$/.test(valueText) ? (valueText.replace(/^0+(?=\d)/, '') || '0') : valueText;
}
export function parseQuantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return null;
  // Permite 1,25 y 1,000.25; descarta cadenas con unidades añadidas.
  const clean = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)
    ? text.replace(/,/g, '') : text.replace(',', '.');
  return /^-?\d+(?:\.\d+)?$/.test(clean) ? Number(clean) : null;
}
export function parseDay(raw) {
  const text = String(raw ?? '').trim();
  const found = text.match(/(?:FECHA\s*[:=]\s*)?(\d{4}-\d{2}-\d{2})/i);
  if (found) {
    const iso = found[1];
    const dt = new Date(`${iso}T12:00:00Z`);
    return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : '';
  }
  const local = text.match(/(?:FECHA\s*[:=]\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  if (local) return parseDay(`${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`);
  return '';
}
export function elSalvadorDay(offset = 0, now = new Date()) {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
  const base = new Date(`${iso}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}
export function daysBetween(first, second) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(first)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(second))) return null;
  const gap = (Date.parse(second + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z')) / 86400000;
  return Number.isFinite(gap) ? gap : null;
}
export function median(values) {
  const arr = values.filter(v => Number.isFinite(v)).slice().sort((a,b)=>a-b);
  if (!arr.length) return null;
  const i = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[i] : (arr[i-1] + arr[i])/2;
}
export function parseSalesRows(values, fallbackDay) {
  const rows = Array.isArray(values) ? values : [];
  // Formato verificado: encabezados en B1/C1/G1, productos B2/C2/G2.
  const normalizeHeader = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const headerIndex = rows.findIndex(row => normalizeHeader(row?.[1]).includes('codigo')
    && normalizeHeader(row?.[6]).includes('cantidad'));
  if (headerIndex < 0) throw new Error('Formato incompatible: se esperaba Código en B y Cantidad en G.');
  const declaredDate = parseDay(rows[0]?.[0]);
  const day = declaredDate || fallbackDay;
  if (!parseDay(day)) throw new Error('Fecha de ventas no válida.');
  const map = new Map();
  let discarded = 0;
  rows.slice(headerIndex + 1).forEach(row => {
    const originalCode = String(row?.[1] ?? '').trim();
    const code = normalizeCode(originalCode);
    const qty = parseQuantity(row?.[6]);
    if (!code || qty === null || qty < 0 || !Number.isFinite(qty)) { discarded += 1; return; }
    const name = String(row?.[2] || '').trim().slice(0, 240);
    const amount = parseQuantity(row?.[9]);
    const current = map.get(code) || { code: originalCode, codeKey: code, name, quantity: 0, salesAmount: 0 };
    current.quantity += qty;
    if (amount !== null) current.salesAmount += amount;
    if (!current.name) current.name = name;
    map.set(code, current);
  });
  if (!map.size) throw new Error('La hoja no contiene productos válidos; no se archivó una hoja vacía.');
  const items = [...map.values()].sort((a,b)=>a.codeKey.localeCompare(b.codeKey));
  const fingerprint = createHash('sha256').update(JSON.stringify(items)).digest('hex');
  return { day, declaredDate: declaredDate || null, items, fingerprint, discarded };
}
const validRequestStatus = status => ['enviado','en_revision','despacho_parcial','despachado','despachado_requisicion_pendiente',
  'despachado_requisicion_hecha','recibido','recibida'].includes(String(status || '').toLowerCase());
function requestDay(req) { return String(req.requestDate || req.submittedAt || req.createdAt || '').slice(0,10); }
function requestKey(item) { return normalizeCode(item.codigo_inventario || item.codigoInventario || item.inventoryCode) || normalizeCode(item.codigo_barras || item.barcode); }

export function calculateReplenishment({ storeKey, snapshots = [], requests = [], today = elSalvadorDay() }) {
  const maxAge = 120;
  const salesDays = [...snapshots].filter(doc => doc.day && daysBetween(doc.day, today) >= 0 && daysBetween(doc.day, today) <= 35)
    .sort((a,b) => a.day.localeCompare(b.day));
  const latestDay = salesDays.at(-1)?.day || null;
  const latestDays = salesDays.filter(doc => daysBetween(doc.day, latestDay) <= 27);
  const productMap = new Map();
  const getProduct = (code, name) => {
    const key = normalizeCode(code);
    if (!key) return null;
    if (!productMap.has(key)) productMap.set(key, { key, code:String(code), name:String(name||''), salesByDay:new Map(), requestByDay:new Map(), lastRequestDate:'', lastRequestQty:0, pendingQuantity:0 });
    const product = productMap.get(key);
    if (!product.name && name) product.name = String(name);
    return product;
  };
  latestDays.forEach(doc => {
    (doc.items || []).forEach(item => {
      const product = getProduct(item.code, item.name);
      if (!product) return;
      product.salesByDay.set(doc.day, (product.salesByDay.get(doc.day) || 0) + Number(item.quantity || 0));
    });
  });
  const dedupe = new Set();
  requests.forEach(req => {
    if (!req || req.storeKey !== storeKey || !validRequestStatus(req.status)) return;
    if (req.mergedIntoRequestId || req.mergedAt) return;
    const day = requestDay(req);
    if (!parseDay(day) || daysBetween(day, today) < 0 || daysBetween(day, today) > maxAge) return;
    const identity = String(req.id || req.requestId || '');
    if (identity && dedupe.has(identity)) return;
    if (identity) dedupe.add(identity);
    (req.items || []).forEach(item => {
      const qty = parseQuantity(item.cantidad ?? item.quantity ?? item.qty);
      if (qty === null || qty <= 0) return;
      const product = getProduct(requestKey(item), item.nombre || item.name);
      if (!product) return;
      product.requestByDay.set(day, (product.requestByDay.get(day) || 0) + qty);
      if (!product.lastRequestDate || day > product.lastRequestDate) { product.lastRequestDate = day; product.lastRequestQty = qty; }
    });
  });
  const snapshotCount = new Set(latestDays.map(s => s.day)).size;
  const result = [...productMap.values()].map(p => {
    const requestedDates = [...p.requestByDay.keys()].sort();
    const gaps = requestedDates.slice(1).map((day,i)=>daysBetween(requestedDates[i],day)).filter(v=>v>0);
    const interval = median(gaps) || 3;
    const requestAvg = requestedDates.length
      ? [...p.requestByDay.values()].reduce((sum,n)=>sum+n,0)/requestedDates.length : 0;
    const daysSince = p.lastRequestDate ? daysBetween(p.lastRequestDate,today) : null;
    const dueRatio = daysSince === null ? null : daysSince/interval;
    const relevantSnapshots = latestDays.filter(doc => daysBetween(doc.day, latestDay) <= 13);
    const recentSnapshots = relevantSnapshots.filter(doc => daysBetween(doc.day, latestDay) <= 6);
    const recentQty = recentSnapshots.reduce((n,doc)=>n+(p.salesByDay.get(doc.day)||0),0);
    const recentDaysCount = recentSnapshots.length;
    const widerQty = relevantSnapshots.reduce((n,doc)=>n+(p.salesByDay.get(doc.day)||0),0);
    const widerDaysCount = relevantSnapshots.length;
    const dailyDemand = (recentDaysCount && widerDaysCount)
      ? 0.6*(recentQty/recentDaysCount) + 0.4*(widerQty/widerDaysCount)
      : (recentDaysCount ? recentQty/recentDaysCount : 0);
    // Sin conteo físico no es posible restar el stock actual. Esta recomendación
    // representa un pedido habitual objetivo, no un faltante demostrado.
    const cycle = Math.max(1, Math.min(14, Math.round(interval)));
    const salesTarget = Math.ceil(dailyDemand * cycle * 1.15);
    const patternTarget = Math.ceil(requestAvg);
    const enoughSales = recentDaysCount >= 4;
    const target = enoughSales
      ? Math.ceil(0.7*salesTarget + 0.3*patternTarget)
      : (patternTarget || salesTarget);
    // Un día aislado sin historial de solicitudes NO basta para emitir un pedido.
    const due = dueRatio === null ? (recentDaysCount >= 4 && dailyDemand > 0) : dueRatio >= 0.8;
    const confidence = recentDaysCount >= 7 && requestedDates.length >= 4 ? 'Alta'
      : recentDaysCount >= 4 || requestedDates.length >= 3 ? 'Media' : 'Baja';
    return {
      code:p.code, codeKey:p.key, name:p.name, suggestedQty: due ? Math.max(0,target) : 0,
      baselineQty:Math.max(0,target), due, confidence, requestCount:requestedDates.length,
      intervalDays:Math.round(interval*10)/10, averageRequested:Math.round(requestAvg*100)/100,
      lastRequestedAt:p.lastRequestDate || null, daysSinceRequest:daysSince,
      dailyDemand:Math.round(dailyDemand*100)/100, recentSales:recentQty,
      salesDays:recentDaysCount, reason: due ? 'Según frecuencia histórica y ventas disponibles' : 'Pedido reciente: aún no corresponde según patrón',
      hasVerifiedStock:false, stockEstimate:null
    };
  }).filter(row => row.baselineQty > 0 && row.due && row.suggestedQty > 0)
    .sort((a,b)=>Number(b.due)-Number(a.due) || b.suggestedQty-a.suggestedQty || a.name.localeCompare(b.name,'es'));
  return { storeKey, latestDay, snapshotCount, missingInventory:true, horizonDays:28, results:result.slice(0,400) };
}
