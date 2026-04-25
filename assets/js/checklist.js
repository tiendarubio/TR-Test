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
  const btnToggleRequisition = $('btnToggleRequisition');
  const btnExcel = $('btnExcel');
  const btnPDF = $('btnPDF');
  const btnClear = $('btnClear');
  const thBodega = $('thBodega');

  // Histórico
  const histDateInput = $('histDateInput');
  const btnHistToday = $('btnHistToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const btnHistoricalSelectMode = $('btnHistoricalSelectMode');
  const btnMergeSelectedToToday = $('btnMergeSelectedToToday');
  const chkSelectAllHistory = $('chkSelectAllHistory');
  const thHistorySelect = $('thHistorySelect');
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

  // Histórico
  let histPicker = null;
  let currentViewDate = null; // null = hoy (editable)
  let histDatesWithData = new Set();
  let historicalUnlockEnabled = false;
  let protectedVersionUnlockEnabled = false;
  let historicalSelectionMode = false;
  let requisitionDone = false;
  let requisitionDoneAt = null;
  let lastCommittedVersionValue = versionSelect?.value || 'base';
  let activeUnlockSession = null;

const checklistShared = window.TRListaChecklistShared?.createBridge({
  storeSelect
});

if (!checklistShared) {
  throw new Error('TRListaChecklistShared no está disponible.');
}

const {
  getBinId,
  getStoreVersions,
  getListLabel,
  isProtectedVersionKey,
  preloadCatalog,
  saveChecklistToFirestore,
  loadChecklistFromFirestore,
  getHistoryDates,
  getTodayString,
  formatSV,
  getCurrentStoreName,
  sanitizeFileNamePart,
  downloadBlobFile,
  parseQuantityToInteger,
  htmlAttrEscape,
  escapeHtml,
  getLocalDateKey
} = checklistShared;

  const UNLOCK_STORAGE_KEY = 'trlista_unlock_session_v1';
  const UNLOCK_SCOPE_HISTORICAL = 'historical';
  const UNLOCK_SCOPE_PROTECTED = 'protected';


  function setToolbarButtonContent(btn, iconClassName, label) {
    if (!btn) return;
    btn.innerHTML = `
      <i class="${iconClassName}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
    `;
  }


  function getDocIdForCurrentList() {
    return getBinId(storeSelect.value, versionSelect.value);
  }

  function isHistoricalDateSelected() {
    const today = getTodayString();
    return !!(currentViewDate && today && currentViewDate !== today);
  }

  function isPastHistoricalDateSelected() {
    const today = getTodayString();
    return !!(currentViewDate && today && currentViewDate < today);
  }

  function getTargetChecklistDate() {
    const today = getTodayString();
    return currentViewDate || today;
  }

  function isProtectedVersionSelected() {
    const versionKey = String(versionSelect?.value || '');
    return !!isProtectedVersionKey(versionKey);
  }

  function isProtectedVersionEditingLocked() {
    return isProtectedVersionSelected() && !(protectedVersionUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_PROTECTED));
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

  function getUnlockStorage() {
    try {
      return window.sessionStorage;
    } catch (_) {
      return null;
    }
  }

  function normalizeUnlockScopes(scopes = []) {
    const list = Array.isArray(scopes) ? scopes : [scopes];

    return [...new Set(
      list
        .map(scope => String(scope || '').trim())
        .filter(Boolean)
    )].sort();
  }

  function getRequestedUnlockScopes(options = {}) {
    const explicitScopes = normalizeUnlockScopes(options.scopes || []);
    if (explicitScopes.length) return explicitScopes;

    const derivedScopes = [];
    if (options.historical) derivedScopes.push(UNLOCK_SCOPE_HISTORICAL);
    if (options.protected) derivedScopes.push(UNLOCK_SCOPE_PROTECTED);
    return normalizeUnlockScopes(derivedScopes);
  }

  function readStoredUnlockSession() {
    if (activeUnlockSession) {
      const activeExpiresAt = Date.parse(String(activeUnlockSession.expiresAt || ''));
      if (Number.isFinite(activeExpiresAt) && activeExpiresAt > Date.now()) {
        return activeUnlockSession;
      }
      activeUnlockSession = null;
    }

    const storage = getUnlockStorage();
    if (!storage) return null;

    try {
      const raw = storage.getItem(UNLOCK_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const token = String(parsed?.token || '').trim();
      const expiresAt = String(parsed?.expiresAt || '').trim();
      const scopes = normalizeUnlockScopes(parsed?.scopes || []);

      const expiresAtMs = Date.parse(expiresAt);

      if (!token || !expiresAt || !scopes.length || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        storage.removeItem(UNLOCK_STORAGE_KEY);
        return null;
      }

      activeUnlockSession = { token, expiresAt, scopes };
      return activeUnlockSession;
    } catch (_) {
      return null;
    }
  }

  function persistUnlockSession(sessionData) {
    const token = String(sessionData?.token || '').trim();
    const expiresAt = String(sessionData?.expiresAt || '').trim();
    const scopes = normalizeUnlockScopes(sessionData?.scopes || []);

    if (!token || !expiresAt || !scopes.length) {
      clearStoredUnlockSession();
      return;
    }

    activeUnlockSession = { token, expiresAt, scopes };

    const storage = getUnlockStorage();
    if (!storage) return;

    storage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(activeUnlockSession));
  }

  function clearStoredUnlockSession() {
    activeUnlockSession = null;

    const storage = getUnlockStorage();
    if (!storage) return;
    storage.removeItem(UNLOCK_STORAGE_KEY);
  }

  function sessionCoversScopes(sessionData, requiredScopes = []) {
    const normalizedScopes = normalizeUnlockScopes(requiredScopes);
    if (!normalizedScopes.length) return true;

    const token = String(sessionData?.token || '').trim();
    const expiresAt = Date.parse(String(sessionData?.expiresAt || ''));
    const sessionScopes = new Set(normalizeUnlockScopes(sessionData?.scopes || []));

    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return false;
    }

    return normalizedScopes.every(scope => sessionScopes.has(scope));
  }

  function hasActiveUnlockScope(scope) {
    return sessionCoversScopes(readStoredUnlockSession(), [scope]);
  }

  async function verifyUnlockSession(requiredScopes = []) {
    const normalizedScopes = normalizeUnlockScopes(requiredScopes);
    const sessionData = readStoredUnlockSession();

    if (!sessionCoversScopes(sessionData, normalizedScopes)) {
      clearStoredUnlockSession();
      return false;
    }

    const resp = await fetch('/api/validate-historical-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'token',
        token: sessionData.token,
        scopes: normalizedScopes
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      clearStoredUnlockSession();
      return false;
    }

    persistUnlockSession({
      token: sessionData.token,
      expiresAt: data.expiresAt || sessionData.expiresAt,
      scopes: normalizeUnlockScopes(data.scopes || sessionData.scopes)
    });

    return true;
  }

  async function requestUnlockPassword(options = {}) {
    const title = options.title || 'Desbloquear edición';
    const text = options.text || 'Ingresa la contraseña para continuar.';
    const confirmButtonText = options.confirmButtonText || 'Desbloquear';
    const requiredScopes = getRequestedUnlockScopes(options);

    if (requiredScopes.length) {
      try {
        const hasReusableSession = await verifyUnlockSession(requiredScopes);
        if (hasReusableSession) {
          return true;
        }
      } catch (err) {
        console.warn('No se pudo reutilizar la sesión de desbloqueo:', err?.message || err);
        clearStoredUnlockSession();
      }
    }

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
      footer: requiredScopes.length
        ? 'El desbloqueo se mantendrá activo temporalmente en esta pestaña.'
        : '',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      preConfirm: async (password) => {
        if (!password) {
          Swal.showValidationMessage('Debes ingresar la contraseña.');
          return false;
        }

        try {
          const sessionData = await validateHistoricalPassword(password, requiredScopes);
          if (!sessionData.ok) {
            Swal.showValidationMessage('Contraseña incorrecta.');
            return false;
          }
          return sessionData;
        } catch (err) {
          Swal.showValidationMessage(String(err.message || err));
          return false;
        }
      }
    });

    if (result.isConfirmed && result.value?.ok) {
      persistUnlockSession(result.value);
      return true;
    }

    return false;
  }

  async function ensureProtectedDestinationAccess(versionKey, actionLabel = 'continuar') {
    const isProtectedDestination = isProtectedVersionKey(versionKey);

    if (!isProtectedDestination) return true;

    return requestUnlockPassword({
      title: 'Acceso a lista protegida',
      text: 'Ingresa la contraseña para ' + actionLabel + ' en la lista ' + getVersionLabel(versionKey) + '.',
      confirmButtonText: 'Continuar',
      scopes: [UNLOCK_SCOPE_PROTECTED]
    });
  }

  function buildChecklistMeta(options = {}) {
    const storeKey = options.storeKey ?? storeSelect.value;
    const storeName = options.storeName ?? getCurrentStoreName();
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
    return getListLabel(versionKey);
  }

  function getStoreVersionKeys(storeKey) {
    return getStoreVersions(storeKey).filter(Boolean);
  }

  function getDestinationVersionKeys(storeKey, currentVersionKey) {
    return getStoreVersionKeys(storeKey)
      .filter(versionKey => versionKey !== currentVersionKey);
  }



  function getAllDestinationVersionKeys(storeKey) {
    return getStoreVersionKeys(storeKey);
  }

  function isHistoricalSelectionAvailable() {
    return isPastHistoricalDateSelected();
  }

  function getHistoricalSelectionCells() {
    return [...body.querySelectorAll('.history-select-cell')];
  }

  function getHistoricalSelectionCheckboxes() {
    return [...body.querySelectorAll('.row-history-select-checkbox')];
  }

  function getSelectedHistoricalRows() {
    return getHistoricalSelectionCheckboxes()
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr'))
      .filter(Boolean);
  }

  function clearHistoricalSelection(options = {}) {
    const { keepMode = false } = options || {};

    getHistoricalSelectionCheckboxes().forEach(cb => {
      cb.checked = false;
    });

    if (chkSelectAllHistory) {
      chkSelectAllHistory.checked = false;
      chkSelectAllHistory.indeterminate = false;
    }

    if (!keepMode) {
      historicalSelectionMode = false;
    }
  }

  function updateHistorySelectAllState() {
    if (!chkSelectAllHistory) return;

    const canSelect = historicalSelectionMode && isHistoricalSelectionAvailable();
    const checkboxes = getHistoricalSelectionCheckboxes();
    const enabledCheckboxes = checkboxes.filter(cb => !cb.disabled);
    const checkedCount = enabledCheckboxes.filter(cb => cb.checked).length;

    chkSelectAllHistory.disabled = !canSelect || !enabledCheckboxes.length;
    chkSelectAllHistory.setAttribute('aria-disabled', String(chkSelectAllHistory.disabled));
    chkSelectAllHistory.checked = !!enabledCheckboxes.length && checkedCount === enabledCheckboxes.length;
    chkSelectAllHistory.indeterminate = checkedCount > 0 && checkedCount < enabledCheckboxes.length;

    if (btnMergeSelectedToToday) {
      const shouldShow = canSelect;
      btnMergeSelectedToToday.classList.toggle('d-none', !shouldShow);
      btnMergeSelectedToToday.disabled = !shouldShow || checkedCount === 0;
      btnMergeSelectedToToday.setAttribute('aria-disabled', String(btnMergeSelectedToToday.disabled));
    }
  }

  function updateHistoricalSelectionUI() {
    const canSelectFromThisView = isHistoricalSelectionAvailable();
    const showSelection = canSelectFromThisView && historicalSelectionMode;

    if (!canSelectFromThisView && historicalSelectionMode) {
      clearHistoricalSelection();
      historicalSelectionMode = false;
    }

    if (btnHistoricalSelectMode) {
      btnHistoricalSelectMode.classList.toggle('d-none', !canSelectFromThisView);
      btnHistoricalSelectMode.disabled = !canSelectFromThisView;
      btnHistoricalSelectMode.setAttribute('aria-disabled', String(btnHistoricalSelectMode.disabled));
      btnHistoricalSelectMode.classList.toggle('btn-outline-info', !showSelection);
      btnHistoricalSelectMode.classList.toggle('btn-info', showSelection);
      btnHistoricalSelectMode.classList.toggle('text-white', showSelection);
      setToolbarButtonContent(
        btnHistoricalSelectMode,
        showSelection ? 'fa-solid fa-check-double' : 'fa-regular fa-square-check',
        showSelection ? 'Selección activa' : 'Seleccionar productos'
      );
    }

    if (thHistorySelect) {
      thHistorySelect.classList.toggle('d-none', !showSelection);
    }

    getHistoricalSelectionCells().forEach(cell => {
      cell.classList.toggle('d-none', !showSelection);
      const checkbox = cell.querySelector('.row-history-select-checkbox');
      if (checkbox) {
        checkbox.disabled = !showSelection;
        checkbox.setAttribute('aria-disabled', String(checkbox.disabled));
        if (!showSelection) checkbox.checked = false;
      }
    });

    updateHistorySelectAllState();
  }

  function buildChecklistItemFromRow(tr) {
    return {
      codigo_barras: tr.cells[1].innerText.trim(),
      nombre: tr.cells[2].innerText.trim(),
      codigo_inventario: tr.cells[3].innerText.trim(),
      bodega: tr.cells[4].innerText.trim(),
      cantidad: (tr.querySelector('.qty')?.value || '').trim(),
      revisado: tr.cells[6].querySelector('button').classList.contains('on'),
      despachado: tr.cells[7].querySelector('button').classList.contains('on')
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

      const selectedRows = getSelectedHistoricalRows();
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
      const today = getLocalDateKey();

      if (!toDoc || !today) {
        await Swal.fire(
          'Configuración incompleta',
          'No se encontró la lista destino o la fecha actual.',
          'error'
        );
        return;
      }

      const tiendaName = getCurrentStoreName();
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
        updateHistorySelectAllState();
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

      clearHistoricalSelection({ keepMode: true });
      updateHistoricalSelectionUI();

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
      (isPastHistorical && historicalUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_HISTORICAL)) ||
      (isProtected && protectedVersionUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_PROTECTED));

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
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloquear edición');
      return;
    }

    if (isUnlocked) {
      btnToggleHistLock.classList.add('btn-outline-success');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-lock', 'Bloquear edición');
    } else {
      btnToggleHistLock.classList.add('btn-outline-warning');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloquear edición');
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
      setToolbarButtonContent(btnToggleRequisition, 'fa-solid fa-flag', 'Requisición hecha');
      btnToggleRequisition.title = requisitionDoneAt
        ? ('Marcada como hecha: ' + formatSV(requisitionDoneAt))
        : 'Marcada como requisición hecha.';
    } else {
      btnToggleRequisition.classList.add('btn-outline-secondary');
      setToolbarButtonContent(btnToggleRequisition, 'fa-regular fa-flag', 'Requisición pendiente');
      btnToggleRequisition.title = 'Marcar esta lista como requisición hecha.';
    }
  }

  function resetHistoricalUnlock() {
    historicalUnlockEnabled = false;
    protectedVersionUnlockEnabled = false;
    clearStoredUnlockSession();
    updateHistoricalLockUI();
    updateRequisitionUI();
  }

  async function validateHistoricalPassword(password, scopes = []) {
    const resp = await fetch('/api/validate-historical-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        scopes: normalizeUnlockScopes(scopes)
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(data.error || 'No se pudo validar la contraseña.');
    }

    return {
      ok: !!data.ok,
      token: String(data.token || '').trim(),
      expiresAt: String(data.expiresAt || '').trim(),
      scopes: normalizeUnlockScopes(data.scopes || scopes)
    };
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
    if (disableEditing && scannerService.isActive()) {
      void stopScanner();
    }

    if (btnSave) btnSave.disabled = disableEditing;
    if (btnClear) btnClear.disabled = disableEditing;

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = tr.querySelector('.qty');
      const btnRev = tr.cells[6]?.querySelector('button');
      const btnDes = tr.cells[7]?.querySelector('button');
      const btnMove = tr.querySelector('.btn-move-list');
      const btnDel = tr.querySelector('.btn-delete-row');
      const rowSelect = tr.querySelector('.row-history-select-checkbox');

      if (qty) qty.disabled = disableEditing;
      if (btnRev) btnRev.disabled = disableEditing;
      if (btnDes) btnDes.disabled = disableEditing;
      if (btnMove) btnMove.disabled = disableEditing;
      if (btnDel) btnDel.disabled = disableEditing;
      if (rowSelect) {
        rowSelect.disabled = !(historicalSelectionMode && isPastHistoricalDateSelected());
        rowSelect.setAttribute('aria-disabled', String(rowSelect.disabled));
      }
    });

    updateHistoricalLockUI();
    updateHistoricalSelectionUI();
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
    const today = getTodayString();
    return !!(
      currentViewDate &&
      today &&
      currentViewDate !== today &&
      !(historicalUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_HISTORICAL))
    );
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

      const tiendaName = getCurrentStoreName();
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

      const destinationItems = Array.isArray(destRec.items) ? destRec.items : [];

      if (findMatchingItemInArray(destinationItems, item)) {
        await Swal.fire(
          'Producto duplicado',
          'Ese producto ya existe en la lista destino. No se movió.',
          'info'
        );
        return;
      }

      destinationItems.push(item);
      destRec.items = destinationItems;
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
      <td class="text-center history-select-cell d-none">
        <input
          type="checkbox"
          class="form-check-input row-history-select-checkbox"
          aria-label="Seleccionar producto histórico para enviar a hoy"
        >
      </td>
    `;
    body.insertBefore(tr, body.firstChild);
    renumber();

    const btnRev = tr.cells[6].querySelector('button');
    const btnDes = tr.cells[7].querySelector('button');
    const btnMove = tr.cells[8].querySelector('.btn-move-list');
    const btnDel = tr.cells[8].querySelector('.btn-delete-row');
    const rowSelect = tr.querySelector('.row-history-select-checkbox');

    btnRev.addEventListener('click', () => toggleBtn(btnRev));
    btnDes.addEventListener('click', () => toggleBtn(btnDes));

    if (rowSelect) {
      rowSelect.addEventListener('change', () => {
        updateHistorySelectAllState();
      });
    }

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
            updateHistorySelectAllState();
          }
        });
      });
    }

    updateHistoricalSelectionUI();

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
const exportService = window.TRListaChecklistExports?.createService({
  body,
  getCurrentStoreName,
  getLocalDateKey,
  sanitizeFileNamePart,
  downloadBlobFile,
  parseQuantityToInteger,
  formatSV,
  getLastUpdateISO: () => lastUpdateISO,
  getCurrentViewDate: () => currentViewDate
});

if (!exportService) {
  throw new Error('TRListaChecklistExports no está disponible.');
}

async function exportPDFPorBodega() {
  return exportService.exportPDFPorBodega();
}

function exportPDFGeneral() {
  return exportService.exportPDFGeneral();
}

async function exportExcelPorBodega() {
  return exportService.exportExcelPorBodega();
}

function exportExcelGeneral() {
  return exportService.exportExcelGeneral();
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

  if (btnToggleRequisition) {
    btnToggleRequisition.addEventListener('click', async () => {
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

const historyService = window.TRListaChecklistHistory?.createService({
  elements: {
    histDateInput,
    histCalendarPanel,
    btnHistCalendar,
    body,
    lastSaved
  },
  getDocIdForCurrentList,
  getHistoryDates,
  getTodayString,
  loadChecklistFromFirestore,
  addRowFromData,
  renumber,
  applyChecklistMeta,
  formatSV,
  resetHistoricalUnlock,
  clearHistoricalSelection,
  loadStoreStateForToday,
  setHistoricalViewMode,
  getCurrentViewDate: () => currentViewDate,
  setCurrentViewDate: (value) => { currentViewDate = value; },
  getHistDatesWithData: () => histDatesWithData,
  setHistDatesWithData: (value) => { histDatesWithData = value; },
  getHistPicker: () => histPicker,
  setHistPicker: (value) => { histPicker = value; },
  setLastUpdateISO: (value) => { lastUpdateISO = value; }
});

if (!historyService) {
  throw new Error('TRListaChecklistHistory no está disponible.');
}

function rememberHistoryDate(docId, isoDate) {
  return historyService.rememberHistoryDate(docId, isoDate);
}

async function refreshHistoryPicker() {
  return historyService.refreshHistoryPicker();
}

async function loadHistoryForDate(dateStr) {
  return historyService.loadHistoryForDate(dateStr);
}

function clearHistoryPickerSelection() {
  return historyService.clearHistoryPickerSelection();
}

  if (btnHistToday) {
    btnHistToday.addEventListener('click', async () => {
      clearHistoryPickerSelection();

      currentViewDate = null;
      resetHistoricalUnlock();
      clearHistoricalSelection();
      await loadStoreStateForToday(); // vuelve a hoy
      setHistoricalViewMode(false);
      if (searchInput) searchInput.focus();
    });
  }

  if (chkSelectAllHistory) {
    chkSelectAllHistory.addEventListener('change', () => {
      const shouldCheck = !!chkSelectAllHistory.checked;
      getHistoricalSelectionCheckboxes().forEach(cb => {
        if (!cb.disabled) cb.checked = shouldCheck;
      });
      updateHistorySelectAllState();
    });
  }

  if (btnHistoricalSelectMode) {
    btnHistoricalSelectMode.addEventListener('click', async () => {
      if (!isHistoricalSelectionAvailable()) {
        await Swal.fire(
          'No aplica',
          'La selección múltiple solo está disponible cuando estás viendo una fecha anterior.',
          'info'
        );
        return;
      }

      historicalSelectionMode = !historicalSelectionMode;
      if (!historicalSelectionMode) {
        clearHistoricalSelection({ keepMode: true });
      }

      updateHistoricalSelectionUI();
    });
  }

  if (btnMergeSelectedToToday) {
    btnMergeSelectedToToday.addEventListener('click', async () => {
      await mergeSelectedHistoricalRowsToToday();
    });
  }

  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
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
        (canUnlockHistorical && historicalUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_HISTORICAL)) ||
        (canUnlockProtected && protectedVersionUnlockEnabled && hasActiveUnlockScope(UNLOCK_SCOPE_PROTECTED));

      if (hasActiveUnlock) {
        historicalUnlockEnabled = false;
        protectedVersionUnlockEnabled = false;
        clearStoredUnlockSession();
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
        confirmButtonText: 'Desbloquear',
        scopes: [
          ...(canUnlockHistorical ? [UNLOCK_SCOPE_HISTORICAL] : []),
          ...(canUnlockProtected ? [UNLOCK_SCOPE_PROTECTED] : [])
        ]
      });

      if (unlocked) {
        historicalUnlockEnabled = canUnlockHistorical;
        protectedVersionUnlockEnabled = canUnlockProtected;
        setHistoricalViewMode(isHistoricalDateSelected());

        await Swal.fire(
          'Desbloqueado',
          'Ya puedes editar esta vista temporalmente en esta pestaña hasta que vuelvas a bloquearla o expire la sesión.',
          'success'
        );
      }
    });
  }

  // ====== Barcode Scanner ======
const scannerService = window.TRListaChecklistScanner?.createService({
  elements: {
    btnScan,
    scanWrap,
    scanVideo,
    btnFilePick,
    fileScan
  },
  onCodeDetected: async (code) => {
    searchInput.value = code;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    searchInput.dispatchEvent(event);
  }
});

if (!scannerService) {
  throw new Error('TRListaChecklistScanner no está disponible.');
}

function startScanner() {
  return scannerService.startScanner();
}

function stopScanner() {
  return scannerService.stopScanner();
}

scannerService.mount();

  // ===== Carga inicial (hoy) =====
  async function loadStoreStateForToday() {
    clearHistoricalSelection();
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
    updateRequisitionUI();
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
    clearHistoryPickerSelection();

    await loadStoreStateForToday();
    setHistoricalViewMode(false);
    await refreshHistoryPicker();
    lastCommittedVersionValue = versionSelect.value;
  });

  versionSelect.addEventListener('change', async () => {
    const requestedVersion = versionSelect.value;
    const previousVersion = lastCommittedVersionValue || 'base';
    const isProtectedRequest = isProtectedVersionKey(requestedVersion);

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

    currentViewDate = null;
    historicalUnlockEnabled = false;
    protectedVersionUnlockEnabled = !!isProtectedRequest;

    clearHistoryPickerSelection();

    await loadStoreStateForToday();
    setHistoricalViewMode(false);
    await refreshHistoryPicker();
    lastCommittedVersionValue = versionSelect.value;
  });
});
