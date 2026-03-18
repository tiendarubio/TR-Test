let CATALOGO_CACHE = null;
let PROVIDERS_CACHE = null;
let __FIREBASE_READY = null;

function getTodayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
}

function showToast(icon, title) {
  if (window.Swal) {
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2200 });
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar: ' + src));
    document.head.appendChild(s);
  });
}

async function initFirebaseCompat() {
  if (__FIREBASE_READY) return __FIREBASE_READY;

  __FIREBASE_READY = (async () => {
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');

    const r = await fetch('/api/firebase-config');
    if (!r.ok) throw new Error('No se pudo cargar firebase-config');
    const cfg = await r.json();

    if (!window.firebase || !window.firebase.initializeApp) {
      throw new Error('Firebase compat no disponible');
    }

    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(cfg);
    }

    return window.firebase;
  })();

  return __FIREBASE_READY;
}

function getDayCollection(dateStr) {
  return initFirebaseCompat().then((fb) => {
    const db = fb.firestore();
    return db
      .collection('tr_recepciones_fechas')
      .doc(dateStr)
      .collection('recepciones');
  });
}

function generateReceptionId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RX-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
}

function normalizeNumber(value, decimals = 2) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Number(n.toFixed(decimals)) : 0;
}

async function preloadCatalog() {
  if (CATALOGO_CACHE) return CATALOGO_CACHE;

  try {
    const r = await fetch('/api/catalogo');
    if (!r.ok) throw new Error('Error catálogo');
    const data = await r.json();
    CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
  } catch (error) {
    console.error('Error al cargar catálogo:', error);
    CATALOGO_CACHE = [];
  }

  return CATALOGO_CACHE;
}

async function preloadProviders() {
  if (PROVIDERS_CACHE) return PROVIDERS_CACHE;

  try {
    const r = await fetch('/api/proveedores');
    if (!r.ok) throw new Error('Error proveedores');
    const data = await r.json();
    PROVIDERS_CACHE = Array.isArray(data.providers) ? data.providers : [];
  } catch (error) {
    console.error('Error al cargar proveedores:', error);
    PROVIDERS_CACHE = [];
  }

  return PROVIDERS_CACHE;
}

function mapCatalogRow(row) {
  return {
    codigoBarras: String(row?.[0] || '').trim(),
    nombre: String(row?.[1] || '').trim(),
    codigoInventario: String(row?.[2] || '').trim(),
    departamento: String(row?.[3] || '').trim(),
    subdepartamento: String(row?.[4] || '').trim(),
    unidad: String(row?.[5] || '').trim()
  };
}

async function createReceptionDraft(dateStr) {
  const fb = await initFirebaseCompat();
  const col = await getDayCollection(dateStr);
  const receptionId = generateReceptionId();

  const payload = {
    receptionId,
    date: dateStr,
    status: 'draft',
    proveedor: '',
    numeroCreditoFiscal: '',
    tienda: 'AVENIDA MORAZÁN',
    items: [],
    totales: {
      lineas: 0,
      cantidad_total: 0,
      total_sin_iva: 0,
      total_con_iva: 0
    },
    createdAt: fb.firestore.FieldValue.serverTimestamp(),
    updatedAt: fb.firestore.FieldValue.serverTimestamp(),
    completedAt: null
  };

  await col.doc(receptionId).set(payload);
  return { receptionId, ...payload };
}

async function saveReceptionDraft(dateStr, receptionId, payload) {
  const fb = await initFirebaseCompat();
  const col = await getDayCollection(dateStr);
  await col.doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: 'draft',
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function finalizeReception(dateStr, receptionId, payload) {
  const fb = await initFirebaseCompat();
  const col = await getDayCollection(dateStr);
  await col.doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: 'completed',
    updatedAt: fb.firestore.FieldValue.serverTimestamp(),
    completedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function cancelReception(dateStr, receptionId, payload = {}) {
  const fb = await initFirebaseCompat();
  const col = await getDayCollection(dateStr);
  await col.doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: 'cancelled',
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function listReceptionsByDate(dateStr) {
  const col = await getDayCollection(dateStr);
  const snap = await col.get();
  const rows = [];
  snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

  return rows.sort((a, b) => {
    const at = a.createdAt?.seconds || 0;
    const bt = b.createdAt?.seconds || 0;
    return bt - at;
  });
}

async function loadReceptionById(dateStr, receptionId) {
  const col = await getDayCollection(dateStr);
  const doc = await col.doc(receptionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
