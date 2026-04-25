// app.js — Config & helpers para TRLista (Vercel)

const DEFAULT_TIME_ZONE = 'America/El_Salvador';

const LIST_LABELS = Object.freeze({
  base: 'Principal',
  alterna: 'Alterna',
  traslado: 'Traslado'
});

// Identificadores lógicos por tienda/lista — se reutilizan como docId en Firestore
const STORE_BINS = {
  lista_sexta_calle: {
    base: '68c5b46ed0ea881f407ce556',
    alterna: '69174e9943b1c97be9ad5f6b',
    traslado: 'traslado_sexta_calle'
  },
  lista_centro_comercial: {
    base: '68c5b4add0ea881f407ce586',
    alterna: '69174eb7d0ea881f40e85786',
    traslado: 'traslado_centro_comercial'
  },
  lista_avenida_morazan: {
    base: '68c5b4e043b1c97be941f83f',
    alterna: '69174e1ad0ea881f40e8565f',
    traslado: 'traslado_avenida_morazan'
  }
};

function getStoreConfig(storeKey) {
  return STORE_BINS[storeKey] || null;
}

function getBinId(storeKey, versionKey = 'base') {
  const rec = getStoreConfig(storeKey);
  if (!rec) return null;
  return rec[versionKey] ?? null;
}

function getStoreVersions(storeKey) {
  const rec = getStoreConfig(storeKey);
  if (!rec) return [];
  return Object.entries(rec)
    .filter(([, docId]) => !!docId)
    .map(([versionKey]) => versionKey);
}

function getListLabel(versionKey) {
  return LIST_LABELS[versionKey] || versionKey;
}

const PROTECTED_VERSION_KEYS = ['traslado'];

function isProtectedVersionKey(versionKey) {
  return PROTECTED_VERSION_KEYS.includes(versionKey);
}

let CATALOGO_CACHE = null;

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
    .catch(e => {
      console.error('Sheets catálogo error:', e);
      CATALOGO_CACHE = [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    });
}

function loadProductsFromGoogleSheets() {
  return preloadCatalog();
}

// === Firestore helpers (histórico por día) ===
// Estructura (igual patrón que TR-Inventario):
//   tr_lista/{docId}/historial/{YYYY-MM-DD}
let FIRESTORE_DB = null;

function getFirestoreDb() {
  if (FIRESTORE_DB) return FIRESTORE_DB;

  if (typeof firebase === 'undefined' || !firebase.firestore) {
    throw new Error('Firebase/Firestore no está disponible.');
  }

  const db = firebase.firestore();

  try {
    db.settings({
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: { timeoutSeconds: 25 },
      useFetchStreams: false,
      merge: true
    });
  } catch (err) {
    console.warn('Firestore settings omitidas:', err?.message || err);
  }

  FIRESTORE_DB = db;
  return FIRESTORE_DB;
}

function getTodayString(timeZone = DEFAULT_TIME_ZONE) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const map = Object.fromEntries(
      parts
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );

    if (map.year && map.month && map.day) {
      return `${map.year}-${map.month}-${map.day}`;
    }
  } catch (err) {
    console.warn('No se pudo resolver la fecha local con Intl:', err?.message || err);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function saveChecklistToFirestore(docId, payload, dateStr) {
  if (!docId) {
    return Promise.reject(new Error('Documento no configurado para esta tienda/lista.'));
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }

  const db  = getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  return db
    .collection('tr_lista')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .set(payload || {}, { merge: true })
    .then(() => ({ ok: true, day }))
    .catch(err => {
      console.error('Error al guardar en Firestore:', err);
      throw err;
    });
}

function loadChecklistFromFirestore(docId, dateStr) {
  if (!docId) return Promise.resolve({});
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }

  const db  = getFirestoreDb();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  return db
    .collection('tr_lista')
    .doc(String(docId))
    .collection('historial')
    .doc(day)
    .get()
    .then(doc => (doc.exists ? (doc.data() || {}) : {}))
    .catch(err => {
      console.error('Error al leer Firestore:', err);
      return {};
    });
}

function getHistoryDates(docId) {
  if (!docId) return Promise.resolve([]);

  const db = getFirestoreDb();
  return db
    .collection('tr_lista')
    .doc(String(docId))
    .collection('historial')
    .get()
    .then(snap => snap.docs.map(d => d.id))
    .catch(err => {
      console.error('Error al listar historial en Firestore:', err);
      throw err;
    });
}

// Formatear fecha/hora a formato ES-SV
function formatSV(iso) {
  if (!iso) return 'Aún no guardado.';
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Aún no guardado.';
  }
}


const TRLISTA_APP_API = Object.freeze({
  constants: Object.freeze({
    DEFAULT_TIME_ZONE,
    LIST_LABELS,
    STORE_BINS,
    PROTECTED_VERSION_KEYS
  }),
  getStoreConfig,
  getBinId,
  getStoreVersions,
  getListLabel,
  isProtectedVersionKey,
  preloadCatalog,
  loadProductsFromGoogleSheets,
  getFirestoreDb,
  getTodayString,
  saveChecklistToFirestore,
  loadChecklistFromFirestore,
  getHistoryDates,
  formatSV
});

try {
  window.TRListaApp = TRLISTA_APP_API;

  // Compatibilidad hacia atrás durante la refactorización progresiva.
  window.STORE_BINS = STORE_BINS;
  window.PROTECTED_VERSION_KEYS = PROTECTED_VERSION_KEYS;
  window.getStoreConfig = getStoreConfig;
  window.getBinId = getBinId;
  window.getStoreVersions = getStoreVersions;
  window.getListLabel = getListLabel;
  window.isProtectedVersionKey = isProtectedVersionKey;
  window.preloadCatalog = preloadCatalog;
  window.loadProductsFromGoogleSheets = loadProductsFromGoogleSheets;
  window.getFirestoreDb = getFirestoreDb;
  window.getTodayString = getTodayString;
  window.saveChecklistToFirestore = saveChecklistToFirestore;
  window.loadChecklistFromFirestore = loadChecklistFromFirestore;
  window.getHistoryDates = getHistoryDates;
  window.formatSV = formatSV;
} catch (_) {}
