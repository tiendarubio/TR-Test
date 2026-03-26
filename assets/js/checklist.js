document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  const storeSelect = $('storeSelect');
  const versionSelect = $('versionSelect');
  const storeBadge = $('storeBadge');
  const storeBadgeText = $('storeBadgeText');
  const lastSaved = $('lastSaved');

  const body = $('chkBody');
  const searchInput = $('searchInput');
  const suggestions = $('suggestions');
  const btnSave = $('btnSave');
  const btnExcel = $('btnExcel');
  const btnPDF = $('btnPDF');
  const btnClear = $('btnClear');
  const thBodega = $('thBodega');

  // Histórico
  const histDateInput = $('histDateInput');
  const btnHistToday = $('btnHistToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const btnHistCalendar = $('btnHistCalendar');
  const histCalendarPanel = $('histCalendarPanel');

  // Scanner elements
  const btnScan = $('btnScan');
  const scanWrap = $('scanWrap');
  const scanVideo = $('scanVideo');
  const btnFilePick = $('btnFilePick');
  const fileScan = $('fileScan');

  let sortAsc = true;
  let lastUpdateISO = null;

  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  // Histórico
  let histPicker = null;
  let currentViewDate = null; // null = hoy (editable)
  let histDatesWithData = new Set();
  let historicalUnlockEnabled = false;

  function getDocIdForCurrentList() {
    return getBinId(storeSelect.value, versionSelect.value);
  }

  function isHistoricalDateSelected() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate !== today);
  }

  function isPastHistoricalDateSelected() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate < today);
  }

  function getTargetChecklistDate() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return currentViewDate || today;
  }

  function getVersionLabel(versionKey) {
    if (typeof getListLabel === 'function') {
      return getListLabel(versionKey);
    }

    const fallback = {
      base: 'Principal',
      alterna: 'Alterna',
      traslado: 'Traslado'
    };

    return fallback[versionKey] || versionKey;
  }

  function getDestinationVersionKeys(storeKey, currentVersionKey) {
    const available = (typeof getStoreVersions === 'function')
      ? getStoreVersions(storeKey)
      : Object.entries((typeof STORE_BINS !== 'undefined' && STORE_BINS[storeKey]) ? STORE_BINS[storeKey] : {})
          .filter(([, docId]) => !!docId)
          .map(([versionKey]) => versionKey);

    return available.filter(versionKey => versionKey !== currentVersionKey);
  }


  function updateHistoricalLockUI() {
    if (!btnToggleHistLock) return;

    const isHistorical = isHistoricalDateSelected();
    const isPastHistorical = isPastHistoricalDateSelected();

    if (btnHistToday) {
      btnHistToday.disabled = !isHistorical;
      btnHistToday.setAttribute('aria-disabled', String(!isHistorical));
    }

    btnToggleHistLock.disabled = !isPastHistorical;
    btnToggleHistLock.setAttribute('aria-disabled', String(!isPastHistorical));
    btnToggleHistLock.classList.toggle('d-none', !isPastHistorical);

    btnToggleHistLock.classList.remove('btn-outline-warning', 'btn-outline-success', 'btn-outline-secondary');

    if (!isPastHistorical) {
      btnToggleHistLock.classList.add('btn-outline-secondary');
      btnToggleHistLock.innerHTML = `
        <i class="fa-solid fa-unlock-keyhole me-1"></i>
        Desbloquear
      `;
      return;
    }

    if (historicalUnlockEnabled) {
      btnToggleHistLock.classList.add('btn-outline-success');
      btnToggleHistLock.innerHTML = `
        <i class="fa-solid fa-lock me-1"></i>
        Bloquear
      `;
    } else {
      btnToggleHistLock.classList.add('btn-outline-warning');
      btnToggleHistLock.innerHTML = `
        <i class="fa-solid fa-unlock-keyhole me-1"></i>
        Desbloquear
      `;
    }
  }

  function resetHistoricalUnlock() {
    historicalUnlockEnabled = false;
    updateHistoricalLockUI();
  }

  async function validateHistoricalPassword(password) {
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

  function setHistoricalViewMode(isHistorical) {
    const histModeText = document.getElementById('histViewModeText');
    const labelDate = currentViewDate || '';
    const disableEditing = isHistorical && !historicalUnlockEnabled;

    if (histModeText) {
      histModeText.classList.remove('text-muted', 'text-primary', 'text-success');

      if (isHistorical) {
        if (historicalUnlockEnabled) {
          histModeText.textContent = labelDate
            ? ('Modo histórico (' + labelDate + '): edición habilitada temporalmente.')
            : 'Modo histórico: edición habilitada temporalmente.';
          histModeText.classList.add('text-success');
        } else {
          histModeText.textContent = labelDate
            ? ('Modo histórico (' + labelDate + '): solo lectura.')
            : 'Modo histórico: solo lectura.';
          histModeText.classList.add('text-primary');
        }
      } else {
        histModeText.textContent = 'Modo: checklist del día actual (editable).';
        histModeText.classList.add('text-muted');
      }
    }

    if (searchInput) searchInput.disabled = disableEditing;
    if (btnScan) btnScan.disabled = disableEditing;
    if (btnFilePick) btnFilePick.disabled = disableEditing;
    if (fileScan) fileScan.disabled = disableEditing;
    if (disableEditing && mediaStream) stopScanner();

    if (btnSave) btnSave.disabled = disableEditing;
    if (btnClear) btnClear.disabled = disableEditing;

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = tr.querySelector('.qty');
      const btnRev = tr.cells[6]?.querySelector('button');
      const btnDes = tr.cells[7]?.querySelector('button');
      const btnMove = tr.querySelector('.btn-move-list');
      const btnDel = tr.querySelector('.btn-delete-row');

      if (qty) qty.disabled = disableEditing;
      if (btnRev) btnRev.disabled = disableEditing;
      if (btnDes) btnDes.disabled = disableEditing;
      if (btnMove) btnMove.disabled = disableEditing;
      if (btnDel) btnDel.disabled = disableEditing;
    });

    updateHistoricalLockUI();
  }

  // --- Centrar siempre el elemento que tiene el foco (buscador o cantidad) ---
  function centerOnElement(el) {
    if (!el) return;
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      const middle = absoluteTop - (window.innerHeight / 2) + rect.height / 2;
      window.scrollTo({ top: middle, behavior: 'smooth' });
    }, 0);
  }

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t === searchInput || t.classList.contains('qty')) {
      centerOnElement(t);
    }
  });

  function updateStoreUI() {
    const val = storeSelect.value;
    const storeShell = storeSelect ? storeSelect.closest('.store-select-shell') : null;

    storeBadge.classList.remove('badge-sexta', 'badge-morazan', 'badge-centro');
    if (storeShell) {
      storeShell.classList.remove('store-tone-sexta', 'store-tone-morazan', 'store-tone-centro');
    }

    if (val === 'lista_sexta_calle') {
      storeBadge.classList.add('badge-sexta');
      storeBadgeText.textContent = 'Sexta Calle';
      if (storeShell) storeShell.classList.add('store-tone-sexta');
    } else if (val === 'lista_avenida_morazan') {
      storeBadge.classList.add('badge-morazan');
      storeBadgeText.textContent = 'Avenida Morazán';
      if (storeShell) storeShell.classList.add('store-tone-morazan');
    } else {
      storeBadge.classList.add('badge-centro');
      storeBadgeText.textContent = 'Centro Comercial';
      if (storeShell) storeShell.classList.add('store-tone-centro');
    }
  }
  updateStoreUI();

  await preloadCatalog();

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

  function renumber() {
    [...body.getElementsByTagName('tr')].forEach((row, idx) => {
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

    return [...body.getElementsByTagName('tr')].find(tr => {
      const rowBarcode = normalizeMatchValue(tr.cells[1]?.innerText);
      const rowInventory = normalizeMatchValue(tr.cells[3]?.innerText);

      if (hasUsefulCode(barcode) && rowBarcode === barcode) return true;
      if (hasUsefulCode(inventoryCode) && rowInventory === inventoryCode) return true;
      return false;
    }) || null;
  }

  function clearSearchUI() {
    suggestions.innerHTML = '';
    currentFocus = -1;
    searchInput.value = '';
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

  function isHistoricalEditingLocked() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate !== today && !historicalUnlockEnabled);
  }

  function updateLastSavedText(updatedAt, emptyText = 'Aún no guardado.') {
    lastUpdateISO = updatedAt || null;
    lastSaved.innerHTML =
      '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
      (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : emptyText);
  }

  async function persistCurrentChecklist(options = {}) {
    const {
      successTitle = 'Guardado',
      successMessage = 'Checklist guardado correctamente.',
      successIcon = 'success',
      showSuccess = true
    } = options || {};

    if (isHistoricalEditingLocked()) {
      await Swal.fire(
        'Vista histórica',
        'Estás viendo el checklist del ' + currentViewDate + '. Desbloquea los controles o vuelve a hoy para guardar cambios.',
        'info'
      );
      return { ok: false, reason: 'locked' };
    }

    const docId = getDocIdForCurrentList();
    const payload = collectPayload();
    const targetDay = getTargetChecklistDate();

    await saveChecklistToFirestore(docId, payload, targetDay);
    rememberHistoryDate(docId, targetDay);
    updateLastSavedText(payload.meta?.updatedAt || null);
    await refreshHistoryPicker();

    if (showSuccess) {
      await Swal.fire(successTitle, successMessage, successIcon);
    }

    return { ok: true, docId, payload, targetDay };
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
      clearSearchUI();
      return;
    }

    clearSearchUI();

    const action = await promptExistingRowAction(item, existingRow);

    if (action === 'duplicate') {
      addRowFromData(item);
      return;
    }

    if (action === 'dispatch') {
      const dispatchBtn = existingRow?.cells?.[7]?.querySelector('button');
      const changed = ensureRowDispatched(existingRow);
      flashAndFocusRow(existingRow, 'dispatch');

      if (!changed) {
        await Swal.fire('Sin cambios', 'Ese producto ya estaba marcado como despachado.', 'info');
        return;
      }

      try {
        await persistCurrentChecklist({
          successTitle: 'Despachado',
          successMessage: 'El producto existente se marcó como despachado y se guardó automáticamente.'
        });
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
      return;
    }

    if (action === 'locate') {
      flashAndFocusRow(existingRow, 'qty');
    }
  }

  function collectPayload() {
    const tiendaKey = storeSelect.value;
    const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
    const versionKey = versionSelect.value;

    const items = [...body.getElementsByTagName('tr')].map(tr => ({
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

  // === MOVER ÍTEM ENTRE LISTAS (persistiendo origen y destino) ===
  async function moveRowToAnotherList(tr) {
    try {
      const today = (typeof getTodayString === 'function') ? getTodayString() : null;
      const lockedHistorical =
        currentViewDate && today && currentViewDate !== today && !historicalUnlockEnabled;

      if (lockedHistorical) {
        await Swal.fire(
          'Vista histórica',
          'Para mover productos, desbloquea los controles o vuelve al día actual.',
          'info'
        );
        return;
      }

      const storeKey = storeSelect.value;
      const fromKey = versionSelect.value;
      const destinationKeys = getDestinationVersionKeys(storeKey, fromKey);

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
      const fromDoc = getBinId(storeKey, fromKey);
      const toDoc = getBinId(storeKey, toKey);

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

      const day = getTargetChecklistDate();
      let destRec = await loadChecklistFromFirestore(toDoc, day);
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

      await saveChecklistToFirestore(toDoc, destRec, day);

      tr.remove();
      renumber();

      const payloadFrom = collectPayload();
      await saveChecklistToFirestore(fromDoc, payloadFrom, day);

      lastUpdateISO = payloadFrom.meta.updatedAt;
      lastSaved.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
        'Última actualización: ' +
        formatSV(lastUpdateISO);

      await refreshHistoryPicker();

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
      btnMove.title = 'Mover a otra lista';
      btnMove.setAttribute('aria-label', 'Mover a otra lista');
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

    // → Foco en Cantidad y ciclo Enter → barra de búsqueda
    const qtyInput = tr.querySelector('.qty');
    if (qtyInput) {
      qtyInput.focus();
      qtyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          if (searchInput) searchInput.focus();
        }
      });
    }
  }

  // --- Autocomplete search ---
  let currentFocus = -1;
  searchInput.addEventListener('input', () => {
    const q = (searchInput.value || '').replace(/\r|\n/g, '').trim().toLowerCase();
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (!q) return;

    loadProductsFromGoogleSheets().then(rows => {
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
            await handleProductSelection(buildItemFromCatalogRow(r));
          });
          suggestions.appendChild(li);
        });
    });
  });

  searchInput.addEventListener('keydown', async (e) => {
    const items = suggestions.getElementsByTagName('li');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      addActive(items);
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      addActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1 && items[currentFocus]) {
        items[currentFocus].click();
      } else {
        const q = (searchInput.value || '').replace(/\r|\n/g, '').trim();
        if (!q) return;
        const rows = (window.CATALOGO_CACHE || []);
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
          await handleProductSelection(buildItemFromCatalogRow(match, q));
        }
      }
    }
  });

  function addActive(items) {
    if (!items || !items.length) return;
    [...items].forEach(x => x.classList.remove('active'));
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('active');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
  }

  // --- Cerrar sugerencias al hacer click fuera del buscador y de la lista ---
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target === searchInput || suggestions.contains(target)) return;
    suggestions.innerHTML = '';
    currentFocus = -1;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      suggestions.innerHTML = '';
      currentFocus = -1;
    }
  });

  // Group by bodega
  function groupByBodega() {
    const groups = {};
    [...body.getElementsByTagName('tr')].forEach(tr => {
      const bod = tr.cells[4].innerText.trim() || 'SIN_BODEGA';
      if (!groups[bod]) groups[bod] = [];
      groups[bod].push(tr);
    });
    return groups;
  }

  // Helpers para exportar PDF
  async function exportPDFPorBodega() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const zip = new JSZip();
    const { jsPDF } = window.jspdf;

    const groups = groupByBodega();
    for (const [bodega, rowsTr] of Object.entries(groups)) {
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(`Tienda: ${tienda}`, 10, 10);
      doc.text(`Fecha: ${fechaActual}`, 10, 18);
      const upd = formatSV(lastUpdateISO);
      doc.text(`Última actualización (guardado): ${upd}`, 10, 26);
      const hasViewLine = !!currentViewDate;
      const startY = hasViewLine ? 50 : 42;

      if (hasViewLine) {
        doc.text(`Vista: ${currentViewDate}`, 10, 34);
        doc.text(`Bodega: ${bodega}`, 10, 42);
      } else {
        doc.text(`Bodega: ${bodega}`, 10, 34);
      }

      const rows = rowsTr.map((tr, i) => {
        const codBar = tr.cells[1].innerText.trim();
        const nombre = tr.cells[2].innerText.trim();
        const codInv = tr.cells[3].innerText.trim();
        const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
        const revisado = tr.cells[6].querySelector('button').classList.contains('on') ? 'Sí' : 'No';
        return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
      });

      doc.autoTable({
        startY,
        head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
        body: rows,
        pageBreak: 'auto'
      });

      const pdfBlob = doc.output('blob');
      const pdfFileName = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${bodega.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist.pdf`;
      zip.file(pdfFileName, pdfBlob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_Checklist_${fechaActual}_PDF.zip`;
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(content);
    link.href = objectUrl;
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    Swal.fire('Éxito', 'Se generaron los PDF por bodega.', 'success');
  }

  function exportPDFGeneral() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Tienda: ${tienda}`, 10, 10);
    doc.text(`Fecha: ${fechaActual}`, 10, 18);
    const upd = formatSV(lastUpdateISO);
    doc.text(`Última actualización (guardado): ${upd}`, 10, 26);
    if (currentViewDate) {
      doc.text(`Vista: ${currentViewDate}`, 10, 34);
    }

    const rows = [...body.getElementsByTagName('tr')].map((tr, i) => {
      const codBar = tr.cells[1].innerText.trim();
      const nombre = tr.cells[2].innerText.trim();
      const codInv = tr.cells[3].innerText.trim();
      const bodega = tr.cells[4].innerText.trim();
      const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
      const revisado = tr.cells[6].querySelector('button').classList.contains('on') ? 'Sí' : 'No';
      return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
    });

    const startY = currentViewDate ? 42 : 34;

    doc.autoTable({
      startY,
      head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
      body: rows,
      pageBreak: 'auto'
    });

    const fileName = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist_GENERAL.pdf`;
    doc.save(fileName);
    Swal.fire('Éxito', 'Se generó el PDF general.', 'success');
  }

  btnPDF.addEventListener('click', async () => {
    if (body.rows.length === 0) {
      Swal.fire('Error', 'No hay productos en la lista para generar PDF.', 'error');
      return;
    }
    const result = await Swal.fire({
      title: 'Tipo de PDF',
      text: '¿Cómo deseas generar el PDF?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Por bodega',
      denyButtonText: 'General',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      await exportPDFPorBodega();
    } else if (result.isDenied) {
      exportPDFGeneral();
    }
  });

  // Helpers para exportar Excel
  async function exportExcelPorBodega() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const zip = new JSZip();

    const groups = groupByBodega();
    for (const [bodega, rowsTr] of Object.entries(groups)) {
      const productos = rowsTr.map(tr => {
        const codigo = tr.cells[3].innerText.trim(); // codigo_inventario
        const descripcion = tr.cells[2].innerText.trim();
        const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
        const cantidad = (cantidadInput.match(/\d+/g)) ? parseInt(cantidadInput.match(/\d+/g).join('')) : 0;
        const lote = '';
        const fechaVence = new Date(1900, 0, 1);
        return [codigo, descripcion, cantidad, lote, fechaVence];
      });

      const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...productos];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = 0; C <= range.e.c; ++C) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellRef]) continue;
          if (C === 0 || C === 1 || C === 3) ws[cellRef].t = 's';
          else if (C === 2) ws[cellRef].t = 'n';
          else if (C === 4) { ws[cellRef].t = 'd'; ws[cellRef].z = 'm/d/yyyy'; }
        }
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pedido');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelFileName = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${bodega.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist.xlsx`;
      zip.file(excelFileName, wbout);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_Checklist_${fechaActual}.zip`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Éxito', 'Se generaron los Excel por bodega.', 'success');
  }

  function exportExcelGeneral() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';

    const rowsTr = [...body.getElementsByTagName('tr')];
    const productos = rowsTr.map(tr => {
      const codigo = tr.cells[3].innerText.trim(); // codigo_inventario
      const descripcion = tr.cells[2].innerText.trim();
      const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
      const cantidad = (cantidadInput.match(/\d+/g)) ? parseInt(cantidadInput.match(/\d+/g).join('')) : 0;
      const lote = '';
      const fechaVence = new Date(1900, 0, 1);
      return [codigo, descripcion, cantidad, lote, fechaVence];
    });

    const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...productos];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C <= range.e.c; ++C) {
      for (let R = 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) continue;
        if (C === 0 || C === 1 || C === 3) ws[cellRef].t = 's';
        else if (C === 2) ws[cellRef].t = 'n';
        else if (C === 4) { ws[cellRef].t = 'd'; ws[cellRef].z = 'm/d/yyyy'; }
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pedido');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist_GENERAL.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Éxito', 'Se generó el Excel general.', 'success');
  }

  btnExcel.addEventListener('click', async () => {
    if (body.rows.length === 0) {
      Swal.fire('Error', 'No hay productos en la lista para generar Excel.', 'error');
      return;
    }
    const result = await Swal.fire({
      title: 'Tipo de Excel',
      text: '¿Cómo deseas generar el Excel?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Por bodega',
      denyButtonText: 'General',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      await exportExcelPorBodega();
    } else if (result.isDenied) {
      exportExcelGeneral();
    }
  });

  // Sort by Bodega via header only
  function sortByBodega() {
    const rows = Array.from(body.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const A = (a.cells[4]?.innerText || '').toLowerCase();
      const B = (b.cells[4]?.innerText || '').toLowerCase();
      return (sortAsc ? A.localeCompare(B) : B.localeCompare(A));
    });
    sortAsc = !sortAsc;
    body.innerHTML = '';
    rows.forEach(r => body.appendChild(r));
    renumber();
  }
  thBodega.addEventListener('click', sortByBodega);

  // Clear & persist empty (solo hoy)
  btnClear.addEventListener('click', async () => {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    const lockedHistorical =
      currentViewDate && today && currentViewDate !== today && !historicalUnlockEnabled;

    if (lockedHistorical) {
      Swal.fire(
        'Vista histórica',
        'Para limpiar esta fecha, primero desbloquea los controles o vuelve al día actual.',
        'info'
      );
      return;
    }

    if (body.rows.length === 0) return;

    const targetDay = getTargetChecklistDate();

    Swal.fire({
      title: '¿Limpiar checklist?',
      text: 'Se eliminarán todos los items en pantalla y se guardará la fecha seleccionada vacía.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Limpiar'
    }).then(async res => {
      if (res.isConfirmed) {
        body.innerHTML = '';
        renumber();

        const docId = getDocIdForCurrentList();
        const payload = collectPayload();

        await saveChecklistToFirestore(docId, payload, targetDay);
        rememberHistoryDate(docId, targetDay);
        lastUpdateISO = payload.meta.updatedAt;
        lastSaved.innerHTML =
          '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
          'Última actualización: ' +
          formatSV(lastUpdateISO);

        await refreshHistoryPicker();

        Swal.fire('Listo', 'Checklist guardado vacío correctamente.', 'success');
      }
    });
  });

  btnSave.addEventListener('click', async () => {
    try {
      await persistCurrentChecklist();
    } catch (e) {
      Swal.fire('Error', String(e), 'error');
    }
  });

  // ===== Histórico =====

  function formatDateISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateISO(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
    const [year, month, day] = String(iso).split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  function sameDay(a, b) {
    return !!(a && b && formatDateISO(a) === formatDateISO(b));
  }

  function getCalendarMonthLabel(date) {
    try {
      return new Intl.DateTimeFormat('es-SV', {
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  function getHistoryCacheKey(docId) {
    return `trlista:history-dates:${docId || 'default'}`;
  }

  function readHistoryDatesCache(docId) {
    if (!docId || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getHistoryCacheKey(docId));
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
        getHistoryCacheKey(docId),
        JSON.stringify(Array.from(new Set((values || []).filter(Boolean))).sort())
      );
    } catch (_) {}
  }

  function rememberHistoryDate(docId, isoDate) {
    if (!docId || !isoDate) return;
    const cached = new Set(readHistoryDatesCache(docId));
    cached.add(isoDate);
    writeHistoryDatesCache(docId, Array.from(cached));
    histDatesWithData = cached;
    if (histPicker && typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }
  }

  function createHistoryPicker() {
    if (!histDateInput || !histCalendarPanel) return null;

    const wrapper = histDateInput.closest('.history-search-shell') || histDateInput.closest('.hist-date-wrapper') || histDateInput.parentElement;
    const shell = histDateInput.closest('.control-shell-history') || histDateInput.closest('.control-shell') || wrapper;
    const weekdayLabels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

    const state = {
      selectedDate: currentViewDate ? parseDateISO(currentViewDate) : null,
      visibleMonth: startOfMonth(currentViewDate ? parseDateISO(currentViewDate) || new Date() : new Date()),
      isOpen: false
    };

    function syncInput() {
      histDateInput.value = state.selectedDate ? formatDateISO(state.selectedDate) : '';
      histDateInput.setAttribute('aria-expanded', String(state.isOpen));
      if (shell) {
        shell.classList.toggle('is-open', state.isOpen);
      }
      if (btnHistCalendar) {
        btnHistCalendar.innerHTML = state.isOpen
          ? '<i class="fa-solid fa-chevron-up"></i>'
          : '<i class="fa-solid fa-chevron-down"></i>';
        btnHistCalendar.setAttribute('aria-expanded', String(state.isOpen));
      }
    }

    function close() {
      state.isOpen = false;
      histCalendarPanel.classList.add('d-none');
      histCalendarPanel.setAttribute('aria-hidden', 'true');
      syncInput();
    }

    function open() {
      state.isOpen = true;
      histCalendarPanel.classList.remove('d-none');
      histCalendarPanel.setAttribute('aria-hidden', 'false');
      render();
      syncInput();
    }

    function toggle() {
      state.isOpen ? close() : open();
    }

    function setSelectedDate(isoDate, triggerChange = false) {
      const parsed = isoDate ? parseDateISO(isoDate) : null;
      state.selectedDate = parsed;
      if (parsed) {
        state.visibleMonth = startOfMonth(parsed);
      }
      syncInput();
      render();

      if (parsed && triggerChange) {
        loadHistoryForDate(formatDateISO(parsed));
      }
    }

    function clear() {
      state.selectedDate = null;
      state.visibleMonth = startOfMonth(new Date());
      close();
      syncInput();
      render();
    }

    function destroy() {
      close();
      histCalendarPanel.innerHTML = '';
    }

    function changeMonth(offset) {
      state.visibleMonth = new Date(
        state.visibleMonth.getFullYear(),
        state.visibleMonth.getMonth() + offset,
        1,
        12, 0, 0, 0
      );
      render();
    }

    function render() {
      if (!histCalendarPanel) return;

      const today = parseDateISO(getTodayString()) || new Date();
      const firstDay = startOfMonth(state.visibleMonth);
      const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay(), 12, 0, 0, 0);

      let html = `
        <div class="history-calendar-header">
          <button type="button" class="history-calendar-nav" data-cal-nav="-1" aria-label="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="history-calendar-title">${getCalendarMonthLabel(firstDay)}</div>
          <button type="button" class="history-calendar-nav" data-cal-nav="1" aria-label="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="history-calendar-weekdays">
          ${weekdayLabels.map(label => `<div class="history-calendar-weekday">${label}</div>`).join('')}
        </div>
        <div class="history-calendar-grid">
      `;

      for (let i = 0; i < 42; i++) {
        const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 12, 0, 0, 0);
        const iso = formatDateISO(date);
        const classes = ['history-calendar-day'];

        if (date.getMonth() !== firstDay.getMonth()) classes.push('is-outside');
        if (sameDay(date, today)) classes.push('is-today');
        if (state.selectedDate && sameDay(date, state.selectedDate)) classes.push('is-selected');
        if (histDatesWithData && histDatesWithData.has(iso)) classes.push('has-history');

        html += `
          <button type="button"
            class="${classes.join(' ')}"
            data-cal-date="${iso}"
            aria-label="Seleccionar ${iso}">
            ${date.getDate()}
          </button>
        `;
      }

      html += '</div>';

      if (!histDatesWithData || histDatesWithData.size === 0) {
        html += '<div class="history-calendar-empty">Aún no hay fechas marcadas para esta lista.</div>';
      }

      histCalendarPanel.innerHTML = html;

      histCalendarPanel.querySelectorAll('[data-cal-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          const offset = Number(btn.getAttribute('data-cal-nav') || 0);
          changeMonth(offset);
        });
      });

      histCalendarPanel.querySelectorAll('[data-cal-date]').forEach(btn => {
        btn.addEventListener('click', () => {
          const iso = btn.getAttribute('data-cal-date');
          setSelectedDate(iso, true);
          close();
        });
      });
    }

    histDateInput.addEventListener('click', (event) => {
      event.stopPropagation();
      toggle();
    });

    histDateInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        close();
      }
    });

    if (shell) {
      shell.addEventListener('click', (event) => {
        if (event.target === histDateInput || event.target.closest('#btnHistToday')) {
          return;
        }

        event.preventDefault();
        toggle();
        histDateInput.focus({ preventScroll: true });
      });
    }

    if (btnHistCalendar) {
      btnHistCalendar.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      });
    }

    document.addEventListener('click', (event) => {
      if (!wrapper || !wrapper.contains(event.target)) {
        close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    syncInput();
    render();

    return {
      clear,
      close,
      destroy,
      open,
      redraw: render,
      setDate: setSelectedDate
    };
  }

  async function refreshHistoryPicker() {
    if (!histDateInput || typeof getHistoryDates !== 'function') return;

    const docId = getDocIdForCurrentList();
    const cachedDates = readHistoryDatesCache(docId);
    histDatesWithData = new Set(cachedDates);

    if (!histPicker) {
      histPicker = createHistoryPicker();
    } else if (typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }

    try {
      const fechas = await getHistoryDates(docId);
      const fechasUnicas = Array.from(new Set((fechas || []).filter(Boolean)));
      histDatesWithData = new Set(fechasUnicas);
      writeHistoryDatesCache(docId, fechasUnicas);
    } catch (e) {
      console.error('Error al obtener fechas de historial:', e);
    }

    if (histPicker && typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }
  }

  async function loadHistoryForDate(dateStr) {
    if (!dateStr) return;
    try {
      const today = (typeof getTodayString === 'function') ? getTodayString() : null;

      if (today && dateStr === today) {
        currentViewDate = null;
        historicalUnlockEnabled = false;

        if (histPicker) {
          histPicker.clear();
        } else if (histDateInput) {
          histDateInput.value = '';
        }

        await loadStoreStateForToday();
        setHistoricalViewMode(false);
        return;
      }

      currentViewDate = dateStr;
      historicalUnlockEnabled = false;

      body.innerHTML = '';
      renumber();

      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId, dateStr);

      if (record && Array.isArray(record.items) && record.items.length) {
        record.items.forEach(addRowFromData);
        renumber();
        lastUpdateISO = record.meta?.updatedAt || null;
        lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
      } else {
        lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + 'Sin guardado para esa fecha.';
        Swal.fire('Sin datos', 'No hay checklist guardado para esa fecha.', 'info');
      }

      const isHistorical = (today ? (dateStr !== today) : true);
      setHistoricalViewMode(isHistorical);
    } catch (e) {
      console.error('Error al cargar histórico:', e);
      Swal.fire('Error', 'No se pudo cargar el histórico para esa fecha.', 'error');
    }
  }

  if (btnHistToday) {
    btnHistToday.addEventListener('click', async () => {
      if (histPicker) {
        histPicker.clear();
      } else if (histDateInput) {
        histDateInput.value = '';
      }

      currentViewDate = null;
      resetHistoricalUnlock();
      await loadStoreStateForToday(); // vuelve a hoy
      setHistoricalViewMode(false);
      if (searchInput) searchInput.focus();
    });
  }

  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
      if (!isHistoricalDateSelected()) {
        await Swal.fire(
          'No aplica',
          'Este botón solo se usa cuando estás viendo una fecha anterior.',
          'info'
        );
        return;
      }

      if (historicalUnlockEnabled) {
        historicalUnlockEnabled = false;
        setHistoricalViewMode(true);

        await Swal.fire(
          'Bloqueado',
          'Los controles de la lista histórica fueron bloqueados nuevamente.',
          'success'
        );
        return;
      }

      const result = await Swal.fire({
        title: 'Desbloquear controles',
        text: 'Ingresa la contraseña para habilitar edición en esta fecha.',
        input: 'password',
        inputLabel: 'Contraseña',
        inputPlaceholder: '••••••••',
        inputAttributes: {
          autocapitalize: 'off',
          autocorrect: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Desbloquear',
        cancelButtonText: 'Cancelar',
        preConfirm: async (password) => {
          if (!password) {
            Swal.showValidationMessage('Debes ingresar la contraseña.');
            return false;
          }

          try {
            const ok = await validateHistoricalPassword(password);
            if (!ok) {
              Swal.showValidationMessage('Contraseña incorrecta.');
              return false;
            }
            return true;
          } catch (err) {
            Swal.showValidationMessage(String(err.message || err));
            return false;
          }
        }
      });

      if (result.isConfirmed) {
        historicalUnlockEnabled = true;
        setHistoricalViewMode(true);

        await Swal.fire(
          'Desbloqueado',
          'Ya puedes editar la lista histórica hasta que vuelvas a bloquearla.',
          'success'
        );
      }
    });
  }

  // ====== Barcode Scanner ======
  function setScanButtonState(isActive) {
    if (!btnScan) return;

    btnScan.classList.remove('btn-outline-primary', 'btn-outline-danger');

    if (isActive) {
      btnScan.classList.add('btn-outline-danger');
      btnScan.title = 'Detener cámara';
      btnScan.setAttribute('aria-label', 'Detener cámara');
      btnScan.innerHTML = '<i class="fa-solid fa-stop me-1"></i><span>Detener</span>';
    } else {
      btnScan.classList.add('btn-outline-primary');
      btnScan.title = 'Escanear código de barras';
      btnScan.setAttribute('aria-label', 'Escanear código de barras');
      btnScan.innerHTML = '<i class="fa-solid fa-barcode"></i>';
    }
  }

  function ensureBarcodeDetector() {
    if (detector !== null) return detector;
    if ('BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'upc_e'] });
      } catch (_e) {
        detector = false;
      }
    } else {
      detector = false;
    }
    return detector || null;
  }

  async function startScanner() {
    if (mediaStream) return;

    ensureBarcodeDetector();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      scanVideo.srcObject = mediaStream;
      await scanVideo.play();
      scanWrap.classList.add('active');
      setScanButtonState(true);

      if (detector) {
        if (scanInterval) clearInterval(scanInterval);
        scanInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(scanVideo);
            if (barcodes && barcodes.length) {
              const raw = String(barcodes[0].rawValue || '').trim();
              if (raw) await onBarcodeFound(raw);
            }
          } catch (_e) { }
        }, 250);
      }
    } catch (err) {
      console.error(err);
      await stopScanner();
      Swal.fire('Cámara no disponible', 'No se pudo acceder a la cámara.', 'error');
    }
  }

  async function stopScanner() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }

    if (scanVideo) {
      try { scanVideo.pause(); } catch (_e) { }
      scanVideo.srcObject = null;
    }

    scanWrap.classList.remove('active');
    setScanButtonState(false);
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    searchInput.value = code;
    const e = new KeyboardEvent('keydown', { key: 'Enter' });
    searchInput.dispatchEvent(e);
  }

  async function tryDetectBarcodeFromImage(file) {
    if (!file || !(file.type || '').startsWith('image/')) return '';
    const activeDetector = ensureBarcodeDetector();
    if (!activeDetector) return '';

    try {
      const bitmap = await createImageBitmap(file);
      try {
        const barcodes = await activeDetector.detect(bitmap);
        const raw = String(barcodes?.[0]?.rawValue || '').trim();
        return raw || '';
      } finally {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      }
    } catch (_e) {
      return '';
    }
  }

  if (btnFilePick) {
    btnFilePick.addEventListener('click', async () => {
      if (mediaStream) await stopScanner();
      if (fileScan) fileScan.click();
    });
  }

  if (fileScan) {
    fileScan.addEventListener('change', async () => {
      const f = fileScan.files?.[0];
      if (!f) return;

      let code = await tryDetectBarcodeFromImage(f);

      if (!code) {
        const m = String(f.name || '').match(/\d{8,}/);
        code = m ? m[0] : '';
      }

      fileScan.value = '';

      if (code) {
        searchInput.value = code;
        const e = new KeyboardEvent('keydown', { key: 'Enter' });
        searchInput.dispatchEvent(e);
      } else {
        Swal.fire('Atención', 'No se pudo leer el código desde el archivo seleccionado.', 'info');
      }
    });
  }

  if (btnScan) {
    btnScan.addEventListener('click', async () => {
      if (mediaStream) {
        await stopScanner();
      } else {
        await startScanner();
      }
    });
  }

  setScanButtonState(false);

  // ===== Carga inicial (hoy) =====
  async function loadStoreStateForToday() {
    body.innerHTML = '';

    const docId = getDocIdForCurrentList();
    const record = await loadChecklistFromFirestore(docId); // hoy
    if (record && Array.isArray(record.items)) {
      record.items.forEach(addRowFromData);
      renumber();
      lastUpdateISO = record.meta?.updatedAt || null;
    } else {
      lastUpdateISO = null;
    }

    lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
  }

  await loadStoreStateForToday();
  setHistoricalViewMode(false);
  await refreshHistoryPicker();

  // → Enfocar la barra de búsqueda al iniciar
  searchInput.focus();

  // Store/version change: vuelve a hoy y refresca calendario para el docId nuevo
  storeSelect.addEventListener('change', async () => {
    updateStoreUI();
    currentViewDate = null;
    resetHistoricalUnlock();
    if (histPicker) { try { histPicker.clear(); } catch (_) {} }
    if (histDateInput) histDateInput.value = '';

    await loadStoreStateForToday();
    setHistoricalViewMode(false);
    await refreshHistoryPicker();
  });

  versionSelect.addEventListener('change', async () => {
    currentViewDate = null;
    resetHistoricalUnlock();
    if (histPicker) { try { histPicker.clear(); } catch (_) {} }
    if (histDateInput) histDateInput.value = '';

    await loadStoreStateForToday();
    setHistoricalViewMode(false);
    await refreshHistoryPicker();
  });
});
