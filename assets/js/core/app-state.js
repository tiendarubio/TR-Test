(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createAppState = function createAppState() {
    return {
      ui: {
        sortAsc: true,
        lastUpdateISO: null
      },
      scanner: {
        mediaStream: null,
        scanInterval: null,
        detector: null
      },
      history: {
        picker: null,
        currentViewDate: null,
        availableDates: new Set(),
        unlockEnabled: false
      }
    };
  };
})(window);
