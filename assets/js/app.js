// app.js — Config & helpers para TRLista (Vercel)

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

function getBinId(storeKey, versionKey = 'base') {
  const rec = STORE_BINS[storeKey];
  if (!rec) return null;
  return rec[versionKey] ?? null;
}

function getStoreVersions(storeKey) {
  const rec = STORE_BINS[storeKey];
  if (!rec) return [];
  return Object.entries(rec)
    .filter(([versionKey, docId]) => !!docId && versionKey !== 'traslado')
    .map(([versionKey]) => versionKey);
}

const STORE_LABELS = {
  lista_sexta_calle: 'Sexta Calle',
  lista_avenida_morazan: 'Avenida Morazán',
  lista_centro_comercial: 'Centro Comercial'
};

function getStoreLabel(storeKey) {
  return STORE_LABELS[storeKey] || storeKey || 'Tienda';
}

function getStoreKeyForDocId(docId) {
  const value = String(docId || '');
  if (!value) return null;

  for (const [storeKey, versions] of Object.entries(STORE_BINS)) {
    if (Object.values(versions || {}).some(id => String(id || '') === value)) {
      return storeKey;
    }
  }

  return null;
}

function getCurrentTRAccess() {
  const auth = window.TRAuth || null;
  return {
    authorized: !!auth?.isAuthorized?.(),
    role: String(auth?.getCurrentRole?.() || 'sin_acceso').trim().toLowerCase(),
    storeKey: String(auth?.getCurrentStoreKey?.() || '').trim() || null
  };
}

function validateChecklistDocAccess(docId, action = 'read') {
  const access = getCurrentTRAccess();
  const targetStoreKey = getStoreKeyForDocId(docId);
  const isProtected = String(docId || '').startsWith('traslado_');

  if (!docId) {
    throw new Error('Documento no configurado para esta tienda/lista.');
  }

  if (!access.authorized) {
    throw new Error('Debes iniciar sesión para usar esta lista.');
  }

  if (access.role === 'admin' || access.role === 'supervisor') {
    return true;
  }

  if (access.role === 'operador') {
    if (!access.storeKey || !targetStoreKey || access.storeKey !== targetStoreKey) {
      throw new Error('Tu usuario solo puede usar la sucursal asignada: ' + getStoreLabel(access.storeKey) + '.');
    }

    if (isProtected) {
      throw new Error('La lista protegida no está disponible para usuarios de tienda.');
    }

    return true;
  }

  throw new Error('Tu usuario no tiene permisos para usar esta lista.');
}

function getListLabel(versionKey) {
  const labels = {
    base: 'Principal',
    alterna: 'Alterna',
    traslado: 'Traslado'
  };
  return labels[versionKey] || versionKey;
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

function getTodayString() {
  if (window.TRUtils?.getLocalDateString) {
    return window.TRUtils.getLocalDateString(new Date());
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function saveChecklistToFirestore(docId, payload, dateStr) {
  try {
    validateChecklistDocAccess(docId, 'write');
  } catch (accessError) {
    return Promise.reject(accessError);
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
  try {
    validateChecklistDocAccess(docId, 'read');
  } catch (accessError) {
    return Promise.reject(accessError);
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
    .get()
    .then(doc => (doc.exists ? (doc.data() || {}) : {}))
    .catch(err => {
      console.error('Error al leer Firestore:', err);
      return {};
    });
}

function getHistoryDates(docId) {
  try {
    validateChecklistDocAccess(docId, 'read');
  } catch (accessError) {
    return Promise.reject(accessError);
  }

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



// === Solicitudes enviadas a bodega ===
// Estructura:
//   requests/{storeKey}_{versionKey}_{YYYY-MM-DD}
// Cada solicitud guarda una copia congelada de los items enviados por la sucursal.
function normalizeRequestDocPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'sin_valor';
}

function getRequestId(storeKey, versionKey, day) {
  const requestDay = day || getTodayString();
  return [storeKey, versionKey || 'base', requestDay]
    .map(normalizeRequestDocPart)
    .join('__');
}

function validateRequestAccessForPayload(payload, action = 'read') {
  const access = getCurrentTRAccess();
  const storeKey = String(payload?.storeKey || '').trim();

  if (!access.authorized) {
    throw new Error('Debes iniciar sesión para usar solicitudes.');
  }

  if (access.role === 'admin' || access.role === 'supervisor') {
    return true;
  }

  if (access.role === 'operador') {
    if (!access.storeKey || !storeKey || access.storeKey !== storeKey) {
      throw new Error('Tu usuario solo puede usar solicitudes de la sucursal asignada: ' + getStoreLabel(access.storeKey) + '.');
    }

    if (action === 'status') {
      throw new Error('Solo bodega puede cambiar el estado de una solicitud enviada.');
    }

    return true;
  }

  throw new Error('Tu usuario no tiene permisos para usar solicitudes.');
}

function saveRequestToFirestore(requestId, payload) {
  try {
    validateRequestAccessForPayload(payload, 'write');
  } catch (accessError) {
    return Promise.reject(accessError);
  }

  const db = getFirestoreDb();
  return db
    .collection('requests')
    .doc(String(requestId))
    .set(payload || {}, { merge: true })
    .then(() => ({ ok: true, requestId }))
    .catch(err => {
      console.error('Error al guardar solicitud:', err);
      throw err;
    });
}

function loadRequestFromFirestore(requestId) {
  const db = getFirestoreDb();
  return db
    .collection('requests')
    .doc(String(requestId))
    .get()
    .then(doc => (doc.exists ? ({ id: doc.id, ...(doc.data() || {}) }) : null))
    .catch(err => {
      console.error('Error al leer solicitud:', err);
      throw err;
    });
}

function getRequestSortTimestamp(req) {
  return String(
    req?.submittedAt
    || req?.statusUpdatedAt
    || req?.lastWarehouseUpdateAt
    || req?.createdAt
    || req?.requestDate
    || ''
  );
}

function sortRequestsByMostRecent(rows = []) {
  return [...rows].sort((a, b) => {
    const byDate = getRequestSortTimestamp(b).localeCompare(getRequestSortTimestamp(a));
    if (byDate !== 0) return byDate;
    return String(b?.id || b?.requestId || '').localeCompare(String(a?.id || a?.requestId || ''));
  });
}

function listRequestsForCurrentAccess(options = {}) {
  const access = getCurrentTRAccess();
  if (!access.authorized) {
    return Promise.reject(new Error('Debes iniciar sesión para consultar solicitudes.'));
  }

  const db = getFirestoreDb();
  const requestedLimit = Math.max(1, Number(options.limit || 50));
  const fetchLimit = Math.min(Math.max(requestedLimit, Number(options.fetchLimit || requestedLimit)), 1000);
  let query = db.collection('requests');

  if (access.role === 'operador') {
    if (!access.storeKey) {
      return Promise.reject(new Error('Tu usuario no tiene sucursal asignada.'));
    }
    query = query.where('storeKey', '==', access.storeKey);
  }

  const canUseServerOrder = access.role === 'admin' || access.role === 'supervisor';
  const orderedQuery = canUseServerOrder ? query.orderBy('submittedAt', 'desc') : query;

  return orderedQuery
    .limit(fetchLimit)
    .get()
    .catch(err => {
      if (!canUseServerOrder) throw err;
      console.warn('No se pudo ordenar solicitudes por submittedAt; usando lectura sin orden como respaldo:', err);
      return query.limit(fetchLimit).get();
    })
    .then(snap => snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) })))
    .then(rows => sortRequestsByMostRecent(rows).slice(0, requestedLimit))
    .catch(err => {
      console.error('Error al listar solicitudes:', err);
      throw err;
    });
}


function listRequestDatesForCurrentAccess(options = {}) {
  return listRequestsForCurrentAccess({ limit: Number(options.limit || 500) })
    .then(rows => {
      let filtered = Array.isArray(rows) ? rows : [];
      const storeKey = String(options.storeKey || '').trim();
      const versionKey = String(options.versionKey || '').trim();

      if (storeKey && storeKey !== '__all__') {
        filtered = filtered.filter(req => String(req.storeKey || '') === storeKey);
      }

      if (versionKey && versionKey !== '__all__') {
        filtered = filtered.filter(req => String(req.versionKey || 'base') === versionKey);
      }

      return Array.from(new Set(filtered
        .map(req => String(req.requestDate || req.submittedAt || req.createdAt || '').slice(0, 10))
        .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
      )).sort();
    });
}

function updateRequestStatus(requestId, status, extra = {}) {
  const access = getCurrentTRAccess();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const canWarehouseChange = access.role === 'admin' || access.role === 'supervisor';
  const canBranchConfirmReceived = access.role === 'operador' && normalizedStatus === 'recibido';

  if (!canWarehouseChange && !canBranchConfirmReceived) {
    return Promise.reject(new Error('Solo bodega puede cambiar estados de solicitudes. Las sucursales solo pueden confirmar recibido.'));
  }

  const db = getFirestoreDb();
  return db
    .collection('requests')
    .doc(String(requestId))
    .set({
      status: normalizedStatus || status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedByUid: firebase.auth?.().currentUser?.uid || null,
      statusUpdatedByEmail: firebase.auth?.().currentUser?.email || null,
      ...extra
    }, { merge: true })
    .then(() => ({ ok: true, requestId, status: normalizedStatus || status }));
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


try {
  window.STORE_BINS = STORE_BINS;
  window.STORE_LABELS = STORE_LABELS;
  window.PROTECTED_VERSION_KEYS = PROTECTED_VERSION_KEYS;
  window.isProtectedVersionKey = isProtectedVersionKey;
  window.getStoreLabel = getStoreLabel;
  window.getStoreKeyForDocId = getStoreKeyForDocId;
  window.validateChecklistDocAccess = validateChecklistDocAccess;
  window.getRequestId = getRequestId;
  window.saveRequestToFirestore = saveRequestToFirestore;
  window.loadRequestFromFirestore = loadRequestFromFirestore;
  window.listRequestsForCurrentAccess = listRequestsForCurrentAccess;
  window.listRequestDatesForCurrentAccess = listRequestDatesForCurrentAccess;
  window.updateRequestStatus = updateRequestStatus;
} catch (_) {}
