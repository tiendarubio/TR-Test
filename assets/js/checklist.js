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
  const btnExport = $('btnExport');
  const btnToggleRequisition = $('btnToggleRequisition');
  const btnExcel = $('btnExcel');
  const btnPDF = $('btnPDF');
  const btnClear = $('btnClear');
  const btnReviewSelected = $('btnReviewSelected');
  const btnDispatchSelected = $('btnDispatchSelected');
  const btnDeleteSelected = $('btnDeleteSelected');
  const thBodega = $('thBodega');
  const chkSelectAllRows = $('chkSelectAllRows');
  const bulkSelectionBar = $('bulkSelectionBar');
  const bulkSelectionCount = $('bulkSelectionCount');
  const btnClearSelection = $('btnClearSelection');
  const moreActionsMenu = $('moreActionsMenu');
  const appLoadingOverlay = $('appLoadingOverlay');
  const appLoadingText = $('appLoadingText');
  const qtyPreviewBubble = $('qtyPreviewBubble');
  const mobileFabToggle = $('mobileFabToggle');
  const mobileFabMenu = $('mobileFabMenu');
  const mobileFabBackdrop = $('mobileFabBackdrop');
  const btnFabSave = $('btnFabSave');
  const btnFabSearchList = $('btnFabSearchList');
  const btnFabExport = $('btnFabExport');
  const btnFabScrollTop = $('btnFabScrollTop');

  // Histórico
  const histDateInput = $('histDateInput');
  const btnHistToday = $('btnHistToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const btnMergeSelectedToToday = $('btnMergeSelectedToToday');
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
  let loadingCounter = 0;

  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  // Histórico
  let histPicker = null;
  let currentViewDate = null; // null = hoy (editable)
  let histDatesWithData = new Set();
  let historicalUnlockEnabled = false;
  let protectedVersionUnlockEnabled = false;
  let requisitionDone = false;
  let requisitionDoneAt = null;
  let lastCommittedVersionValue = versionSelect?.value || 'base';

  const COL_INDEX = {
    bulkSelect: 0,
    rowNumber: 1,
    barcode: 2,
    name: 3,
    inventoryCode: 4,
    warehouse: 5,
    quantity: 6,
    actions: 7
  };

  const MOBILE_BREAKPOINT = 767.98;
  const ROW_CELL_LABELS = {
    [COL_INDEX.bulkSelect]: 'Seleccionar',
    [COL_INDEX.rowNumber]: '#',
    [COL_INDEX.barcode]: 'Cód. barras',
    [COL_INDEX.name]: 'Producto',
    [COL_INDEX.inventoryCode]: 'Cód. inv.',
    [COL_INDEX.warehouse]: 'Bodega',
    [COL_INDEX.quantity]: 'Cantidad',
    [COL_INDEX.actions]: 'Acciones'
  };


  function setLoadingState(isLoading, message = 'Cargando...') {
    if (!appLoadingOverlay) return;

    if (isLoading) {
      loadingCounter += 1;
      if (appLoadingText) {
        appLoadingText.textContent = message || 'Cargando...';
      }
      appLoadingOverlay.classList.remove('d-none');
      appLoadingOverlay.setAttribute('aria-hidden', 'false');
      return;
    }

    loadingCounter = Math.max(0, loadingCounter - 1);

    if (loadingCounter === 0) {
      appLoadingOverlay.classList.add('d-none');
      appLoadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  async function withLoading(message, task) {
    setLoadingState(true, message);
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

    try {
      return await task();
    } finally {
      setLoadingState(false);
    }
  }

  function setToolbarButtonContent(btn, iconClassName, label) {
    if (!btn) return;
    btn.innerHTML = `
      <i class="${iconClassName}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
    `;
  }

  function closeMoreActionsMenu() {
    if (moreActionsMenu?.hasAttribute('open')) {
      moreActionsMenu.removeAttribute('open');
    }
  }

  function setMobileFabOpen(shouldOpen) {
    if (!mobileFabToggle || !mobileFabMenu || !mobileFabBackdrop) return;
    const isOpen = !!shouldOpen;
    mobileFabMenu.classList.toggle('d-none', !isOpen);
    mobileFabBackdrop.classList.toggle('d-none', !isOpen);
    mobileFabMenu.setAttribute('aria-hidden', String(!isOpen));
    mobileFabToggle.setAttribute('aria-expanded', String(isOpen));
    mobileFabToggle.closest('.mobile-fab-shell')?.classList.toggle('is-open', isOpen);
  }

  function closeMobileFab() {
    setMobileFabOpen(false);
  }

  function buildRowSearchText(tr) {
    if (!tr?.cells) return '';
    return [
      tr.cells[COL_INDEX.barcode]?.innerText || '',
      tr.cells[COL_INDEX.name]?.innerText || '',
      tr.cells[COL_INDEX.inventoryCode]?.innerText || '',
      tr.cells[COL_INDEX.warehouse]?.innerText || '',
      tr.querySelector('.qty')?.value || ''
    ].join(' ').toLowerCase();
  }

  function buildRowSearchLabel(tr) {
    const nombre = tr?.cells?.[COL_INDEX.name]?.innerText?.trim() || 'Producto';
    const codigo = tr?.cells?.[COL_INDEX.inventoryCode]?.innerText?.trim() || 'N/A';
    const bodega = tr?.cells?.[COL_INDEX.warehouse]?.innerText?.trim() || 'Sin bodega';
    return `${nombre} · ${codigo} · ${bodega}`;
  }

  async function openInsertedRowsSearch() {
    const rows = [...body.querySelectorAll('tr')];
    if (!rows.length) {
      await Swal.fire('Sin productos', 'Todavía no hay productos agregados en la lista actual.', 'info');
      return;
    }

    closeMobileFab();

    const queryPrompt = await Swal.fire({
      title: 'Buscar en la lista actual',
      input: 'text',
      inputLabel: 'Nombre, código de barras, código inventario o bodega',
      inputPlaceholder: 'Escribe para ubicar un producto ya agregado',
      showCancelButton: true,
      confirmButtonText: 'Buscar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!String(value || '').trim()) return 'Escribe algo para buscar.';
        return undefined;
      }
    });

    if (!queryPrompt.isConfirmed) return;

    const needle = String(queryPrompt.value || '').trim().toLowerCase();
    const matches = rows.filter(tr => buildRowSearchText(tr).includes(needle));

    if (!matches.length) {
      await Swal.fire('Sin resultados', 'No encontré coincidencias en la lista actual.', 'info');
      return;
    }

    if (matches.length === 1) {
      flashAndFocusRow(matches[0], 'qty');
      return;
    }

    const options = Object.fromEntries(
      matches.slice(0, 50).map((tr, idx) => [String(idx), buildRowSearchLabel(tr)])
    );

    const choice = await Swal.fire({
      title: `Coincidencias (${matches.length})`,
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Selecciona una fila',
      showCancelButton: true,
      confirmButtonText: 'Ir a fila',
      cancelButtonText: 'Cancelar'
    });

    if (!choice.isConfirmed) return;

    const targetRow = matches[Number(choice.value)];
    if (targetRow) {
      flashAndFocusRow(targetRow, 'qty');
    }
  }


  function isCompactScreen() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function applyResponsiveRowLabels(tr) {
    if (!tr?.cells) return;

    [...tr.cells].forEach((cell, idx) => {
      cell.setAttribute('data-label', ROW_CELL_LABELS[idx] || '');
      if (idx === COL_INDEX.bulkSelect) {
        cell.classList.add('cell-select');
      }
      if (idx === COL_INDEX.name) {
        cell.classList.add('cell-name');
      }
      if (idx === COL_INDEX.inventoryCode) {
        cell.classList.add('cell-inventory');
      }
      if (idx === COL_INDEX.warehouse) {
        cell.classList.add('cell-warehouse');
      }
      if (idx === COL_INDEX.quantity) {
        cell.classList.add('cell-quantity');
      }
      if (idx === COL_INDEX.actions) {
        cell.classList.add('cell-actions');
      }
    });
  }

  function syncQtyInputMode(input) {
    if (!input) return;
    input.readOnly = isCompactScreen();
    input.classList.toggle('qty-mobile-readonly', input.readOnly);
    input.setAttribute('inputmode', input.readOnly ? 'none' : 'text');
  }

  async function openQtyEditor(input) {
    if (!input) return;
    const result = await Swal.fire({
      title: 'Editar cantidad',
      input: 'text',
      inputValue: String(input.value || ''),
      inputLabel: 'Cantidad',
      inputPlaceholder: 'Escribe la cantidad completa',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      }
    });

    if (!result.isConfirmed) return;
    input.value = String(result.value || '').trim();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function handleQtyInputInteraction(ev) {
    const input = ev.currentTarget;
    if (!isCompactScreen() || !input) return;
    ev.preventDefault();
    ev.stopPropagation();
    input.blur();
    await openQtyEditor(input);
  }


  function getReviewButton(tr) {
    return tr?.querySelector('.btn-toggle-review') || null;
  }

  function getDispatchButton(tr) {
    return tr?.querySelector('.btn-toggle-dispatch') || null;
  }

  function getMoveButton(tr) {
    return tr?.querySelector('.btn-move-list') || null;
  }

  function getDeleteButton(tr) {
    return tr?.querySelector('.btn-delete-row') || null;
  }

  function updateQtyPreview(input) {
    if (!qtyPreviewBubble) return;

    const value = String(input?.value || '').trim();
    const shouldShow = !!input && document.activeElement === input && value.length > 10;

    if (!shouldShow) {
      qtyPreviewBubble.classList.add('d-none');
      qtyPreviewBubble.setAttribute('aria-hidden', 'true');
      return;
    }

    qtyPreviewBubble.textContent = value;
    const rect = input.getBoundingClientRect();
    qtyPreviewBubble.classList.remove('d-none');
    qtyPreviewBubble.setAttribute('aria-hidden', 'false');
    qtyPreviewBubble.style.left = Math.max(12, Math.min(window.innerWidth - qtyPreviewBubble.offsetWidth - 12, rect.left)) + 'px';
    qtyPreviewBubble.style.top = Math.min(window.innerHeight - 16, rect.bottom + 10) + 'px';
  }

  function bindQtyPreview(input) {
    if (!input) return;

    syncQtyInputMode(input);

    const sync = () => {
      input.setAttribute('title', input.value || '');
      updateQtyPreview(input);
    };

    input.addEventListener('focus', sync);
    input.addEventListener('input', sync);
    input.addEventListener('blur', () => updateQtyPreview(null));
    input.addEventListener('click', async (ev) => {
      if (isCompactScreen()) {
        await handleQtyInputInteraction(ev);
        return;
      }
      sync();
    });
    input.addEventListener('keydown', async (ev) => {
      if (!isCompactScreen()) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        await handleQtyInputInteraction(ev);
      }
    });
    sync();
  }

  window.addEventListener('resize', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
    [...body.querySelectorAll('.qty')].forEach(syncQtyInputMode);
  });

  document.addEventListener('scroll', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
  }, true);


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

  function isProtectedVersionSelected() {
    const versionKey = String(versionSelect?.value || '');
    if (typeof isProtectedVersionKey === 'function') {
      return !!isProtectedVersionKey(versionKey);
    }
    return versionKey === 'traslado';
  }

  function isProtectedVersionEditingLocked() {
    return isProtectedVersionSelected() && !protectedVersionUnlockEnabled;
  }

  function getActiveEditingContexts() {
    const contexts = [];

    if (isHistoricalDateSelected()) {
      contexts.push(currentViewDate ? ('histórico (' + currentViewDate + ')') : 'histórico');
    }

    if (isProtectedVersionSelected()) {
      contexts.push('protegido (' + getVersionLabel(versionSelect.value) + ')');
    }

    return contexts;
  }

  function getEditingModeMessage() {
    const contexts = getActiveEditingContexts();
    if (!contexts.length) {
      return {
        text: 'Modo: checklist del día actual (editable).',
        className: 'text-muted'
      };
    }

    if (isEditingLocked()) {
      return {
        text: 'Modo ' + contexts.join(' + ') + ': solo lectura.',
        className: 'text-primary'
      };
    }

    return {
      text: 'Modo ' + contexts.join(' + ') + ': edición habilitada temporalmente.',
      className: 'text-success'
    };
  }

  async function showEditingLockedAlert(actionLabel = 'continuar') {
    const contexts = getActiveEditingContexts();
    const contextText = contexts.length
      ? ('Esta vista está protegida (' + contexts.join(' + ') + ').')
      : 'Esta vista está protegida.';

    await Swal.fire(
      'Edición bloqueada',
      'Para ' + actionLabel + ', desbloquea la edición o cambia de vista. ' + contextText,
      'info'
    );
  }

  async function requestUnlockPassword(options = {}) {
    const title = options.title || 'Desbloquear edición';
    const text = options.text || 'Ingresa la contraseña para continuar.';
    const confirmButtonText = options.confirmButtonText || 'Desbloquear';

    const result = await Swal.fire({
      title,
      text,
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: '••••••••',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText,
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

    return !!result.isConfirmed;
  }

  async function ensureProtectedDestinationAccess(versionKey, actionLabel = 'continuar') {
    const isProtectedDestination = (typeof isProtectedVersionKey === 'function')
      ? isProtectedVersionKey(versionKey)
      : (versionKey === 'traslado');

    if (!isProtectedDestination) return true;

    return requestUnlockPassword({
      title: 'Acceso a lista protegida',
      text: 'Ingresa la contraseña para ' + actionLabel + ' en la lista ' + getVersionLabel(versionKey) + '.',
      confirmButtonText: 'Continuar'
    });
  }

  function buildChecklistMeta(options = {}) {
    const storeKey = options.storeKey ?? storeSelect.value;
    const storeName = options.storeName ?? storeSelect.options[storeSelect.selectedIndex].text;
    const versionKey = options.versionKey ?? versionSelect.value;
    const updatedAt = options.updatedAt || new Date().toISOString();
    const reqDone = typeof options.requisitionDone === 'boolean'
      ? options.requisitionDone
      : requisitionDone;
    const reqDoneAt = reqDone
      ? (options.requisitionDoneAt ?? requisitionDoneAt ?? updatedAt)
      : null;

    return {
      tienda_key: storeKey,
      tienda: storeName,
      version: versionKey,
      version_label: getVersionLabel(versionKey),
      requisition_done: reqDone,
      requisition_done_at: reqDoneAt,
      updatedAt
    };
  }

  function applyChecklistMeta(meta = {}) {
    requisitionDone = !!meta?.requisition_done;
    requisitionDoneAt = requisitionDone
      ? String(meta?.requisition_done_at || '').trim() || null
      : null;

    updateRequisitionUI();
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



  function getAllDestinationVersionKeys(storeKey) {
    const available = (typeof getStoreVersions === 'function')
      ? getStoreVersions(storeKey)
      : Object.entries((typeof STORE_BINS !== 'undefined' && STORE_BINS[storeKey]) ? STORE_BINS[storeKey] : {})
          .filter(([, docId]) => !!docId)
          .map(([versionKey]) => versionKey);

    return available.filter(Boolean);
  }

  function getBulkSelectionCheckboxes() {
    return [...body.querySelectorAll('.row-bulk-select-checkbox')];
  }

  function getSelectedTableRows() {
    return getBulkSelectionCheckboxes()
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr'))
      .filter(Boolean);
  }

  function clearBulkSelection() {
    getBulkSelectionCheckboxes().forEach(cb => {
      cb.checked = false;
    });

    if (chkSelectAllRows) {
      chkSelectAllRows.checked = false;
      chkSelectAllRows.indeterminate = false;
    }
  }


  function clearHistoricalSelection() {
    clearBulkSelection();
    updateHistoricalSelectionUI();
  }

  function updateBulkSelectionUI() {
    const checkboxes = getBulkSelectionCheckboxes();
    const selectableCheckboxes = checkboxes.filter(cb => !cb.disabled);
    const selectedCount = selectableCheckboxes.filter(cb => cb.checked).length;
    const hasRows = checkboxes.length > 0;
    const editingLocked = isEditingLocked();

    if (chkSelectAllRows) {
      chkSelectAllRows.disabled = !hasRows;
      chkSelectAllRows.setAttribute('aria-disabled', String(chkSelectAllRows.disabled));
      chkSelectAllRows.checked = !!selectableCheckboxes.length && selectedCount === selectableCheckboxes.length;
      chkSelectAllRows.indeterminate = selectedCount > 0 && selectedCount < selectableCheckboxes.length;
    }

    if (bulkSelectionBar) {
      const shouldShow = selectedCount > 0;
      bulkSelectionBar.classList.toggle('d-none', !shouldShow);
      bulkSelectionBar.setAttribute('aria-hidden', String(!shouldShow));
      document.body.classList.toggle('has-mobile-selection', shouldShow && isCompactScreen());
    }

    if (bulkSelectionCount) {
      bulkSelectionCount.textContent = selectedCount === 1 ? '1 seleccionada' : (selectedCount + ' seleccionadas');
    }

    if (btnClearSelection) {
      btnClearSelection.disabled = selectedCount === 0;
      btnClearSelection.setAttribute('aria-disabled', String(btnClearSelection.disabled));
    }

    if (btnReviewSelected) {
      btnReviewSelected.disabled = editingLocked || selectedCount === 0;
      btnReviewSelected.setAttribute('aria-disabled', String(btnReviewSelected.disabled));
      setToolbarButtonContent(btnReviewSelected, 'fa-solid fa-clipboard-check', 'Revisar');
    }

    if (btnDispatchSelected) {
      btnDispatchSelected.disabled = editingLocked || selectedCount === 0;
      btnDispatchSelected.setAttribute('aria-disabled', String(btnDispatchSelected.disabled));
      setToolbarButtonContent(btnDispatchSelected, 'fa-solid fa-truck-ramp-box', 'Despachar');
    }

    if (btnDeleteSelected) {
      btnDeleteSelected.disabled = editingLocked || selectedCount === 0;
      btnDeleteSelected.setAttribute('aria-disabled', String(btnDeleteSelected.disabled));
      setToolbarButtonContent(btnDeleteSelected, 'fa-solid fa-trash-can-list', 'Eliminar');
    }

    updateHistoricalSelectionUI();
  }


  async function markSelectedRowsWithState(kind) {
    if (isEditingLocked()) {
      await showEditingLockedAlert(kind === 'reviewed' ? 'marcar múltiples filas como revisadas' : 'marcar múltiples filas como despachadas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await Swal.fire(
        'Sin selección',
        'Selecciona al menos una fila para aplicar esta acción masiva.',
        'info'
      );
      return;
    }

    const actionLabel = kind === 'reviewed' ? 'revisadas' : 'despachadas';

    let changedCount = 0;

    selectedRows.forEach(tr => {
      const btn = kind === 'reviewed' ? getReviewButton(tr) : getDispatchButton(tr);
      if (!btn || btn.classList.contains('on')) return;
      setToggleState(btn, true);
      changedCount += 1;
    });

    clearBulkSelection();
    updateBulkSelectionUI();

    await Swal.fire(
      changedCount ? 'Actualizado' : 'Sin cambios',
      changedCount
        ? ('Se marcaron ' + changedCount + ' fila(s) como ' + actionLabel + '.')
        : ('Las filas seleccionadas ya estaban ' + actionLabel + '.'),
      changedCount ? 'success' : 'info'
    );
  }

  async function deleteSelectedRows() {
    if (isEditingLocked()) {
      await showEditingLockedAlert('eliminar múltiples filas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await Swal.fire(
        'Sin selección',
        'Selecciona al menos una fila para eliminarla de la tabla actual.',
        'info'
      );
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar filas seleccionadas?',
      html: '<div class="small text-muted">Se eliminarán <strong>' + selectedRows.length + '</strong> fila(s) de la tabla actual. Recuerda guardar para persistir el cambio.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    selectedRows.forEach(tr => tr.remove());
    renumber();
    updateBulkSelectionUI();

    await Swal.fire(
      'Filas eliminadas',
      'Se eliminaron ' + selectedRows.length + ' fila(s) de la tabla actual.',
      'success'
    );
  }

  function isHistoricalSelectionAvailable() {
    return isPastHistoricalDateSelected();
  }

  if (chkSelectAllRows) {
    chkSelectAllRows.addEventListener('change', () => {
      const shouldCheck = !!chkSelectAllRows.checked;
      getBulkSelectionCheckboxes().forEach(cb => {
        if (!cb.disabled) cb.checked = shouldCheck;
      });
      updateBulkSelectionUI();
    });
  }

  if (btnReviewSelected) {
    btnReviewSelected.addEventListener('click', async () => {
      await markSelectedRowsWithState('reviewed');
    });
  }

  if (btnDispatchSelected) {
    btnDispatchSelected.addEventListener('click', async () => {
      await markSelectedRowsWithState('dispatched');
    });
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async () => {
      await deleteSelectedRows();
    });
  }

  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
      getBulkSelectionCheckboxes().forEach(cb => {
        cb.checked = false;
      });
      updateBulkSelectionUI();
      updateHistoricalSelectionUI();
    });
  }

  function updateHistoricalSelectionUI() {
    const canMerge = isHistoricalSelectionAvailable();

    if (btnMergeSelectedToToday) {
      const selectedCount = getSelectedTableRows().length;
      const shouldShow = canMerge && selectedCount > 0;

      btnMergeSelectedToToday.classList.toggle('d-none', !shouldShow);
      btnMergeSelectedToToday.disabled = !canMerge || selectedCount === 0;
      btnMergeSelectedToToday.setAttribute('aria-disabled', String(btnMergeSelectedToToday.disabled));
      btnMergeSelectedToToday.title = canMerge
        ? 'Enviar productos seleccionados a la lista de hoy'
        : '';

      if (shouldShow) {
        setToolbarButtonContent(btnMergeSelectedToToday, 'fa-solid fa-share-from-square', 'Enviar hoy');
      }
    }
  }


  function buildChecklistItemFromRow(tr) {
    const reviewBtn = getReviewButton(tr);
    const dispatchBtn = getDispatchButton(tr);

    return {
      codigo_barras: tr.cells[COL_INDEX.barcode].innerText.trim(),
      nombre: tr.cells[COL_INDEX.name].innerText.trim(),
      codigo_inventario: tr.cells[COL_INDEX.inventoryCode].innerText.trim(),
      bodega: tr.cells[COL_INDEX.warehouse].innerText.trim(),
      cantidad: (tr.querySelector('.qty')?.value || '').trim(),
      revisado: reviewBtn ? reviewBtn.classList.contains('on') : false,
      despachado: dispatchBtn ? dispatchBtn.classList.contains('on') : false
    };
  }

  function buildMergeItemFromHistoricalRow(tr) {
    const item = buildChecklistItemFromRow(tr);
    return {
      ...item,
      revisado: false,
      despachado: false
    };
  }

  function itemsMatch(itemA, itemB) {
    const barcodeA = normalizeMatchValue(itemA?.codigo_barras);
    const barcodeB = normalizeMatchValue(itemB?.codigo_barras);
    const inventoryA = normalizeMatchValue(itemA?.codigo_inventario);
    const inventoryB = normalizeMatchValue(itemB?.codigo_inventario);

    if (hasUsefulCode(barcodeA) && hasUsefulCode(barcodeB) && barcodeA === barcodeB) return true;
    if (hasUsefulCode(inventoryA) && hasUsefulCode(inventoryB) && inventoryA === inventoryB) return true;
    return false;
  }

  function findMatchingItemInArray(items, item) {
    return (items || []).find(existingItem => itemsMatch(existingItem, item)) || null;
  }

  async function mergeSelectedHistoricalRowsToToday() {
    try {
      if (!isHistoricalSelectionAvailable()) {
        await Swal.fire(
          'No aplica',
          'Esta acción solo está disponible cuando estás viendo una fecha anterior.',
          'info'
        );
        return;
      }

      const selectedRows = getSelectedTableRows();
      if (!selectedRows.length) {
        await Swal.fire(
          'Sin selección',
          'Selecciona al menos un producto histórico para enviarlo a la fecha actual.',
          'info'
        );
        return;
      }

      const storeKey = storeSelect.value;
      const destinationKeys = getAllDestinationVersionKeys(storeKey);

      if (!destinationKeys.length) {
        await Swal.fire(
          'Configuración incompleta',
          'No hay listas destino disponibles para esta tienda.',
          'error'
        );
        return;
      }

      const destinationOptions = Object.fromEntries(
        destinationKeys.map(versionKey => [versionKey, getVersionLabel(versionKey)])
      );

      const selection = await Swal.fire({
        title: 'Enviar productos a hoy',
        html: `
          <div class="text-start small text-muted">
            Se copiarán <strong>${selectedRows.length}</strong> producto(s) desde la vista histórica hacia una lista del día actual.<br>
            Los productos que ya existan en el destino se omitirán automáticamente.<br>
            Los estados <strong>Revisado</strong> y <strong>Despachado</strong> se reiniciarán en la lista de hoy.
          </div>
        `,
        input: 'select',
        inputOptions: destinationOptions,
        inputPlaceholder: 'Selecciona la lista destino de hoy',
        showCancelButton: true,
        confirmButtonText: 'Enviar a hoy',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) return 'Debes seleccionar una lista destino.';
          return undefined;
        }
      });

      if (!selection.isConfirmed) return;

      const toKey = selection.value;
      const hasProtectedDestinationAccess = await ensureProtectedDestinationAccess(
        toKey,
        'enviar productos a hoy'
      );

      if (!hasProtectedDestinationAccess) {
        return;
      }

      const toDoc = getBinId(storeKey, toKey);
      const today = (typeof getTodayString === 'function') ? getTodayString() : new Date().toISOString().split('T')[0];

      if (!toDoc || !today) {
        await Swal.fire(
          'Configuración incompleta',
          'No se encontró la lista destino o la fecha actual.',
          'error'
        );
        return;
      }

      const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
      let destinationRecord = await loadChecklistFromFirestore(toDoc, today);

      if (!destinationRecord || !Array.isArray(destinationRecord.items)) {
        destinationRecord = {
          meta: buildChecklistMeta({
            storeKey,
            storeName: tiendaName,
            versionKey: toKey,
            requisitionDone: false,
            requisitionDoneAt: null,
            updatedAt: null
          }),
          items: []
        };
      }

      const destinationItems = Array.isArray(destinationRecord.items)
        ? destinationRecord.items.slice()
        : [];

      const addedItems = [];
      const omittedItems = [];

      selectedRows.forEach(tr => {
        const candidate = buildMergeItemFromHistoricalRow(tr);
        if (findMatchingItemInArray(destinationItems, candidate)) {
          omittedItems.push(candidate);
          return;
        }

        destinationItems.push(candidate);
        addedItems.push(candidate);
      });

      if (!addedItems.length) {
            await Swal.fire(
          'Sin cambios',
          'Todos los productos seleccionados ya existen en la lista de hoy elegida. No se agregó nada.',
          'info'
        );
        return;
      }

      destinationRecord.items = destinationItems;
      destinationRecord.meta = buildChecklistMeta({
        storeKey,
        storeName: tiendaName,
        versionKey: toKey,
        requisitionDone: !!destinationRecord.meta?.requisition_done,
        requisitionDoneAt: destinationRecord.meta?.requisition_done_at || null
      });

      await saveChecklistToFirestore(toDoc, destinationRecord, today);
      rememberHistoryDate(toDoc, today);
      await refreshHistoryPicker();

      clearBulkSelection();
      updateBulkSelectionUI();

      await Swal.fire({
        title: 'Productos enviados',
        icon: 'success',
        html: `
          <div class="text-start small">
            <div><strong>Destino:</strong> ${escapeHtml(getVersionLabel(toKey))} (${escapeHtml(today)})</div>
            <div><strong>Agregados:</strong> ${addedItems.length}</div>
            <div><strong>Omitidos por duplicado:</strong> ${omittedItems.length}</div>
          </div>
        `
      });
    } catch (err) {
      console.error(err);
      await Swal.fire(
        'Error',
        'No se pudieron enviar los productos seleccionados a la lista de hoy. Intenta nuevamente.',
        'error'
      );
    }
  }

  function updateHistoricalLockUI() {
    if (!btnToggleHistLock) return;

    const isPastHistorical = isPastHistoricalDateSelected();
    const isProtected = isProtectedVersionSelected();
    const shouldShow = isPastHistorical || isProtected;
    const isUnlocked =
      (isPastHistorical && historicalUnlockEnabled) ||
      (isProtected && protectedVersionUnlockEnabled);

    if (btnHistToday) {
      btnHistToday.disabled = !isHistoricalDateSelected();
      btnHistToday.setAttribute('aria-disabled', String(!isHistoricalDateSelected()));
    }

    btnToggleHistLock.disabled = !shouldShow;
    btnToggleHistLock.setAttribute('aria-disabled', String(!shouldShow));
    btnToggleHistLock.classList.toggle('d-none', !shouldShow);
    btnToggleHistLock.classList.remove('btn-outline-warning', 'btn-outline-success', 'btn-outline-secondary');

    if (!shouldShow) {
      btnToggleHistLock.classList.add('btn-outline-secondary');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloq.');
      btnToggleHistLock.title = 'Desbloquear edición';
      return;
    }

    if (isUnlocked) {
      btnToggleHistLock.classList.add('btn-outline-success');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-lock', 'Bloquear');
      btnToggleHistLock.title = 'Bloquear edición';
    } else {
      btnToggleHistLock.classList.add('btn-outline-warning');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloq.');
      btnToggleHistLock.title = 'Desbloquear edición';
    }
  }

  function updateRequisitionUI() {
    if (!btnToggleRequisition) return;

    const locked = isEditingLocked();
    btnToggleRequisition.disabled = locked;
    btnToggleRequisition.setAttribute('aria-disabled', String(locked));
    btnToggleRequisition.classList.remove('btn-outline-secondary', 'btn-success', 'text-white');

    if (requisitionDone) {
      btnToggleRequisition.classList.add('btn-success', 'text-white');
      setToolbarButtonContent(btnToggleRequisition, 'fa-solid fa-flag', 'Req. hecha');
      btnToggleRequisition.title = requisitionDoneAt
        ? ('Marcada como hecha: ' + formatSV(requisitionDoneAt))
        : 'Marcada como requisición hecha.';
    } else {
      btnToggleRequisition.classList.add('btn-outline-secondary');
      setToolbarButtonContent(btnToggleRequisition, 'fa-regular fa-flag', 'Req. pend.');
      btnToggleRequisition.title = 'Marcar esta lista como requisición hecha.';
    }
  }

  function resetHistoricalUnlock() {
    historicalUnlockEnabled = false;
    protectedVersionUnlockEnabled = false;
    updateHistoricalLockUI();
    updateRequisitionUI();
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

  function setHistoricalViewMode(_isHistorical) {
    const histModeText = document.getElementById('histViewModeText');
    const disableEditing = isEditingLocked();
    const modeMessage = getEditingModeMessage();

    if (histModeText) {
      histModeText.classList.remove('text-muted', 'text-primary', 'text-success');
      histModeText.textContent = modeMessage.text;
      histModeText.classList.add(modeMessage.className);
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
      const btnRev = getReviewButton(tr);
      const btnDes = getDispatchButton(tr);
      const btnMove = getMoveButton(tr);
      const btnDel = getDeleteButton(tr);
      const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');

      if (qty) qty.disabled = disableEditing;
      if (btnRev) btnRev.disabled = disableEditing;
      if (btnDes) btnDes.disabled = disableEditing;
      if (btnMove) btnMove.disabled = disableEditing;
      if (btnDel) btnDel.disabled = disableEditing;
      if (bulkSelect) {
        bulkSelect.disabled = false;
        bulkSelect.setAttribute('aria-disabled', 'false');
      }
    });

    updateHistoricalLockUI();
    updateHistoricalSelectionUI();
    updateBulkSelectionUI();
    updateRequisitionUI();
  }


  function isEditingLocked() {
    return isHistoricalEditingLocked() || isProtectedVersionEditingLocked();
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

  document.addEventListener('click', (e) => {
    if (!moreActionsMenu?.hasAttribute('open')) return;
    const target = e.target;
    if (target instanceof Node && !moreActionsMenu.contains(target)) {
      closeMoreActionsMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMoreActionsMenu();
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
      row.cells[COL_INDEX.rowNumber].textContent = (body.rows.length - idx);
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
    return [...body.getElementsByTagName('tr')].find(tr => itemsMatch(buildChecklistItemFromRow(tr), item)) || null;
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
      const dispatchBtn = getDispatchButton(tr);
      const reviewBtn = getReviewButton(tr);
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
    const btnDes = getDispatchButton(tr);
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

    if (isEditingLocked()) {
      await showEditingLockedAlert('guardar cambios');
      return { ok: false, reason: 'locked' };
    }

    return withLoading('Guardando checklist...', async () => {
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
    });
  }

  async function promptExistingRowAction(item, existingRow) {
    const isAlreadyDispatched = getDispatchButton(existingRow)?.classList.contains('on');
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
      const dispatchBtn = getDispatchButton(existingRow);
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
    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);

    return {
      meta: buildChecklistMeta(),
      items
    };
  }

  // === MOVER ÍTEM ENTRE LISTAS (persistiendo origen y destino) ===
  async function moveRowToAnotherList(tr) {
    try {
      if (isEditingLocked()) {
        await showEditingLockedAlert('mover productos');
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
      const hasProtectedDestinationAccess = await ensureProtectedDestinationAccess(
        toKey,
        'mover este producto'
      );

      if (!hasProtectedDestinationAccess) {
        return;
      }

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
      const item = buildChecklistItemFromRow(tr);

      const day = getTargetChecklistDate();
      let destRec = await loadChecklistFromFirestore(toDoc, day);
      if (!destRec || !Array.isArray(destRec.items)) {
        destRec = {
          meta: buildChecklistMeta({
            storeKey,
            storeName: tiendaName,
            versionKey: toKey,
            requisitionDone: false,
            requisitionDoneAt: null,
            updatedAt: null
          }),
          items: []
        };
      }

      destRec.items.push(item);
      destRec.meta = buildChecklistMeta({
        storeKey,
        storeName: tiendaName,
        versionKey: toKey,
        requisitionDone: !!destRec.meta?.requisition_done,
        requisitionDoneAt: destRec.meta?.requisition_done_at || null
      });

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
      <td class="text-center sticky-col-select row-bulk-select-cell">
        <input
          type="checkbox"
          class="form-check-input row-bulk-select-checkbox"
          aria-label="Seleccionar fila"
        >
      </td>
      <td></td>
      <td>${item.codigo_barras || ''}</td>
      <td>${item.nombre || ''}</td>
      <td>${item.codigo_inventario || 'N/A'}</td>
      <td>${item.bodega || ''}</td>
      <td>
        <input type="text" class="form-control form-control-sm qty" value="${qtyValue}" placeholder="0">
      </td>
      <td class="text-center">
        <div class="row-actions-grid" role="group" aria-label="Acciones de fila">
          <button class="btn btn-sm btn-outline-primary btn-toggle btn-toggle-review ${item.revisado ? 'on' : 'off'}" title="Revisado" aria-label="Marcar revisado">
            <i class="fa-solid fa-clipboard-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-success btn-toggle btn-toggle-dispatch ${item.despachado ? 'on' : 'off'}" title="Despachado" aria-label="Marcar despachado">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning btn-move-list" title="Mover a otra lista" aria-label="Mover a otra lista">
            <i class="fa-solid fa-right-left"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary btn-delete-row" title="Eliminar fila" aria-label="Eliminar fila">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    body.insertBefore(tr, body.firstChild);
    applyResponsiveRowLabels(tr);
    renumber();

    const btnRev = getReviewButton(tr);
    const btnDes = getDispatchButton(tr);
    const btnMove = getMoveButton(tr);
    const btnDel = getDeleteButton(tr);
    const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');

    if (btnRev) {
      btnRev.addEventListener('click', () => toggleBtn(btnRev));
    }

    if (btnDes) {
      btnDes.addEventListener('click', () => toggleBtn(btnDes));
    }

    if (bulkSelect) {
      bulkSelect.addEventListener('change', () => {
        updateBulkSelectionUI();
      });
    }

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
            updateBulkSelectionUI();
            updateHistoricalSelectionUI();
          }
        });
      });
    }

    updateHistoricalSelectionUI();
    updateBulkSelectionUI();

    const qtyInput = tr.querySelector('.qty');
    if (qtyInput) {
      bindQtyPreview(qtyInput);
      if (!isCompactScreen()) {
        qtyInput.focus();
      }
      qtyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !isCompactScreen()) {
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
      const bod = tr.cells[COL_INDEX.warehouse].innerText.trim() || 'SIN_BODEGA';
      if (!groups[bod]) groups[bod] = [];
      groups[bod].push(tr);
    });
    return groups;
  }

  function getWarehouseNames() {
    return Object.keys(groupByBodega()).sort((a, b) => a.localeCompare(b, 'es'));
  }

  function sanitizeFilePart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'archivo';
  }

  async function promptExportMode(formatLabel) {
    const result = await Swal.fire({
      title: 'Exportar ' + formatLabel,
      text: '¿Deseas exportar todo o elegir bodegas específicas?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Elegir bodegas',
      denyButtonText: 'Todo',
      cancelButtonText: 'Cancelar'
    });

    if (result.isDismissed) return null;
    return result.isConfirmed ? 'warehouses' : 'general';
  }

  async function promptWarehouseSelection(formatLabel) {
    const warehouseNames = getWarehouseNames();

    if (!warehouseNames.length) {
      await Swal.fire('Sin bodegas', 'No se encontraron bodegas disponibles para exportar.', 'info');
      return null;
    }

    const optionsHtml = warehouseNames.map((name, index) => `
      <label class="warehouse-export-option">
        <input type="checkbox" class="form-check-input warehouse-export-checkbox" value="${htmlAttrEscape(name)}" ${index === 0 && warehouseNames.length === 1 ? 'checked' : ''}>
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    const result = await Swal.fire({
      title: 'Bodegas para ' + formatLabel,
      html: `
        <div class="text-start">
          <label class="warehouse-export-option warehouse-export-option-all">
            <input type="checkbox" id="warehouseExportAll" class="form-check-input">
            <span>Todas las bodegas</span>
          </label>
          <div class="warehouse-export-list">
            ${optionsHtml}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        const master = popup.querySelector('#warehouseExportAll');
        const checkboxes = [...popup.querySelectorAll('.warehouse-export-checkbox')];

        const syncMaster = () => {
          const checkedCount = checkboxes.filter(cb => cb.checked).length;
          master.checked = checkedCount === checkboxes.length;
          master.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        };

        master?.addEventListener('change', () => {
          const shouldCheck = !!master.checked;
          checkboxes.forEach(cb => {
            cb.checked = shouldCheck;
          });
          syncMaster();
        });

        checkboxes.forEach(cb => cb.addEventListener('change', syncMaster));
        syncMaster();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const checkboxes = popup ? [...popup.querySelectorAll('.warehouse-export-checkbox:checked')] : [];
        const selected = checkboxes.map(cb => String(cb.value || '').trim()).filter(Boolean);

        if (!selected.length) {
          Swal.showValidationMessage('Selecciona al menos una bodega.');
          return false;
        }

        return selected;
      }
    });

    return result.isConfirmed ? (result.value || []) : null;
  }

  function buildPdfRows(rowsTr) {
    return rowsTr.map((tr, i) => {
      const codBar = tr.cells[COL_INDEX.barcode].innerText.trim();
      const nombre = tr.cells[COL_INDEX.name].innerText.trim();
      const codInv = tr.cells[COL_INDEX.inventoryCode].innerText.trim();
      const bodega = tr.cells[COL_INDEX.warehouse].innerText.trim();
      const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
      const revisado = getReviewButton(tr)?.classList.contains('on') ? 'Sí' : 'No';
      return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
    });
  }

  function writePdfHeader(doc, tienda, fechaActual, subtitle) {
    doc.setFontSize(12);
    doc.text(`Tienda: ${tienda}`, 10, 10);
    doc.text(`Fecha: ${fechaActual}`, 10, 18);
    doc.text(`Última actualización: ${formatSV(lastUpdateISO)}`, 10, 26);

    let nextY = 34;
    if (currentViewDate) {
      doc.text(`Vista consultada: ${currentViewDate}`, 10, 34);
      nextY = 42;
    }

    if (subtitle) {
      doc.text(subtitle, 10, nextY);
      nextY += 8;
    }

    return nextY;
  }

  function saveBlobFile(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportPDFGeneral() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const rows = buildPdfRows([...body.getElementsByTagName('tr')]);
    const startY = writePdfHeader(doc, tienda, fechaActual, 'Checklist general');

    doc.autoTable({
      startY,
      head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
      body: rows,
      pageBreak: 'auto'
    });

    const fileName = `${sanitizeFilePart(tienda)}_${fechaActual}_Checklist_GENERAL.pdf`;
    doc.save(fileName);
    Swal.fire('Éxito', 'Se generó el PDF general.', 'success');
  }

  async function exportPDFPorBodega(selectedWarehouses) {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await Swal.fire('Sin datos', 'No hay productos para las bodegas seleccionadas.', 'info');
      return;
    }

    const { jsPDF } = window.jspdf;

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const doc = new jsPDF();
      const startY = writePdfHeader(doc, tienda, fechaActual, `Bodega: ${bodega}`);
      doc.autoTable({
        startY,
        head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
        body: buildPdfRows(rowsTr),
        pageBreak: 'auto'
      });
      doc.save(`${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.pdf`);
      await Swal.fire('Éxito', 'Se generó el PDF de la bodega seleccionada.', 'success');
      return;
    }

    const zip = new JSZip();
    selectedGroups.forEach(([bodega, rowsTr]) => {
      const doc = new jsPDF();
      const startY = writePdfHeader(doc, tienda, fechaActual, `Bodega: ${bodega}`);
      doc.autoTable({
        startY,
        head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
        body: buildPdfRows(rowsTr),
        pageBreak: 'auto'
      });
      zip.file(
        `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.pdf`,
        doc.output('arraybuffer')
      );
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlobFile(content, `${sanitizeFilePart(tienda)}_PDF_BODEGAS_${fechaActual}.zip`);
    await Swal.fire('Éxito', 'Se generó un ZIP con los PDFs de las bodegas seleccionadas.', 'success');
  }

  function buildExcelRows(rowsTr) {
    return rowsTr.map(tr => {
      const codigo = tr.cells[COL_INDEX.inventoryCode].innerText.trim();
      const descripcion = tr.cells[COL_INDEX.name].innerText.trim();
      const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
      const cantidad = (cantidadInput.match(/\d+/g)) ? parseInt(cantidadInput.match(/\d+/g).join('')) : 0;
      const lote = '';
      const fechaVence = new Date(1900, 0, 1);
      return [codigo, descripcion, cantidad, lote, fechaVence];
    });
  }

  function buildExcelWorkbook(rowsTr) {
    const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...buildExcelRows(rowsTr)];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C <= range.e.c; ++C) {
      for (let R = 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) continue;
        if (C === 0 || C === 1 || C === 3) ws[cellRef].t = 's';
        else if (C === 2) ws[cellRef].t = 'n';
        else if (C === 4) {
          ws[cellRef].t = 'd';
          ws[cellRef].z = 'm/d/yyyy';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pedido');
    return wb;
  }

  async function exportExcelPorBodega(selectedWarehouses) {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await Swal.fire('Sin datos', 'No hay productos para las bodegas seleccionadas.', 'info');
      return;
    }

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const wb = buildExcelWorkbook(rowsTr);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.xlsx`);
      await Swal.fire('Éxito', 'Se generó el Excel de la bodega seleccionada.', 'success');
      return;
    }

    const zip = new JSZip();
    selectedGroups.forEach(([bodega, rowsTr]) => {
      const wb = buildExcelWorkbook(rowsTr);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(
        `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.xlsx`,
        wbout
      );
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlobFile(content, `${sanitizeFilePart(tienda)}_EXCEL_BODEGAS_${fechaActual}.zip`);
    await Swal.fire('Éxito', 'Se generó un ZIP con los Excel de las bodegas seleccionadas.', 'success');
  }

  function exportExcelGeneral() {
    const fechaActual = new Date().toISOString().split('T')[0];
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const wb = buildExcelWorkbook([...body.getElementsByTagName('tr')]);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${fechaActual}_Checklist_GENERAL.xlsx`);
    Swal.fire('Éxito', 'Se generó el Excel general.', 'success');
  }

  async function handleExportRequest(preferredFormat = '') {
    if (body.rows.length === 0) {
      await Swal.fire('Error', 'No hay productos en la lista para exportar.', 'error');
      return;
    }

    let format = preferredFormat;

    if (!format) {
      const formatResult = await Swal.fire({
        title: 'Exportar checklist',
        input: 'radio',
        inputOptions: {
          pdf: 'PDF',
          excel: 'Excel'
        },
        inputValue: 'pdf',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => value ? undefined : 'Selecciona un formato.'
      });

      if (!formatResult.isConfirmed) return;
      format = formatResult.value;
    }

    const mode = await promptExportMode(format === 'pdf' ? 'PDF' : 'Excel');
    if (!mode) return;

    if (mode === 'general') {
      if (format === 'pdf') {
        await withLoading('Generando PDF...', async () => {
          exportPDFGeneral();
        });
      } else {
        await withLoading('Generando Excel...', async () => {
          exportExcelGeneral();
        });
      }
      return;
    }

    const warehouses = await promptWarehouseSelection(format === 'pdf' ? 'PDF' : 'Excel');
    if (!warehouses) return;

    if (format === 'pdf') {
      await withLoading('Generando PDF por bodega...', async () => {
        await exportPDFPorBodega(warehouses);
      });
    } else {
      await withLoading('Generando Excel por bodega...', async () => {
        await exportExcelPorBodega(warehouses);
      });
    }
  }

  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      closeMoreActionsMenu();
      await handleExportRequest();
    });
  }

  if (mobileFabToggle) {
    mobileFabToggle.addEventListener('click', () => {
      const expanded = mobileFabToggle.getAttribute('aria-expanded') === 'true';
      setMobileFabOpen(!expanded);
    });
  }

  if (mobileFabBackdrop) {
    mobileFabBackdrop.addEventListener('click', closeMobileFab);
  }

  if (btnFabSearchList) {
    btnFabSearchList.addEventListener('click', async () => {
      await openInsertedRowsSearch();
    });
  }

  if (btnFabSave) {
    btnFabSave.addEventListener('click', async () => {
      closeMobileFab();
      await persistCurrentChecklist({
        successTitle: 'Guardado',
        successMessage: 'Checklist guardado correctamente.'
      });
    });
  }

  if (btnFabExport) {
    btnFabExport.addEventListener('click', async () => {
      closeMobileFab();
      await handleExportRequest();
    });
  }

  if (btnFabScrollTop) {
    btnFabScrollTop.addEventListener('click', () => {
      closeMobileFab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMobileFab();
    }
  });

  window.addEventListener('resize', () => {
    if (!isCompactScreen()) {
      closeMobileFab();
    }
  });


  if (btnPDF) {
    btnPDF.addEventListener('click', async () => {
      await handleExportRequest('pdf');
    });
  }

  if (btnExcel) {
    btnExcel.addEventListener('click', async () => {
      await handleExportRequest('excel');
    });
  }


  // Sort by Bodega via header only
  function sortByBodega() {
    const rows = Array.from(body.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const A = (a.cells[COL_INDEX.warehouse]?.innerText || '').toLowerCase();
      const B = (b.cells[COL_INDEX.warehouse]?.innerText || '').toLowerCase();
      return (sortAsc ? A.localeCompare(B) : B.localeCompare(A));
    });
    sortAsc = !sortAsc;
    body.innerHTML = '';
    rows.forEach(r => body.appendChild(r));
    renumber();
    updateBulkSelectionUI();
  }
  thBodega.addEventListener('click', sortByBodega);

  // Clear & persist empty (solo hoy)
  btnClear.addEventListener('click', async () => {
    if (isEditingLocked()) {
      await showEditingLockedAlert('limpiar la lista');
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
        await withLoading('Limpiando checklist...', async () => {
          body.innerHTML = '';
          renumber();
          updateBulkSelectionUI();

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
        });

        Swal.fire('Listo', 'Checklist guardado vacío correctamente.', 'success');
      }
    });
  });

  btnSave.addEventListener('click', async () => {
    closeMoreActionsMenu();
    try {
      await persistCurrentChecklist();
    } catch (e) {
      Swal.fire('Error', String(e), 'error');
    }
  });

  if (btnToggleRequisition) {
    btnToggleRequisition.addEventListener('click', async () => {
      closeMoreActionsMenu();
      if (isEditingLocked()) {
        await showEditingLockedAlert('marcar la requisición');
        return;
      }

      const prevDone = requisitionDone;
      const prevDoneAt = requisitionDoneAt;
      const nextDone = !requisitionDone;

      requisitionDone = nextDone;
      requisitionDoneAt = nextDone ? new Date().toISOString() : null;
      updateRequisitionUI();

      try {
        await persistCurrentChecklist({
          successTitle: nextDone ? 'Requisición marcada' : 'Requisición pendiente',
          successMessage: nextDone
            ? 'La lista quedó marcada como requisición hecha.'
            : 'La lista quedó marcada como requisición pendiente.'
        });
      } catch (e) {
        requisitionDone = prevDone;
        requisitionDoneAt = prevDoneAt;
        updateRequisitionUI();
        await Swal.fire('Error', String(e), 'error');
      }
    });
  }

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
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const offset = Number(btn.getAttribute('data-cal-nav') || 0);
          changeMonth(offset);
        });
      });

      histCalendarPanel.querySelectorAll('[data-cal-date]').forEach(btn => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

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

    return withLoading('Cargando historial...', async () => {
      try {
        const today = (typeof getTodayString === 'function') ? getTodayString() : null;

        if (today && dateStr === today) {
          currentViewDate = null;
          resetHistoricalUnlock();
          clearHistoricalSelection();

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
        resetHistoricalUnlock();
        clearHistoricalSelection();

        body.innerHTML = '';
        renumber();
        updateBulkSelectionUI();

        const docId = getDocIdForCurrentList();
        const record = await loadChecklistFromFirestore(docId, dateStr);
        applyChecklistMeta(record?.meta || {});

        if (record && Array.isArray(record.items) && record.items.length) {
          record.items.forEach(addRowFromData);
          renumber();
          lastUpdateISO = record.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
        } else {
          lastUpdateISO = record?.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + 'Sin guardado para esa fecha.';
          Swal.fire('Sin datos', 'No hay checklist guardado para esa fecha.', 'info');
        }

        const isHistorical = (today ? (dateStr !== today) : true);
        setHistoricalViewMode(isHistorical);
      } catch (e) {
        console.error('Error al cargar histórico:', e);
        Swal.fire('Error', 'No se pudo cargar el histórico para esa fecha.', 'error');
      }
    });
  }

  if (btnHistToday) {
    btnHistToday.addEventListener('click', async () => {
      await withLoading('Volviendo a hoy...', async () => {
        if (histPicker) {
          histPicker.clear();
        } else if (histDateInput) {
          histDateInput.value = '';
        }

        currentViewDate = null;
        resetHistoricalUnlock();
        clearHistoricalSelection();
        await loadStoreStateForToday(); // vuelve a hoy
        setHistoricalViewMode(false);
      });

      if (searchInput) searchInput.focus();
    });
  }

  if (btnMergeSelectedToToday) {
    btnMergeSelectedToToday.addEventListener('click', async () => {
      await mergeSelectedHistoricalRowsToToday();
    });
  }

  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
      closeMoreActionsMenu();
      const canUnlockHistorical = isPastHistoricalDateSelected();
      const canUnlockProtected = isProtectedVersionSelected();
      const canUnlockAny = canUnlockHistorical || canUnlockProtected;

      if (!canUnlockAny) {
        await Swal.fire(
          'No aplica',
          'Este botón solo se usa cuando estás viendo una fecha anterior o una lista protegida.',
          'info'
        );
        return;
      }

      const hasActiveUnlock =
        (canUnlockHistorical && historicalUnlockEnabled) ||
        (canUnlockProtected && protectedVersionUnlockEnabled);

      if (hasActiveUnlock) {
        historicalUnlockEnabled = false;
        protectedVersionUnlockEnabled = false;
        setHistoricalViewMode(isHistoricalDateSelected());

        await Swal.fire(
          'Bloqueado',
          'Los controles protegidos fueron bloqueados nuevamente.',
          'success'
        );
        return;
      }

      const contexts = [];
      if (canUnlockHistorical) contexts.push('la vista histórica');
      if (canUnlockProtected) contexts.push('la lista ' + getVersionLabel(versionSelect.value));

      const unlocked = await requestUnlockPassword({
        title: 'Desbloquear edición',
        text: 'Ingresa la contraseña para habilitar edición en ' + contexts.join(' y ') + '.',
        confirmButtonText: 'Desbloquear'
      });

      if (unlocked) {
        historicalUnlockEnabled = canUnlockHistorical;
        protectedVersionUnlockEnabled = canUnlockProtected;
        setHistoricalViewMode(isHistoricalDateSelected());

        await Swal.fire(
          'Desbloqueado',
          'Ya puedes editar esta vista hasta que vuelvas a bloquearla.',
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
  async function loadStoreStateForToday(options = {}) {
    const { withLoader = false } = options || {};

    const run = async () => {
      clearHistoricalSelection();
      clearBulkSelection();
      body.innerHTML = '';

      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId); // hoy
      applyChecklistMeta(record?.meta || {});

      if (record && Array.isArray(record.items)) {
        record.items.forEach(addRowFromData);
        renumber();
        lastUpdateISO = record.meta?.updatedAt || null;
      } else {
        lastUpdateISO = null;
      }

      lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
      updateBulkSelectionUI();
      updateRequisitionUI();
    };

    if (withLoader) {
      return withLoading('Cargando checklist actual...', run);
    }

    return run();
  }

  await withLoading('Cargando checklist...', async () => {
    await preloadCatalog();
    await loadStoreStateForToday();
    setHistoricalViewMode(false);
    await refreshHistoryPicker();
  });

  // → Enfocar la barra de búsqueda al iniciar
  searchInput.focus();

  // Store/version change: vuelve a hoy y refresca calendario para el docId nuevo
  storeSelect.addEventListener('change', async () => {
    closeMoreActionsMenu();
    closeMobileFab();
    await withLoading('Cambiando tienda...', async () => {
      updateStoreUI();
      currentViewDate = null;
      resetHistoricalUnlock();
      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = '';

      await loadStoreStateForToday();
      setHistoricalViewMode(false);
      await refreshHistoryPicker();
      lastCommittedVersionValue = versionSelect.value;
    });
  });

  versionSelect.addEventListener('change', async () => {
    closeMoreActionsMenu();
    closeMobileFab();
    const requestedVersion = versionSelect.value;
    const previousVersion = lastCommittedVersionValue || 'base';
    const isProtectedRequest = (typeof isProtectedVersionKey === 'function')
      ? isProtectedVersionKey(requestedVersion)
      : (requestedVersion === 'traslado');

    if (isProtectedRequest && requestedVersion !== previousVersion) {
      const hasProtectedAccess = await ensureProtectedDestinationAccess(
        requestedVersion,
        'abrir esta lista protegida'
      );

      if (!hasProtectedAccess) {
        versionSelect.value = previousVersion;
        return;
      }
    }

    await withLoading('Cargando lista...', async () => {
      currentViewDate = null;
      historicalUnlockEnabled = false;
      protectedVersionUnlockEnabled = !!isProtectedRequest;

      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = '';

      await loadStoreStateForToday();
      setHistoricalViewMode(false);
      await refreshHistoryPicker();
      lastCommittedVersionValue = versionSelect.value;
    });
  });
});
