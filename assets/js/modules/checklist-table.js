(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createChecklistTable = function createChecklistTable(options) {
    const {
      body,
      searchInput,
      lastSaved,
      storeSelect,
      versionSelect,
      uiState,
      services,
      getTargetChecklistDate,
      getVersionLabel,
      isHistoricalEditingLocked,
      persistCurrentChecklist,
      refreshHistoryPicker
    } = options || {};

    if (!body || !searchInput || !lastSaved || !storeSelect || !versionSelect || !services) {
      return null;
    }

    function htmlAttrEscape(v) {
      if (v === null || v === undefined) return '';
      return String(v).replace(/"/g, '&quot;');
    }

    function escapeHtml(v) {
      if (v === null || v === undefined) return '';
      return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getRows() {
      return [...body.getElementsByTagName('tr')];
    }

    function renumber() {
      getRows().forEach((row, idx) => {
        row.cells[0].textContent = (body.rows.length - idx);
      });
    }

    function setToggleState(btn, shouldBeOn) {
      if (!btn) return;
      btn.classList.toggle('on', !!shouldBeOn);
      btn.classList.toggle('off', !shouldBeOn);
    }

    function toggleBtn(btn) {
      const on = btn.classList.contains('on');
      setToggleState(btn, !on);
    }

    function normalizeMatchValue(value) {
      return String(value || '').trim().toLowerCase();
    }

    function hasUsefulCode(value) {
      const normalized = normalizeMatchValue(value);
      return !!normalized && normalized !== 'n/a' && normalized !== 'na' && normalized !== 'sin código' && normalized !== 'sin codigo';
    }

    function buildItemFromCatalogRow(row, fallbackCode = '') {
      return {
        codigo_barras: row?.[3] || fallbackCode || '',
        nombre: row?.[0] || '',
        codigo_inventario: row?.[1] || 'N/A',
        bodega: row?.[2] || '',
        cantidad: '',
        revisado: false,
        despachado: false
      };
    }

    function findExistingRowByItem(item) {
      const barcode = normalizeMatchValue(item?.codigo_barras);
      const inventoryCode = normalizeMatchValue(item?.codigo_inventario);

      return getRows().find(tr => {
        const rowBarcode = normalizeMatchValue(tr.cells[1]?.innerText);
        const rowInventory = normalizeMatchValue(tr.cells[3]?.innerText);

        if (hasUsefulCode(barcode) && rowBarcode === barcode) return true;
        if (hasUsefulCode(inventoryCode) && rowInventory === inventoryCode) return true;
        return false;
      }) || null;
    }

    function flashAndFocusRow(tr, preferredTarget = 'qty') {
      if (!tr) return;

      tr.classList.remove('row-existing-highlight');
      void tr.offsetWidth;
      tr.classList.add('row-existing-highlight');

      window.setTimeout(() => {
        tr.classList.remove('row-existing-highlight');
      }, 3800);

      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });

      window.setTimeout(() => {
        const qtyInput = tr.querySelector('.qty');
        const dispatchBtn = tr.cells[7]?.querySelector('button');
        const reviewBtn = tr.cells[6]?.querySelector('button');
        const focusTarget =
          (preferredTarget === 'dispatch' ? dispatchBtn : null) ||
          qtyInput ||
          dispatchBtn ||
          reviewBtn ||
          tr;

        if (focusTarget === tr) {
          tr.setAttribute('tabindex', '-1');
        }

        try {
          focusTarget.focus({ preventScroll: true });
        } catch (_) {
          try { focusTarget.focus(); } catch (_) {}
        }
      }, 220);
    }

    function ensureRowDispatched(tr) {
      const btnDes = tr?.cells?.[7]?.querySelector('button');
      if (!btnDes) return false;

      const wasDispatched = btnDes.classList.contains('on');
      if (!wasDispatched) {
        setToggleState(btnDes, true);
      }
      return !wasDispatched;
    }

    function updateLastSavedText(updatedAt, emptyText = 'Aún no guardado.') {
      uiState.lastUpdateISO = updatedAt || null;
      lastSaved.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
        (uiState.lastUpdateISO ? ('Última actualización: ' + services.formatSV(uiState.lastUpdateISO)) : emptyText);
    }

    function clearRows() {
      body.innerHTML = '';
      renumber();
    }

    function renderRows(items = []) {
      clearRows();
      (items || []).forEach(addRowFromData);
      renumber();
    }

    function setRowsDisabled(disabled) {
      getRows().forEach(tr => {
        const qty = tr.querySelector('.qty');
        const btnRev = tr.cells[6]?.querySelector('button');
        const btnDes = tr.cells[7]?.querySelector('button');
        const btnMove = tr.querySelector('.btn-move-list');
        const btnDel = tr.querySelector('.btn-delete-row');

        if (qty) qty.disabled = disabled;
        if (btnRev) btnRev.disabled = disabled;
        if (btnDes) btnDes.disabled = disabled;
        if (btnMove) btnMove.disabled = disabled;
        if (btnDel) btnDel.disabled = disabled;
      });
    }

    function collectPayload() {
      const tiendaKey = storeSelect.value;
      const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
      const versionKey = versionSelect.value;

      const items = getRows().map(tr => ({
        codigo_barras: tr.cells[1].innerText.trim(),
        nombre: tr.cells[2].innerText.trim(),
        codigo_inventario: tr.cells[3].innerText.trim(),
        bodega: tr.cells[4].innerText.trim(),
        cantidad: (tr.querySelector('.qty')?.value || '').trim(),
        revisado: tr.cells[6].querySelector('button').classList.contains('on'),
        despachado: tr.cells[7].querySelector('button').classList.contains('on')
      }));

      return {
        meta: {
          tienda_key: tiendaKey,
          tienda: tiendaName,
          version: versionKey,
          version_label: getVersionLabel(versionKey),
          updatedAt: new Date().toISOString()
        },
        items
      };
    }

    async function moveRowToAnotherList(tr) {
      try {
        if (typeof isHistoricalEditingLocked === 'function' && isHistoricalEditingLocked()) {
          await Swal.fire(
            'Vista histórica',
            'Para mover productos, desbloquea los controles o vuelve al día actual.',
            'info'
          );
          return;
        }

        const storeKey = storeSelect.value;
        const fromKey = versionSelect.value;
        const destinationKeys = services.getStoreVersions(storeKey).filter(versionKey => versionKey !== fromKey);

        if (!destinationKeys.length) {
          await Swal.fire(
            'Configuración incompleta',
            'No hay otra lista disponible como destino para esta tienda.',
            'error'
          );
          return;
        }

        const destinationOptions = Object.fromEntries(
          destinationKeys.map(versionKey => [versionKey, getVersionLabel(versionKey)])
        );

        const selection = await Swal.fire({
          title: 'Mover producto',
          input: 'select',
          inputOptions: destinationOptions,
          inputPlaceholder: 'Selecciona la lista destino',
          showCancelButton: true,
          confirmButtonText: 'Mover',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => {
            if (!value) return 'Debes seleccionar una lista destino.';
            if (value === fromKey) return 'Debes seleccionar una lista distinta.';
            return undefined;
          }
        });

        if (!selection.isConfirmed) return;

        const toKey = selection.value;
        const fromDoc = services.getBinId(storeKey, fromKey);
        const toDoc = services.getBinId(storeKey, toKey);

        if (!fromDoc || !toDoc) {
          await Swal.fire(
            'Configuración incompleta',
            'No se encontró el identificador de la lista origen o destino para esta tienda.',
            'error'
          );
          return;
        }

        const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
        const item = {
          codigo_barras: tr.cells[1].innerText.trim(),
          nombre: tr.cells[2].innerText.trim(),
          codigo_inventario: tr.cells[3].innerText.trim(),
          bodega: tr.cells[4].innerText.trim(),
          cantidad: (tr.querySelector('.qty')?.value || '').trim(),
          revisado: tr.cells[6].querySelector('button').classList.contains('on'),
          despachado: tr.cells[7].querySelector('button').classList.contains('on')
        };

        const day = typeof getTargetChecklistDate === 'function' ? getTargetChecklistDate() : services.getTodayString();
        let destRec = await services.loadChecklistFromFirestore(toDoc, day);

        if (!destRec || !Array.isArray(destRec.items)) {
          destRec = {
            meta: {
              tienda_key: storeKey,
              tienda: tiendaName,
              version: toKey,
              version_label: getVersionLabel(toKey),
              updatedAt: null
            },
            items: []
          };
        }

        destRec.items.push(item);
        destRec.meta = destRec.meta || {};
        destRec.meta.tienda_key = storeKey;
        destRec.meta.tienda = tiendaName;
        destRec.meta.version = toKey;
        destRec.meta.version_label = getVersionLabel(toKey);
        destRec.meta.updatedAt = new Date().toISOString();

        await services.saveChecklistToFirestore(toDoc, destRec, day);

        tr.remove();
        renumber();

        const payloadFrom = collectPayload();
        await services.saveChecklistToFirestore(fromDoc, payloadFrom, day);

        updateLastSavedText(payloadFrom.meta.updatedAt);
        if (typeof refreshHistoryPicker === 'function') {
          await refreshHistoryPicker();
        }

        await Swal.fire(
          'Movimiento realizado',
          'El producto se movió a la lista ' + getVersionLabel(toKey) + ' de esta tienda.',
          'success'
        );
      } catch (err) {
        console.error(err);
        await Swal.fire('Error', 'No se pudo mover el producto entre listas. Intenta de nuevo.', 'error');
      }
    }

    function addRowFromData(item) {
      const tr = document.createElement('tr');
      const qtyValue = htmlAttrEscape(item.cantidad ?? '');
      tr.innerHTML = `
        <td></td>
        <td>${item.codigo_barras || ''}</td>
        <td>${item.nombre || ''}</td>
        <td>${item.codigo_inventario || 'N/A'}</td>
        <td>${item.bodega || ''}</td>
        <td>
          <input type="text" class="form-control form-control-sm qty" value="${qtyValue}" placeholder="0">
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary btn-toggle ${item.revisado ? 'on' : 'off'}" title="Revisado">
            <i class="fa-solid fa-clipboard-check"></i>
          </button>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-success btn-toggle ${item.despachado ? 'on' : 'off'}" title="Despachado">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </button>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-warning btn-move-list" title="Mover a otra lista" aria-label="Mover a otra lista">
              <i class="fa-solid fa-right-left"></i>
            </button>
            <button class="btn btn-outline-secondary btn-delete-row" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      body.insertBefore(tr, body.firstChild);
      renumber();

      const btnRev = tr.cells[6].querySelector('button');
      const btnDes = tr.cells[7].querySelector('button');
      const btnMove = tr.cells[8].querySelector('.btn-move-list');
      const btnDel = tr.cells[8].querySelector('.btn-delete-row');

      btnRev.addEventListener('click', () => toggleBtn(btnRev));
      btnDes.addEventListener('click', () => toggleBtn(btnDes));

      if (btnMove) {
        btnMove.addEventListener('click', async () => {
          await moveRowToAnotherList(tr);
        });
      }

      if (btnDel) {
        btnDel.addEventListener('click', () => {
          Swal.fire({
            title: '¿Eliminar ítem?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar'
          }).then(res => {
            if (res.isConfirmed) {
              tr.remove();
              renumber();
            }
          });
        });
      }

      const qtyInput = tr.querySelector('.qty');
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            searchInput.focus();
          }
        });
      }

      return tr;
    }

    async function promptExistingRowAction(item, existingRow) {
      const isAlreadyDispatched = existingRow?.cells?.[7]?.querySelector('button')?.classList.contains('on');
      const safeName = escapeHtml(item?.nombre || 'Este producto');
      let selectedAction = 'cancel';

      await Swal.fire({
        title: 'Producto ya agregado',
        html: `
          <div class="text-start small text-muted mb-3">
            <strong>${safeName}</strong> ya existe en la lista actual. ¿Qué deseas hacer?
          </div>
          <div class="d-grid gap-2 existing-item-actions">
            <button type="button" class="btn btn-primary" data-action="locate">
              <i class="fa-solid fa-location-crosshairs me-1"></i>
              Ubicarme en esa fila
            </button>
            <button type="button" class="btn btn-success" data-action="dispatch" ${isAlreadyDispatched ? 'disabled' : ''}>
              <i class="fa-solid fa-truck-ramp-box me-1"></i>
              ${isAlreadyDispatched ? 'Ya está marcado como despachado' : 'Marcarlo como despachado y guardar'}
            </button>
            <button type="button" class="btn btn-outline-secondary" data-action="duplicate">
              <i class="fa-solid fa-plus me-1"></i>
              Agregar otra fila de todas formas
            </button>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        focusCancel: true,
        didOpen: () => {
          const popup = Swal.getPopup();
          if (!popup) return;

          popup.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
              const action = btn.getAttribute('data-action') || 'cancel';
              if (action === 'dispatch' && btn.hasAttribute('disabled')) {
                return;
              }
              selectedAction = action;
              Swal.close();
            });
          });
        }
      });

      return selectedAction;
    }

    async function handleProductSelection(item) {
      const existingRow = findExistingRowByItem(item);

      if (!existingRow) {
        addRowFromData(item);
        return 'added';
      }

      const action = await promptExistingRowAction(item, existingRow);

      if (action === 'duplicate') {
        addRowFromData(item);
        return 'duplicated';
      }

      if (action === 'dispatch') {
        const dispatchBtn = existingRow?.cells?.[7]?.querySelector('button');
        const changed = ensureRowDispatched(existingRow);
        flashAndFocusRow(existingRow, 'dispatch');

        if (!changed) {
          await Swal.fire('Sin cambios', 'Ese producto ya estaba marcado como despachado.', 'info');
          return 'noop';
        }

        try {
          if (typeof persistCurrentChecklist === 'function') {
            await persistCurrentChecklist({
              successTitle: 'Despachado',
              successMessage: 'El producto existente se marcó como despachado y se guardó automáticamente.'
            });
          }
        } catch (e) {
          if (dispatchBtn) {
            setToggleState(dispatchBtn, false);
          }
          flashAndFocusRow(existingRow, 'dispatch');
          await Swal.fire(
            'Error',
            'Se marcó el producto en pantalla, pero no se pudo guardar automáticamente. ' + String(e),
            'error'
          );
        }
        return 'dispatched';
      }

      if (action === 'locate') {
        flashAndFocusRow(existingRow, 'qty');
        return 'located';
      }

      return 'cancelled';
    }

    function sortByBodega() {
      const rows = Array.from(body.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const A = (a.cells[4]?.innerText || '').toLowerCase();
        const B = (b.cells[4]?.innerText || '').toLowerCase();
        return (uiState.sortAsc ? A.localeCompare(B) : B.localeCompare(A));
      });

      uiState.sortAsc = !uiState.sortAsc;
      body.innerHTML = '';
      rows.forEach(r => body.appendChild(r));
      renumber();
    }

    return {
      buildItemFromCatalogRow,
      addRowFromData,
      clearRows,
      renderRows,
      renumber,
      collectPayload,
      updateLastSavedText,
      setRowsDisabled,
      handleProductSelection,
      sortByBodega,
      getRowCount() {
        return body.rows.length;
      }
    };
  };
})(window);
