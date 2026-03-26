(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createStoreUI = function createStoreUI(options) {
    const {
      storeSelect,
      storeBadge,
      storeBadgeText
    } = options || {};

    function update() {
      if (!storeSelect || !storeBadge || !storeBadgeText) return;

      const val = storeSelect.value;
      const storeShell = storeSelect.closest('.store-select-shell');

      storeBadge.classList.remove('badge-sexta', 'badge-morazan', 'badge-centro');
      if (storeShell) {
        storeShell.classList.remove('store-tone-sexta', 'store-tone-morazan', 'store-tone-centro');
      }

      if (val === 'lista_sexta_calle') {
        storeBadge.classList.add('badge-sexta');
        storeBadgeText.textContent = 'Sexta Calle';
        if (storeShell) storeShell.classList.add('store-tone-sexta');
        return;
      }

      if (val === 'lista_avenida_morazan') {
        storeBadge.classList.add('badge-morazan');
        storeBadgeText.textContent = 'Avenida Morazán';
        if (storeShell) storeShell.classList.add('store-tone-morazan');
        return;
      }

      storeBadge.classList.add('badge-centro');
      storeBadgeText.textContent = 'Centro Comercial';
      if (storeShell) storeShell.classList.add('store-tone-centro');
    }

    return { update };
  };
})(window);
