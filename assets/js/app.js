
let CATALOGO_CACHE = null;
let PROVIDERS_CACHE = null;
let __FIREBASE_READY = null;

function getTodayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
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

async function preloadCatalog() {
  if (CATALOGO_CACHE) return CATALOGO_CACHE;

  try {
    const r = await fetch('/api/catalogo');
    if (!r.ok) throw new Error('Error catálogo: ' + r.statusText);
    const data = await r.json();
    CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
    window.CATALOGO_CACHE = CATALOGO_CACHE;
  } catch (error) {
    console.error('Error al cargar catálogo:', error);
    CATALOGO_CACHE = [];
    window.CATALOGO_CACHE = [];
  }

  return CATALOGO_CACHE;
}

function loadProductsFromGoogleSheets() {
  return preloadCatalog();
}

async function preloadProviders() {
  if (PROVIDERS_CACHE) return PROVIDERS_CACHE;

  try {
    const r = await fetch('/api/proveedores');
    if (!r.ok) throw new Error('Error proveedores: ' + r.statusText);
    const data = await r.json();
    PROVIDERS_CACHE = Array.isArray(data.providers) ? data.providers : [];
  } catch (error) {
    console.error('Error al cargar proveedores:', error);
    PROVIDERS_CACHE = [];
  }

  return PROVIDERS_CACHE;
}

function loadProvidersFromGoogleSheets() {
  return preloadProviders();
}

async function getDB() {
  const fb = await initFirebaseCompat();
  return { fb, db: fb.firestore() };
}

async function ensureDateDocument(dateStr) {
  const { fb, db } = await getDB();
  await db.collection('tr_recepciones_fechas').doc(dateStr).set({
    date: dateStr,
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
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

async function createReceptionDraft(dateStr) {
  const { fb, db } = await getDB();
  const receptionId = generateReceptionId();
  const parentRef = db.collection('tr_recepciones_fechas').doc(dateStr);
  const ref = parentRef.collection('recepciones').doc(receptionId);

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

  await parentRef.set({
    date: dateStr,
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await ref.set(payload);
  return { receptionId, ...payload };
}

async function saveReceptionDraft(dateStr, receptionId, payload) {
  return saveReceptionWithStatus(dateStr, receptionId, payload, 'draft');
}

async function saveReceptionWithStatus(dateStr, receptionId, payload, status = 'draft') {
  const { fb, db } = await getDB();
  const parentRef = db.collection('tr_recepciones_fechas').doc(dateStr);
  await parentRef.set({
    date: dateStr,
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const normalizedStatus = ['draft', 'completed', 'cancelled'].includes(status) ? status : 'draft';

  await parentRef.collection('recepciones').doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: normalizedStatus,
    updatedAt: fb.firestore.FieldValue.serverTimestamp(),
    completedAt: normalizedStatus === 'completed'
      ? fb.firestore.FieldValue.serverTimestamp()
      : null
  }, { merge: true });
}

async function finalizeReception(dateStr, receptionId, payload) {
  const { fb, db } = await getDB();
  const parentRef = db.collection('tr_recepciones_fechas').doc(dateStr);
  await parentRef.set({
    date: dateStr,
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await parentRef.collection('recepciones').doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: 'completed',
    updatedAt: fb.firestore.FieldValue.serverTimestamp(),
    completedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function cancelReception(dateStr, receptionId, payload = {}) {
  const { fb, db } = await getDB();
  const parentRef = db.collection('tr_recepciones_fechas').doc(dateStr);
  await parentRef.set({
    date: dateStr,
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await parentRef.collection('recepciones').doc(receptionId).set({
    ...payload,
    receptionId,
    date: dateStr,
    status: 'cancelled',
    updatedAt: fb.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function loadReceptionById(dateStr, receptionId) {
  if (!dateStr || !receptionId) return {};
  try {
    const { db } = await getDB();
    const snap = await db.collection('tr_recepciones_fechas').doc(dateStr).collection('recepciones').doc(receptionId).get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch (error) {
    console.error('Error al cargar recepción:', error);
    return {};
  }
}

async function listReceptionsByDate(dateStr) {
  if (!dateStr) return [];
  try {
    const { db } = await getDB();
    const snap = await db
      .collection('tr_recepciones_fechas')
      .doc(dateStr)
      .collection('recepciones')
      .orderBy('updatedAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error al listar recepciones por fecha:', error);
    return [];
  }
}

async function getHistoryDates() {
  try {
    const { db } = await getDB();
    const snap = await db.collection('tr_recepciones_fechas').get();
    return snap.docs.map((d) => d.id).filter(Boolean).sort();
  } catch (error) {
    console.error('Error al listar fechas del historial:', error);
    return [];
  }
}
