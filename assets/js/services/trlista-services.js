(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createAppServices = function createAppServices() {
    const app = global.TRListaApp || {};

    function requireMethod(name) {
      const fn = app[name];
      if (typeof fn !== 'function') {
        throw new Error('TRListaApp.' + name + ' no está disponible.');
      }
      return fn;
    }

    return {
      getBinId: typeof app.getBinId === 'function' ? app.getBinId : () => null,
      getStoreVersions: typeof app.getStoreVersions === 'function' ? app.getStoreVersions : () => [],
      getListLabel: typeof app.getListLabel === 'function' ? app.getListLabel : (value) => value,
      preloadCatalog: typeof app.preloadCatalog === 'function' ? app.preloadCatalog : (() => Promise.resolve([])),
      loadProductsFromGoogleSheets: typeof app.loadProductsFromGoogleSheets === 'function'
        ? app.loadProductsFromGoogleSheets
        : (() => Promise.resolve([])),
      getTodayString: typeof app.getTodayString === 'function'
        ? app.getTodayString
        : (() => new Date().toISOString().split('T')[0]),
      saveChecklistToFirestore: requireMethod('saveChecklistToFirestore'),
      loadChecklistFromFirestore: requireMethod('loadChecklistFromFirestore'),
      getHistoryDates: requireMethod('getHistoryDates'),
      formatSV: typeof app.formatSV === 'function' ? app.formatSV : (() => 'Aún no guardado.'),
      async validateHistoricalPassword(password) {
        const resp = await fetch('/api/validate-historical-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          throw new Error(data.error || 'No se pudo validar la contraseña.');
        }

        return !!data.ok;
      }
    };
  };
})(window);
