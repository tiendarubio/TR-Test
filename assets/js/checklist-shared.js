(function (global) {
  'use strict';

  const APP_DEFAULT_LABELS = Object.freeze({
    base: 'Principal',
    alterna: 'Alterna',
    traslado: 'Traslado'
  });

  function createBridge(options = {}) {
    const storeSelect = options.storeSelect || null;
    const globalApi = global.TRListaApp || {};
    const storeBins = globalApi?.constants?.STORE_BINS || global.STORE_BINS || {};
    const protectedKeys = globalApi?.constants?.PROTECTED_VERSION_KEYS || global.PROTECTED_VERSION_KEYS || ['traslado'];

    const getFallbackTodayString = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatFallbackDateTime = (iso) => {
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
      } catch (_) {
        return 'Aún no guardado.';
      }
    };

    const api = {
      getBinId: typeof globalApi.getBinId === 'function'
        ? globalApi.getBinId.bind(globalApi)
        : ((storeKey, versionKey = 'base') => storeBins?.[storeKey]?.[versionKey] ?? null),
      getStoreVersions: typeof globalApi.getStoreVersions === 'function'
        ? globalApi.getStoreVersions.bind(globalApi)
        : ((storeKey) => Object.entries(storeBins?.[storeKey] || {})
            .filter(([, docId]) => !!docId)
            .map(([versionKey]) => versionKey)),
      getListLabel: typeof globalApi.getListLabel === 'function'
        ? globalApi.getListLabel.bind(globalApi)
        : ((versionKey) => APP_DEFAULT_LABELS[versionKey] || versionKey),
      isProtectedVersionKey: typeof globalApi.isProtectedVersionKey === 'function'
        ? globalApi.isProtectedVersionKey.bind(globalApi)
        : ((versionKey) => protectedKeys.includes(versionKey)),
      preloadCatalog: typeof globalApi.preloadCatalog === 'function'
        ? globalApi.preloadCatalog.bind(globalApi)
        : (() => Promise.resolve(Array.isArray(global.CATALOGO_CACHE) ? global.CATALOGO_CACHE : [])),
      saveChecklistToFirestore: typeof globalApi.saveChecklistToFirestore === 'function'
        ? globalApi.saveChecklistToFirestore.bind(globalApi)
        : (() => Promise.reject(new Error('saveChecklistToFirestore no está disponible.'))),
      loadChecklistFromFirestore: typeof globalApi.loadChecklistFromFirestore === 'function'
        ? globalApi.loadChecklistFromFirestore.bind(globalApi)
        : (() => Promise.resolve({})),
      getHistoryDates: typeof globalApi.getHistoryDates === 'function'
        ? globalApi.getHistoryDates.bind(globalApi)
        : (() => Promise.resolve([])),
      getTodayString: typeof globalApi.getTodayString === 'function'
        ? globalApi.getTodayString.bind(globalApi)
        : getFallbackTodayString,
      formatSV: typeof globalApi.formatSV === 'function'
        ? globalApi.formatSV.bind(globalApi)
        : formatFallbackDateTime
    };

    function getCurrentStoreName(fallback = 'Tienda') {
      return storeSelect?.options?.[storeSelect.selectedIndex]?.text?.trim() || fallback;
    }

    function sanitizeFileNamePart(value, fallback = 'NA') {
      const normalized = String(value || '').trim();
      if (!normalized) return fallback;
      return normalized.replace(/[^a-zA-Z0-9]/g, '_');
    }

    function downloadBlobFile(blobContent, fileName) {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blobContent);
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      global.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }

    function parseQuantityToInteger(quantityText) {
      const numericParts = String(quantityText || '').match(/\d+/g);
      return numericParts ? parseInt(numericParts.join(''), 10) : 0;
    }

    function htmlAttrEscape(value) {
      if (value === null || value === undefined) return '';
      return String(value).replace(/"/g, '&quot;');
    }

    function escapeHtml(value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getLocalDateKey() {
      return api.getTodayString();
    }

    return {
      getBinId: api.getBinId,
      getStoreVersions: api.getStoreVersions,
      getListLabel: api.getListLabel,
      isProtectedVersionKey: api.isProtectedVersionKey,
      preloadCatalog: api.preloadCatalog,
      saveChecklistToFirestore: api.saveChecklistToFirestore,
      loadChecklistFromFirestore: api.loadChecklistFromFirestore,
      getHistoryDates: api.getHistoryDates,
      getTodayString: api.getTodayString,
      formatSV: api.formatSV,
      getCurrentStoreName,
      sanitizeFileNamePart,
      downloadBlobFile,
      parseQuantityToInteger,
      htmlAttrEscape,
      escapeHtml,
      getLocalDateKey
    };
  }

  global.TRListaChecklistShared = Object.freeze({
    createBridge
  });
})(window);
