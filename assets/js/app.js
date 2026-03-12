// app.js — Config & helpers para TRLista (Vercel)

// BINS por tienda (principal y alterna) — se reutilizan como docId en Firestore
const STORE_BINS = {
  lista_sexta_calle:      { base:'68c5b46ed0ea881f407ce556', alterna:'69174e9943b1c97be9ad5f6b' },
  lista_centro_comercial: { base:'68c5b4add0ea881f407ce586', alterna:'69174eb7d0ea881f40e85786' },
  lista_avenida_morazan:  { base:'68c5b4e043b1c97be941f83f', alterna:'69174e1ad0ea881f40e8565f' }
};

function getBinId(storeKey, versionKey = 'base') {
  const rec = STORE_BINS[storeKey];
  if (!rec) return null;
  return rec[versionKey] || rec.base;
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
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function saveChecklistToFirestore(docId, payload, dateStr) {
  if (!docId) {
    return Promise.reject(new Error('Documento no configurado para esta tienda/lista.'));
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }

  const db  = firebase.firestore();
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

  const db  = firebase.firestore();
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
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }

  const db = firebase.firestore();
  return db
    .collection('tr_lista')
    .doc(String(docId))
    .collection('historial')
    .get()
    .then(snap => snap.docs.map(d => d.id))
    .catch(err => {
      console.error('Error al listar historial en Firestore:', err);
      return [];
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
