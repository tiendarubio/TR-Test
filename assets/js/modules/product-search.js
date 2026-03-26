(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createProductSearch = function createProductSearch(options) {
    const {
      searchInput,
      suggestions,
      loadProducts,
      onItemSelected,
      buildItemFromCatalogRow
    } = options || {};

    if (!searchInput || !suggestions || typeof loadProducts !== 'function' || typeof onItemSelected !== 'function') {
      return null;
    }

    let currentFocus = -1;

    function clear() {
      suggestions.innerHTML = '';
      currentFocus = -1;
      searchInput.value = '';
    }

    function clearSuggestions() {
      suggestions.innerHTML = '';
      currentFocus = -1;
    }

    function addActive(items) {
      if (!items || !items.length) return;
      [...items].forEach(x => x.classList.remove('active'));
      if (currentFocus >= items.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items[currentFocus].classList.add('active');
      items[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    async function renderSuggestions(query) {
      const q = String(query || '').replace(/\r|\n/g, '').trim().toLowerCase();
      clearSuggestions();
      if (!q) return;

      const rows = await loadProducts();
      rows
        .filter(r => {
          const n = (r[0] || '').toLowerCase();
          const cod = (r[1] || '').toLowerCase();
          const bod = (r[2] || '').toLowerCase();
          const bar = (r[3] || '').toLowerCase();
          return n.includes(q) || cod.includes(q) || bod.includes(q) || bar.includes(q);
        })
        .slice(0, 50)
        .forEach(r => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          const nombre = r[0] || '';
          const codInv = r[1] || 'N/A';
          const bodega = r[2] || '';
          const barcode = r[3] || 'sin código';
          li.textContent = `${nombre} (${barcode}) [${codInv}] — ${bodega}`;
          li.addEventListener('click', async () => {
            await onItemSelected(buildItemFromCatalogRow(r));
          });
          suggestions.appendChild(li);
        });
    }

    async function handleExactMatchSelection(rawQuery) {
      const q = String(rawQuery || '').replace(/\r|\n/g, '').trim();
      if (!q) return;

      const rows = global.CATALOGO_CACHE || await loadProducts();
      let match = null;

      for (const r of rows) {
        const bar = r[3] ? String(r[3]).trim() : '';
        const cod = r[1] ? String(r[1]).trim() : '';
        if (bar === q || cod === q) {
          match = r;
          break;
        }
      }

      if (match) {
        await onItemSelected(buildItemFromCatalogRow(match, q));
      }
    }

    function bind() {
      searchInput.addEventListener('input', async () => {
        await renderSuggestions(searchInput.value);
      });

      searchInput.addEventListener('keydown', async (e) => {
        const items = suggestions.getElementsByTagName('li');

        if (e.key === 'ArrowDown') {
          currentFocus += 1;
          addActive(items);
          return;
        }

        if (e.key === 'ArrowUp') {
          currentFocus -= 1;
          addActive(items);
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          if (currentFocus > -1 && items[currentFocus]) {
            items[currentFocus].click();
            return;
          }
          await handleExactMatchSelection(searchInput.value);
        }
      });

      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target === searchInput || suggestions.contains(target)) return;
        clearSuggestions();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearSuggestions();
        }
      });
    }

    bind();

    return {
      clear,
      focus() {
        searchInput.focus();
      }
    };
  };
})(window);
