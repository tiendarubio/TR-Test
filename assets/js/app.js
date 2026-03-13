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

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getHistoryDatesCacheKey(docId) {
  return `trlista:history-dates:${docId || 'default'}`;
}

function readHistoryDatesCache(docId) {
  if (!docId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getHistoryDatesCacheKey(docId));
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(v => /^\d{4}-\d{2}-\d{2}$/.test(String(v)));
  } catch (_) {
    return [];
  }
}

function writeHistoryDatesCache(docId, values) {
  if (!docId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      getHistoryDatesCacheKey(docId),
      JSON.stringify(Array.from(new Set((values || []).filter(Boolean))).sort())
    );
  } catch (_) {}
}

function getChecklistCacheKey(docId, day) {
  return `trlista:checklist:${docId || 'default'}:${day || 'today'}`;
}

function cloneData(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch (_) {
    return value ?? {};
  }
}

function readChecklistCache(docId, day) {
  if (!docId || !day || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getChecklistCacheKey(docId, day));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeChecklistCache(docId, day, payload) {
  if (!docId || !day || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getChecklistCacheKey(docId, day), JSON.stringify(cloneData(payload || {})));
  } catch (_) {}
}

async function parseApiError(resp, fallbackMessage) {
  let data = null;
  let text = '';

  try {
    data = await resp.json();
  } catch (_) {
    try {
      text = await resp.text();
    } catch (_2) {}
  }

  const message =
    data?.error ||
    data?.details ||
    text ||
    fallbackMessage ||
    'Error inesperado del servidor.';

  return new Error(String(message));
}

async function saveChecklistToFirestore(docId, payload, dateStr) {
  if (!docId) {
    throw new Error('Documento no configurado para esta tienda/lista.');
  }

  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  const resp = await fetch('/api/checklist-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId, date: day, payload: payload || {} })
  });

  if (!resp.ok) {
    throw await parseApiError(resp, 'No se pudo guardar el checklist.');
  }

  const data = await resp.json().catch(() => ({}));
  if (!data?.ok) {
    throw new Error(data?.error || 'No se pudo guardar el checklist.');
  }

  writeChecklistCache(docId, day, payload || {});
  writeHistoryDatesCache(docId, [...readHistoryDatesCache(docId), day]);

  return { ok: true, day };
}

async function loadChecklistFromFirestore(docId, dateStr) {
  if (!docId) return {};

  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  try {
    const resp = await fetch(
      `/api/checklist-get?docId=${encodeURIComponent(docId)}&date=${encodeURIComponent(day)}`
    );

    if (!resp.ok) {
      throw await parseApiError(resp, 'No se pudo leer el checklist.');
    }

    const data = await resp.json().catch(() => ({}));
    if (!data?.ok) {
      throw new Error(data?.error || 'No se pudo leer el checklist.');
    }

    const record = (data?.data && typeof data.data === 'object') ? data.data : {};
    writeChecklistCache(docId, day, record);

    if (record && Array.isArray(record.items)) {
      writeHistoryDatesCache(docId, [...readHistoryDatesCache(docId), day]);
    }

    return record;
  } catch (err) {
    console.error('Error al leer checklist desde backend:', err);

    const cached = readChecklistCache(docId, day);
    if (cached) {
      const copy = cloneData(cached);
      copy.__fromCache = true;
      return copy;
    }

    throw err instanceof Error ? err : new Error(String(err || 'No se pudo leer el checklist.'));
  }
}

async function getHistoryDates(docId) {
  if (!docId) return [];

  try {
    const resp = await fetch(`/api/checklist-history?docId=${encodeURIComponent(docId)}`);
    if (!resp.ok) {
      throw await parseApiError(resp, 'No se pudo obtener el historial.');
    }

    const data = await resp.json().catch(() => ({}));
    const dates = Array.isArray(data?.dates) ? data.dates.filter(Boolean) : [];

    writeHistoryDatesCache(docId, dates);
    return dates;
  } catch (err) {
    console.error('Error al listar historial desde backend:', err);
    return readHistoryDatesCache(docId);
  }
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
