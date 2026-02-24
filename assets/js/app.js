// assets/js/app.js — Helpers para TRInventario (Vercel) usando Firestore + Google Sheets

let CATALOGO_CACHE = null;
let PROVIDERS_CACHE = null;
let ESTANTES_CACHE = null;

// --- Catálogo ---
function preloadCatalog() {
  if (CATALOGO_CACHE) return Promise.resolve(CATALOGO_CACHE);

  return fetch('/api/catalogo')
    .then(r => {
      if (!r.ok) throw new Error('Error catálogo: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar catálogo:', err);
      CATALOGO_CACHE = [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    });
}
function loadProductsFromGoogleSheets() { return preloadCatalog(); }

// --- Proveedores ---
function preloadProviders() {
  if (PROVIDERS_CACHE) return Promise.resolve(PROVIDERS_CACHE);

  return fetch('/api/proveedores')
    .then(r => {
      if (!r.ok) throw new Error('Error proveedores: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      PROVIDERS_CACHE = Array.isArray(data.providers) ? data.providers : [];
      return PROVIDERS_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar proveedores:', err);
      PROVIDERS_CACHE = [];
      return PROVIDERS_CACHE;
    });
}
function loadProvidersFromGoogleSheets() { return preloadProviders(); }

// --- Estantes (Wizard) ---
function preloadEstantes() {
  if (ESTANTES_CACHE) return Promise.resolve(ESTANTES_CACHE);

  return fetch('/api/estantes')
    .then(r => {
      if (!r.ok) throw new Error('Error estantes: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      ESTANTES_CACHE = data || {};
      return ESTANTES_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar estantes:', err);
      ESTANTES_CACHE = {};
      return ESTANTES_CACHE;
    });
}

// ===== Firestore helpers =====
function getTodayString() { return new Date().toISOString().split('T')[0]; }

let __FIREBASE_INIT_PROMISE__ = null;

async function ensureFirebaseInitialized() {
  if (typeof firebase === 'undefined' || !firebase.apps) throw new Error('Firebase no está disponible en el cliente.');
  if (firebase.apps.length) return true;

  if (!__FIREBASE_INIT_PROMISE__) {
    __FIREBASE_INIT_PROMISE__ = fetch('/api/firebase-config')
      .then(r => {
        if (!r.ok) throw new Error('No se pudo obtener firebase-config');
        return r.json();
      })
      .then(cfg => {
        if (!cfg || !cfg.apiKey || !cfg.projectId) throw new Error('Configuración de Firebase incompleta.');
        firebase.initializeApp(cfg);
        return true;
      });
  }
  await __FIREBASE_INIT_PROMISE__;
  return true;
}

async function getFirestoreDb() {
  await ensureFirebaseInitialized();
  if (!firebase.firestore) throw new Error('Firestore no está disponible.');
  return firebase.firestore();
}

async function saveInventoryToFirestore(docId, payload, dateStr) {
  if (!docId) throw new Error('Documento no configurado para esta hoja.');
  const db = await getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  await db.collection('tr_inventario').doc(String(docId)).collection('historial').doc(day)
    .set(payload || {}, { merge: true });

  return { ok: true, day };
}

async function loadInventoryFromFirestore(docId, dateStr) {
  if (!docId) return {};
  const db = await getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  try {
    const doc = await db.collection('tr_inventario').doc(String(docId)).collection('historial').doc(day).get();
    return doc.exists ? (doc.data() || {}) : {};
  } catch (err) {
    console.error('Error al leer Firestore:', err);
    return {};
  }
}

async function getHistoryDates(docId) {
  if (!docId) return [];
  try {
    const db = await getFirestoreDb();
    const snap = await db.collection('tr_inventario').doc(String(docId)).collection('historial').get();
    return snap.docs.map(d => d.id);
  } catch (err) {
    console.error('Error al listar historial en Firestore:', err);
    return [];
  }
}

async function loadLatestInventoryFromFirestore(docId) {
  if (!docId) return {};
  const db = await getFirestoreDb();
  try {
    const snap = await db.collection('tr_inventario').doc(String(docId)).collection('historial')
      .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(1).get();
    if (!snap || snap.empty) return {};
    const d = snap.docs[0];
    return d && d.exists ? (d.data() || {}) : {};
  } catch (err) {
    console.error('Error al cargar último registro Firestore:', err);
    return {};
  }
}
