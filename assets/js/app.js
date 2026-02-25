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

// --- Estantes (Google Sheets -> /api/estantes) ---
let ESTANTES_CACHE = null;

function preloadEstantes() {
  if (ESTANTES_CACHE) return Promise.resolve(ESTANTES_CACHE);

  return fetch('/api/estantes')
    .then(r => {
      if (!r.ok) throw new Error('Error estantes: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      ESTANTES_CACHE = Array.isArray(data.values) ? data.values : [];
      try { window.ESTANTES_CACHE = ESTANTES_CACHE; } catch (_) {}
      return ESTANTES_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar estantes:', err);
      ESTANTES_CACHE = [];
      try { window.ESTANTES_CACHE = ESTANTES_CACHE; } catch (_) {}
      return ESTANTES_CACHE;
    });
}

function loadEstantesFromGoogleSheets() {
  return preloadEstantes();
}

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

// ===== Firestore helpers (Sesiones de inventario) =====
// Estructura:
//   tr_inventario_sessions/{sessionId}
// sessionId = ID único (string)
// Para filtrar por día: campo day = YYYY-MM-DD

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

let __FIREBASE_INIT_PROMISE__ = null;

async function ensureFirebaseInitialized() {
  try {
    if (typeof firebase === 'undefined' || !firebase.apps) {
      throw new Error('Firebase no está disponible en el cliente.');
    }
    if (firebase.apps.length) return true;

    if (!__FIREBASE_INIT_PROMISE__) {
      __FIREBASE_INIT_PROMISE__ = fetch('/api/firebase-config')
        .then(r => {
          if (!r.ok) throw new Error('No se pudo obtener firebase-config');
          return r.json();
        })
        .then(cfg => {
          if (!cfg || !cfg.apiKey || !cfg.projectId) {
            throw new Error('Configuración de Firebase incompleta.');
          }
          firebase.initializeApp(cfg);
          return true;
        })
        .catch(err => {
          console.error('Firebase init error:', err);
          throw err;
        });
    }
    await __FIREBASE_INIT_PROMISE__;
    return true;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getFirestoreDb() {
  await ensureFirebaseInitialized();
  if (!firebase.firestore) throw new Error('Firestore no está disponible.');
  return firebase.firestore();
}

function getServerTimestamp() {
  try { return firebase.firestore.FieldValue.serverTimestamp(); }
  catch (_) { return new Date().toISOString(); }
}

async function createInventorySession(sessionId, payload) {
  const db = await getFirestoreDb();
  const ref = db.collection('tr_inventario_sessions').doc(String(sessionId));
  await ref.set(payload || {}, { merge: true });
  return { ok: true, sessionId };
}

async function updateInventorySession(sessionId, payload) {
  const db = await getFirestoreDb();
  const ref = db.collection('tr_inventario_sessions').doc(String(sessionId));
  await ref.set(payload || {}, { merge: true });
  return { ok: true, sessionId };
}

async function loadInventorySession(sessionId) {
  if (!sessionId) return null;
  const db = await getFirestoreDb();
  try {
    const doc = await db.collection('tr_inventario_sessions').doc(String(sessionId)).get();
    return doc.exists ? (doc.data() || null) : null;
  } catch (err) {
    console.error('Error al leer sesión:', err);
    return null;
  }
}

async function listSessionsByDay(tienda, day) {
  // NOTE: evitamos índices compuestos consultando solo por 'day' y ordenando en cliente.
  const db = await getFirestoreDb();
  try {
    const snap = await db.collection('tr_inventario_sessions')
      .where('day', '==', String(day))
      .get();

    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));

    // Si existe el campo tienda, filtramos aquí (sin índice compuesto)
    const filtered = tienda ? rows.filter(x => !x.tienda || String(x.tienda) === String(tienda)) : rows;

    // Orden: más reciente primero (createdAtClient -> updatedAtClient -> id)
    filtered.sort((a, b) => {
      const ta = a.createdAtClient || a.updatedAtClient || '';
      const tb = b.createdAtClient || b.updatedAtClient || '';
      if (ta < tb) return 1;
      if (ta > tb) return -1;
      return String(b.id).localeCompare(String(a.id));
    });

    return filtered;
  } catch (err) {
    console.error('Error al listar sesiones por día:', err);
    return [];
  }
}

async function getHistoryDays(tienda, limit = 500) {
  // NOTE: evitamos índices compuestos consultando por orden de 'day' sin filtros
  // y deduplicando/filtrando en cliente.
  const db = await getFirestoreDb();
  try {
    let q = db.collection('tr_inventario_sessions').orderBy('day', 'desc');
    const snap = await q.limit(limit).get();

    const days = new Set();
    snap.docs.forEach(d => {
      const data = d.data() || {};
      if (!data.day) return;
      if (tienda && data.tienda && String(data.tienda) !== String(tienda)) return;
      days.add(String(data.day));
    });
    return Array.from(days);
  } catch (err) {
    console.error('Error al obtener días con historial:', err);
    return [];
  }
}
