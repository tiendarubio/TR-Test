// assets/js/app.js — Helpers para TRInventario (Vercel) usando Firestore + Google Sheets

// Cache de catálogo y proveedores
let CATALOGO_CACHE = null;
let ESTANTES_CACHE = null;
let PROVIDERS_CACHE = null;

// --- Catálogo de productos (Google Sheets -> /api/catalogo) ---
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

function loadProductsFromGoogleSheets() {
  return preloadCatalog();
}

// --- Opciones de inventario (sheet "estantes" -> /api/estantes) ---
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

function loadEstantesFromGoogleSheets() {
  return preloadEstantes();
}

// --- Proveedores (Google Sheets -> /api/proveedores) ---
function preloadProviders() {
  if (PROVIDERS_CACHE) return Promise.resolve(PROVIDERS_CACHE);

  return fetch('/api/proveedores')
    .then(r => {
      if (!r.ok) throw new Error('Error proveedores: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      const list = Array.isArray(data.providers) ? data.providers : [];
      PROVIDERS_CACHE = list;
      return PROVIDERS_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar proveedores:', err);
      PROVIDERS_CACHE = [];
      return PROVIDERS_CACHE;
    });
}

function loadProvidersFromGoogleSheets() {
  return preloadProviders();
}

// ===== Firestore helpers (mismo patrón que TRLista2.0) =====
// Estructura:
//   tr_inventario/{docId}/historial/{YYYY-MM-DD}
// docId = binId original (para no romper lógica/IDs)
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function newSessionId() {
  try {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (_) {}
  // fallback
  return 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
}

// === Firestore helpers (histórico por día + sesiones) ===
// Estructura:
//   tr_inventario/{docId}/historial/{YYYY-MM-DD}                -> índice/resumen
//   tr_inventario/{docId}/historial/{YYYY-MM-DD}/sesiones/{id}  -> payload completo

function saveInventorySessionToFirestore(docId, sessionId, payload, dateStr) {
  if (!docId) {
    return Promise.reject(new Error('Documento no configurado para este inventario.'));
  }
  if (!sessionId) {
    return Promise.reject(new Error('Sesión no iniciada.'));
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }

  const db  = firebase.firestore();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();
  const nowIso = new Date().toISOString();

  const sessionRef = db
    .collection('tr_inventario')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .collection('sesiones')
    .doc(String(sessionId));

  const indexRef = db
    .collection('tr_inventario')
    .doc(String(docId))
    .collection('historial')
    .doc(day);

  const safePayload = payload || {};
  safePayload.updatedAt = nowIso;
  if (safePayload.meta && typeof safePayload.meta === 'object') {
    safePayload.meta.updatedAt = nowIso;
  }

  // Guardamos el payload completo en la sesión, y un índice ligero por día
  return sessionRef
    .set(safePayload, { merge: true })
    .then(() => {
      const idx = {
        updatedAt: nowIso,
        lastSessionId: String(sessionId)
      };
      // índice de sesiones (rápido de leer para el calendario)
      const meta = (safePayload.meta && typeof safePayload.meta === 'object') ? safePayload.meta : {};
      const tot = (safePayload.totales && typeof safePayload.totales === 'object') ? safePayload.totales : {};
      idx.sessions = {
        [String(sessionId)]: {
          updatedAt: nowIso,
          finalizado: !!meta.finalizado,
          tipo: meta.tipo || '',
          ubicacion: meta.ubicacion || '',
          sala_venta: meta.sala_venta || '',
          estante: meta.estante || '',
          dependiente: meta.dependiente || '',
          hoja_inventario: meta.hoja_inventario || '',
          lineas: tot.lineas ?? null,
          cantidad_total: tot.cantidad_total ?? null
        }
      };
      return indexRef.set(idx, { merge: true });
    })
    .then(() => ({ ok: true, day, sessionId: String(sessionId) }))
    .catch(err => {
      console.error('Error al guardar sesión en Firestore:', err);
      throw err;
    });
}

function loadInventorySessionFromFirestore(docId, sessionId, dateStr) {
  if (!docId || !sessionId) return Promise.resolve({});
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }
  const db  = firebase.firestore();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();
  return db
    .collection('tr_inventario')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .collection('sesiones')
    .doc(String(sessionId))
    .get()
    .then(doc => (doc.exists ? (doc.data() || {}) : {}))
    .catch(err => {
      console.error('Error al leer sesión Firestore:', err);
      return {};
    });
}

function loadLatestInventorySessionForDay(docId, dateStr) {
  if (!docId) return Promise.resolve({});
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }
  const db  = firebase.firestore();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();
  return db
    .collection('tr_inventario')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .collection('sesiones')
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
    .then(snap => {
      const doc = snap.docs && snap.docs[0];
      return doc ? (doc.data() || {}) : {};
    })
    .catch(err => {
      console.error('Error al leer última sesión del día:', err);
      return {};
    });
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

async function saveInventoryToFirestore(docId, payload, dateStr) {
  if (!docId) throw new Error('Documento no configurado para esta hoja.');
  const db = await getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  await db
    .collection('tr_inventario')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .set(payload || {}, { merge: true });

  return { ok: true, day };
}

async function loadInventoryFromFirestore(docId, dateStr) {
  if (!docId) return {};
  const db = await getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  try {
    const doc = await db
      .collection('tr_inventario')
      .doc(String(docId))
      .collection('historial')
      .doc(day)
      .get();

    return doc.exists ? (doc.data() || {}) : {};
  } catch (err) {
    console.error('Error al leer Firestore:', err);
    return {};
  }
}

// Fallback: cargar el registro más reciente disponible (para no "romper" la UX si hoy está vacío)

async function getHistoryDates(docId) {
  if (!docId) return [];
  try {
    const db = await getFirestoreDb();
    const snap = await db
      .collection('tr_inventario')
      .doc(String(docId))
      .collection('historial')
      .get();

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
    const snap = await db
      .collection('tr_inventario')
      .doc(String(docId))
      .collection('historial')
      .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
      .limit(1)
      .get();

    if (!snap || snap.empty) return {};
    const d = snap.docs[0];
    return d && d.exists ? (d.data() || {}) : {};
  } catch (err) {
    console.error('Error al cargar último registro Firestore:', err);
    return {};
  }
}