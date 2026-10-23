document.addEventListener('DOMContentLoaded', async () => {
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!window.location.hash) window.scrollTo(0, 0);
  } catch (_) {}
  if (window.TRAuth?.waitForReady) {
    try {
      await window.TRAuth.waitForReady();
    } catch (authError) {
      console.error('Error preparando autenticación:', authError);
    }
  }

  if (window.TRAuth && !window.TRAuth.isAuthorized?.()) {
    return;
  }

  const $ = (id) => document.getElementById(id);

  const storeSelect = $('storeSelect');
  const versionSelect = $('versionSelect');
  const storeBadge = $('storeBadge');
  const storeBadgeText = $('storeBadgeText');
  const lastSaved = $('lastSaved');

  const body = $('chkBody');
  const searchInput = $('searchInput');
  const btnSearchModeToggle = $('btnSearchModeToggle');
  const searchLeadLabel = $('searchLeadLabel');
  const suggestions = $('suggestions');


  // Permite que la lista desplegable del buscador tenga scroll propio en móvil.
  // No usamos preventDefault: así el navegador conserva el scroll natural de la lista.
  if (suggestions) {
    suggestions.setAttribute('role', 'listbox');
    if (searchInput) {
      searchInput.setAttribute('role', 'combobox');
      searchInput.setAttribute('aria-autocomplete', 'list');
      searchInput.setAttribute('aria-controls', 'suggestions');
    }
    ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel'].forEach(eventName => {
      suggestions.addEventListener(eventName, event => {
        event.stopPropagation();
      }, { passive: true });
    });
  }
  const btnSave = $('btnSave');
  const btnExport = $('btnExport');
  const btnToggleRequisition = $('btnToggleRequisition');
  const btnClear = $('btnClear');
  const btnDispatchSelected = $('btnDispatchSelected');
  const btnMoveSelectedToRequest = $('btnMoveSelectedToRequest');
  const btnDeleteSelected = $('btnDeleteSelected');
  const thBodega = $('thBodega');
  const chkSelectAllRows = $('chkSelectAllRows');
  const bulkSelectionBar = $('bulkSelectionBar');
  const bulkSelectionDesktopSlot = $('bulkSelectionDesktopSlot');
  const mobileFabBulkSelectionSlot = $('mobileFabBulkSelectionSlot');
  const bulkSelectionCount = $('bulkSelectionCount');
  const btnClearSelection = $('btnClearSelection');
  const btnToggleSelectAllBulk = $('btnToggleSelectAllBulk');
  const moreActionsMenu = $('moreActionsMenu');
  const warehouseActionsMenu = $('warehouseActionsMenu');
  const appLoadingOverlay = $('appLoadingOverlay');
  const appLoadingText = $('appLoadingText');
  const qtyPreviewBubble = $('qtyPreviewBubble');
  const mobileFabToggle = $('mobileFabToggle');
  const mobileFabMenu = $('mobileFabMenu');
  const mobileFabBackdrop = $('mobileFabBackdrop');
  const mobileFabClose = $('mobileFabClose');
  const btnFabSave = $('btnFabSave');
  const btnFabSearchList = $('btnFabSearchList');
  const btnFabSortWarehouse = $('btnFabSortWarehouse');
  const btnFabExport = $('btnFabExport');
  const btnFabRequisition = $('btnFabRequisition');
  const btnFabClear = $('btnFabClear');
  const btnFabScrollTop = $('btnFabScrollTop');
  const btnFabCloseRequest = $('btnFabCloseRequest');
  const btnFabDispatchRequest = $('btnFabDispatchRequest');
  const btnFabCancelRequest = $('btnFabCancelRequest');
  const btnFabMergeRequests = $('btnFabMergeRequests');
  const btnFabExportPendingRequisitions = $('btnFabExportPendingRequisitions');
  const btnFabRequisitionsByDay = $('btnFabRequisitionsByDay');
  const btnFabConsolidatePendingRequisitions = $('btnFabConsolidatePendingRequisitions');
  const btnFabWarehouseNotifications = $('btnFabWarehouseNotifications');
  const btnOpenReplenishment = $('btnOpenReplenishment');
  const btnFabReplenishment = $('btnFabReplenishment');
  const btnSyncDailySales = $('btnSyncDailySales');
  const replenishmentStatus = $('replenishmentStatus');
  const mobileFabRequestSectionTitle = $('mobileFabRequestSectionTitle');
  const mobileFabToolsSectionTitle = $('mobileFabToolsSectionTitle');
  const searchModeHint = $('searchModeHint');
  const listSearchCount = $('listSearchCount');
  const mobileChecklistCards = $('mobileChecklistCards');

  // Flujo de solicitudes
  const requestFlowCard = $('requestFlowCard');
  const requestFlowTitle = $('requestFlowTitle');
  const requestFlowMeta = $('requestFlowMeta');
  const requestStatusBadge = $('requestStatusBadge');
  const btnStartList = $('btnStartList');
  const btnSubmitRequest = $('btnSubmitRequest');
  const btnViewCurrentRequest = $('btnViewCurrentRequest');
  const btnConfirmRequestReceived = $('btnConfirmRequestReceived');
  const btnViewRequestHistory = $('btnViewRequestHistory');
  const warehouseInboxCard = $('warehouseInboxCard');
  const warehouseInboxMeta = $('warehouseInboxMeta');
  const btnWarehouseInbox = $('btnWarehouseInbox');
  const btnWarehouseNotifications = $('btnWarehouseNotifications');
  const btnCreateWarehouseRequest = $('btnCreateWarehouseRequest');
  const warehouseInboxBadge = $('warehouseInboxBadge');
  const btnCloseWarehouseRequest = $('btnCloseWarehouseRequest');
  const btnMarkRequestDispatched = $('btnMarkRequestDispatched');
  const btnCancelWarehouseRequest = $('btnCancelWarehouseRequest');
  const btnMergeWarehouseRequests = $('btnMergeWarehouseRequests');
  const btnExportPendingRequisitions = $('btnExportPendingRequisitions');
  const btnRequisitionsByDay = $('btnRequisitionsByDay');
  const btnConsolidatePendingRequisitions = $('btnConsolidatePendingRequisitions');
  const warehouseIdleNotice = $('warehouseIdleNotice');
  const scanToastHost = $('scanToastHost');

  // Histórico
  const histDateInput = $('histDateInput');
  const btnHistToday = $('btnHistToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const btnHistCalendar = $('btnHistCalendar');
  const histCalendarPanel = $('histCalendarPanel');

  // Scanner elements
  const btnScan = $('btnScan');
  const btnScannerSoundToggle = $('btnScannerSoundToggle');
  const scanWrap = $('scanWrap');
  const scanVideo = $('scanVideo');
  const html5QrReader = $('html5QrReader');
  const btnFilePick = $('btnFilePick');
  const fileScan = $('fileScan');

  let sortAsc = true;
  let lastUpdateISO = null;
  let loadingCounter = 0;

  let mediaStream = null;
  let scanInterval = null;
  let detector = null;
  let html5QrScanner = null;
  let html5QrScannerActive = false;

  // Histórico
  let histPicker = null;
  let currentViewDate = null; // null = hoy (editable)
  let histDatesWithData = new Set();
  let historicalUnlockEnabled = false;
  let protectedVersionUnlockEnabled = false;
  let requisitionDone = false;
  let requisitionDoneAt = null;
  let requestFlowState = { status: 'none', requestId: null, submittedAt: null, createdAt: null, itemCount: 0, record: null };
  let activeWarehouseRequest = null;
  let activeWarehouseRequestSnapshot = '';
  let lastCommittedVersionValue = versionSelect?.value || 'base';
  let listSearchTerm = '';
  let primarySearchMode = 'catalog';
  let catalogSearchIndex = null;
  let catalogSearchRenderTimer = null;
  let lastCatalogQuery = '';
  let suppressProductAddedToast = false;
  let isBulkRenderingRows = false;
  let scannerAudioContext = null;
  let scannerSoundEnabled = localStorage.getItem('trlistaScannerSound') !== 'off';
  let warehouseRequestsUnsubscribe = null;
  let warehouseNotificationPrimed = false;
  let knownWarehouseRequestIds = new Set();
  let notifiedWarehouseRequestIds = new Set();
  let warehouseInboxCounts = { pending: 0, review: 0, dispatched: 0, received: 0, total: 0 };
  let clientConfigCache = null;
  let fcmRegistrationPromise = null;
  let fcmTokenRegistered = false;
  let autoSaveTimer = null;
  let autoSaveInFlight = false;
  let autoSaveQueued = false;
  let autoSaveDirty = false;
  let lastAutoSaveSignature = '';
  let lastAutoSaveToastAt = 0;
  let suppressMobileCardRefresh = false;
  let pendingMobileCardRefresh = false;
  const AUTO_SAVE_DELAY_MS = 2500;

  const REQUEST_STATUSES = Object.freeze({
    NONE: 'none',
    DRAFT: 'draft',
    SENT: 'enviado',
    REVIEW: 'en_revision',
    DISPATCHED: 'despachado',
    DISPATCHED_REQUISITION_PENDING: 'despachado_requisicion_pendiente',
    DISPATCHED_REQUISITION_DONE: 'despachado_requisicion_hecha',
    PARTIAL_DISPATCH: 'despacho_parcial',
    RECEIVED: 'recibido',
    CANCELLED: 'cancelado',
    MERGED: 'fusionado'
  });

  const REQUEST_STATUS_META = Object.freeze({
    none: { label: 'Sin iniciar', badge: 'text-bg-secondary' },
    draft: { label: 'En edición', badge: 'text-bg-warning' },
    borrador: { label: 'En edición', badge: 'text-bg-warning' },
    enviado: { label: 'Enviada a bodega', badge: 'text-bg-primary' },
    en_revision: { label: 'En revisión', badge: 'text-bg-info' },
    despacho_parcial: { label: 'Despacho parcial', badge: 'text-bg-warning' },
    despachado: { label: 'Despachado', badge: 'text-bg-success' },
    despachado_requisicion_pendiente: { label: 'Despachado/Pendiente de requisición', badge: 'text-bg-warning' },
    despachado_requisicion_hecha: { label: 'Despachado/Requisición hecha', badge: 'text-bg-success' },
    recibido: { label: 'Recibida', badge: 'text-bg-dark' },
    cancelado: { label: 'Cancelada', badge: 'text-bg-danger' },
    cancelada: { label: 'Cancelada', badge: 'text-bg-danger' },
    fusionado: { label: 'Fusionada', badge: 'text-bg-secondary' },
    fusionada: { label: 'Fusionada', badge: 'text-bg-secondary' }
  });

  function normalizeRequestStatus(status, fallback = REQUEST_STATUSES.NONE) {
    const value = String(status || fallback || REQUEST_STATUSES.NONE).trim().toLowerCase();
    if (value === 'borrador') return REQUEST_STATUSES.DRAFT;
    if (value === 'recibida') return REQUEST_STATUSES.RECEIVED;
    if (value === 'cancelada') return REQUEST_STATUSES.CANCELLED;
    if (value === 'fusionada') return REQUEST_STATUSES.MERGED;
    if (['despachada_requisicion_pendiente', 'despachado/requisicion_pendiente', 'despachada/requisición_pendiente', 'despachado/pendiente_de_requisicion', 'despachado/pendiente de requisición'].includes(value)) {
      return REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING;
    }
    if (['despachada_requisicion_hecha', 'despachado/requisicion_hecha', 'despachada/requisición_hecha'].includes(value)) {
      return REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE;
    }
    return value || fallback || REQUEST_STATUSES.NONE;
  }

  function getToastIcon(type) {
    if (type === 'success') return 'fa-circle-check';
    if (type === 'warning') return 'fa-triangle-exclamation';
    if (type === 'error') return 'fa-circle-xmark';
    return 'fa-circle-info';
  }


  function updateScannerSoundButton() {
    if (!btnScannerSoundToggle) return;
    btnScannerSoundToggle.classList.toggle('is-muted', !scannerSoundEnabled);
    btnScannerSoundToggle.title = scannerSoundEnabled ? 'Sonido del escáner activado' : 'Sonido del escáner desactivado';
    btnScannerSoundToggle.setAttribute('aria-pressed', scannerSoundEnabled ? 'true' : 'false');
    btnScannerSoundToggle.innerHTML = scannerSoundEnabled
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';
  }

  function getScannerAudioContext() {
    if (!scannerSoundEnabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      if (!scannerAudioContext) scannerAudioContext = new AudioCtx();
      if (scannerAudioContext.state === 'suspended') {
        scannerAudioContext.resume().catch(() => {});
      }
      return scannerAudioContext;
    } catch (_err) {
      return null;
    }
  }

  function vibrateScannerFeedback(type) {
    if (!scannerSoundEnabled || !navigator.vibrate) return;
    const patterns = {
      success: [70],
      warning: [45, 35, 45],
      error: [110, 55, 110],
      info: [35]
    };
    try { navigator.vibrate(patterns[type] || patterns.info); } catch (_err) {}
  }

  function playTone(ctx, startAt, frequency, duration, gainValue = 0.055) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.025);
  }

  function playScannerFeedback(type = 'info') {
    if (!scannerSoundEnabled) return;
    vibrateScannerFeedback(type);

    const ctx = getScannerAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + 0.01;
      if (type === 'success') {
        playTone(ctx, now, 880, 0.075, 0.05);
        playTone(ctx, now + 0.085, 1175, 0.09, 0.05);
      } else if (type === 'warning') {
        playTone(ctx, now, 740, 0.055, 0.045);
        playTone(ctx, now + 0.075, 740, 0.055, 0.045);
      } else if (type === 'error') {
        playTone(ctx, now, 260, 0.14, 0.06);
      } else {
        playTone(ctx, now, 660, 0.055, 0.04);
      }
    } catch (_err) {}
  }

  updateScannerSoundButton();

  if (btnScannerSoundToggle) {
    btnScannerSoundToggle.addEventListener('click', () => {
      scannerSoundEnabled = !scannerSoundEnabled;
      localStorage.setItem('trlistaScannerSound', scannerSoundEnabled ? 'on' : 'off');
      updateScannerSoundButton();
      if (scannerSoundEnabled) {
        playScannerFeedback('info');
        showScanToast('info', 'Sonido activado', 'El escáner avisará con beep y vibración.', { timeout: 2200 });
      } else {
        showScanToast('info', 'Sonido desactivado', 'El escáner seguirá mostrando avisos visuales.', { timeout: 2200 });
      }
    });
  }

  function showAppToast(type, title, message, options = {}) {
    const safeType = ['success', 'info', 'warning', 'error'].includes(type) ? type : 'info';
    const timeout = Number(options.timeout || options.timer || 2600);
    const toastTitle = String(title || '').trim();
    const toastMessage = String(message || '').trim();

    // En pantallas compactas usamos siempre el host propio. SweetAlert2 puede modificar
    // foco, clases del body y compensación del scrollbar incluso en modo toast; algunos
    // navegadores móviles interpretan esos cambios como una solicitud de volver arriba.
    const useNativeMobileToast = isCompactScreen();

    // En escritorio se conserva SweetAlert2, pero sin restauración de foco ni ajustes
    // automáticos de altura/scroll para que el aviso no altere la posición de la vista.
    if (!useNativeMobileToast && window.Swal?.mixin) {
      const Toast = Swal.mixin({
        toast: true,
        position: options.position || 'top-end',
        icon: safeType,
        showConfirmButton: false,
        returnFocus: false,
        heightAuto: false,
        scrollbarPadding: false,
        timer: timeout > 0 ? timeout : undefined,
        timerProgressBar: timeout > 0,
        customClass: {
          popup: 'tr-swal-toast'
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });

      return Toast.fire({
        title: toastTitle,
        text: toastMessage
      });
    }

    if (!scanToastHost) return Promise.resolve();

    const toast = document.createElement('div');
    toast.className = `scan-toast scan-toast-${safeType}`;
    toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="scan-toast-icon" aria-hidden="true"><i class="fa-solid ${getToastIcon(safeType)}"></i></span>
      <span class="scan-toast-content">
        <span class="scan-toast-title">${escapeHtml(toastTitle)}</span>
        <span class="scan-toast-message">${escapeHtml(toastMessage)}</span>
      </span>
      <button type="button" class="scan-toast-close" aria-label="Cerrar aviso"><i class="fa-solid fa-xmark"></i></button>
    `;

    const closeToast = () => {
      if (!toast.isConnected) return;
      toast.classList.add('is-hiding');
      window.setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('.scan-toast-close')?.addEventListener('click', closeToast);
    scanToastHost.appendChild(toast);

    while (scanToastHost.children.length > 3) {
      scanToastHost.firstElementChild?.remove();
    }

    if (timeout > 0) {
      window.setTimeout(closeToast, timeout);
    }

    return Promise.resolve();
  }

  function showScanToast(type, title, message, options = {}) {
    // Compatibilidad: el nombre histórico se mantiene, pero todos los avisos pasan por una sola función.
    return showAppToast(type, title, message, options);
  }

  function normalizeCatalogText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function ensureCatalogSearchIndex(rows = window.CATALOGO_CACHE || []) {
    if (catalogSearchIndex && catalogSearchIndex.source === rows) {
      return catalogSearchIndex.items;
    }

    const items = (Array.isArray(rows) ? rows : []).map(row => {
      const nombre = row?.[0] || '';
      const codInv = row?.[1] || '';
      const bodega = row?.[2] || '';
      const barcode = row?.[3] || '';
      return {
        row,
        searchText: normalizeCatalogText(`${nombre} ${codInv} ${bodega} ${barcode}`)
      };
    });

    catalogSearchIndex = { source: rows, items };
    return items;
  }

  function clearCatalogSearchTimer() {
    if (catalogSearchRenderTimer) {
      window.clearTimeout(catalogSearchRenderTimer);
      catalogSearchRenderTimer = null;
    }
  }

  function renderCatalogSuggestions(rows, rawQuery) {
    if (!suggestions) return;
    const q = normalizeCatalogText(rawQuery);
    if (suggestions) suggestions.innerHTML = '';
    currentFocus = -1;
    if (!q) return;

    const matches = ensureCatalogSearchIndex(rows)
      .filter(entry => entry.searchText.includes(q))
      .slice(0, 40);

    suggestions.setAttribute('role', 'listbox');

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted small';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', 'true');
      li.textContent = 'Sin coincidencias en catálogo.';
      suggestions.appendChild(li);
      return;
    }

    const frag = document.createDocumentFragment();
    matches.forEach(({ row: r }, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.setAttribute('role', 'option');
      li.id = `catalog-suggestion-${index}`;
      const nombre = r[0] || '';
      const codInv = r[1] || 'N/A';
      const bodega = r[2] || '';
      const barcode = r[3] || 'sin código';
      li.textContent = `${nombre} (${barcode}) [${codInv}] — ${bodega}`;
      li.addEventListener('click', async () => {
        await handleProductSelection(buildItemFromCatalogRow(r));
      });
      frag.appendChild(li);
    });
    suggestions.appendChild(frag);
  }

  const currentUserRole = String(window.TRAuth?.getCurrentRole?.() || 'sin_acceso').trim().toLowerCase();
  const currentUserEmail = String(window.TRAuth?.getCurrentUser?.()?.email || '').trim().toLowerCase();
  const currentUserStoreKey = String(window.TRAuth?.getCurrentStoreKey?.() || '').trim();

  function hasRole(...roles) {
    return roles.includes(currentUserRole);
  }

  function canUnlockHistoricalViews() {
    return hasRole('admin', 'supervisor');
  }

  function canUseProtectedLists() {
    return hasRole('admin', 'supervisor');
  }


  function canUseWarehouseTools() {
    return hasRole('admin', 'supervisor');
  }

  // El usuario de bodega (ROLE_SUPERVISOR_EMAILS) trabaja por bandeja.
  // No debe cargar ni editar una tabla hasta abrir una solicitud enviada.
  function requiresWarehouseRequestContext() {
    return hasRole('supervisor');
  }

  function hasActiveWarehouseRequest() {
    return !!(activeWarehouseRequest && activeWarehouseRequest.requestId);
  }

  function getActiveWarehouseRequestStatus(fallback = '') {
    const rawStatus = activeWarehouseRequest?.status
      ?? activeWarehouseRequest?.original?.status
      ?? fallback;
    return normalizeRequestStatus(rawStatus, fallback);
  }

  function getActiveWarehouseSnapshot() {
    if (!hasActiveWarehouseRequest()) return '';
    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    return JSON.stringify({
      requestId: activeWarehouseRequest.requestId,
      storeKey: storeSelect?.value || '',
      versionKey: versionSelect?.value || '',
      requestDate: getTargetChecklistDate(),
      status: activeWarehouseRequest.status || '',
      items
    });
  }

  function rememberActiveWarehouseSnapshot() {
    activeWarehouseRequestSnapshot = getActiveWarehouseSnapshot();
  }

  function hasUnsavedActiveWarehouseChanges() {
    if (!requiresWarehouseRequestContext() || !hasActiveWarehouseRequest()) return false;
    return getActiveWarehouseSnapshot() !== activeWarehouseRequestSnapshot;
  }

  async function confirmLeaveActiveWarehouseRequest(actionLabel = 'cambiar de solicitud') {
    if (!hasUnsavedActiveWarehouseChanges()) return true;

    const result = await Swal.fire({
      title: 'Cambios sin guardar',
      html: '<div class="text-start small">Tienes cambios sin guardar en la solicitud activa.<br><br>¿Qué deseas hacer antes de ' + escapeHtml(actionLabel) + '?</div>',
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Guardar y continuar',
      denyButtonText: 'Continuar sin guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      const saveResult = await persistCurrentChecklist({
        showSuccess: false,
        successTitle: 'Guardado',
        successMessage: 'Cambios guardados correctamente.'
      });
      return !!saveResult?.ok;
    }

    if (result.isDenied) return true;
    return false;
  }

  function getAutoSaveSignature() {
    try {
      const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
      return JSON.stringify({
        role: currentUserRole,
        storeKey: storeSelect?.value || '',
        versionKey: versionSelect?.value || '',
        targetDay: getTargetChecklistDate(),
        requestId: activeWarehouseRequest?.requestId || requestFlowState?.requestId || '',
        requestStatus: normalizeRequestStatus(requestFlowState?.status || activeWarehouseRequest?.status || REQUEST_STATUSES.NONE),
        items
      });
    } catch (_err) {
      return '';
    }
  }

  function canAutoSaveCurrentChecklist() {
    if (!body || !btnSave) return false;
    if (loadingCounter > 0 || isBulkRenderingRows) return false;
    if (isEditingLocked()) return false;

    if (isBranchOperator()) {
      return isRequestDraftStatus(requestFlowState?.status);
    }

    if (requiresWarehouseRequestContext()) {
      return hasActiveWarehouseRequest();
    }

    // Admin conserva guardado manual para evitar escrituras automáticas sobre vistas técnicas/legacy.
    return false;
  }

  function setAutoSaveStatus(status, detail = '') {
    if (!lastSaved) return;
    if (status === 'pending') {
      lastSaved.innerHTML = '<i class="fa-solid fa-circle-exclamation me-1 text-warning"></i>Cambios sin guardar' + (detail ? ': ' + escapeHtml(detail) : '.');
      return;
    }
    if (status === 'saving') {
      lastSaved.innerHTML = '<i class="fa-solid fa-rotate fa-spin me-1 text-primary"></i>Guardando automáticamente...';
      return;
    }
    if (status === 'error') {
      lastSaved.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1 text-danger"></i>No se pudo autoguardar.';
    }
  }

  function queueAutoSave(reason = 'cambio') {
    if (!canAutoSaveCurrentChecklist()) return;
    const signature = getAutoSaveSignature();
    if (!signature || signature === lastAutoSaveSignature) return;

    autoSaveDirty = true;
    setAutoSaveStatus('pending');
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
      autoSaveTimer = null;
      runAutoSave(reason);
    }, AUTO_SAVE_DELAY_MS);
  }

  function cancelPendingAutoSave() {
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    autoSaveDirty = false;
    autoSaveQueued = false;
  }

  async function runAutoSave(reason = 'cambio') {
    if (!autoSaveDirty || !canAutoSaveCurrentChecklist()) return;
    if (autoSaveInFlight) {
      autoSaveQueued = true;
      return;
    }

    const beforeSignature = getAutoSaveSignature();
    if (!beforeSignature || beforeSignature === lastAutoSaveSignature) {
      autoSaveDirty = false;
      return;
    }

    autoSaveInFlight = true;
    autoSaveDirty = false;
    setAutoSaveStatus('saving');

    try {
      const docId = getDocIdForCurrentList();
      const payload = collectPayload();
      const targetDay = getTargetChecklistDate();

      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);

      if (isBranchOperator()) {
        requestFlowState = buildRequestSummaryFromRecord(payload);
      } else if (activeWarehouseRequest) {
        await syncActiveWarehouseRequest();
      }

      lastAutoSaveSignature = getAutoSaveSignature() || beforeSignature;
      updateLastSavedText(payload.meta?.updatedAt || new Date().toISOString());
      updateRequestFlowUI({ refreshMobileCards: false });

      const nowMs = Date.now();
      if (!isMobileQuantityEditorActive() && nowMs - lastAutoSaveToastAt > 12000) {
        showScanToast('success', 'Guardado automático', formatSV(payload.meta?.updatedAt || new Date().toISOString()), { timeout: 1900 });
        lastAutoSaveToastAt = nowMs;
      }
    } catch (err) {
      console.error('Error en autoguardado:', err);
      setAutoSaveStatus('error');
      showScanToast('error', 'No se pudo autoguardar', 'Revisa la conexión y usa Guardar.', { timeout: 4200 });
      autoSaveDirty = true;
    } finally {
      autoSaveInFlight = false;
      if (autoSaveQueued) {
        autoSaveQueued = false;
        queueAutoSave('cambio pendiente');
      }
    }
  }

  function resetAutoSaveBaseline() {
    cancelPendingAutoSave();
    ensureWarehouseFilterOption();
    ensureWarehouseVersionFilterOption();
    lastAutoSaveSignature = getAutoSaveSignature();
  }

  function isWarehouseWaitingForRequest() {
    return requiresWarehouseRequestContext() && !hasActiveWarehouseRequest();
  }

  function canWarehouseEditActiveRequest() {
    return canUseWarehouseTools() && (!requiresWarehouseRequestContext() || hasActiveWarehouseRequest());
  }

  function canWarehouseUseActiveRequestAction() {
    return canWarehouseEditActiveRequest() && !isEditingLocked();
  }

  function canUseBulkSelection() {
    return hasRole('admin', 'supervisor', 'operador');
  }

  function isBranchOperator() {
    return hasRole('operador');
  }

  function supportsBrowserNotifications() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  function getBrowserNotificationPermission() {
    if (!supportsBrowserNotifications()) return 'unsupported';
    return Notification.permission || 'default';
  }

  async function loadClientConfig() {
    if (clientConfigCache) return clientConfigCache;
    try {
      const response = await fetch('/api/client-config', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo leer configuración pública.');
      clientConfigCache = await response.json();
    } catch (err) {
      console.warn('No se pudo cargar configuración pública:', err);
      clientConfigCache = { ok: false, firebaseVapidKey: '' };
    }
    return clientConfigCache;
  }

  function supportsFirebaseMessaging() {
    return typeof firebase !== 'undefined'
      && !!firebase.messaging
      && 'serviceWorker' in navigator
      && supportsBrowserNotifications()
      && (location.protocol === 'https:' || location.hostname === 'localhost');
  }

  async function getCurrentUserIdToken() {
    const user = window.TRAuth?.getCurrentUser?.();
    if (!user || typeof user.getIdToken !== 'function') return '';
    try {
      return await user.getIdToken();
    } catch (err) {
      console.warn('No se pudo obtener ID token:', err);
      return '';
    }
  }

  async function registerWarehouseFcmToken({ silent = false } = {}) {
    if (!canUseWarehouseTools()) return false;
    if (!supportsFirebaseMessaging()) {
      if (!silent) await showScanToast('info', 'No compatible', 'Este navegador no permite push web con Firebase Cloud Messaging.');
      return false;
    }

    if (Notification.permission !== 'granted') return false;
    if (fcmRegistrationPromise) return fcmRegistrationPromise;

    fcmRegistrationPromise = (async () => {
      const config = await loadClientConfig();
      const vapidKey = String(config.firebaseVapidKey || '').trim();
      if (!vapidKey) {
        if (!silent) await showScanToast('warning', 'Falta VAPID key', 'La variable VITE_FIREBASE_VAPID_KEY no está disponible desde /api/client-config.');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = firebase.messaging();
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
      if (!token) {
        if (!silent) showScanToast('warning', 'Push no registrado', 'El navegador no devolvió token FCM.', { timeout: 3500 });
        return false;
      }

      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        if (!silent) await showScanToast('warning', 'Sesión requerida', 'No se pudo validar la sesión para registrar notificaciones.');
        return false;
      }

      const response = await fetch('/api/register-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({ token, userAgent: navigator.userAgent || '' })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo registrar el token FCM.');

      fcmTokenRegistered = true;

      try {
        messaging.onMessage((payload) => {
          const notification = payload.notification || {};
          const dataPayload = payload.data || {};
          const requestId = String(dataPayload.requestId || '').trim();
          const fallbackReq = {
            id: requestId,
            requestId,
            status: dataPayload.status || REQUEST_STATUSES.SENT,
            storeName: dataPayload.storeName || 'Sucursal',
            itemCount: Number(dataPayload.itemCount || 0),
            _notificationTitle: notification.title || 'Nueva solicitud a bodega',
            _notificationBody: notification.body || ''
          };

          if (requestId && canUseWarehouseTools()) {
            loadRequestFromFirestore(requestId)
              .then(req => {
                notifyNewWarehouseRequest(req || fallbackReq);
                updateWarehouseInboxBadge(warehouseInboxCounts);
              })
              .catch(() => notifyNewWarehouseRequest(fallbackReq));
          } else {
            notifyNewWarehouseRequest(fallbackReq);
          }
        });
      } catch (_) {}

      return true;
    })().finally(() => {
      fcmRegistrationPromise = null;
      updateWarehouseNotificationButton();
    });

    return fcmRegistrationPromise;
  }

  function getWarehouseNotificationPermissionLabel() {
    const permission = getBrowserNotificationPermission();
    if (permission === 'granted' && fcmTokenRegistered) return 'Push ON';
    if (permission === 'granted') return 'Notificaciones activas';
    if (permission === 'denied') return 'Notificaciones bloqueadas';
    if (permission === 'unsupported') return 'No compatible';
    return 'Activar notificaciones';
  }

  function copyButtonStateToFab(source, target, fallbackIconClassName, fallbackLabel) {
    if (!target) return false;

    const hidden = !source || source.classList.contains('d-none') || source.getAttribute('aria-hidden') === 'true';
    target.classList.toggle('d-none', hidden);
    target.setAttribute('aria-hidden', String(hidden));

    if (hidden) {
      target.disabled = true;
      target.setAttribute('aria-disabled', 'true');
      return false;
    }

    target.disabled = !!source.disabled;
    target.setAttribute('aria-disabled', String(target.disabled));
    target.title = source.title || fallbackLabel || '';

    const sourceIcon = source.querySelector('i');
    const sourceLabel = source.querySelector('span');
    const iconClassName = sourceIcon
      ? Array.from(sourceIcon.classList).filter(cls => cls !== 'me-1' && cls !== 'me-2').join(' ')
      : fallbackIconClassName;
    const label = (sourceLabel?.textContent || fallbackLabel || '').trim();

    target.innerHTML = `
      <i class="${escapeHtml(iconClassName)}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
    `;

    return true;
  }

  function setFabButtonVisibility(btn, visible) {
    if (!btn) return false;
    btn.classList.toggle('d-none', !visible);
    btn.setAttribute('aria-hidden', String(!visible));
    if (!visible) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    return !!visible;
  }

  function syncMobileFabGeneralActions() {
    const rowsCount = body ? body.querySelectorAll('tr').length : 0;
    const hasRows = rowsCount > 0;
    const draft = isRequestDraftStatus(normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE));
    const locked = isEditingLocked();
    const saveVisible = isBranchOperator()
      ? draft
      : (!requiresWarehouseRequestContext() || hasActiveWarehouseRequest());
    const saveEnabled = saveVisible && !locked;

    if (btnFabSortWarehouse) {
      setFabButtonVisibility(btnFabSortWarehouse, hasRows);
      if (hasRows) {
        btnFabSortWarehouse.disabled = locked;
        btnFabSortWarehouse.setAttribute('aria-disabled', String(locked));
      }
    }

    if (btnFabExport) {
      setFabButtonVisibility(btnFabExport, hasRows);
      if (hasRows) {
        btnFabExport.disabled = false;
        btnFabExport.setAttribute('aria-disabled', 'false');
      }
    }

    if (btnFabClear) {
      setFabButtonVisibility(btnFabClear, hasRows && !locked);
      if (hasRows && !locked) {
        btnFabClear.disabled = false;
        btnFabClear.setAttribute('aria-disabled', 'false');
      }
    }

    if (btnFabSave) {
      setFabButtonVisibility(btnFabSave, saveVisible);
      if (saveVisible) {
        btnFabSave.disabled = !saveEnabled;
        btnFabSave.setAttribute('aria-disabled', String(btnFabSave.disabled));
      }
    }
  }

  function syncMobileFabWarehouseActions() {
    syncMobileFabGeneralActions();

    const hasActiveRequestActions = [
      copyButtonStateToFab(btnMarkRequestDispatched, btnFabDispatchRequest, 'fa-solid fa-truck-ramp-box', 'Finalizar despacho'),
      copyButtonStateToFab(btnCancelWarehouseRequest, btnFabCancelRequest, 'fa-solid fa-ban', 'Cancelar solicitud'),
      copyButtonStateToFab(btnToggleRequisition, btnFabRequisition, 'fa-solid fa-file-circle-check', 'Marcar requisición como hecha')
    ].some(Boolean);

    if (btnFabWarehouseNotifications) {
      btnFabWarehouseNotifications.classList.add('d-none');
      btnFabWarehouseNotifications.setAttribute('aria-hidden', 'true');
      btnFabWarehouseNotifications.disabled = true;
      btnFabWarehouseNotifications.setAttribute('aria-disabled', 'true');
    }

    const hasWarehouseTools = [
      copyButtonStateToFab(btnMergeWarehouseRequests, btnFabMergeRequests, 'fa-solid fa-code-merge', 'Fusionar solicitudes'),
      copyButtonStateToFab(btnRequisitionsByDay, btnFabRequisitionsByDay, 'fa-solid fa-calendar-days', 'Requisiciones por día'),
      copyButtonStateToFab(btnExportPendingRequisitions, btnFabExportPendingRequisitions, 'fa-solid fa-file-zipper', 'Exportar pendientes por solicitud'),
      copyButtonStateToFab(btnConsolidatePendingRequisitions, btnFabConsolidatePendingRequisitions, 'fa-solid fa-layer-group', 'Consolidar pendientes por bodega')
    ].some(Boolean);

    if (mobileFabRequestSectionTitle) {
      mobileFabRequestSectionTitle.classList.toggle('d-none', !hasActiveRequestActions);
    }

    if (mobileFabToolsSectionTitle) {
      mobileFabToolsSectionTitle.classList.toggle('d-none', !hasWarehouseTools);
    }
  }

  function refreshAuthMenuDividerFromChecklist() {
    if (window.TRAuth?.refreshMenuDividers) {
      window.TRAuth.refreshMenuDividers();
      return;
    }
    const divider = $('authBeforeLogoutDivider');
    if (!divider) return;
    const hasVisibleAction = ['btnAdminPanel', 'btnOperationalView', 'btnAuthWarehouseNotifications']
      .some(id => {
        const el = $(id);
        return !!el && !el.classList.contains('d-none') && el.getAttribute('aria-hidden') !== 'true';
      });
    divider.classList.toggle('d-none', !hasVisibleAction);
    divider.setAttribute('aria-hidden', String(!hasVisibleAction));
  }

  function renderWarehouseNotificationButton(button, options = {}) {
    if (!button) return;
    const { dropdown = false, show = false, permission = getBrowserNotificationPermission() } = options;

    button.classList.toggle('d-none', !show);
    button.setAttribute('aria-hidden', String(!show));
    if (!show) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      return;
    }

    const disabled = permission === 'unsupported';
    const label = permission === 'granted' ? 'Notificaciones ON' : getWarehouseNotificationPermissionLabel();
    const iconClass = permission === 'granted' ? 'fa-solid fa-bell' : 'fa-regular fa-bell';
    const iconSpacing = dropdown ? 'me-2' : 'me-1';
    const iconColor = dropdown
      ? (permission === 'denied' ? 'text-danger' : (permission === 'granted' ? 'text-success' : 'text-primary'))
      : '';

    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
    button.classList.toggle('is-active', permission === 'granted');
    button.classList.toggle('is-blocked', permission === 'denied');
    button.title = permission === 'denied'
      ? 'El navegador bloqueó las notificaciones. Actívalas desde la configuración del sitio.'
      : getWarehouseNotificationPermissionLabel();
    button.innerHTML = `
      <i class="${escapeHtml([iconClass, iconSpacing, iconColor].filter(Boolean).join(' '))}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
    `;
  }

  function updateWarehouseNotificationButton() {
    const show = canUseWarehouseTools();
    const permission = getBrowserNotificationPermission();

    renderWarehouseNotificationButton(btnWarehouseNotifications, { show, permission });
    renderWarehouseNotificationButton(btnAuthWarehouseNotifications, { show, permission, dropdown: true });

    refreshAuthMenuDividerFromChecklist();
    syncMobileFabWarehouseActions();
  }

  async function requestWarehouseBrowserNotifications() {
    if (!supportsBrowserNotifications()) {
      await showScanToast('info', 'No compatible', 'Este navegador no permite notificaciones del sistema para esta app.');
      updateWarehouseNotificationButton();
      return false;
    }

    if (Notification.permission === 'denied') {
      await showScanToast('info', 'Notificaciones bloqueadas', 'El navegador bloqueó las notificaciones. Debes habilitarlas desde la configuración del sitio o del navegador.');
      updateWarehouseNotificationButton();
      return false;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    updateWarehouseNotificationButton();

    if (permission !== 'granted') {
      showScanToast('warning', 'Notificaciones no activadas', 'Seguirás viendo avisos dentro de la app.', { timeout: 3000 });
      return false;
    }

    const fcmOk = await registerWarehouseFcmToken({ silent: false });
    updateWarehouseNotificationButton();

    if (fcmOk) {
      showScanToast('success', 'Push activado', 'Bodega podrá recibir avisos del navegador cuando entren solicitudes.', { timeout: 3500 });
    } else {
      showScanToast('info', 'Notificaciones activas', 'Recibirás avisos mientras la app esté abierta. Revisa VAPID/FCM para push cerrado.', { timeout: 4200 });
    }

    playWarehouseNotificationSound();
    return true;
  }

  function playWarehouseNotificationSound() {
    // Usa Web Audio para evitar archivos de audio pesados.
    let ctx = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!scannerAudioContext) scannerAudioContext = new AudioCtx();
      ctx = scannerAudioContext;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const tones = [740, 980];
      tones.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (index * 0.09));
        gain.gain.setValueAtTime(0.0001, now + (index * 0.09));
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015 + (index * 0.09));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + (index * 0.09));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (index * 0.09));
        osc.stop(now + 0.14 + (index * 0.09));
      });
    } catch (_) {}

    if (navigator.vibrate) {
      try { navigator.vibrate([90, 40, 90]); } catch (_) {}
    }
  }

  function getWarehouseNotificationKey(req) {
    if (!req) return '';
    return String(req.id || req.requestId || req._notificationBody || '').trim();
  }

  function shouldNotifyWarehouseRequest(req) {
    const status = normalizeRequestStatus(req?.status || REQUEST_STATUSES.SENT);
    if (status !== REQUEST_STATUSES.SENT) return false;
    const key = getWarehouseNotificationKey(req);
    if (!key) return true;
    if (notifiedWarehouseRequestIds.has(key)) return false;
    notifiedWarehouseRequestIds.add(key);
    return true;
  }

  function showWarehouseBrowserNotification(req) {
    if (!supportsBrowserNotifications() || Notification.permission !== 'granted') return;
    const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
    const storeName = req.storeName || getStoreLabel(req.storeKey);
    const requestId = req.id || req.requestId || 'sin ID';
    const friendlyId = getFriendlyRequestCode(req);
    try {
      const notification = new Notification('Nueva solicitud a bodega', {
        body: storeName + ' envió ' + count + ' producto(s). Solicitud: ' + friendlyId,
        tag: 'trlista-' + requestId,
        requireInteraction: false
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        openWarehouseRequest(req).catch(err => console.error('No se pudo abrir solicitud desde notificación:', err));
      };
    } catch (err) {
      console.warn('No se pudo mostrar notificación del navegador:', err);
    }
  }

  function updateWarehouseInboxBadge(counts = warehouseInboxCounts) {
    warehouseInboxCounts = counts || warehouseInboxCounts;
    const pending = Number(warehouseInboxCounts.pending || 0);
    if (warehouseInboxBadge) {
      warehouseInboxBadge.textContent = pending > 99 ? '99+' : String(pending);
      warehouseInboxBadge.classList.toggle('d-none', pending <= 0);
    }

    if (warehouseInboxMeta && requiresWarehouseRequestContext() && !hasActiveWarehouseRequest()) {
      const review = Number(warehouseInboxCounts.review || 0);
      const dispatched = Number(warehouseInboxCounts.dispatched || 0);
      warehouseInboxMeta.textContent = 'Bandeja de solicitudes. Pendientes: ' + pending + ' · En revisión: ' + review + ' · Despachadas: ' + dispatched + '.';
    }
  }

  function calculateWarehouseRequestCounts(requests = []) {
    const counts = { pending: 0, review: 0, dispatched: 0, received: 0, total: requests.length };
    requests.forEach(req => {
      const status = normalizeRequestStatus(req.status || REQUEST_STATUSES.SENT);
      if (status === REQUEST_STATUSES.SENT) counts.pending += 1;
      else if (status === REQUEST_STATUSES.REVIEW || status === REQUEST_STATUSES.PARTIAL_DISPATCH) counts.review += 1;
      else if (isDispatchedRequestStatus(status)) counts.dispatched += 1;
      else if (status === REQUEST_STATUSES.RECEIVED) counts.received += 1;
    });
    return counts;
  }

  function notifyNewWarehouseRequest(req) {
    if (!req || !shouldNotifyWarehouseRequest(req)) return;
    const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
    const storeName = req.storeName || getStoreLabel(req.storeKey);
    const requestId = req.id || req.requestId || 'sin ID';
    const title = req._notificationTitle || 'Nueva solicitud recibida';
    const bodyText = req._notificationBody || (storeName + ' envió ' + count + ' producto(s). Solicitud: ' + getFriendlyRequestCode(req));

    showScanToast('success', title, bodyText, { timeout: 7000 });
    playWarehouseNotificationSound();
    showWarehouseBrowserNotification(req);
  }

  function startWarehouseInboxNotifications() {
    if (!canUseWarehouseTools()) return;
    if (warehouseRequestsUnsubscribe) {
      try { warehouseRequestsUnsubscribe(); } catch (_) {}
      warehouseRequestsUnsubscribe = null;
    }

    try {
      const db = getFirestoreDb();
      const query = db.collection('requests').orderBy('submittedAt', 'desc').limit(300);
      warehouseNotificationPrimed = false;
      knownWarehouseRequestIds = new Set();
      notifiedWarehouseRequestIds = new Set();

      warehouseRequestsUnsubscribe = query.onSnapshot((snap) => {
        const rows = snap.docs
          .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
          .sort((a, b) => String(b.submittedAt || b.createdAt || '').localeCompare(String(a.submittedAt || a.createdAt || '')));

        updateWarehouseInboxBadge(calculateWarehouseRequestCounts(rows));

        if (!warehouseNotificationPrimed) {
          rows.forEach(req => knownWarehouseRequestIds.add(String(req.id || req.requestId || '')));
          warehouseNotificationPrimed = true;
          return;
        }

        snap.docChanges().forEach(change => {
          const req = { id: change.doc.id, ...(change.doc.data() || {}) };
          const id = String(req.id || req.requestId || '');
          const isNew = change.type === 'added' && !knownWarehouseRequestIds.has(id);
          if (id) knownWarehouseRequestIds.add(id);
          if (isNew) notifyNewWarehouseRequest(req);
        });

        if (typeof refreshHistoryPicker === 'function') {
          refreshHistoryPicker().catch(err => console.warn('No se pudo refrescar calendario por notificación:', err));
        }
      }, (err) => {
        console.warn('No se pudo activar escucha de solicitudes:', err);
        showScanToast('warning', 'Bandeja sin escucha automática', 'Puedes seguir usando “Ver bandeja” para actualizar manualmente.', { timeout: 5000 });
      });
    } catch (err) {
      console.warn('No se pudo iniciar notificaciones de bodega:', err);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (warehouseRequestsUnsubscribe) {
      try { warehouseRequestsUnsubscribe(); } catch (_) {}
    }
  });

  function canDeleteRows() {
    return hasRole('admin', 'supervisor', 'operador');
  }

  function getRoleAccessLabel() {
    return currentUserEmail || currentUserRole || 'sin_acceso';
  }

  function getAssignedStoreLabel() {
    if (typeof getStoreLabel === 'function') {
      return getStoreLabel(currentUserStoreKey);
    }
    return currentUserStoreKey || 'tu sucursal';
  }

  function hasStoreRestriction() {
    return currentUserRole === 'operador' && !!currentUserStoreKey;
  }


  function getRequestStatusMeta(status) {
    const value = normalizeRequestStatus(status);
    return REQUEST_STATUS_META[value] || { label: value || 'Sin iniciar', badge: 'text-bg-secondary' };
  }

  function getRequestStatusLabel(status) {
    return getRequestStatusMeta(status).label;
  }

  function getRequestStatusBadgeClass(status) {
    return getRequestStatusMeta(status).badge;
  }

  function isDispatchedRequestStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE
    ].includes(value);
  }

  function isReceivableRequestStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE
    ].includes(value);
  }

  function isRequestTerminalStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE,
      REQUEST_STATUSES.RECEIVED,
      REQUEST_STATUSES.CANCELLED,
      REQUEST_STATUSES.MERGED
    ].includes(value);
  }

  function getRequestDateKey(req) {
    return String(req?.requestDate || req?.submittedAt || req?.createdAt || '').slice(0, 10);
  }


  function getRequestStorePrefix(storeKey) {
    const key = String(storeKey || '').trim();
    if (key === 'lista_sexta_calle') return 'SXTA';
    if (key === 'lista_avenida_morazan') return 'AVM';
    if (key === 'lista_centro_comercial') return 'CC';
    if (key === '__all__') return 'TODAS';
    return normalizeRequestIdPart(key || 'GEN').slice(0, 6).toUpperCase();
  }

  function getRequestTypeLabel(reqOrVersion) {
    const version = typeof reqOrVersion === 'string'
      ? reqOrVersion
      : String(reqOrVersion?.versionKey || reqOrVersion?.version || 'base');
    return getVersionLabel(version || 'base');
  }

  function getFriendlyRequestCode(reqLike = {}) {
    const rawId = String(reqLike.id || reqLike.requestId || reqLike.request_id || '').trim();
    const storeKey = String(reqLike.storeKey || reqLike.destinationStoreKey || '').trim();
    const date = getRequestDateKey(reqLike) || String(rawId.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '').trim();
    const compactDate = date ? date.replace(/-/g, '') : '';
    const origin = String(reqLike.origin || '').toLowerCase();
    const version = String(reqLike.versionKey || reqLike.version || '').trim();
    const prefix = origin === 'warehouse'
      ? ('BOD-' + getRequestStorePrefix(storeKey))
      : getRequestStorePrefix(storeKey || rawId.split('__')[0]);
    if (compactDate) {
      const typeSuffix = version === 'traslado' || origin === 'warehouse' ? '-TR' : '';
      return prefix + '-' + compactDate + typeSuffix;
    }
    return rawId ? rawId.replace(/^lista_/i, '').replace(/__/g, ' · ').replace(/_/g, ' ') : 'Solicitud sin ID';
  }

  function getRequestDisplayTitle(reqLike = {}) {
    const origin = String(reqLike.origin || '').toLowerCase();
    const storeName = reqLike.destinationStoreName || reqLike.storeName || getStoreLabel(reqLike.destinationStoreKey || reqLike.storeKey);
    const typeLabel = getRequestTypeLabel(reqLike);
    if (origin === 'warehouse') {
      return 'Traslado Bodega → ' + storeName;
    }
    return 'Solicitud ' + getFriendlyRequestCode(reqLike) + ' · ' + typeLabel;
  }

  function getRequestDisplaySubtitle(reqLike = {}) {
    const storeName = reqLike.destinationStoreName || reqLike.storeName || getStoreLabel(reqLike.destinationStoreKey || reqLike.storeKey);
    const typeLabel = getRequestTypeLabel(reqLike);
    const date = getRequestDateKey(reqLike);
    const parts = [storeName, typeLabel];
    if (date) parts.push(date);
    return parts.filter(Boolean).join(' · ');
  }


  function getActiveRequestExportMeta() {
    const req = activeWarehouseRequest || requestFlowState?.record || requestFlowState || {};
    const requestDate = getRequestDateKey(req) || getTargetChecklistDate() || (typeof getTodayString === 'function' ? getTodayString() : '');
    const printDate = (typeof getTodayString === 'function' ? getTodayString() : new Date().toISOString().slice(0, 10));
    const requestCode = getFriendlyRequestCode(req);
    const storeName = req.destinationStoreName || req.storeName || getStoreLabel(req.destinationStoreKey || req.storeKey || storeSelect?.value);
    const typeLabel = getRequestTypeLabel(req.versionKey || req.version || versionSelect?.value || 'base');
    return { requestDate, printDate, requestCode, storeName, typeLabel };
  }

  function updateWarehouseTodayButtonLabel() {
    if (!btnHistToday) return;
    const label = btnHistToday.querySelector('span');
    const icon = btnHistToday.querySelector('i');
    const isWarehouseActive = requiresWarehouseRequestContext() && hasActiveWarehouseRequest();
    if (isWarehouseActive) {
      if (label) label.textContent = 'Cerrar solicitud';
      if (icon) icon.className = 'fa-solid fa-xmark';
      btnHistToday.title = 'Cerrar la solicitud activa y volver a la bandeja';
      btnHistToday.classList.remove('btn-outline-secondary');
      btnHistToday.classList.add('btn-outline-primary');
    } else {
      if (label) label.textContent = 'Hoy';
      if (icon) icon.className = 'fa-solid fa-rotate-left';
      btnHistToday.title = 'Volver a hoy';
      btnHistToday.classList.remove('btn-outline-primary');
      btnHistToday.classList.add('btn-outline-secondary');
    }
  }

  function isRequestSentStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [
      REQUEST_STATUSES.SENT,
      REQUEST_STATUSES.REVIEW,
      REQUEST_STATUSES.PARTIAL_DISPATCH,
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE,
      REQUEST_STATUSES.RECEIVED,
      REQUEST_STATUSES.CANCELLED,
      REQUEST_STATUSES.MERGED
    ].includes(value);
  }

  function isRequestDraftStatus(status) {
    return normalizeRequestStatus(status, '') === REQUEST_STATUSES.DRAFT;
  }

  function getCurrentRequestIdForToday() {
    const day = typeof getTodayString === 'function' ? getTodayString() : null;
    if (!day || typeof getRequestId !== 'function') return null;
    return getRequestId(storeSelect.value, versionSelect.value, day);
  }

  function normalizeRequestIdPart(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'sin_valor';
  }

  function buildWarehouseCreatedRequestId(storeKey, versionKey, day = getTodayString()) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 17);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return ['bodega', storeKey, versionKey || 'base', day, stamp, randomSuffix]
      .map(normalizeRequestIdPart)
      .join('__');
  }

  function buildStoreOptionsHtml(selectedValue = '') {
    const options = Array.from(storeSelect?.options || [])
      .filter(option => option.value && option.value !== '__all__');
    return options.map(option => `
      <option value="${htmlAttrEscape(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${escapeHtml(option.textContent || option.label || option.value)}</option>
    `).join('');
  }

  function buildVersionOptionsHtml(selectedValue = 'base', optionsConfig = {}) {
    const includeProtected = !!optionsConfig.includeProtected;
    const onlyProtected = !!optionsConfig.onlyProtected;
    const options = Array.from(versionSelect?.options || [])
      .filter(option => {
        if (!option.value) return false;
        const protectedOption = option.value === 'traslado';
        if (onlyProtected) return protectedOption;
        return includeProtected || !protectedOption;
      });
    return options.map(option => `
      <option value="${htmlAttrEscape(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${escapeHtml(option.textContent || option.label || option.value)}</option>
    `).join('');
  }

  function buildRequestSummaryFromRecord(record = {}) {
    const meta = record?.meta || {};
    const items = Array.isArray(record?.items) ? record.items : [];
    const status = String(meta.request_status || meta.solicitud_status || '').trim().toLowerCase();
    const requestId = String(meta.request_id || '').trim() || getCurrentRequestIdForToday();
    const createdAt = meta.request_created_at || meta.createdAt || meta.updatedAt || null;
    const submittedAt = meta.request_submitted_at || meta.submittedAt || null;
    const dispatchedAt = meta.request_dispatched_at || meta.dispatchedAt || null;
    const cancelledAt = meta.request_cancelled_at || meta.cancelledAt || null;
    const mergedAt = meta.request_merged_at || meta.mergedAt || null;
    const mergedIntoRequestId = meta.merged_into_request_id || meta.mergedIntoRequestId || null;
    const receivedAt = meta.request_received_at || meta.receivedAt || null;
    const origin = meta.request_origin || meta.origin || null;

    if (status) {
      return {
        status,
        requestId,
        createdAt,
        submittedAt,
        dispatchedAt,
        cancelledAt,
        mergedAt,
        mergedIntoRequestId,
        receivedAt,
        origin,
        itemCount: Number(meta.request_item_count || items.length || 0),
        record
      };
    }

    if (items.length) {
      return {
        status: REQUEST_STATUSES.DRAFT,
        requestId,
        createdAt: meta.updatedAt || null,
        submittedAt: null,
        itemCount: items.length,
        record
      };
    }

    return {
      status: REQUEST_STATUSES.NONE,
      requestId: null,
      createdAt: null,
      submittedAt: null,
      itemCount: 0,
      record: null
    };
  }

  function isBranchRequestEditingLocked() {
    if (!isBranchOperator()) return false;
    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    return !isRequestDraftStatus(status);
  }

  function updateRequestFlowUI(options = {}) {
    const { refreshMobileCards = true } = options || {};
    const isBranch = isBranchOperator();
    const warehouse = canUseWarehouseTools();
    const warehouseRequestMode = requiresWarehouseRequestContext();
    const warehouseHasActive = hasActiveWarehouseRequest();
    const activeWarehouseStatus = getActiveWarehouseRequestStatus('');
    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    const sent = isRequestSentStatus(status);
    const draft = isRequestDraftStatus(status);
    const none = status === 'none' || !status;
    const itemCount = Number(requestFlowState?.itemCount || body?.rows?.length || 0);
    const requestId = requestFlowState?.requestId || getCurrentRequestIdForToday();

    if (requestFlowCard) requestFlowCard.classList.toggle('d-none', !isBranch);
    if (warehouseInboxCard) warehouseInboxCard.classList.toggle('d-none', !warehouse);

    if (requestStatusBadge) {
      requestStatusBadge.className = 'badge rounded-pill ' + getRequestStatusBadgeClass(status);
      requestStatusBadge.textContent = getRequestStatusLabel(status);
      requestStatusBadge.classList.toggle('d-none', none && !isBranch);
    }

    if (requestFlowTitle) {
      if (none) requestFlowTitle.textContent = 'Inicia una lista para esta sucursal.';
      else if (draft) requestFlowTitle.textContent = 'Lista en edición.';
      else if (status === REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING) requestFlowTitle.textContent = 'Solicitud despachada; pendiente de requisición.';
      else if (status === REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE) requestFlowTitle.textContent = 'Solicitud despachada; requisición hecha.';
      else if (status === REQUEST_STATUSES.DISPATCHED) requestFlowTitle.textContent = 'Solicitud despachada por bodega.';
      else if (status === REQUEST_STATUSES.RECEIVED) requestFlowTitle.textContent = 'Solicitud recibida.';
      else requestFlowTitle.textContent = 'Solicitud enviada a bodega.';
    }

    if (requestFlowMeta) {
      if (none) {
        requestFlowMeta.textContent = 'Presiona “Iniciar lista” para comenzar a llenar productos. Solo se permite una solicitud por día.';
      } else if (draft) {
        requestFlowMeta.textContent = 'Puedes guardar durante el proceso. Cuando termines, usa “Finalizar y enviar”. Items actuales: ' + itemCount + '.';
      } else {
        const sentText = requestFlowState?.submittedAt ? formatSV(requestFlowState.submittedAt) : 'fecha no registrada';
        const extraParts = [];
        if (requestFlowState?.dispatchedAt) extraParts.push('Despachada: ' + formatSV(requestFlowState.dispatchedAt));
        if (requestFlowState?.receivedAt) extraParts.push('Recibida: ' + formatSV(requestFlowState.receivedAt));
        if (requestFlowState?.cancelledAt) extraParts.push('Cancelada: ' + formatSV(requestFlowState.cancelledAt));
        if (requestFlowState?.mergedIntoRequestId) extraParts.push('Fusionada con: ' + getFriendlyRequestCode({ requestId: requestFlowState.mergedIntoRequestId, id: requestFlowState.mergedIntoRequestId, storeKey: storeSelect?.value, versionKey: versionSelect?.value }));
        requestFlowMeta.textContent = getFriendlyRequestCode(requestFlowState?.record || { requestId, storeKey: storeSelect?.value, versionKey: versionSelect?.value, submittedAt: requestFlowState?.submittedAt }) + ' · Enviada: ' + sentText + ' · Items: ' + itemCount + (extraParts.length ? ' · ' + extraParts.join(' · ') : '') + '.';
      }
    }

    if (btnStartList) btnStartList.classList.toggle('d-none', !isBranch || !none);
    if (btnSubmitRequest) {
      btnSubmitRequest.classList.toggle('d-none', !isBranch || !draft);
      btnSubmitRequest.disabled = !draft || isEditingLocked();
      btnSubmitRequest.setAttribute('aria-disabled', String(btnSubmitRequest.disabled));
    }
    if (btnViewCurrentRequest) btnViewCurrentRequest.classList.toggle('d-none', !isBranch || !(sent || draft));
    if (btnConfirmRequestReceived) {
      const showReceive = isBranch && isReceivableRequestStatus(status) && !!requestId;
      btnConfirmRequestReceived.classList.toggle('d-none', !showReceive);
      btnConfirmRequestReceived.disabled = !showReceive;
      btnConfirmRequestReceived.setAttribute('aria-disabled', String(btnConfirmRequestReceived.disabled));
    }
    if (btnViewRequestHistory) btnViewRequestHistory.classList.toggle('d-none', !isBranch);

    const checklistCard = document.querySelector('.table-checklist-shell');
    const searchShell = document.querySelector('.checklist-search-shell');
    const shouldShowEditor = isBranch ? draft : (!warehouseRequestMode || warehouseHasActive);
    if (checklistCard) checklistCard.classList.toggle('d-none', !shouldShowEditor);
    if (searchShell) searchShell.classList.toggle('d-none', !shouldShowEditor);
    if (warehouseIdleNotice) warehouseIdleNotice.classList.toggle('d-none', !(warehouseRequestMode && !warehouseHasActive));

    if (isBranch) {
      if (btnSave) btnSave.disabled = !draft;
      if (btnFabSave) btnFabSave.disabled = !draft;
      if (btnClear) btnClear.disabled = !draft;
      if (searchInput) searchInput.disabled = !draft;
      if (btnScan) btnScan.disabled = !draft;
      if (btnSearchModeToggle) btnSearchModeToggle.disabled = !draft;
    }

    if (warehouseInboxMeta && warehouse) {
      if (warehouseRequestMode && warehouseHasActive) {
        const req = activeWarehouseRequest || {};
        const dirtyText = hasUnsavedActiveWarehouseChanges() ? ' · Cambios sin guardar' : '';
        const meta = getActiveRequestExportMeta();
        warehouseInboxMeta.textContent = 'Solicitud activa: ' + meta.requestCode + ' · ' + getRequestDisplaySubtitle(req) + ' · Fecha solicitud: ' + (meta.requestDate || 'Sin fecha') + ' · ' + getRequestStatusLabel(req.status || 'en_revision') + dirtyText + '.';
        updateLastSavedText(lastUpdateISO, 'Abierta sin actualización registrada.');
      } else {
        updateWarehouseInboxBadge();
      }
    }

    if (btnCreateWarehouseRequest) {
      const showCreateWarehouse = canUseWarehouseTools();
      btnCreateWarehouseRequest.classList.toggle('d-none', !showCreateWarehouse);
      btnCreateWarehouseRequest.disabled = !showCreateWarehouse;
      btnCreateWarehouseRequest.setAttribute('aria-disabled', String(btnCreateWarehouseRequest.disabled));
    }
    if (btnCloseWarehouseRequest) {
      // Evita dos rutas para lo mismo: en bodega el cierre visible queda en el botón superior “Cerrar solicitud”.
      btnCloseWarehouseRequest.classList.add('d-none');
      btnCloseWarehouseRequest.disabled = true;
      btnCloseWarehouseRequest.setAttribute('aria-disabled', 'true');
    }
    if (btnMarkRequestDispatched) {
      const activeStatus = activeWarehouseStatus;
      const finalizableStatuses = [
        REQUEST_STATUSES.SENT,
        REQUEST_STATUSES.REVIEW,
        REQUEST_STATUSES.PARTIAL_DISPATCH
      ];
      const showDispatch = canWarehouseEditActiveRequest()
        && !!activeWarehouseRequest?.requestId
        && finalizableStatuses.includes(activeStatus);
      btnMarkRequestDispatched.classList.toggle('d-none', !showDispatch);
      btnMarkRequestDispatched.disabled = !showDispatch || isEditingLocked();
      btnMarkRequestDispatched.setAttribute('aria-disabled', String(btnMarkRequestDispatched.disabled));
      btnMarkRequestDispatched.title = 'Finalizar el despacho según los productos marcados.';
    }
    if (btnCancelWarehouseRequest) {
      const activeStatus = activeWarehouseStatus;
      const showCancel = canWarehouseEditActiveRequest() && !!activeWarehouseRequest?.requestId && !isRequestTerminalStatus(activeStatus);
      btnCancelWarehouseRequest.classList.toggle('d-none', !showCancel);
      btnCancelWarehouseRequest.disabled = !showCancel || isEditingLocked();
      btnCancelWarehouseRequest.setAttribute('aria-disabled', String(btnCancelWarehouseRequest.disabled));
    }
    if (btnMergeWarehouseRequests) {
      const showMerge = canUseWarehouseTools()
        && (!warehouseHasActive || !isRequestTerminalStatus(activeWarehouseStatus));
      btnMergeWarehouseRequests.classList.toggle('d-none', !showMerge);
      btnMergeWarehouseRequests.setAttribute('aria-hidden', String(!showMerge));
      btnMergeWarehouseRequests.disabled = !showMerge;
      btnMergeWarehouseRequests.setAttribute('aria-disabled', String(btnMergeWarehouseRequests.disabled));
    }

    // Sincronizar primero la acción de requisición y después sus reflejos móviles.
    // Esto garantiza exclusión mutua entre “Finalizar despacho” y
    // “Marcar requisición como hecha”.
    updateRequisitionUI();
    syncMobileFabWarehouseActions();
    updateWarehouseTodayButtonLabel();

    if (requiresWarehouseRequestContext()) {
      const disabledBecauseActive = warehouseHasActive;
      if (storeSelect) {
        storeSelect.disabled = disabledBecauseActive;
        storeSelect.title = disabledBecauseActive ? 'Cierra la solicitud activa antes de cambiar el filtro de tienda.' : 'Filtro de tienda para la bandeja de bodega.';
      }
      if (versionSelect) {
        versionSelect.disabled = disabledBecauseActive;
        versionSelect.title = disabledBecauseActive ? 'Cierra la solicitud activa antes de cambiar la versión.' : 'Filtro de versión para la bandeja de bodega.';
      }
    }

    updateBulkSelectionUI();
    if (refreshMobileCards) {
      refreshMobileChecklistCardsSafely();
    }
  }

  async function showRequestDetail(requestLike) {
    const req = requestLike || requestFlowState || {};
    const items = Array.isArray(req.items)
      ? req.items
      : Array.isArray(req.record?.items)
        ? req.record.items
        : [];
    const requestId = req.id || req.requestId || req.request_id || requestFlowState?.requestId || 'sin ID';
    const status = req.status || req.request_status || requestFlowState?.status || 'none';
    const storeName = req.storeName || req.tienda || getStoreLabel(req.storeKey || storeSelect.value);
    const submittedAt = req.submittedAt || requestFlowState?.submittedAt || req.request_submitted_at || null;
    const dispatchedAt = req.dispatchedAt || requestFlowState?.dispatchedAt || req.request_dispatched_at || null;
    const cancelledAt = req.cancelledAt || requestFlowState?.cancelledAt || req.request_cancelled_at || null;
    const mergedAt = req.mergedAt || requestFlowState?.mergedAt || req.request_merged_at || null;
    const mergedIntoRequestId = req.mergedIntoRequestId || requestFlowState?.mergedIntoRequestId || req.merged_into_request_id || null;
    const receivedAt = req.receivedAt || requestFlowState?.receivedAt || req.request_received_at || null;
    const origin = req.origin || req.request_origin || null;
    const destinationStoreName = req.destinationStoreName || req.destino || null;
    const requisitionStatus = req.requisitionStatus || (req.requisitionDone ? 'hecha' : null);
    const requisitionItemCount = Number(req.requisitionItemCount || (Array.isArray(req.requisitionItems) ? req.requisitionItems.length : 0));

    const canConfirmReceivedFromDetail = isBranchOperator() && isReceivableRequestStatus(status) && !!requestId;

    const rowsHtml = items.length
      ? items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(item.nombre || item.name || '')}</td>
            <td>${escapeHtml(item.codigo_inventario || item.codigoInv || item.inventoryCode || item.codigoInventario || '')}</td>
            <td>${escapeHtml(item.bodega || item.warehouse || '')}</td>
            <td class="text-end">${escapeHtml(item.cantidad || item.quantity || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" class="text-center text-muted">Sin items.</td></tr>';

    const detailResult = await Swal.fire({
      title: 'Detalle de solicitud',
      width: 920,
      html: `
        <div class="text-start small">
          <div class="mb-2"><strong>Solicitud:</strong> ${escapeHtml(getFriendlyRequestCode(req))}</div>
          <div class="mb-2"><strong>Tienda:</strong> ${escapeHtml(storeName)}</div>
          ${origin === 'warehouse' ? `<div class="mb-2"><strong>Origen:</strong> Bodega${destinationStoreName ? ' · Destino: ' + escapeHtml(destinationStoreName) : ''}</div>` : ''}
          <div class="mb-2"><strong>Estado:</strong> ${escapeHtml(getRequestStatusLabel(status))}</div>
          ${submittedAt ? `<div class="mb-2"><strong>Solicitada:</strong> ${escapeHtml(formatSV(submittedAt))}</div>` : ''}
          ${dispatchedAt ? `<div class="mb-2"><strong>Despachada:</strong> ${escapeHtml(formatSV(dispatchedAt))}</div>` : ''}
          ${receivedAt ? `<div class="mb-2"><strong>Recibida:</strong> ${escapeHtml(formatSV(receivedAt))}</div>` : ''}
          ${requisitionStatus ? `<div class="mb-2"><strong>Requisición:</strong> ${escapeHtml(requisitionStatus === 'hecha' ? 'Hecha' : 'Pendiente')}${requisitionItemCount ? ' · ' + requisitionItemCount + ' producto(s) retirados de la lista despachada' : ''}</div>` : ''}
          ${cancelledAt ? `<div class="mb-2"><strong>Cancelada:</strong> ${escapeHtml(formatSV(cancelledAt))}</div>` : ''}
          ${mergedIntoRequestId ? `<div class="mb-2"><strong>Fusionada con:</strong> ${escapeHtml(getFriendlyRequestCode({ requestId: mergedIntoRequestId, id: mergedIntoRequestId, storeKey: req.storeKey, versionKey: req.versionKey, requestDate: String(mergedIntoRequestId).match(/\d{4}-\d{2}-\d{2}/)?.[0] || getRequestDateKey(req) }))}${mergedAt ? ' · ' + escapeHtml(formatSV(mergedAt)) : ''}</div>` : ''}
          <div class="mb-3"><strong>Enviada:</strong> ${escapeHtml(submittedAt ? formatSV(submittedAt) : 'No enviada')}</div>
          <div class="table-responsive request-detail-table-wrap">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr><th>#</th><th>Producto</th><th>Cód. inv.</th><th>Bodega</th><th class="text-end">Cant.</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `,
      confirmButtonText: canConfirmReceivedFromDetail ? 'Confirmar recibido' : 'Cerrar',
      showCancelButton: canConfirmReceivedFromDetail,
      cancelButtonText: 'Cerrar'
    });

    if (canConfirmReceivedFromDetail && detailResult.isConfirmed) {
      await confirmBranchRequestReceived({ requestId, status }, { skipPrompt: true });
    }
  }


  function getComputedDispatchStatus() {
    const rows = [...body.getElementsByTagName('tr')];
    if (!rows.length) return normalizeRequestStatus(activeWarehouseRequest?.status || REQUEST_STATUSES.REVIEW);
    const dispatchedCount = rows.filter(tr => !!getDispatchButton(tr)?.classList.contains('on')).length;
    if (dispatchedCount <= 0) return REQUEST_STATUSES.REVIEW;
    if (dispatchedCount >= rows.length) return REQUEST_STATUSES.DISPATCHED;
    return REQUEST_STATUSES.PARTIAL_DISPATCH;
  }

  function updateActiveRequestDispatchVisualStatus() {
    if (!activeWarehouseRequest?.requestId || !canUseWarehouseTools()) return;
    const currentStatus = getActiveWarehouseRequestStatus(REQUEST_STATUSES.REVIEW);
    if (isRequestTerminalStatus(currentStatus)) return;
    const nextStatus = getComputedDispatchStatus();
    if (nextStatus === REQUEST_STATUSES.DISPATCHED) {
      // No cerrar automáticamente la solicitud completa; “Finalizar despacho” realiza el cierre formal.
      activeWarehouseRequest.status = REQUEST_STATUSES.PARTIAL_DISPATCH;
    } else {
      activeWarehouseRequest.status = nextStatus;
    }
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      status: activeWarehouseRequest.status
    };
    updateRequestFlowUI({ refreshMobileCards: false });
  }

  function buildActiveWarehouseRequestSyncPayload(statusOverride = null) {
    if (!activeWarehouseRequest || !canUseWarehouseTools()) return null;

    const rows = [...body.getElementsByTagName('tr')];
    const items = rows.map(buildChecklistItemFromRow);
    let status = statusOverride || getActiveWarehouseRequestStatus(REQUEST_STATUSES.REVIEW);
    if (!statusOverride && !isRequestTerminalStatus(status)) {
      const computed = getComputedDispatchStatus();
      status = computed === REQUEST_STATUSES.DISPATCHED ? REQUEST_STATUSES.PARTIAL_DISPATCH : computed;
    }
    status = normalizeRequestStatus(status, REQUEST_STATUSES.REVIEW);

    const requestId = activeWarehouseRequest.requestId;
    if (!requestId) return null;

    const payload = {
      ...activeWarehouseRequest.original,
      requestId,
      storeKey: storeSelect.value,
      storeName: storeSelect.options[storeSelect.selectedIndex]?.text || getStoreLabel(storeSelect.value),
      versionKey: versionSelect.value,
      versionLabel: getVersionLabel(versionSelect.value),
      requestDate: getTargetChecklistDate(),
      status,
      itemCount: items.length,
      dispatchedAt: activeWarehouseRequest.original?.dispatchedAt || null,
      dispatchedByEmail: activeWarehouseRequest.original?.dispatchedByEmail || null,
      cancelledAt: activeWarehouseRequest.original?.cancelledAt || null,
      cancelledByEmail: activeWarehouseRequest.original?.cancelledByEmail || null,
      mergedAt: activeWarehouseRequest.original?.mergedAt || null,
      receivedAt: activeWarehouseRequest.original?.receivedAt || null,
      receivedByEmail: activeWarehouseRequest.original?.receivedByEmail || null,
      receivedByUid: activeWarehouseRequest.original?.receivedByUid || null,
      origin: activeWarehouseRequest.original?.origin || null,
      destinationStoreKey: activeWarehouseRequest.original?.destinationStoreKey || null,
      destinationStoreName: activeWarehouseRequest.original?.destinationStoreName || null,
      mergedIntoRequestId: activeWarehouseRequest.original?.mergedIntoRequestId || null,
      items,
      lastWarehouseUpdateAt: new Date().toISOString(),
      lastWarehouseUpdateByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
      lastWarehouseUpdateByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
    };

    return { requestId, status, payload, items };
  }

  function applyActiveWarehouseRequestSyncResult(result) {
    if (!result) return;
    activeWarehouseRequest = {
      ...activeWarehouseRequest,
      status: result.status,
      original: result.payload
    };
    rememberActiveWarehouseSnapshot();
  }

  async function syncActiveWarehouseRequest(statusOverride = null) {
    const result = buildActiveWarehouseRequestSyncPayload(statusOverride);
    if (!result) return;

    await saveRequestToFirestore(result.requestId, result.payload);
    applyActiveWarehouseRequestSyncResult(result);
  }

  async function openWarehouseRequest(requestLike) {
    if (!canUseWarehouseTools()) return showRequestDetail(requestLike);
    if (!requestLike) return;

    const requestId = requestLike.id || requestLike.requestId;
    const storeKey = requestLike.storeKey;
    const versionKey = requestLike.versionKey || 'base';
    const requestDate = requestLike.requestDate || getTodayString();
    if (!requestId || !storeKey) {
      await showScanToast('error', 'Solicitud incompleta', 'No se pudo abrir la solicitud porque falta tienda o identificador.');
      return;
    }

    if (activeWarehouseRequest?.requestId && activeWarehouseRequest.requestId !== requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('abrir otra solicitud');
      if (!canLeave) return;
    }

    await withLoading('Abriendo solicitud para revisión...', async () => {
      if (storeSelect && Array.from(storeSelect.options).some(option => option.value === storeKey)) {
        storeSelect.value = storeKey;
      }
      if (versionSelect && Array.from(versionSelect.options).some(option => option.value === versionKey)) {
        versionSelect.value = versionKey;
      }
      updateStoreUI();
      currentViewDate = requestDate;
      historicalUnlockEnabled = true;
      protectedVersionUnlockEnabled = canUseProtectedLists() || !isProtectedVersionSelected();
      const openedStatus = normalizeRequestStatus(requestLike.status || REQUEST_STATUSES.SENT, REQUEST_STATUSES.SENT);
      activeWarehouseRequest = {
        requestId,
        status: openedStatus,
        original: { ...requestLike, status: openedStatus }
      };

      body.innerHTML = '';
      resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
      clearBulkSelection();
      clearHistoricalSelection();

      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId, requestDate);
      // En el flujo nuevo la solicitud es la fuente principal. El histórico legacy queda como respaldo.
      const sourceItems = Array.isArray(requestLike.items)
        ? requestLike.items
        : ((record && Array.isArray(record.items) && record.items.length) ? record.items : []);
      applyChecklistMeta({
        ...(record?.meta || {}),
        requisition_done: typeof requestLike.requisitionDone === 'boolean'
          ? requestLike.requisitionDone
          : (record?.meta?.requisition_done || false),
        requisition_done_at: requestLike.requisitionDoneAt || record?.meta?.requisition_done_at || null
      });
      renderChecklistItems(sourceItems);
      lastUpdateISO = record?.meta?.updatedAt || requestLike.lastWarehouseUpdateAt || requestLike.submittedAt || null;
      updateLastSavedText(lastUpdateISO);

      if (!isRequestTerminalStatus(requestLike.status || REQUEST_STATUSES.SENT) && normalizeRequestStatus(requestLike.status || REQUEST_STATUSES.SENT) === REQUEST_STATUSES.SENT) {
        await updateRequestStatus(requestId, REQUEST_STATUSES.REVIEW, {
          reviewStartedAt: new Date().toISOString(),
          reviewStartedByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
        });
        activeWarehouseRequest.status = REQUEST_STATUSES.REVIEW;
        activeWarehouseRequest.original = {
          ...(activeWarehouseRequest.original || {}),
          status: REQUEST_STATUSES.REVIEW
        };
      }

      await refreshHistoryPicker();
      rememberActiveWarehouseSnapshot();
      resetAutoSaveBaseline();
      setHistoricalViewMode(false);
      updateRequestFlowUI();
      applyListSearchFilter();
    });
  }

  function buildRequestListHtml(requests = [], options = {}) {
    const filterSummary = String(options.filterSummary || '').trim();
    const renderRows = (rows = []) => rows.map(req => {
      const status = req.status || 'enviado';
      const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
      const dt = req.submittedAt || req.createdAt || '';
      const friendlyCode = getFriendlyRequestCode(req);
      const title = getRequestDisplayTitle(req);
      const subtitle = getRequestDisplaySubtitle(req);
      const dispatchedText = req.dispatchedAt ? 'Despachada: ' + formatSV(req.dispatchedAt) : '';
      const mergedText = req.mergedIntoRequestId ? 'Fusionada con: ' + getFriendlyRequestCode({ requestId: req.mergedIntoRequestId, id: req.mergedIntoRequestId, storeKey: req.storeKey, versionKey: req.versionKey, requestDate: String(req.mergedIntoRequestId).match(/\d{4}-\d{2}-\d{2}/)?.[0] || getRequestDateKey(req) }) : '';
      const cancelledText = req.cancelledAt ? 'Cancelada: ' + formatSV(req.cancelledAt) : '';
      const receivedText = req.receivedAt ? 'Recibida: ' + formatSV(req.receivedAt) : '';
      const originText = req.origin === 'warehouse' ? 'Origen: Bodega' : '';
      const extraText = dispatchedText || receivedText || mergedText || cancelledText || originText;
      return `
        <button type="button" class="request-list-row" data-request-id="${htmlAttrEscape(req.id || req.requestId || '')}" title="${htmlAttrEscape(title)}">
          <span class="request-list-main">
            <strong>${escapeHtml(friendlyCode)}</strong>
            <small>${escapeHtml(subtitle)} · ${count} item(s)${extraText ? ' · ' + escapeHtml(extraText) : ''}</small>
          </span>
          <span class="request-list-side">
            <span class="badge rounded-pill ${getRequestStatusBadgeClass(status)}">${escapeHtml(getRequestStatusLabel(status))}</span>
            <small>${escapeHtml(dt ? formatSV(dt) : 'Sin fecha')}</small>
          </span>
        </button>
      `;
    }).join('');

    const sections = Array.isArray(options.sections) ? options.sections.filter(section => Array.isArray(section.rows) && section.rows.length) : [];
    const summaryHtml = filterSummary ? `<div class="request-filter-summary text-start mb-3"><i class="fa-solid fa-filter me-1" aria-hidden="true"></i>${escapeHtml(filterSummary)}</div>` : '';

    if (sections.length) {
      return `
        ${summaryHtml}
        <div class="request-list-modal text-start">
          ${sections.map(section => `
            <div class="request-list-section mb-3">
              <div class="d-flex justify-content-between align-items-center px-1 mb-2">
                <strong class="small text-uppercase text-muted">${escapeHtml(section.title || 'Solicitudes')}</strong>
                <span class="badge text-bg-light border">${section.rows.length}</span>
              </div>
              ${renderRows(section.rows)}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!requests.length) {
      return summaryHtml + '<div class="text-muted small text-start">No hay solicitudes para mostrar.</div>';
    }

    return `
      ${summaryHtml}
      <div class="request-list-modal text-start">
        ${renderRows(requests)}
      </div>
    `;
  }

  async function openRequestsList(options = {}) {
    const title = options.title || (canUseWarehouseTools() ? 'Solicitudes recibidas' : 'Mis solicitudes');
    let requests = await listRequestsForCurrentAccess({ limit: 800 });
    let requestListSections = null;
    if (requiresWarehouseRequestContext()) {
      const selectedStoreFilter = String(storeSelect?.value || '').trim();
      const selectedVersionFilter = String(versionSelect?.value || '').trim();
      if (selectedStoreFilter && selectedStoreFilter !== '__all__') {
        requests = requests.filter(req => String(req.storeKey || '') === selectedStoreFilter);
      }
      if (selectedVersionFilter && selectedVersionFilter !== '__all__') {
        requests = requests.filter(req => String(req.versionKey || 'base') === selectedVersionFilter);
      }

      const today = (typeof getTodayString === 'function') ? getTodayString() : '';
      const selectedDate = currentViewDate || today;

      if (selectedDate) {
        if (!currentViewDate && selectedDate === today) {
          const openRequests = requests.filter(req => {
            const status = normalizeRequestStatus(req.status || REQUEST_STATUSES.SENT);
            return !isRequestTerminalStatus(status) || status === REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING;
          });
          const openIds = new Set(openRequests.map(req => String(req.id || req.requestId || '')).filter(Boolean));
          const todayRequests = requests.filter(req => {
            const id = String(req.id || req.requestId || '');
            return getRequestDateKey(req) === selectedDate && !openIds.has(id);
          });
          requests = [...openRequests, ...todayRequests];
          requestListSections = [
            { title: 'Solicitudes abiertas', rows: openRequests },
            { title: 'Solicitudes de hoy', rows: todayRequests }
          ];
        } else {
          requests = requests.filter(req => getRequestDateKey(req) === selectedDate);
          requestListSections = [{ title: 'Solicitudes del ' + selectedDate, rows: requests }];
        }
      }
    }
    const filterSummary = requiresWarehouseRequestContext()
      ? [
          'Tienda: ' + (storeSelect?.value === '__all__' ? 'Todas las sucursales' : getStoreLabel(storeSelect?.value)),
          'Tipo: ' + (versionSelect?.value === '__all__' ? 'Todos' : getVersionLabel(versionSelect?.value || 'base')),
          'Vista: ' + (currentViewDate ? ('Fecha ' + currentViewDate) : 'Solicitudes abiertas + hoy')
        ].join(' · ')
      : '';
    const result = await Swal.fire({
      title,
      width: 980,
      html: buildRequestListHtml(requests, { sections: requestListSections, filterSummary }),
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: 'Cerrar',
      didOpen: (popup) => {
        popup.querySelectorAll('[data-request-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const requestId = String(btn.getAttribute('data-request-id') || '').trim();
            if (!requestId) return;
            const found = requests.find(req => String(req.id || req.requestId || '') === requestId) || await loadRequestFromFirestore(requestId);
            if (canUseWarehouseTools()) {
              btn.disabled = true;
              Swal.close();
              await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
              window.TRUtils?.releaseModalScrollLock?.();
              try {
                await openWarehouseRequest(found);
              } finally {
                window.TRUtils?.releaseModalScrollLock?.();
              }
            } else {
              await showRequestDetail(found);
            }
          });
        });
      }
    });
    return result;
  }

  function isStoreAllowedForCurrentUser(storeKey) {
    if (!hasStoreRestriction()) return true;
    return String(storeKey || '').trim() === currentUserStoreKey;
  }

  async function showStoreDeniedAlert(actionLabel = 'usar esta sucursal') {
    await showScanToast('info', 'Sucursal restringida', 'Tu usuario solo puede ' + actionLabel + ' de ' + getAssignedStoreLabel() + '.');
  }

  async function enforceCurrentStoreAccess(actionLabel = 'usar esta sucursal') {
    if (!storeSelect || isStoreAllowedForCurrentUser(storeSelect.value)) return true;

    const previousValue = storeSelect.value;
    if (currentUserStoreKey && Array.from(storeSelect.options).some(option => option.value === currentUserStoreKey)) {
      storeSelect.value = currentUserStoreKey;
    }

    if (previousValue !== storeSelect.value) {
      updateStoreUI();
    }

    await showStoreDeniedAlert(actionLabel);
    return false;
  }

  async function showRoleDeniedAlert(actionLabel = 'usar esta función', allowedLabel = 'usuarios autorizados') {
    await showScanToast('info', 'Acceso restringido', 'Tu usuario (' + getRoleAccessLabel() + ') no tiene permisos para ' + actionLabel + '. Esta acción está disponible solo para ' + allowedLabel + '.');
  }

  function restrictOperatorStoreAccess() {
    if (!hasStoreRestriction() || !storeSelect) return;

    const allowedOption = Array.from(storeSelect.options).find(option => option.value === currentUserStoreKey);
    if (!allowedOption) return;

    Array.from(storeSelect.options).forEach(option => {
      const isAllowed = option.value === currentUserStoreKey;
      option.hidden = !isAllowed;
      option.disabled = !isAllowed;
      option.selected = isAllowed;
    });

    storeSelect.value = currentUserStoreKey;
    storeSelect.disabled = true;
    storeSelect.setAttribute('aria-disabled', 'true');
    storeSelect.dataset.lockedStore = currentUserStoreKey;
    storeSelect.dataset.allowedStore = currentUserStoreKey;
    storeSelect.title = 'Esta cuenta está limitada a ' + getAssignedStoreLabel() + '.';

    const label = document.querySelector('label[for="storeSelect"]');
    if (label && !label.querySelector('.store-lock-hint')) {
      const hint = document.createElement('span');
      hint.className = 'store-lock-hint';
      hint.textContent = ' · fija por usuario';
      label.appendChild(hint);
    }
  }

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

  const sharedUtils = window.TRUtils || {};
  const htmlAttrEscape = sharedUtils.htmlAttrEscape || ((value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '&quot;');
  });
  const escapeHtml = sharedUtils.escapeHtml || ((value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  });
  const normalizeMatchValue = sharedUtils.normalizeText || ((value) => String(value || '').trim().toLowerCase());
  const hasUsefulCode = sharedUtils.hasUsefulCode || ((value) => {
    const normalized = normalizeMatchValue(value);
    return !!normalized && normalized !== 'n/a' && normalized !== 'na' && normalized !== 'sin código' && normalized !== 'sin codigo';
  });
  const setToggleState = sharedUtils.setToggleState || ((button, shouldBeOn) => {
    if (!button) return;
    button.classList.toggle('on', !!shouldBeOn);
    button.classList.toggle('off', !shouldBeOn);
  });
  const toggleBtn = sharedUtils.toggleButtonState || ((button) => {
    if (!button) return;
    setToggleState(button, !button.classList.contains('on'));
  });

  const checklistHelpers = window.TRChecklistHelpers || {};
  const normalizeListSearchTerm = checklistHelpers.normalizeListSearchTerm || ((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase());
  const buildRowSearchText = (row) => (checklistHelpers.buildRowSearchText
    ? checklistHelpers.buildRowSearchText(row, COL_INDEX)
    : [
        row?.cells?.[COL_INDEX.barcode]?.innerText || '',
        row?.cells?.[COL_INDEX.name]?.innerText || '',
        row?.cells?.[COL_INDEX.inventoryCode]?.innerText || '',
        row?.cells?.[COL_INDEX.warehouse]?.innerText || '',
        row?.querySelector('.qty')?.value || ''
      ].join(' ').toLowerCase());
  const getDispatchButton = checklistHelpers.getDispatchButton || ((row) => row?.querySelector('.btn-toggle-dispatch') || null);
  const getMoveButton = checklistHelpers.getMoveButton || ((row) => row?.querySelector('.btn-move-list') || null);
  const getDeleteButton = checklistHelpers.getDeleteButton || ((row) => row?.querySelector('.btn-delete-row') || null);
  const buildChecklistItemFromRow = (row) => (checklistHelpers.buildChecklistItemFromRow
    ? checklistHelpers.buildChecklistItemFromRow(row, COL_INDEX)
    : {
        codigo_barras: row?.cells?.[COL_INDEX.barcode]?.innerText?.trim?.() || '',
        nombre: row?.cells?.[COL_INDEX.name]?.innerText?.trim?.() || '',
        codigo_inventario: row?.cells?.[COL_INDEX.inventoryCode]?.innerText?.trim?.() || '',
        bodega: row?.cells?.[COL_INDEX.warehouse]?.innerText?.trim?.() || '',
        cantidad: (row?.querySelector('.qty')?.value || '').trim(),
        despachado: getDispatchButton(row) ? getDispatchButton(row).classList.contains('on') : false
      });
  const buildItemFromCatalogRow = checklistHelpers.buildItemFromCatalogRow || ((row, fallbackCode = '') => ({
    codigo_barras: row?.[3] || fallbackCode || '',
    nombre: row?.[0] || '',
    codigo_inventario: row?.[1] || 'N/A',
    bodega: row?.[2] || '',
    cantidad: '',
    despachado: false
  }));
  const itemsMatch = checklistHelpers.itemsMatch || ((itemA, itemB) => {
    const barcodeA = normalizeMatchValue(itemA?.codigo_barras);
    const barcodeB = normalizeMatchValue(itemB?.codigo_barras);
    const inventoryA = normalizeMatchValue(itemA?.codigo_inventario);
    const inventoryB = normalizeMatchValue(itemB?.codigo_inventario);

    if (hasUsefulCode(barcodeA) && hasUsefulCode(barcodeB) && barcodeA === barcodeB) return true;
    if (hasUsefulCode(inventoryA) && hasUsefulCode(inventoryB) && inventoryA === inventoryB) return true;
    return false;
  });
  const findMatchingItemInArray = checklistHelpers.findMatchingItemInArray || ((items, item) => (items || []).find((existingItem) => itemsMatch(existingItem, item)) || null);



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

  function closeWarehouseActionsMenu() {
    if (warehouseActionsMenu?.hasAttribute('open')) {
      warehouseActionsMenu.removeAttribute('open');
    }
  }

  function closeAllToolbarMenus() {
    closeMoreActionsMenu();
    closeWarehouseActionsMenu();
  }

  function setMobileFabOpen(shouldOpen) {
    if (!mobileFabToggle || !mobileFabMenu || !mobileFabBackdrop) return;
    const isOpen = !!shouldOpen;
    if (isOpen && suggestions) suggestions.innerHTML = '';
    if (isOpen && document.activeElement === searchInput) searchInput.blur();
    mobileFabMenu.classList.toggle('d-none', !isOpen);
    mobileFabBackdrop.classList.toggle('d-none', !isOpen);
    mobileFabMenu.setAttribute('aria-hidden', String(!isOpen));
    mobileFabToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('mobile-actions-open', isOpen);
    mobileFabMenu.closest('.mobile-fab-shell')?.classList.toggle('is-open', isOpen);
  }

  function closeMobileFab() {
    setMobileFabOpen(false);
  }


function getTableRows() {
  return [...body.querySelectorAll('tr')];
}


function ensureRowDomId(tr) {
  if (!tr) return '';
  if (!tr.dataset.rowId) {
    rowDomIdCounter += 1;
    tr.dataset.rowId = 'row-' + rowDomIdCounter;
  }
  return tr.dataset.rowId;
}

function getMobileCardForRow(tr) {
  const rowId = ensureRowDomId(tr);
  if (!rowId || !mobileChecklistCards) return null;
  return mobileChecklistCards.querySelector('[data-row-id="' + rowId + '"]');
}

function syncMobileDispatchStateForRow(tr) {
  if (!tr || !isCompactScreen()) return;
  const card = getMobileCardForRow(tr);
  if (!card) return;

  const sourceButton = getDispatchButton(tr);
  const mobileButton = card.querySelector('.mobile-action-dispatch');
  if (!sourceButton || !mobileButton) return;

  const isDispatched = sourceButton.classList.contains('on');
  setToggleState(mobileButton, isDispatched);
  mobileButton.setAttribute('aria-pressed', String(isDispatched));
  card.classList.toggle('is-dispatched', isDispatched);
}

function revealRowForLocate(tr) {
  if (!tr) return;
  if (tr.classList.contains('table-row-hidden-by-search')) {
    listSearchTerm = '';
    if (searchInput && primarySearchMode === 'list') {
      searchInput.value = '';
    }
    applyListSearchFilter();
  }
}

function rowMatchesCurrentListSearch(tr) {
  if (!listSearchTerm) return true;
  return buildRowSearchText(tr).includes(listSearchTerm);
}

function findExistingRowByCode(code) {
  const normalizedCode = normalizeMatchValue(code);
  if (!hasUsefulCode(normalizedCode)) return null;

  return getTableRows().find(tr => {
    const rowBarcode = normalizeMatchValue(tr?.cells?.[COL_INDEX.barcode]?.innerText || '');
    const rowInventoryCode = normalizeMatchValue(tr?.cells?.[COL_INDEX.inventoryCode]?.innerText || '');

    return (
      (hasUsefulCode(rowBarcode) && rowBarcode === normalizedCode) ||
      (hasUsefulCode(rowInventoryCode) && rowInventoryCode === normalizedCode)
    );
  }) || null;
}

async function handleScannedOrImportedCode(code) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return false;

  if (searchInput) {
    searchInput.value = normalizedCode;
  }

  showScanToast('info', 'Código leído', normalizedCode, { timeout: 1800 });

  const existingRow = findExistingRowByCode(normalizedCode);

  // En modo “Lista Actual” el escáner se comporta igual que la barra:
  // solo filtra/ubica filas que ya existen en la tabla construida.
  // No cambia a Catálogo y no inserta filas.
  if (primarySearchMode === 'list') {
    syncPrimarySearchToListSearch();

    const firstMatch = existingRow || getTableRows().find(tr => rowMatchesCurrentListSearch(tr));
    if (firstMatch) {
      flashAndFocusRow(firstMatch, 'qty');
      playScannerFeedback('success');
      showScanToast('success', 'Encontrado en lista actual', buildChecklistItemFromRow(firstMatch)?.nombre || normalizedCode, { timeout: 2800 });
    } else {
      playScannerFeedback('error');
      showScanToast('error', 'No está en la lista actual', 'Código: ' + normalizedCode, { timeout: 3800 });
    }
    return true;
  }

  if (existingRow) {
    if (suggestions) suggestions.innerHTML = '';
    currentFocus = -1;

    await handleExistingRowAction(existingRow);
    playScannerFeedback('warning');
    showScanToast('warning', 'Producto ya estaba en la lista', buildChecklistItemFromRow(existingRow)?.nombre || normalizedCode, { timeout: 3200 });
    return true;
  }

  // En modo Catálogo sí se permite resolver el código contra el catálogo e insertar si existe.
  if (searchInput) searchInput.value = normalizedCode;

  const beforeCount = getTableRows().length;
  suppressProductAddedToast = true;
  try {
    await handlePrimarySearchSubmit();
  } finally {
    suppressProductAddedToast = false;
  }
  const afterCount = getTableRows().length;

  if (afterCount > beforeCount) {
    const addedRow = body?.querySelector('tr');
    const addedName = addedRow ? (buildChecklistItemFromRow(addedRow)?.nombre || normalizedCode) : normalizedCode;
    playScannerFeedback('success');
    showScanToast('success', 'Producto agregado', addedName, { timeout: 3200 });
  } else {
    playScannerFeedback('error');
    showScanToast('error', 'No se encontró el producto', 'Código: ' + normalizedCode, { timeout: 4200 });
  }

  return true;
}


function updateListSearchMeta() {
  if (!listSearchCount) return;
  const rows = getTableRows();
  const visible = rows.filter(tr => rowMatchesCurrentListSearch(tr)).length;
  listSearchCount.textContent = `${visible} / ${rows.length}`;
}

function updatePrimarySearchModeUI() {
  const isListMode = primarySearchMode === 'list';

  if (searchInput) {
    const compact = isCompactScreen();
    searchInput.placeholder = isListMode
      ? (compact ? 'Buscar en lista' : 'Buscar en la lista actual')
      : (compact ? 'Producto o código' : 'Nombre, código inventario o código de barras');
  }

  const modeLabel = isListMode ? 'Lista' : 'Catálogo';
  const modeIcon = isListMode ? 'fa-solid fa-table-list' : 'fa-solid fa-box-archive';

  if (searchModeHint) {
    searchModeHint.textContent = isListMode ? 'Modo: lista actual' : 'Modo: catálogo';
    searchModeHint.classList.toggle('is-list-mode', isListMode);
  }

  if (btnSearchModeToggle) {
    btnSearchModeToggle.dataset.searchMode = primarySearchMode;
    btnSearchModeToggle.classList.toggle('is-list-mode', isListMode);
    btnSearchModeToggle.title = isListMode
      ? 'Cambiar a búsqueda de catálogo'
      : 'Cambiar a búsqueda en la lista actual';
    btnSearchModeToggle.setAttribute('aria-label', btnSearchModeToggle.title);
    btnSearchModeToggle.innerHTML = `
      <i class="${modeIcon}" aria-hidden="true"></i>
      <span id="searchLeadLabel">${modeLabel}</span>
    `;
  }

  if (!isListMode) {
    listSearchTerm = '';
  } else {
    suggestions.innerHTML = '';
    currentFocus = -1;
  }

  applyListSearchFilter();
}

function syncPrimarySearchToListSearch() {
  listSearchTerm = normalizeListSearchTerm(searchInput?.value || '');
  applyListSearchFilter();
}


function resetSearchState(options = {}) {
  const {
    mode = 'catalog',
    clearInput = true,
    applyFilter = true,
    clearSuggestions = true
  } = options || {};

  primarySearchMode = mode === 'list' ? 'list' : 'catalog';

  if (clearInput && searchInput) {
    searchInput.value = '';
  }

  if (clearSuggestions && suggestions) {
    suggestions.innerHTML = '';
  }

  currentFocus = -1;
  listSearchTerm = primarySearchMode === 'list'
    ? normalizeListSearchTerm(searchInput?.value || '')
    : '';

  updatePrimarySearchModeUI();

  if (!applyFilter) return;

  if (primarySearchMode === 'list') {
    syncPrimarySearchToListSearch();
    return;
  }

  applyListSearchFilter();
}

function isTextEditingElement(element) {
  if (!element || !(element instanceof Element)) return false;
  return element === searchInput
    || element.classList.contains('qty')
    || element.classList.contains('mobile-card-qty-input')
    || element.matches('input[type="text"], input[type="number"], input[type="search"], textarea, select');
}

function isMobileQuantityEditorActive() {
  const active = document.activeElement;
  return isCompactScreen()
    && active instanceof Element
    && (active.classList.contains('qty') || active.classList.contains('mobile-card-qty-input'));
}

function refreshMobileChecklistCardsSafely(options = {}) {
  const { force = false } = options || {};
  if (!force && isMobileQuantityEditorActive()) {
    pendingMobileCardRefresh = true;
    return false;
  }
  pendingMobileCardRefresh = false;
  refreshMobileChecklistCards();
  return true;
}

function flushPendingMobileCardRefresh(options = {}) {
  if (!pendingMobileCardRefresh) return;
  const { delay = 80 } = options || {};
  window.setTimeout(() => {
    if (isMobileQuantityEditorActive()) return;
    refreshMobileChecklistCardsSafely({ force: true });
  }, delay);
}

function preserveCompactScroll(task) {
  if (!isCompactScreen()) {
    return task();
  }

  const scrollY = window.scrollY;
  const activeElement = document.activeElement;
  const keepKeyboardOpen = isTextEditingElement(activeElement);
  const result = task();

  window.requestAnimationFrame(() => {
    try {
      if (keepKeyboardOpen && activeElement && document.contains(activeElement) && document.activeElement !== activeElement) {
        activeElement.focus({ preventScroll: true });
      }
    } catch (_) {}
    window.scrollTo(0, scrollY);
  });

  return result;
}

function syncMobileCardSelectionState(card, checked) {
  if (!card) return;
  card.classList.toggle('is-selected', !!checked);
  const checkbox = card.querySelector('.mobile-card-select');
  if (checkbox) checkbox.checked = !!checked;
}


function refreshMobileChecklistCards() {
  if (!mobileChecklistCards) return;
  if (!isCompactScreen()) {
    mobileChecklistCards.innerHTML = '';
    return;
  }

  const rows = getTableRows();
  mobileChecklistCards.innerHTML = '';

  rows.forEach((tr) => {
    const item = buildChecklistItemFromRow(tr);
    const selected = tr.querySelector('.row-bulk-select-checkbox')?.checked;
    const matchesSearch = rowMatchesCurrentListSearch(tr);

    ensureRowDomId(tr);
    const card = document.createElement('article');
    card.className = 'mobile-check-card';
    card.dataset.rowId = tr.dataset.rowId || '';
    if (selected) card.classList.add('is-selected');
    if (matchesSearch && listSearchTerm) card.classList.add('is-search-match');
    if (!matchesSearch) card.classList.add('mobile-card-row-hidden');

    const numberText = tr.cells[COL_INDEX.rowNumber]?.textContent?.trim() || '';
    const barcode = item.codigo_barras || '—';
    const inventory = item.codigo_inventario || 'N/A';
    const warehouse = item.bodega || '—';
    const quantity = item.cantidad || 'Sin cantidad';

    card.innerHTML = `
      <div class="mobile-card-top">
        <div class="mobile-card-check">
          <label class="mobile-card-check-wrap" title="Seleccionar tarjeta">
            <input type="checkbox" class="form-check-input mobile-card-select" aria-label="Seleccionar producto">
            <span class="mobile-card-check-icon">
              <i class="fa-solid fa-square-check" aria-hidden="true"></i>
            </span>
          </label>
        </div>
        <div class="mobile-card-main">
          <h6 class="mobile-card-title">${escapeHtml(item.nombre || 'Producto')}</h6>
          <div class="mobile-card-meta">
            <div class="mobile-card-meta-item">
              <span class="mobile-card-meta-label">Cód. barras</span>
              <span class="mobile-card-meta-value">${escapeHtml(barcode)}</span>
            </div>
            <div class="mobile-card-meta-item">
              <span class="mobile-card-meta-label">Cód. inv.</span>
              <span class="mobile-card-meta-value">${escapeHtml(inventory)}</span>
            </div>
            <div class="mobile-card-meta-item" style="grid-column: 1 / -1;">
              <span class="mobile-card-meta-label">Bodega</span>
              <span class="mobile-card-meta-value">${escapeHtml(warehouse)}</span>
            </div>
          </div>

        </div>
        <span class="mobile-card-index">${escapeHtml(numberText)}</span>
      </div>

      <div class="mobile-card-qty">
        <label class="mobile-card-qty-field">
          <span class="qty-label">Cantidad</span>
          <input
            type="text"
            class="form-control mobile-card-qty-input"
            value="${htmlAttrEscape(quantity === 'Sin cantidad' ? '' : quantity)}"
            placeholder="0"
            autocomplete="off"
            inputmode="text"
            aria-label="Cantidad"
          >
        </label>
      </div>

      <div class="mobile-card-actions" role="group" aria-label="Acciones del producto">
        <button type="button" class="btn btn-outline-success mobile-action-dispatch btn-toggle off" aria-label="Marcar despachado" title="Despachado">
          <i class="fa-solid fa-truck-ramp-box" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary mobile-action-delete" aria-label="Eliminar" title="Eliminar">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    `;

    const sourceCheckbox = tr.querySelector('.row-bulk-select-checkbox');
    const cardCheckbox = card.querySelector('.mobile-card-select');
    if (sourceCheckbox && cardCheckbox) {
      const cardCheckWrap = card.querySelector('.mobile-card-check');
      if (cardCheckWrap) cardCheckWrap.classList.toggle('d-none', !canUseBulkSelection());
      cardCheckbox.checked = canUseBulkSelection() && !!sourceCheckbox.checked;
      cardCheckbox.disabled = !!sourceCheckbox.disabled;
      cardCheckbox.addEventListener('change', () => {
        sourceCheckbox.checked = cardCheckbox.checked;
        syncMobileCardSelectionState(card, cardCheckbox.checked);
        preserveCompactScroll(() => updateBulkSelectionUI());
      });
    }

    const cardQtyInput = card.querySelector('.mobile-card-qty-input');
    if (cardQtyInput) {
      const sourceQtyInput = tr.querySelector('.qty');
      if (sourceQtyInput) {
        cardQtyInput.value = sourceQtyInput.value || '';
        cardQtyInput.disabled = !!sourceQtyInput.disabled;

        cardQtyInput.addEventListener('input', () => {
          const previousSuppress = suppressMobileCardRefresh;
          suppressMobileCardRefresh = true;
          try {
            sourceQtyInput.value = cardQtyInput.value;
            sourceQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
          } finally {
            suppressMobileCardRefresh = previousSuppress;
          }
        });

        cardQtyInput.addEventListener('change', () => {
          sourceQtyInput.value = cardQtyInput.value;
          sourceQtyInput.dispatchEvent(new Event('change', { bubbles: true }));
          if (primarySearchMode === 'list') {
            preserveCompactScroll(() => applyListSearchFilter());
          }
          flushPendingMobileCardRefresh({ delay: 120 });
        });

        cardQtyInput.addEventListener('blur', () => {
          flushPendingMobileCardRefresh({ delay: 120 });
        });

        cardQtyInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            sourceQtyInput.value = cardQtyInput.value;
            sourceQtyInput.dispatchEvent(new Event('change', { bubbles: true }));
            cardQtyInput.blur();
            focusSearchInput({ center: false, select: true, force: true });
          }
        });
      }
    }

    card.querySelector('.mobile-action-dispatch')?.addEventListener('click', (event) => {
      const btn = getDispatchButton(tr);
      if (!btn) return;

      // El estado despachado no cambia el contenido del filtro ni el orden de la lista.
      // Sincronizamos solo esta tarjeta para no destruir el botón enfocado ni reconstruir
      // todo el DOM móvil, que era el origen principal del salto al inicio.
      toggleBtn(btn);
      syncMobileDispatchStateForRow(tr);
      event.currentTarget?.blur?.();
      queueAutoSave('marcar despachado');
      updateActiveRequestDispatchVisualStatus();
    });


    card.querySelector('.mobile-action-delete')?.addEventListener('click', async () => {
      const btn = getDeleteButton(tr);
      if (!btn) return;
      const scrollY = window.scrollY;
      btn.click();
      window.setTimeout(() => {
        applyListSearchFilter();
        window.scrollTo(0, scrollY);
      }, 450);
    });

    applyRoleStateToMobileCard(card, tr);
    mobileChecklistCards.appendChild(card);
  });

  const visibleCount = rows.filter(tr => rowMatchesCurrentListSearch(tr)).length;
}

function applyListSearchFilter() {
  if (primarySearchMode !== 'list') {
    listSearchTerm = '';
  } else {
    listSearchTerm = normalizeListSearchTerm(searchInput?.value || '');
  }

  let clearedHiddenSelection = false;
  getTableRows().forEach(tr => {
    const matches = rowMatchesCurrentListSearch(tr);
    tr.classList.toggle('table-row-hidden-by-search', !matches);

    if (!matches) {
      const selected = tr.querySelector('.row-bulk-select-checkbox');
      if (selected?.checked) {
        selected.checked = false;
        clearedHiddenSelection = true;
      }
    }
  });

  updateListSearchMeta();
  if (clearedHiddenSelection) updateBulkSelectionUI();
  refreshMobileChecklistCardsSafely();
}

async function openInsertedRowsSearch(options = {}) {
  closeMobileFab();

  primarySearchMode = 'list';
  updatePrimarySearchModeUI();
  syncPrimarySearchToListSearch();

  if (options.notify !== false) {
    await showScanToast('info', 'Buscar en lista', 'Ahora la búsqueda filtra únicamente la tabla ya construida.');
  }

  if (!shouldAvoidAutoFocus()) {
    window.setTimeout(() => {
      searchInput?.focus({ preventScroll: true });
      searchInput?.select();
    }, 120);
  }
}


  function isCompactScreen() {
    return window.TRUtils?.isCompactViewport
      ? window.TRUtils.isCompactViewport(MOBILE_BREAKPOINT)
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function shouldAvoidAutoFocus() {
    // Evita autofoco general para no mover la pantalla.
    // El flujo principal de captura usa focusSearchInput({ force: true })
    // y focusQuantityInputForRow() para mantener: buscador -> cantidad -> buscador.
    return true;
  }

  function focusDomInput(input, options = {}) {
    if (!input || input.disabled) return false;

    const { select = false, preventScroll = true } = options || {};

    try {
      input.focus({ preventScroll });
    } catch (_) {
      try { input.focus(); } catch (_) { return false; }
    }

    if (select && typeof input.select === 'function') {
      try { input.select(); } catch (_) {}
    }

    return document.activeElement === input;
  }

  function focusSearchInput(options = {}) {
    const { center = false, select = false, force = false } = options || {};
    if (!searchInput || (!force && shouldAvoidAutoFocus())) return;

    const targetSearchBlock = searchInput.closest('.checklist-search-shell');
    if (center && targetSearchBlock) {
      targetSearchBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.setTimeout(() => {
      focusDomInput(searchInput, { select, preventScroll: !center });
    }, center ? 220 : 90);
  }

  function focusQuantityInputForRow(tr, options = {}) {
    if (!tr) return;

    const { select = true, center = false, delay = null } = options || {};
    const ms = Number.isFinite(delay) ? delay : (isCompactScreen() ? 140 : 70);

    window.setTimeout(() => {
      if (isCompactScreen()) {
        refreshMobileChecklistCardsSafely({ force: true });
        const card = getMobileCardForRow(tr);
        const mobileQtyInput = card?.querySelector('.mobile-card-qty-input');

        if (mobileQtyInput && !mobileQtyInput.disabled) {
          if (center && card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          focusDomInput(mobileQtyInput, { select, preventScroll: true });
          return;
        }
      }

      const qtyInput = tr.querySelector('.qty');
      if (!qtyInput || qtyInput.disabled) return;

      if (center && !isCompactScreen()) {
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      focusDomInput(qtyInput, { select, preventScroll: true });
    }, ms);
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
    input.readOnly = false;
    input.classList.remove('qty-mobile-readonly');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('autocomplete', 'off');
  }

  // En móvil la cantidad se edita directamente desde la card.
  // No se usa modal para evitar pasos extra y pérdida de velocidad al capturar.

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
    input.addEventListener('click', () => {
      sync();
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        input.blur();
        focusSearchInput({ center: false, select: true, force: true });
      }
    });
    sync();
  }

  window.addEventListener('resize', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
    [...body.querySelectorAll('.qty')].forEach(syncQtyInputMode);
    updateBulkSelectionUI();
  });

  document.addEventListener('scroll', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
  }, true);


  function getDocIdForCurrentList() {
    const storeKey = storeSelect.value;
    if (!isStoreAllowedForCurrentUser(storeKey)) {
      throw new Error('Sucursal no permitida para este usuario.');
    }
    return getBinId(storeKey, versionSelect.value);
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
    const requestStatus = normalizeRequestStatus(activeWarehouseRequest?.status || activeWarehouseRequest?.original?.status || '', '');
    if (activeWarehouseRequest?.requestId && isWarehouseRequestEditingLocked()) {
      if (requestStatus === REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING) {
        return {
          text: 'Despacho finalizado: queda pendiente marcar la requisición como hecha.',
          className: 'text-primary'
        };
      }
      return {
        text: 'Solicitud cerrada: checklist disponible solo para consulta.',
        className: 'text-primary'
      };
    }

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

    await showScanToast(
      'info',
      'Edición bloqueada',
      'Para ' + actionLabel + ', desbloquea la edición o cambia de vista. ' + contextText,
      { timeout: 4200 }
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

    if (!canUseProtectedLists()) {
      await showRoleDeniedAlert(actionLabel + ' en la lista protegida', 'bodega o administradores');
      return false;
    }

    if (canUseWarehouseTools()) return true;

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

  function isBulkSelectionRowVisible(tr) {
    if (!tr) return false;
    if (tr.classList.contains('table-row-hidden-by-search') || tr.classList.contains('d-none')) return false;
    if (tr.hidden || tr.style.display === 'none') return false;
    return true;
  }

  function getSelectedTableRows() {
    return getBulkSelectionCheckboxes()
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr'))
      .filter(isBulkSelectionRowVisible);
  }

  function getVisibleBulkSelectionCheckboxes() {
    return getBulkSelectionCheckboxes().filter(cb => {
      if (!cb || cb.disabled) return false;
      return isBulkSelectionRowVisible(cb.closest('tr'));
    });
  }

  function toggleVisibleBulkSelection() {
    if (!canUseBulkSelection()) return;

    const visibleCheckboxes = getVisibleBulkSelectionCheckboxes();
    if (!visibleCheckboxes.length) {
      updateBulkSelectionUI();
      return;
    }

    const allVisibleSelected = visibleCheckboxes.every(cb => cb.checked);
    visibleCheckboxes.forEach(cb => {
      cb.checked = !allVisibleSelected;
    });

    updateBulkSelectionUI();
    refreshMobileChecklistCardsSafely();
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
  }

  function updateMobileFabSelectionHint(selectedCount = 0) {
    if (!mobileFabToggle) return;

    const compact = isCompactScreen();
    const hasSelection = compact && selectedCount > 0;
    const label = mobileFabToggle.querySelector('span');

    mobileFabToggle.classList.toggle('has-selection', hasSelection);
    mobileFabToggle.setAttribute(
      'title',
      hasSelection
        ? (selectedCount === 1 ? '1 fila seleccionada' : selectedCount + ' filas seleccionadas')
        : 'Abrir panel de acciones'
    );
    mobileFabToggle.setAttribute(
      'aria-label',
      hasSelection
        ? 'Abrir acciones de selección: ' + (selectedCount === 1 ? '1 fila seleccionada' : selectedCount + ' filas seleccionadas')
        : 'Abrir panel de acciones'
    );

    if (label) {
      label.textContent = hasSelection
        ? (selectedCount === 1 ? '1 sel.' : selectedCount + ' sel.')
        : 'Acciones';
    }
  }

  function syncBulkSelectionPlacement(selectedCount = 0) {
    if (!bulkSelectionBar) return;

    const compact = isCompactScreen();
    const useMobileSlot = compact && !!mobileFabBulkSelectionSlot;
    const targetSlot = useMobileSlot ? mobileFabBulkSelectionSlot : bulkSelectionDesktopSlot;

    if (targetSlot && bulkSelectionBar.parentElement !== targetSlot) {
      targetSlot.appendChild(bulkSelectionBar);
    }

    if (bulkSelectionDesktopSlot) {
      const showDesktopSelectionSlot = !useMobileSlot && selectedCount > 0;
      bulkSelectionDesktopSlot.classList.toggle('d-none', !showDesktopSelectionSlot);
      bulkSelectionDesktopSlot.setAttribute('aria-hidden', String(!showDesktopSelectionSlot));
    }

    if (mobileFabBulkSelectionSlot) {
      const showMobileSelectionSlot = useMobileSlot && selectedCount > 0;
      mobileFabBulkSelectionSlot.classList.toggle('d-none', !showMobileSelectionSlot);
      mobileFabBulkSelectionSlot.setAttribute('aria-hidden', String(!showMobileSelectionSlot));
      mobileFabBulkSelectionSlot.dataset.selectionLabel = selectedCount === 1
        ? 'Selección · 1 seleccionado'
        : `Selección · ${selectedCount} seleccionados`;
    }

    updateMobileFabSelectionHint(selectedCount);
  }

  function updateBulkSelectionUI() {
    const checkboxes = getBulkSelectionCheckboxes();
    const selectableCheckboxes = checkboxes.filter(cb => !cb.disabled && isBulkSelectionRowVisible(cb.closest('tr')));
    const selectedCount = selectableCheckboxes.filter(cb => cb.checked).length;
    const hasRows = selectableCheckboxes.length > 0;
    const editingLocked = isEditingLocked();

    syncBulkSelectionPlacement(selectedCount);

    if (chkSelectAllRows) {
      chkSelectAllRows.disabled = !canUseBulkSelection() || !hasRows;
      chkSelectAllRows.setAttribute('aria-disabled', String(chkSelectAllRows.disabled));
      chkSelectAllRows.checked = !!selectableCheckboxes.length && selectedCount === selectableCheckboxes.length;
      chkSelectAllRows.indeterminate = selectedCount > 0 && selectedCount < selectableCheckboxes.length;
    }

    const allSelected = !!selectableCheckboxes.length && selectedCount === selectableCheckboxes.length;

    if (bulkSelectionBar) {
      const shouldShow = canUseBulkSelection() && selectedCount > 0;
      const activeInsideBulkBar = bulkSelectionBar.contains(document.activeElement);

      if (!shouldShow && activeInsideBulkBar) {
        try {
          document.activeElement?.blur?.();
        } catch (_) {}
      }

      bulkSelectionBar.classList.toggle('d-none', !shouldShow);
      bulkSelectionBar.toggleAttribute('hidden', !shouldShow);
      bulkSelectionBar.inert = !shouldShow;
      bulkSelectionBar.setAttribute('aria-hidden', String(!shouldShow));
      document.body.classList.toggle('has-mobile-selection', shouldShow && isCompactScreen());

    }

    if (bulkSelectionCount) {
      if (isCompactScreen()) {
        bulkSelectionCount.textContent = selectedCount === 1 ? '1 sel.' : (selectedCount + ' sel.');
      } else {
        bulkSelectionCount.textContent = selectedCount === 1 ? '1 seleccionada' : (selectedCount + ' seleccionadas');
      }
    }

    if (btnClearSelection) {
      btnClearSelection.disabled = selectedCount === 0;
      btnClearSelection.setAttribute('aria-disabled', String(btnClearSelection.disabled));
    }

    if (btnToggleSelectAllBulk) {
      btnToggleSelectAllBulk.disabled = !canUseBulkSelection() || !selectableCheckboxes.length;
      btnToggleSelectAllBulk.setAttribute('aria-disabled', String(btnToggleSelectAllBulk.disabled));
      setToolbarButtonContent(
        btnToggleSelectAllBulk,
        allSelected ? 'fa-regular fa-square-minus' : 'fa-regular fa-square-check',
        allSelected ? 'Quitar todas' : 'Todas'
      );
    }

    if (btnDispatchSelected) {
      btnDispatchSelected.classList.toggle('d-none', !canUseWarehouseTools());
      btnDispatchSelected.disabled = !canUseWarehouseTools() || editingLocked || selectedCount === 0;
      btnDispatchSelected.setAttribute('aria-disabled', String(btnDispatchSelected.disabled));
      setToolbarButtonContent(btnDispatchSelected, 'fa-solid fa-truck-ramp-box', 'Despachar');
    }

    if (btnMoveSelectedToRequest) {
      const canMoveSelected = canMoveSelectedRowsToRequest();
      btnMoveSelectedToRequest.classList.toggle('d-none', !canUseWarehouseTools());
      btnMoveSelectedToRequest.disabled = !canMoveSelected || selectedCount === 0;
      btnMoveSelectedToRequest.setAttribute('aria-disabled', String(btnMoveSelectedToRequest.disabled));
      btnMoveSelectedToRequest.title = canMoveSelected ? 'Mover seleccionados a otra solicitud de la misma sucursal' : 'Abre una solicitud activa de bodega para mover seleccionados';
      setToolbarButtonContent(btnMoveSelectedToRequest, 'fa-solid fa-right-left', 'Mover');
    }

    if (btnDeleteSelected) {
      const canShowBulkDelete = canUseBulkSelection() && canDeleteRows();
      btnDeleteSelected.classList.toggle('d-none', !canShowBulkDelete);
      btnDeleteSelected.disabled = !canShowBulkDelete || editingLocked || selectedCount === 0;
      btnDeleteSelected.setAttribute('aria-disabled', String(btnDeleteSelected.disabled));
      btnDeleteSelected.title = canShowBulkDelete ? 'Eliminar seleccionados' : 'Sin permiso para eliminar seleccionados';
      setToolbarButtonContent(btnDeleteSelected, 'fa-solid fa-trash-can', 'Eliminar');
    }

    syncMobileFabGeneralActions();
  }


  async function markSelectedRowsWithState() {
    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('marcar múltiples filas como despachadas', 'bodega o administradores');
      return;
    }

    if (isEditingLocked()) {
      await showEditingLockedAlert('marcar múltiples filas como despachadas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await showScanToast('info', 'Sin selección', 'Selecciona al menos una fila para aplicar esta acción masiva.');
      return;
    }

    let changedCount = 0;
    selectedRows.forEach(tr => {
      const btn = getDispatchButton(tr);
      if (!btn || btn.classList.contains('on')) return;
      setToggleState(btn, true);
      changedCount += 1;
    });

    clearBulkSelection();
    updateBulkSelectionUI();
    refreshMobileChecklistCardsSafely();
    updateActiveRequestDispatchVisualStatus();
    if (changedCount) queueAutoSave('marcado despachado');

    await showScanToast(
      changedCount ? 'success' : 'info',
      changedCount ? 'Actualizado' : 'Sin cambios',
      changedCount
        ? ('Se marcaron ' + changedCount + ' fila(s) como despachadas.')
        : 'Las filas seleccionadas ya estaban despachadas.'
    );
  }

  async function deleteSelectedRows() {
    if (!canDeleteRows()) {
      await showRoleDeniedAlert('eliminar filas en selección múltiple', 'usuarios autorizados');
      return;
    }

    if (isEditingLocked()) {
      await showEditingLockedAlert('eliminar múltiples filas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await showScanToast('info', 'Sin selección', 'Selecciona al menos una fila para eliminarla de la tabla actual.');
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
    refreshMobileChecklistCardsSafely();
    queueAutoSave('eliminar seleccionados');

    await showScanToast('success', 'Filas eliminadas', 'Se eliminaron ' + selectedRows.length + ' fila(s) de la tabla actual.');
  }

  function canMoveSelectedRowsToRequest() {
    const activeStatus = normalizeRequestStatus(activeWarehouseRequest?.status || '', '');
    return canUseWarehouseTools()
      && !!activeWarehouseRequest?.requestId
      && isRequestOpenForWarehouseMerge(activeStatus)
      && !isEditingLocked();
  }

  function buildMoveSelectedDestinationHtml(candidates = [], sourceRequest = {}) {
    const sourceStoreName = sourceRequest.storeName || getStoreLabel(sourceRequest.storeKey || storeSelect?.value);
    const destinationOptions = candidates.map(req => {
      const id = req.id || req.requestId || '';
      const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
      const date = getRequestDateKey(req) || 'sin fecha';
      const label = getFriendlyRequestCode(req) + ' · ' + getRequestTypeLabel(req) + ' · ' + date + ' · ' + count + ' item(s)';
      return '<option value="' + htmlAttrEscape(id) + '">' + escapeHtml(label) + '</option>';
    }).join('');

    return `
      <div class="text-start small">
        <p class="text-muted mb-3">
          Mueve los productos seleccionados desde la solicitud actual hacia otra recepción/solicitud abierta de <strong>${escapeHtml(sourceStoreName)}</strong>. Al finalizar se eliminan del origen y quedan solo en el destino.
        </p>
        <label class="form-label fw-semibold" for="moveDestinationRequest">Destino</label>
        <select id="moveDestinationRequest" class="form-select mb-2">
          <option value="__create_transfer__">Crear nueva recepción/traslado de hoy para esta sucursal</option>
          ${destinationOptions}
        </select>
        <div class="form-text mb-3">Solo se permiten destinos de la misma sucursal y que no estén cerrados, recibidos, cancelados o fusionados.</div>
        <label class="form-check">
          <input class="form-check-input" type="checkbox" id="moveOpenDestinationAfter" checked>
          <span class="form-check-label">Abrir el destino al terminar</span>
        </label>
      </div>
    `;
  }

  function buildWarehouseTransferRequestPayload(sourceRequest = {}, requestId = '', items = []) {
    const now = new Date().toISOString();
    const day = getTodayString();
    const storeKey = sourceRequest.storeKey || storeSelect?.value || '';
    const storeName = sourceRequest.storeName || getStoreLabel(storeKey);
    const versionKey = 'traslado';

    return {
      requestId,
      storeKey,
      storeName,
      destinationStoreKey: storeKey,
      destinationStoreName: storeName,
      versionKey,
      versionLabel: getVersionLabel(versionKey),
      requestDate: day,
      status: REQUEST_STATUSES.REVIEW,
      origin: 'warehouse',
      createdAt: now,
      submittedAt: now,
      reviewStartedAt: now,
      reviewStartedByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
      itemCount: items.length,
      items,
      createdByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
      createdByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
      createdByRole: currentUserRole,
      movedFrom: []
    };
  }

  function buildRequestChecklistMirrorInfo(requestLike = {}, items = []) {
    const storeKey = requestLike.storeKey || requestLike.destinationStoreKey || '';
    const versionKey = requestLike.versionKey || 'base';
    const docId = getBinId(storeKey, versionKey);
    if (!docId) return null;

    const day = getRequestDateKey(requestLike) || getTodayString();
    const payload = {
      meta: buildChecklistMeta({
        storeKey,
        storeName: requestLike.storeName || requestLike.destinationStoreName || getStoreLabel(storeKey),
        versionKey,
        requisitionDone: false,
        requisitionDoneAt: null
      }),
      items: Array.isArray(items) ? items : []
    };

    return { docId, day, key: docId + '::' + day, payload };
  }

  async function saveRequestChecklistMirror(requestLike = {}, items = []) {
    const mirror = buildRequestChecklistMirrorInfo(requestLike, items);
    if (!mirror) return;
    await saveChecklistToFirestore(mirror.docId, mirror.payload, mirror.day);
  }

  function cleanFirestorePayload(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
      return value
        .map(item => cleanFirestorePayload(item))
        .filter(item => item !== undefined);
    }
    if (typeof value === 'object') {
      if (value instanceof Date) return value;
      const clean = {};
      Object.entries(value).forEach(([key, childValue]) => {
        const cleaned = cleanFirestorePayload(childValue);
        if (cleaned !== undefined) clean[key] = cleaned;
      });
      return clean;
    }
    return value;
  }

  function addChecklistMirrorToBatch(db, batch, mirror) {
    if (!db || !batch || !mirror?.docId || !mirror?.day) return false;
    if (typeof validateChecklistDocAccess === 'function') {
      validateChecklistDocAccess(mirror.docId, 'write');
    }
    batch.set(
      db.collection('tr_lista').doc(String(mirror.docId)).collection('historial').doc(String(mirror.day)),
      cleanFirestorePayload(mirror.payload || {}),
      { merge: true }
    );
    return true;
  }

  function combineChecklistMirrorsForSameKey(mirrors = []) {
    const validMirrors = (Array.isArray(mirrors) ? mirrors : []).filter(mirror => mirror?.docId && mirror?.day);
    if (!validMirrors.length) return [];

    const grouped = new Map();
    validMirrors.forEach(mirror => {
      const key = mirror.key || (String(mirror.docId) + '::' + String(mirror.day));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(mirror);
    });

    return Array.from(grouped.values()).map(group => {
      if (group.length === 1) return group[0];

      const baseMirror = group[group.length - 1];
      const combinedItems = [];
      group.forEach(mirror => {
        const items = Array.isArray(mirror?.payload?.items) ? mirror.payload.items : [];
        items.forEach(item => combinedItems.push(cloneChecklistItem(item)));
      });

      return {
        ...baseMirror,
        payload: {
          ...(baseMirror.payload || {}),
          meta: {
            ...((baseMirror.payload || {}).meta || {}),
            updatedAt: new Date().toISOString()
          },
          items: combinedItems
        }
      };
    });
  }

  function addChecklistMirrorsToBatch(db, batch, mirrors = []) {
    combineChecklistMirrorsForSameKey(mirrors).forEach(mirror => {
      addChecklistMirrorToBatch(db, batch, mirror);
    });
  }

  async function saveMoveRequestDocsAtomic(sourceId, sourcePayload, destinationId, destinationPayload, mirrors = {}) {
    if (typeof validateRequestAccessForPayload === 'function') {
      validateRequestAccessForPayload(sourcePayload, 'write');
      validateRequestAccessForPayload(destinationPayload, 'write');
    }

    const db = getFirestoreDb();
    const batch = db.batch();
    batch.set(db.collection('requests').doc(String(destinationId)), cleanFirestorePayload(destinationPayload || {}), { merge: true });
    batch.set(db.collection('requests').doc(String(sourceId)), cleanFirestorePayload(sourcePayload || {}), { merge: true });

    const sourceMirror = mirrors.sourceMirror || null;
    const destinationMirror = mirrors.destinationMirror || null;
    addChecklistMirrorsToBatch(db, batch, [destinationMirror, sourceMirror].filter(Boolean));

    await batch.commit();
  }

  function getComputedDispatchStatusFromItems(items = [], fallback = REQUEST_STATUSES.REVIEW) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) return REQUEST_STATUSES.REVIEW;
    const dispatchedCount = rows.filter(item => Boolean(item?.despachado)).length;
    if (dispatchedCount <= 0) return REQUEST_STATUSES.REVIEW;
    if (dispatchedCount >= rows.length) return REQUEST_STATUSES.DISPATCHED;
    return REQUEST_STATUSES.PARTIAL_DISPATCH;
  }

  async function resolveMoveDestination(selectionValue, sourceRequest, selectedItems) {
    if (selectionValue === '__create_transfer__') {
      const requestId = buildWarehouseCreatedRequestId(sourceRequest.storeKey, 'traslado', getTodayString());
      return {
        requestId,
        request: buildWarehouseTransferRequestPayload(sourceRequest, requestId, []),
        created: true
      };
    }

    const request = await loadRequestFromFirestore(selectionValue);
    if (!request) throw new Error('No se encontró la solicitud destino.');
    return {
      requestId: request.id || request.requestId || selectionValue,
      request,
      created: false
    };
  }

  async function chooseMoveSelectedDestination(sourceRequest, selectedItems) {
    const sourceId = sourceRequest.requestId || sourceRequest.id || activeWarehouseRequest?.requestId || '';
    let requests = await listRequestsForCurrentAccess({ limit: 500 });
    requests = requests.filter(req => {
      const id = String(req.id || req.requestId || '');
      if (!id || id === String(sourceId)) return false;
      if (String(req.storeKey || '') !== String(sourceRequest.storeKey || '')) return false;
      return isMergeEligibleDestination(req);
    });

    const result = await Swal.fire({
      title: 'Mover seleccionados',
      width: 720,
      html: buildMoveSelectedDestinationHtml(requests, sourceRequest),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const popup = Swal.getPopup();
        const destinationId = String(popup?.querySelector('#moveDestinationRequest')?.value || '').trim();
        const openAfter = !!popup?.querySelector('#moveOpenDestinationAfter')?.checked;
        if (!destinationId) {
          Swal.showValidationMessage('Selecciona el destino.');
          return false;
        }
        return { destinationId, openAfter };
      }
    });

    return result.isConfirmed ? result.value : null;
  }

  async function moveSelectedRowsToRequest() {
    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('mover productos entre solicitudes', 'bodega o administradores');
      return;
    }

    if (!activeWarehouseRequest?.requestId) {
      await showScanToast('info', 'Sin solicitud activa', 'Abre primero la solicitud que contiene los productos a mover.');
      return;
    }

    if (isEditingLocked()) {
      await showEditingLockedAlert('mover productos seleccionados');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await showScanToast('info', 'Sin selección', 'Selecciona uno o más productos para moverlos a otra solicitud.');
      return;
    }

    const sourceRequest = {
      ...(activeWarehouseRequest.original || {}),
      id: activeWarehouseRequest.requestId,
      requestId: activeWarehouseRequest.requestId,
      status: activeWarehouseRequest.status || activeWarehouseRequest.original?.status || REQUEST_STATUSES.REVIEW,
      storeKey: activeWarehouseRequest.original?.storeKey || storeSelect?.value || '',
      storeName: activeWarehouseRequest.original?.storeName || getStoreLabel(storeSelect?.value),
      versionKey: activeWarehouseRequest.original?.versionKey || versionSelect?.value || 'base',
      requestDate: activeWarehouseRequest.original?.requestDate || getTargetChecklistDate()
    };

    const selectedItems = selectedRows.map(buildChecklistItemFromRow);
    const destinationChoice = await chooseMoveSelectedDestination(sourceRequest, selectedItems);
    if (!destinationChoice) return;

    const destinationInfo = await resolveMoveDestination(destinationChoice.destinationId, sourceRequest, selectedItems);
    const destinationRequest = destinationInfo.request || {};
    if (String(destinationRequest.storeKey || '') !== String(sourceRequest.storeKey || '')) {
      await showScanToast('error', 'Sucursal distinta', 'El destino debe pertenecer a la misma sucursal que la solicitud origen.');
      return;
    }
    if (!isMergeEligibleDestination(destinationRequest)) {
      await showScanToast('error', 'Destino cerrado', 'El destino seleccionado no está abierto para recibir productos.');
      return;
    }

    const destinationItems = Array.isArray(destinationRequest.items) ? destinationRequest.items : [];
    const conflicts = analyzeMergeConflicts(destinationItems, selectedItems);
    const duplicateStrategy = await promptMergeConflictStrategy(conflicts, {
      title: 'Coincidencias en destino',
      confirmButtonText: 'Mover productos',
      skipHelp: 'No mueve los repetidos; se quedan en la solicitud origen.',
      defaultStrategy: conflicts.hasWeakConflicts ? 'keep' : 'sum'
    });
    if (!duplicateStrategy) return;

    await withLoading('Moviendo productos seleccionados...', async () => {
      const now = new Date().toISOString();
      const user = window.TRAuth?.getCurrentUser?.();
      const mergeResult = mergeChecklistItems(destinationItems, selectedItems, { duplicateStrategy });
      const appliedSet = new Set(mergeResult.appliedSourceIndexes || []);
      const movedItems = selectedItems.filter((_item, idx) => appliedSet.has(idx));

      if (!movedItems.length) {
        await showScanToast('info', 'Sin cambios', 'No se movió ningún producto porque todos fueron omitidos por la regla seleccionada.');
        return;
      }

      const existingMovedFrom = Array.isArray(destinationRequest.movedFrom) ? destinationRequest.movedFrom : [];
      const destinationOriginalStatus = normalizeRequestStatus(destinationRequest.status || REQUEST_STATUSES.REVIEW);
      const destinationNextStatus = destinationOriginalStatus === REQUEST_STATUSES.SENT
        ? REQUEST_STATUSES.REVIEW
        : (destinationOriginalStatus || REQUEST_STATUSES.REVIEW);
      const destinationPayload = {
        ...destinationRequest,
        requestId: destinationInfo.requestId,
        id: undefined,
        items: mergeResult.items,
        itemCount: mergeResult.items.length,
        status: destinationNextStatus,
        ...(destinationNextStatus !== destinationOriginalStatus ? {
          statusUpdatedAt: now,
          statusUpdatedByUid: user?.uid || null,
          statusUpdatedByEmail: user?.email || null
        } : {}),
        movedFrom: [
          ...existingMovedFrom,
          {
            requestId: sourceRequest.requestId,
            movedAt: now,
            movedByEmail: user?.email || null,
            movedCount: movedItems.length
          }
        ],
        lastMoveAt: now,
        lastMoveByEmail: user?.email || null,
        lastWarehouseUpdateAt: now,
        lastWarehouseUpdateByUid: user?.uid || null,
        lastWarehouseUpdateByEmail: user?.email || null
      };
      delete destinationPayload.id;

      const rowsToMove = new Set(selectedRows.filter((_tr, idx) => appliedSet.has(idx)));
      const sourceItemsAfterMove = getTableRows()
        .filter(tr => !rowsToMove.has(tr))
        .map(buildChecklistItemFromRow);
      const computedSourceStatus = getComputedDispatchStatusFromItems(sourceItemsAfterMove, sourceRequest.status || REQUEST_STATUSES.REVIEW);
      const fullyMovedOut = sourceItemsAfterMove.length === 0;
      const sourceStatus = fullyMovedOut
        ? REQUEST_STATUSES.MERGED
        : (computedSourceStatus === REQUEST_STATUSES.DISPATCHED ? REQUEST_STATUSES.PARTIAL_DISPATCH : computedSourceStatus);
      const sourcePayload = {
        ...sourceRequest,
        id: undefined,
        requestId: sourceRequest.requestId,
        status: sourceStatus,
        itemCount: sourceItemsAfterMove.length,
        items: sourceItemsAfterMove,
        lastMoveOutAt: now,
        lastMoveOutByEmail: user?.email || null,
        lastWarehouseUpdateAt: now,
        lastWarehouseUpdateByUid: user?.uid || null,
        lastWarehouseUpdateByEmail: user?.email || null,
        ...(fullyMovedOut ? {
          statusUpdatedAt: now,
          statusUpdatedByUid: user?.uid || null,
          statusUpdatedByEmail: user?.email || null,
          mergedAt: now,
          mergedByEmail: user?.email || null,
          mergedIntoRequestId: destinationInfo.requestId,
          movedIntoRequestId: destinationInfo.requestId
        } : {})
      };
      delete sourcePayload.id;

      const sourceMirror = buildRequestChecklistMirrorInfo(sourcePayload, sourceItemsAfterMove);
      const destinationMirror = buildRequestChecklistMirrorInfo(destinationPayload, mergeResult.items);
      await saveMoveRequestDocsAtomic(sourceRequest.requestId, sourcePayload, destinationInfo.requestId, destinationPayload, {
        sourceMirror,
        destinationMirror
      });

      rowsToMove.forEach(tr => tr.remove());
      activeWarehouseRequest = { ...activeWarehouseRequest, status: sourceStatus, original: sourcePayload };
      renumber();
      clearBulkSelection();
      updateBulkSelectionUI();
      refreshMobileChecklistCardsSafely();
      rememberActiveWarehouseSnapshot();
      resetAutoSaveBaseline();
      updateLastSavedText(now);

      await refreshHistoryPicker();
      updateRequestFlowUI();

      const friendlyDestination = getFriendlyRequestCode({
        requestId: destinationInfo.requestId,
        id: destinationInfo.requestId,
        storeKey: destinationPayload.storeKey,
        versionKey: destinationPayload.versionKey,
        requestDate: destinationPayload.requestDate
      });
      const resolutionText = mergeResult.summed
        ? ' · Sumados: ' + mergeResult.summed
        : (mergeResult.keptSeparate ? ' · Separados: ' + mergeResult.keptSeparate : (mergeResult.skippedDuplicates ? ' · Omitidos: ' + mergeResult.skippedDuplicates : ''));

      await showScanToast('success', 'Productos movidos', 'Se movieron ' + movedItems.length + ' producto(s) a ' + friendlyDestination + resolutionText + '.', { timeout: 5200 });

      if (destinationChoice.openAfter) {
        await openWarehouseRequest({ id: destinationInfo.requestId, ...destinationPayload });
      }
    });
  }


  function updateHistoricalLockUI() {
    if (!btnToggleHistLock) return;

    const isPastHistorical = isPastHistoricalDateSelected();
    const isProtected = isProtectedVersionSelected();
    const canShowHistoricalUnlock = isPastHistorical && canUnlockHistoricalViews();
    const canShowProtectedUnlock = isProtected && canUseProtectedLists();
    const shouldShow = canShowHistoricalUnlock || canShowProtectedUnlock;
    const isUnlocked =
      (canShowHistoricalUnlock && historicalUnlockEnabled) ||
      (canShowProtectedUnlock && protectedVersionUnlockEnabled);

    if (btnHistToday) {
      // El botón Hoy debe estar siempre disponible; antes quedaba deshabilitado en modo hoy
      // y el clic terminaba abriendo el calendario por el contenedor.
      btnHistToday.disabled = false;
      btnHistToday.setAttribute('aria-disabled', 'false');
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

    const status = getActiveWarehouseRequestStatus('');
    const visible = canUseWarehouseTools()
      && hasActiveWarehouseRequest()
      && status === REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING;

    // Ocultar y desactivar primero evita que un estado visual anterior quede activo
    // al abrir otra solicitud o al reutilizar el panel lateral.
    btnToggleRequisition.classList.toggle('d-none', !visible);
    btnToggleRequisition.setAttribute('aria-hidden', String(!visible));
    btnToggleRequisition.disabled = !visible;
    btnToggleRequisition.setAttribute('aria-disabled', String(!visible));

    if (!visible) return;

    // El estado formal es la única fuente de verdad. Los campos legacy
    // requisition_done/requisitionDone no pueden mostrar u ocultar esta acción.
    btnToggleRequisition.classList.remove('btn-outline-secondary', 'btn-success', 'text-white');
    btnToggleRequisition.classList.add('btn-warning');
    setToolbarButtonContent(btnToggleRequisition, 'fa-solid fa-file-circle-check', 'Marcar requisición como hecha');
    btnToggleRequisition.title = 'Cambiar la solicitud a Despachado/Requisición hecha.';
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

  function applyRolePermissionsToRow(tr, disableEditing = isEditingLocked()) {
    if (!tr) return;

    const qty = tr.querySelector('.qty');
    const btnDes = getDispatchButton(tr);
    const btnMove = getMoveButton(tr);
    const btnDel = getDeleteButton(tr);
    const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');
    const bulkCell = tr.querySelector('.row-bulk-select-cell');

    if (bulkCell) bulkCell.classList.toggle('d-none', !canUseBulkSelection());

    if (qty) qty.disabled = disableEditing;
    if (btnDes) {
      btnDes.disabled = disableEditing || !canUseWarehouseTools();
      btnDes.classList.toggle('d-none', !canUseWarehouseTools());
    }
    if (btnMove) {
      btnMove.disabled = disableEditing || !canUseWarehouseTools();
      btnMove.classList.toggle('d-none', !canUseWarehouseTools());
    }

    if (btnDel) {
      const deleteDisabled = disableEditing || !canDeleteRows();
      btnDel.disabled = deleteDisabled;
      btnDel.classList.toggle('d-none', !canDeleteRows());
      btnDel.title = canDeleteRows() ? 'Quitar producto' : 'Sin permiso para quitar';
      btnDel.setAttribute('aria-label', canDeleteRows() ? 'Quitar producto' : 'Quitar producto (sin permiso)');
    }

    if (bulkSelect) {
      bulkSelect.disabled = !canUseBulkSelection();
      bulkSelect.checked = canUseBulkSelection() ? bulkSelect.checked : false;
      bulkSelect.setAttribute('aria-disabled', String(!canUseBulkSelection()));
    }
  }

  function applyRoleStateToMobileCard(card, tr) {
    if (!card || !tr) return;

    const qtyEditor = card.querySelector('.mobile-card-qty-input');
    const dispatchButton = card.querySelector('.mobile-action-dispatch');
        const deleteButton = card.querySelector('.mobile-action-delete');
    const qtyInput = tr.querySelector('.qty');
    const sourceDispatch = getDispatchButton(tr);
        const sourceDelete = getDeleteButton(tr);

    if (qtyEditor) qtyEditor.disabled = !!qtyInput?.disabled;
    if (dispatchButton) {
      dispatchButton.disabled = !canUseWarehouseTools() || !!sourceDispatch?.disabled;
      dispatchButton.classList.toggle('d-none', !canUseWarehouseTools());
      const isDispatched = !!sourceDispatch?.classList.contains('on');
      setToggleState(dispatchButton, isDispatched);
      dispatchButton.setAttribute('aria-pressed', String(isDispatched));
      card.classList.toggle('is-dispatched', isDispatched);
    }

    const cardCheck = card.querySelector('.mobile-card-check');
        if (cardCheck) cardCheck.classList.toggle('d-none', !canUseBulkSelection());

    if (deleteButton) {
      deleteButton.disabled = !canDeleteRows() || !!sourceDelete?.disabled;
      deleteButton.classList.toggle('d-none', !canDeleteRows());
      deleteButton.title = canDeleteRows() ? 'Quitar' : 'Sin permiso';
      deleteButton.setAttribute('aria-label', canDeleteRows() ? 'Quitar producto' : 'Quitar producto (sin permiso)');
    }
  }

  function applyRolePermissions() {
    restrictOperatorStoreAccess();

    const warehouseTools = canUseWarehouseTools();
    setWarehouseFilterLabels();
    if (warehouseTools) ensureWarehouseVersionFilterOption();
    document.body.classList.toggle('role-branch-operator', !warehouseTools);
    document.body.classList.toggle('role-warehouse-tools', warehouseTools);

    const histWrapper = document.querySelector('.hist-date-wrapper');
    if (histWrapper) histWrapper.classList.toggle('d-none', !warehouseTools);

    [btnExport, btnFabExport, moreActionsMenu].forEach(el => {
      if (!el) return;
      el.classList.toggle('d-none', !warehouseTools);
      if (!warehouseTools) {
        el.setAttribute('aria-hidden', 'true');
        if ('disabled' in el) el.disabled = true;
      } else {
        el.removeAttribute('aria-hidden');
        if ('disabled' in el) el.disabled = false;
      }
    });

    const bulkHeader = document.querySelector('th.bulk-select-col');
    if (bulkHeader) bulkHeader.classList.toggle('d-none', !canUseBulkSelection());

    const actionsHeader = document.querySelector('#chkTable thead th:last-child');
    if (actionsHeader) actionsHeader.textContent = warehouseTools ? 'Acciones' : 'Quitar';

    if (versionSelect) {
      Array.from(versionSelect.options).forEach(option => {
        if (option.value === '__all__') {
          option.hidden = !requiresWarehouseRequestContext();
          option.disabled = !requiresWarehouseRequestContext();
          return;
        }
        const protectedOption = (typeof isProtectedVersionKey === 'function')
          ? isProtectedVersionKey(option.value)
          : option.value === 'traslado';

        if (!protectedOption) return;

        option.disabled = !canUseProtectedLists();
        option.hidden = !canUseProtectedLists();
      });

      const currentProtected = (typeof isProtectedVersionKey === 'function')
        ? isProtectedVersionKey(versionSelect.value)
        : versionSelect.value === 'traslado';

      if ((currentProtected && !canUseProtectedLists()) || (!requiresWarehouseRequestContext() && versionSelect.value === '__all__')) {
        versionSelect.value = 'base';
        lastCommittedVersionValue = 'base';
      }
    }

    if (btnDispatchSelected) btnDispatchSelected.classList.toggle('d-none', !warehouseTools);
    if (btnMoveSelectedToRequest) btnMoveSelectedToRequest.classList.toggle('d-none', !warehouseTools);
    if (btnRequisitionsByDay) btnRequisitionsByDay.classList.toggle('d-none', !warehouseTools);
    if (btnFabRequisitionsByDay) btnFabRequisitionsByDay.classList.toggle('d-none', !warehouseTools);
    if (btnExportPendingRequisitions) btnExportPendingRequisitions.classList.toggle('d-none', !warehouseTools);
    if (btnFabExportPendingRequisitions) btnFabExportPendingRequisitions.classList.toggle('d-none', !warehouseTools);
    if (btnConsolidatePendingRequisitions) btnConsolidatePendingRequisitions.classList.toggle('d-none', !warehouseTools);
    if (btnFabConsolidatePendingRequisitions) btnFabConsolidatePendingRequisitions.classList.toggle('d-none', !warehouseTools);

    if (btnDeleteSelected) {
      const canShowBulkDelete = canUseBulkSelection() && canDeleteRows();
      btnDeleteSelected.classList.toggle('d-none', !canShowBulkDelete);
      btnDeleteSelected.title = canShowBulkDelete ? 'Eliminar seleccionados' : 'Sin permiso para eliminar seleccionados';
    }


    Array.from(body?.getElementsByTagName('tr') || []).forEach(tr => applyRolePermissionsToRow(tr, isEditingLocked()));
    refreshMobileChecklistCardsSafely();
    updateRequestFlowUI();
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
      applyRolePermissionsToRow(tr, disableEditing);
    });

    updateHistoricalLockUI();
    updateBulkSelectionUI();
    updateRequisitionUI();
    updateRequestFlowUI();
  }


  function isWarehouseRequestEditingLocked() {
    if (!canUseWarehouseTools() || !activeWarehouseRequest?.requestId) return false;
    return isRequestTerminalStatus(activeWarehouseRequest.status || activeWarehouseRequest.original?.status || '');
  }

  function isEditingLocked() {
    return isWarehouseWaitingForRequest()
      || isHistoricalEditingLocked()
      || isProtectedVersionEditingLocked()
      || isBranchRequestEditingLocked()
      || isWarehouseRequestEditingLocked();
  }

  // --- Centrar siempre el elemento que tiene el foco (buscador o cantidad) ---
  function centerOnElement() {
    // Desactivado: el centrado automático del foco movía la pantalla en PC y móvil.
  }

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t === searchInput || t?.classList?.contains('qty') || t?.classList?.contains('mobile-card-qty-input')) {
      centerOnElement(t);
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;

    if (moreActionsMenu?.hasAttribute('open') && !moreActionsMenu.contains(target)) {
      closeMoreActionsMenu();
    }

    if (warehouseActionsMenu?.hasAttribute('open') && !warehouseActionsMenu.contains(target)) {
      closeWarehouseActionsMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllToolbarMenus();
    }
  });


  [moreActionsMenu, warehouseActionsMenu].forEach(menu => {
    if (!menu) return;
    menu.addEventListener('click', (e) => {
      const action = e.target instanceof Element ? e.target.closest('button') : null;
      if (action && !action.closest('summary')) {
        setTimeout(() => menu.removeAttribute('open'), 0);
      }
    });
  });

  if (btnToggleSelectAllBulk) {
    btnToggleSelectAllBulk.addEventListener('click', () => {
      if (btnToggleSelectAllBulk.disabled) return;
        toggleVisibleBulkSelection();
    });
  }

  if (chkSelectAllRows) {
    chkSelectAllRows.addEventListener('change', () => {
      if (chkSelectAllRows.disabled) {
        updateBulkSelectionUI();
        return;
      }
      toggleVisibleBulkSelection();
    });
  }

  if (btnDispatchSelected) {
    btnDispatchSelected.addEventListener('click', async () => {
      if (btnDispatchSelected.disabled) return;
        await markSelectedRowsWithState();
    });
  }

  if (btnMoveSelectedToRequest) {
    btnMoveSelectedToRequest.addEventListener('click', async () => {
      if (btnMoveSelectedToRequest.disabled) return;
      try { await moveSelectedRowsToRequest(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async () => {
      if (btnDeleteSelected.disabled) return;
        await deleteSelectedRows();
    });
  }

  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', async () => {
      if (btnClearSelection.disabled) return;
      clearBulkSelection();
        updateBulkSelectionUI();
      refreshMobileChecklistCardsSafely();
      await showScanToast('info', 'Selección cancelada', 'Se quitó la selección de productos.');
    });
  }

  function updateStoreUI() {
    const val = storeSelect.value;
    const storeShell = storeSelect ? storeSelect.closest('.store-select-shell') : null;

    storeBadge.classList.remove('badge-sexta', 'badge-morazan', 'badge-centro');
    if (storeShell) {
      storeShell.classList.remove('store-tone-sexta', 'store-tone-morazan', 'store-tone-centro');
    }

    if (val === '__all__') {
      storeBadge.classList.add('badge-morazan');
      storeBadgeText.textContent = 'Todas las sucursales';
      if (storeShell) storeShell.classList.add('store-tone-morazan');
    } else if (val === 'lista_sexta_calle') {
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
  restrictOperatorStoreAccess();
  applyRolePermissions();
  updateStoreUI();




  function renumber() {
    [...body.getElementsByTagName('tr')].forEach((row, idx) => {
      row.cells[COL_INDEX.rowNumber].textContent = (body.rows.length - idx);
    });
  }


  function findExistingRowByItem(item) {
    return [...body.getElementsByTagName('tr')].find(tr => itemsMatch(buildChecklistItemFromRow(tr), item)) || null;
  }

  function clearSearchUI() {
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (searchInput) searchInput.value = '';
    if (primarySearchMode === 'list') {
      applyListSearchFilter();
    }
  }

  function flashAndFocusRow(tr, preferredTarget = 'qty') {
    if (!tr) return;

    revealRowForLocate(tr);

    tr.classList.remove('row-existing-highlight');
    void tr.offsetWidth;
    tr.classList.add('row-existing-highlight');

    window.setTimeout(() => {
      tr.classList.remove('row-existing-highlight');
    }, 3800);

    if (isCompactScreen()) {
      refreshMobileChecklistCardsSafely({ force: true });
      const card = getMobileCardForRow(tr);
      if (!card) return;

      card.classList.remove('mobile-card-locate-highlight');
      void card.offsetWidth;
      card.classList.add('mobile-card-locate-highlight');
      window.setTimeout(() => {
        card.classList.remove('mobile-card-locate-highlight');
      }, 3800);

      const scrollCardIntoView = () => {
        const cardRect = card.getBoundingClientRect();
        const absoluteTop = cardRect.top + window.pageYOffset;
        const targetTop = Math.max(0, absoluteTop - ((window.innerHeight - cardRect.height) / 2));
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      };

      window.setTimeout(scrollCardIntoView, 30);
      return;
    }

    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (!lastSaved) return;
    if (requiresWarehouseRequestContext() && hasActiveWarehouseRequest()) {
      const meta = getActiveRequestExportMeta();
      const lastText = lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : emptyText;
      lastSaved.innerHTML =
        '<i class="fa-solid fa-clipboard-list me-1 text-primary"></i>' +
        '<strong>Solicitud abierta:</strong> ' + escapeHtml(meta.requestCode) +
        ' · <strong>Fecha solicitud:</strong> ' + escapeHtml(meta.requestDate || 'Sin fecha') +
        ' · ' + escapeHtml(lastText);
      return;
    }
    lastSaved.innerHTML =
      '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
      (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : emptyText);
  }

  async function persistCurrentChecklist(options = {}) {
    if (isWarehouseWaitingForRequest()) {
      await showScanToast('info', 'Sin solicitud abierta', 'Bodega debe abrir una solicitud desde la bandeja antes de guardar cambios.');
      return { ok: false, reason: 'warehouse_no_request' };
    }

    const {
      successTitle = 'Guardado',
      successMessage = 'Checklist guardado correctamente.',
      successIcon = 'success',
      showSuccess = true,
      allowLocked = false,
      requestStatusOverride = null
    } = options || {};

    if (isEditingLocked() && !allowLocked) {
      await showEditingLockedAlert('guardar cambios');
      return { ok: false, reason: 'locked' };
    }

    if (!(await enforceCurrentStoreAccess('guardar información'))) {
      return { ok: false, reason: 'store_denied' };
    }

    return withLoading('Guardando checklist...', async () => {
      const docId = getDocIdForCurrentList();
      const payload = collectPayload();
      const targetDay = getTargetChecklistDate();

      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);
      if (isBranchOperator()) {
        requestFlowState = buildRequestSummaryFromRecord(payload);
      } else if (activeWarehouseRequest) {
        await syncActiveWarehouseRequest(requestStatusOverride);
      }
      updateLastSavedText(payload.meta?.updatedAt || null);
      resetAutoSaveBaseline();
      await refreshHistoryPicker();
      updateRequestFlowUI();

      resetAutoSaveBaseline();

      if (showSuccess) {
        await showScanToast(successIcon, successTitle, successMessage);
      }

      return { ok: true, docId, payload, targetDay };
    });
  }


  async function persistWarehouseWorkflowTransition(requestStatusOverride) {
    if (!activeWarehouseRequest?.requestId || !canUseWarehouseTools()) {
      return { ok: false, reason: 'warehouse_no_request' };
    }

    if (!(await enforceCurrentStoreAccess('cambiar el estado de la solicitud'))) {
      return { ok: false, reason: 'store_denied' };
    }

    const normalizedStatus = normalizeRequestStatus(requestStatusOverride, '');
    const allowedTransitions = [
      REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE
    ];
    if (!allowedTransitions.includes(normalizedStatus)) {
      throw new Error('Transición de requisición no válida.');
    }

    return withLoading('Guardando estado de la solicitud...', async () => {
      const docId = getDocIdForCurrentList();
      const targetDay = getTargetChecklistDate();
      const checklistPayload = collectPayload();
      const requestResult = buildActiveWarehouseRequestSyncPayload(normalizedStatus);
      if (!requestResult) throw new Error('No se pudo preparar la solicitud para guardar.');

      if (typeof validateChecklistDocAccess === 'function') {
        validateChecklistDocAccess(docId, 'write');
      }
      if (typeof validateRequestAccessForPayload === 'function') {
        validateRequestAccessForPayload(requestResult.payload, 'write');
      }

      const db = getFirestoreDb();
      const batch = db.batch();
      batch.set(
        db.collection('tr_lista').doc(String(docId)).collection('historial').doc(String(targetDay)),
        cleanFirestorePayload(checklistPayload || {}),
        { merge: true }
      );
      batch.set(
        db.collection('requests').doc(String(requestResult.requestId)),
        cleanFirestorePayload(requestResult.payload || {}),
        { merge: true }
      );
      await batch.commit();

      applyActiveWarehouseRequestSyncResult(requestResult);
      rememberHistoryDate(docId, targetDay);
      lastUpdateISO = checklistPayload.meta?.updatedAt || new Date().toISOString();
      updateLastSavedText(lastUpdateISO);
      resetAutoSaveBaseline();
      await refreshHistoryPicker();
      updateRequestFlowUI();

      return {
        ok: true,
        docId,
        targetDay,
        payload: checklistPayload,
        requestPayload: requestResult.payload,
        status: requestResult.status
      };
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
            ${isCompactScreen() ? 'Ubicar producto' : 'Ubicarme en esa fila'}
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
      returnFocus: false,
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

  
  async function handleExistingRowAction(existingRow) {
    if (!existingRow) return false;

    const existingItem = buildChecklistItemFromRow(existingRow);
    const action = await promptExistingRowAction(existingItem, existingRow);

    if (action === 'duplicate') {
      addRowFromData(existingItem, { focusQuantity: true });
      return true;
    }

    if (action === 'dispatch') {
      const dispatchBtn = getDispatchButton(existingRow);
      const changed = ensureRowDispatched(existingRow);
      flashAndFocusRow(existingRow, 'dispatch');

      if (!changed) {
        await showScanToast('info', 'Sin cambios', 'Ese producto ya estaba marcado como despachado.');
        return true;
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
        await showScanToast(
          'error',
          'Error',
          'Se marcó el producto en pantalla, pero no se pudo guardar automáticamente. ' + String(e),
          { timeout: 5200 }
        );
      }
      return true;
    }

    if (action === 'locate') {
      window.setTimeout(() => {
        flashAndFocusRow(existingRow, 'qty');
      }, isCompactScreen() ? 160 : 60);
      return true;
    }

    return action !== 'cancel';
  }

async function handleProductSelection(item) {
    if (isWarehouseWaitingForRequest()) {
      await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de agregar productos.');
      return;
    }

    if (isBranchOperator() && !isRequestDraftStatus(requestFlowState?.status)) {
      await showScanToast('info', 'Lista no iniciada', 'Presiona “Iniciar lista” antes de agregar productos.');
      return;
    }

    const existingRow = findExistingRowByItem(item);

    if (!existingRow) {
      addRowFromData(item, { focusQuantity: true });
      clearSearchUI();
      if (shouldAvoidAutoFocus()) {
        try { searchInput?.blur(); } catch (_) {}
      }
      if (!suppressProductAddedToast) {
        showScanToast('success', 'Producto agregado', item?.nombre || 'Producto agregado', { timeout: 2400 });
      }
      queueAutoSave('producto agregado');
      return;
    }

    clearSearchUI();
    const existingChanged = await handleExistingRowAction(existingRow);
    if (existingChanged) queueAutoSave('producto existente actualizado');
  }

  // ===== Sugeridos por ventas diarias / historial de solicitudes =====
  // Solo se incorporan productos confirmados del catálogo y dentro de la sucursal autorizada.
  async function fetchReplenishment(storeKey) {
    const token = await getCurrentUserIdToken();
    if (!token) throw new Error('Tu sesión expiró. Ingresa nuevamente.');
    const resp = await fetch('/api/replenishment?storeKey=' + encodeURIComponent(storeKey), {
      headers: { Authorization: 'Bearer ' + token }, cache:'no-store'
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error(data.error || 'No se pudieron obtener los sugeridos.');
    return data;
  }

  async function syncDailySales(day = '') {
    if (!hasRole('admin')) {
      await showRoleDeniedAlert('sincronizar ventas', 'administradores');
      return false;
    }
    const token = await getCurrentUserIdToken();
    const resp = await fetch('/api/daily-sales-sync', {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
      body:JSON.stringify({ ...(day ? { day } : {}) }), cache:'no-store'
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.status >= 400 || !data.results) throw new Error(data.error || 'No se pudieron archivar las ventas.');
    const details = data.results.map(row => {
      const label = (row.sheet || row.storeKey || '').replace('VENTAS-DIARIAS-','');
      const status = row.status === 'saved' ? 'Archivada' : row.status === 'updated' ? 'Actualizada'
        : row.status === 'already-saved' ? 'Ya guardada' : row.status === 'unchanged-source' ? 'Sin cambios desde la última captura' : 'Error';
      return '<div class="d-flex justify-content-between gap-2 border-bottom py-2"><span>' + escapeHtml(label)
        + '</span><span><strong>' + escapeHtml(status) + '</strong> · ' + escapeHtml(String(row.rows ?? 0))
        + ' productos' + (row.error ? '<div class="text-danger small">' + escapeHtml(row.error) + '</div>' : '') + '</span></div>';
    }).join('');
    await Swal.fire({title:'Sincronización de ventas', html:'<div class="text-start">' + details + '</div>', icon:data.ok ? 'success' : 'warning', confirmButtonText:'Aceptar'});
    return data.ok;
  }

  function getQuantityFromRow(row) {
    const raw = String(row?.querySelector('.qty')?.value ?? '').trim();
    if (!raw) return 0;
    // La tabla permite cantidades textuales; nunca sumamos si no es numérica.
    if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return null;
    return Number(raw.replace(',','.'));
  }

  function findSalesCatalogEntry(code, catalog) {
    const target = String(code || '').trim().toUpperCase().replace(/^0+(?=\d)/,'');
    if (!target) return null;
    const matches = (catalog || []).filter(row => {
      const inv = String(row?.[1] || '').trim().toUpperCase().replace(/^0+(?=\d)/,'');
      return inv === target;
    });
    // Si el mismo código aparece en varias bodegas, resolver SOLO por nombre exacto.
    if (matches.length === 1) return matches[0];
    // No adivinar asignaciones con códigos ambiguos.
    return null;
  }

  async function openReplenishment() {
    closeMobileFab();
    if (!(await enforceCurrentStoreAccess('consultar sugeridos'))) return;
    const storeKey = String(storeSelect?.value || '');
    if (!['lista_avenida_morazan','lista_centro_comercial','lista_sexta_calle'].includes(storeKey)) {
      await showScanToast('info','Elige una sucursal','Selecciona una tienda específica para consultar sus sugeridos.');
      return;
    }
    try {
      const [data,catalog] = await withLoading('Consultando ventas y solicitudes...', () => Promise.all([fetchReplenishment(storeKey), loadProductsFromGoogleSheets()]));
        if (storeSelect.value !== storeKey) throw new Error('La sucursal cambió durante la consulta.');
        const activeEntries = (data.results || []).filter(item => item.suggestedQty > 0).slice(0,150).map(item => {
          const catalogRow = findSalesCatalogEntry(item.code,catalog);
          const existingRow = catalogRow ? findExistingRowByItem(buildItemFromCatalogRow(catalogRow)) : null;
          const alreadyOnList = existingRow ? getQuantityFromRow(existingRow) : 0;
          return { ...item, catalogRow, existingRow, alreadyOnList,
            quantity:Math.max(0,Math.ceil(item.suggestedQty - (alreadyOnList ?? 0))) };
        });
        if (replenishmentStatus) replenishmentStatus.textContent = (data.latestDay
          ? 'Ventas archivadas hasta ' + data.latestDay : 'Sin ventas diarias archivadas')
          + ' · ' + (data.requestRecords || 0) + ' solicitudes históricas consultadas.';
        if (!activeEntries.length) {
          await Swal.fire({icon:'info',title:'Sin sugeridos disponibles',
            text:data.warning || 'No hay productos con patrones suficientes o aún no corresponde otra solicitud.'});
          return;
        }
        const canAdd = !isEditingLocked() && (!isBranchOperator() || isRequestDraftStatus(requestFlowState?.status)) && isStoreAllowedForCurrentUser(storeKey);
        const rows = activeEntries.map((item,index) => {
          const unavailable = !item.catalogRow;
          const badQty = item.alreadyOnList === null;
          const blocked = unavailable || badQty || item.quantity <= 0 || !canAdd;
          return `<tr class="align-middle" data-suggest-index="${index}">
            <td><input class="form-check-input suggest-select" type="checkbox" ${blocked ? 'disabled' : 'checked'} aria-label="Seleccionar producto"></td>
            <td class="text-start"><div class="fw-semibold">${escapeHtml(item.name || item.catalogRow?.[0] || item.code)}</div>
              <div class="small text-muted">${escapeHtml(item.code)} · ${item.salesDays} día(s) ventas · ${item.requestCount} solicitudes</div>
              <div class="small ${unavailable || badQty ? 'text-danger' : 'text-muted'}">${unavailable ? 'No encontrado de forma única en catálogo' : badQty ? 'La cantidad actual es texto: revisar manualmente' : 'Prom. ventas: '+item.dailyDemand+'/día · Ciclo: '+item.intervalDays+' días'}</div></td>
            <td class="text-end">${item.suggestedQty}</td>
            <td><span class="badge ${item.confidence === 'Alta' ? 'text-bg-success' : item.confidence === 'Media' ? 'text-bg-primary' : 'text-bg-secondary'}">${escapeHtml(item.confidence)}</span></td>
            <td style="min-width:90px"><input class="form-control form-control-sm suggest-qty" type="number" min="0" step="1" max="100000" value="${item.quantity}" ${blocked ? 'disabled' : ''} aria-label="Cantidad a incorporar"></td></tr>`;
        }).join('');
        const warning = data.warning ? `<div class="alert alert-warning py-2 small">${escapeHtml(data.warning)}</div>` : '';
        const html = `<div class="text-start"><p class="small text-muted mb-2">${escapeHtml(storeSelect.options[storeSelect.selectedIndex]?.text || '')} · Última venta archivada: ${escapeHtml(data.latestDay || 'Sin datos')} · ${data.snapshotCount} fechas.</p>
          <div class="alert alert-info py-2 small">Cantidades <strong>orientativas</strong>: basadas en ventas y patrones de solicitudes. Sin inventario físico confirmado no representan faltantes reales. Las cantidades ya presentes en la lista se descuentan.</div>${warning}
          <div class="table-responsive" style="max-height:55vh;overflow-y:auto"><table class="table table-sm align-middle"><thead class="table-light sticky-top"><tr><th>Sel.</th><th>Producto</th><th class="text-end">Objetivo</th><th>Conf.</th><th>A agregar</th></tr></thead><tbody>${rows}</tbody></table></div>
          <small class="text-muted">Solo se incorporarán productos con coincidencia única de código de inventario en el catálogo. Puedes ajustar cantidades antes de agregar.</small></div>`;
        const result = await Swal.fire({title:'Sugeridos de reposición',html,width:1020,showCancelButton:canAdd,
          showConfirmButton:canAdd,confirmButtonText:'Añadir seleccionados',cancelButtonText:'Cerrar',
          didOpen: popup => {
            popup.querySelectorAll('.suggest-qty').forEach(input => input.addEventListener('input',()=>{
              const tr=input.closest('tr');
              if (tr && Number(input.value)>0) tr.querySelector('.suggest-select').checked=true;
            }));
          },
          preConfirm: () => {
            const popup=Swal.getPopup();
            const chosen=[...popup.querySelectorAll('tr[data-suggest-index]')].filter(tr=>tr.querySelector('.suggest-select')?.checked).map(tr => {
              const idx=Number(tr.dataset.suggestIndex), qty=Number(tr.querySelector('.suggest-qty')?.value);
              return { idx, qty };
            });
            if (!chosen.length) { Swal.showValidationMessage('Selecciona al menos un producto.'); return false; }
            if (chosen.some(x=>!Number.isSafeInteger(x.qty)||x.qty<1||x.qty>100000)) {
              Swal.showValidationMessage('Usa cantidades enteras entre 1 y 100000.');return false;
            }
            return chosen;
          }
        });
        if (!result.isConfirmed || !Array.isArray(result.value)) return;
        // Estado puede cambiar al abrir un modal (otra pestaña o contexto).
        if (storeSelect.value !== storeKey || isEditingLocked() || (isBranchOperator() && !isRequestDraftStatus(requestFlowState?.status))) {
          await showScanToast('warning','Lista bloqueada','Abre o inicia una lista editable antes de incorporar sugeridos.');return;
        }
        let added=0, summed=0, skipped=0;
        for (const {idx,qty} of result.value) {
          const item=activeEntries[idx];
          if (!item?.catalogRow) { skipped++;continue; }
          const listItem=buildItemFromCatalogRow(item.catalogRow);
          const existing=findExistingRowByItem(listItem);
          if (existing) {
            const current=getQuantityFromRow(existing);
            if (current === null) {skipped++;continue;}
            const input=existing.querySelector('.qty');
            if (!input || input.disabled) {skipped++;continue;}
            input.value=String(Math.round((current+qty)*100)/100);
            input.dispatchEvent(new Event('input',{bubbles:true}));
            summed++;
          } else {
            addRowFromData({...listItem,cantidad:String(qty)}, {focusQuantity:false});
            added++;
          }
        }
        if (added || summed) {
          renumber();updateBulkSelectionUI();applyListSearchFilter();
          refreshMobileChecklistCardsSafely({force:true});
          queueAutoSave('sugeridos de reposición');
        }
        await showScanToast('success','Sugeridos incorporados',`Nuevos: ${added} · Sumados: ${summed} · Omitidos: ${skipped}.`);
    } catch(error) {
      console.error('Error en sugeridos:',error);
      await Swal.fire({icon:'error',title:'No se pudieron consultar los sugeridos',text:error.message || String(error)});
    }
  }

  [btnOpenReplenishment, btnFabReplenishment].filter(Boolean).forEach(button => {
    button.addEventListener('click', () => { openReplenishment(); });
  });
  if (btnSyncDailySales) {
    btnSyncDailySales.classList.toggle('d-none', !hasRole('admin'));
    btnSyncDailySales.addEventListener('click', async () => {
      try {
        const d = new Date();
        d.setDate(d.getDate()-1);
        const proposed = (window.TRUtils?.getLocalDateString?.(d)) || (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
        const answer = await Swal.fire({title:'Fecha de las ventas cargadas',input:'date',inputValue:proposed,
          text:'Indica el día al que corresponde lo que actualmente aparece en las tres hojas. No es la fecha de hoy salvo que sean ventas de hoy.',
          showCancelButton:true,confirmButtonText:'Archivar tres sucursales',cancelButtonText:'Cancelar',
          inputValidator: day => !day ? 'Selecciona una fecha.' : undefined});
        if (!answer.isConfirmed) return;
        const data = await withLoading('Archivando ventas de las tres sucursales...',()=>syncDailySales(answer.value));
      }
      catch(err) { await Swal.fire({icon:'error',title:'Error al sincronizar',text:err.message||String(err)}); }
    });
  }

  function collectPayload(options = {}) {
    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    const meta = buildChecklistMeta();

    if (isBranchOperator()) {
      const now = new Date().toISOString();
      const status = options.requestStatus || requestFlowState?.status || 'draft';
      meta.request_status = status;
      meta.solicitud_status = status;
      meta.request_id = options.requestId || requestFlowState?.requestId || getCurrentRequestIdForToday();
      meta.request_created_at = options.requestCreatedAt || requestFlowState?.createdAt || now;
      meta.request_submitted_at = options.requestSubmittedAt || requestFlowState?.submittedAt || null;
      meta.request_item_count = items.length;
    }

    return {
      meta,
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

      if (!(await enforceCurrentStoreAccess('mover productos'))) return;

      const storeKey = storeSelect.value;
      const fromKey = versionSelect.value;
      const destinationKeys = getDestinationVersionKeys(storeKey, fromKey);

      if (!destinationKeys.length) {
        await showScanToast('error', 'Configuración incompleta', 'No hay otra lista disponible como destino para esta tienda.');
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
        await showScanToast('error', 'Configuración incompleta', 'No se encontró el identificador de la lista origen o destino para esta tienda.');
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

      if (findMatchingItemInArray(destRec.items, item)) {
        await showScanToast('info', 'Sin cambios', 'Ese producto ya existe en la lista destino. No se movió para evitar duplicados.');
        return;
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

      await showScanToast('success', 'Movimiento realizado', 'El producto se movió a la lista ' + getVersionLabel(toKey) + ' de esta tienda.');
    } catch (err) {
      console.error(err);
      await showScanToast('error', 'Error', 'No se pudo mover el producto entre listas. Intenta de nuevo.');
    }
  }

  function addRowFromData(item, options = {}) {
    const tr = document.createElement('tr');
    ensureRowDomId(tr);
    const qtyValue = htmlAttrEscape(item.cantidad ?? '');
    const safeBarcode = escapeHtml(item.codigo_barras || '');
    const safeName = escapeHtml(item.nombre || '');
    const safeInventoryCode = escapeHtml(item.codigo_inventario || 'N/A');
    const safeWarehouse = escapeHtml(item.bodega || '');
    tr.innerHTML = `
      <td class="text-center sticky-col-select row-bulk-select-cell">
        <input
          type="checkbox"
          class="form-check-input row-bulk-select-checkbox"
          aria-label="Seleccionar fila"
        >
      </td>
      <td></td>
      <td>${safeBarcode}</td>
      <td>${safeName}</td>
      <td>${safeInventoryCode}</td>
      <td>${safeWarehouse}</td>
      <td>
        <input type="text" class="form-control form-control-sm qty" value="${qtyValue}" placeholder="0">
      </td>
      <td class="text-center">
        <div class="row-actions-grid" role="group" aria-label="Acciones de fila">
          <button class="btn btn-sm btn-outline-success btn-toggle btn-toggle-dispatch ${item.despachado ? 'on' : 'off'}" title="Despachado" aria-label="Marcar despachado">
            <i class="fa-solid fa-truck-ramp-box"></i>
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

    const btnDes = getDispatchButton(tr);
    const btnMove = getMoveButton(tr);
    const btnDel = getDeleteButton(tr);
    const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');

    if (btnDes) {
      btnDes.addEventListener('click', () => {
        toggleBtn(btnDes);
        syncMobileDispatchStateForRow(tr);
        queueAutoSave('marcar despachado');
        updateActiveRequestDispatchVisualStatus();
      });
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
      btnDel.addEventListener('click', async () => {
        if (!canDeleteRows()) {
          await showRoleDeniedAlert('quitar productos', 'usuarios autorizados');
          return;
        }

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
            applyListSearchFilter();
            refreshMobileChecklistCardsSafely();
            queueAutoSave('eliminar producto');
          }
        });
      });
    }

    applyRolePermissionsToRow(tr, isEditingLocked());
    if (!isBulkRenderingRows) {
      updateBulkSelectionUI();
    }

    const qtyInput = tr.querySelector('.qty');
    if (qtyInput) {
      bindQtyPreview(qtyInput);
      qtyInput.addEventListener('input', () => {
        const editingThisQty = document.activeElement === qtyInput;
        const deferMobileRefresh = isCompactScreen() && editingThisQty;
        if (!suppressMobileCardRefresh && !deferMobileRefresh) {
          refreshMobileChecklistCardsSafely();
        }
        updateListSearchMeta();
        queueAutoSave('cantidad');
      });
      qtyInput.addEventListener('change', () => {
        if (!suppressMobileCardRefresh && isCompactScreen()) {
          refreshMobileChecklistCardsSafely();
        }
        flushPendingMobileCardRefresh({ delay: 120 });
      });
      qtyInput.addEventListener('blur', () => {
        if (!suppressMobileCardRefresh && isCompactScreen()) {
          flushPendingMobileCardRefresh({ delay: 120 });
          window.setTimeout(() => refreshMobileChecklistCardsSafely({ force: true }), 160);
        }
      });
      qtyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          focusSearchInput({ center: false, select: true, force: true });
        }
      });
    }

    if (!isBulkRenderingRows) {
      applyListSearchFilter();
    }

    if (options.focusQuantity) {
      focusQuantityInputForRow(tr, { select: true, center: false });
    }
  }

  function renderChecklistItems(items = []) {
    const list = Array.isArray(items) ? items : [];
    isBulkRenderingRows = true;
    try {
      list.forEach(item => addRowFromData(item, { focusQuantity: false }));
    } finally {
      isBulkRenderingRows = false;
    }
    renumber();
    updateBulkSelectionUI();
    applyListSearchFilter();
    refreshMobileChecklistCardsSafely({ force: true });
  }


  // --- Autocomplete search ---
  let currentFocus = -1;
  let rowDomIdCounter = 0;

  if (btnSearchModeToggle) {
    btnSearchModeToggle.addEventListener('click', () => {
      primarySearchMode = primarySearchMode === 'catalog' ? 'list' : 'catalog';
      updatePrimarySearchModeUI();

      if (primarySearchMode === 'list') {
        syncPrimarySearchToListSearch();
        if (!shouldAvoidAutoFocus()) {
          focusSearchInput({ center: false, select: true });
        }
        return;
      }

      suggestions.innerHTML = '';
      currentFocus = -1;
      applyListSearchFilter();
      focusSearchInput({ center: true, select: true });
    });
  }
  searchInput.addEventListener('input', () => {
    const rawValue = (searchInput.value || '').replace(/\r|\n/g, '');
    const q = rawValue.trim();
    clearCatalogSearchTimer();
    suggestions.innerHTML = '';
    currentFocus = -1;

    if (primarySearchMode === 'list') {
      syncPrimarySearchToListSearch();
      return;
    }

    if (!q) {
      lastCatalogQuery = '';
      return;
    }

    lastCatalogQuery = q;
    catalogSearchRenderTimer = window.setTimeout(async () => {
      const rows = await loadProductsFromGoogleSheets();
      if (lastCatalogQuery !== q || primarySearchMode !== 'catalog') return;
      renderCatalogSuggestions(rows, q);
    }, 90);
  });



  async function handlePrimarySearchSubmit() {
    if (primarySearchMode === 'list') {
      syncPrimarySearchToListSearch();

      const firstMatch = getTableRows().find(tr => rowMatchesCurrentListSearch(tr));
      if (firstMatch) {
        flashAndFocusRow(firstMatch, 'qty');
      }
      return;
    }

    const q = (searchInput?.value || '').replace(/\r|\n/g, '').trim();
    if (!q) return;

    const existingRow = findExistingRowByCode(q);
    if (existingRow) {
      clearSearchUI();
      await handleExistingRowAction(existingRow);
      return;
    }

    const selectableSuggestions = suggestions
      ? [...suggestions.querySelectorAll('li:not(.text-muted)')]
      : [];
    if (selectableSuggestions.length === 1) {
      selectableSuggestions[0].click();
      return;
    }

    const rows = (window.CATALOGO_CACHE && window.CATALOGO_CACHE.length)
      ? window.CATALOGO_CACHE
      : await loadProductsFromGoogleSheets();
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

  searchInput.addEventListener('keydown', async (e) => {
    if (primarySearchMode === 'list') {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handlePrimarySearchSubmit();
      }
      return;
    }

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
        await handlePrimarySearchSubmit();
      }
    }
  });

  function addActive(items) {
    if (!items || !items.length) return;
    [...items].forEach(x => x.classList.remove('active'));
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('active');
    if (searchInput && items[currentFocus].id) {
      searchInput.setAttribute('aria-activedescendant', items[currentFocus].id);
    }
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

  async function promptExportFormat() {
    let selectedFormat = '';

    await Swal.fire({
      title: 'Exportar checklist',
      html: `
        <div class="d-grid gap-2 export-format-actions">
          <button type="button" class="btn btn-danger" data-export-format="pdf">
            <i class="fa-solid fa-file-pdf me-1"></i>
            PDF
          </button>
          <button type="button" class="btn btn-success" data-export-format="excel">
            <i class="fa-solid fa-file-excel me-1"></i>
            Excel
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

        popup.querySelectorAll('[data-export-format]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedFormat = String(btn.getAttribute('data-export-format') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedFormat || null;
  }

  async function promptPdfVariant() {
    let selectedVariant = '';

    await Swal.fire({
      title: 'Tipo de PDF',
      html: `
        <div class="d-grid gap-2 export-scope-actions">
          <button type="button" class="btn btn-danger" data-pdf-variant="fleteros">
            <i class="fa-solid fa-truck-ramp-box me-1"></i>
            PDF fleteros
          </button>
          <button type="button" class="btn btn-outline-danger" data-pdf-variant="reporte">
            <i class="fa-solid fa-file-lines me-1"></i>
            PDF reporte
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

        popup.querySelectorAll('[data-pdf-variant]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedVariant = String(btn.getAttribute('data-pdf-variant') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedVariant || null;
  }

  async function promptExportMode(formatLabel) {
    let selectedMode = '';

    await Swal.fire({
      title: 'Exportar ' + formatLabel,
      html: `
        <div class="d-grid gap-2 export-scope-actions">
          <button type="button" class="btn btn-primary" data-export-scope="general">
            <i class="fa-solid fa-file-lines me-1"></i>
            Un solo archivo
          </button>
          <button type="button" class="btn btn-outline-primary" data-export-scope="warehouses">
            <i class="fa-solid fa-warehouse me-1"></i>
            Separado por bodega
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

        popup.querySelectorAll('[data-export-scope]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedMode = String(btn.getAttribute('data-export-scope') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedMode || null;
  }

  async function promptWarehouseSelection(formatLabel) {
    const warehouseNames = getWarehouseNames();

    if (!warehouseNames.length) {
      await showScanToast('info', 'Sin bodegas', 'No se encontraron bodegas disponibles para exportar.');
      return null;
    }

    const optionsHtml = warehouseNames.map((name) => `
      <label class="warehouse-export-option">
        <input type="checkbox" class="form-check-input warehouse-export-checkbox" value="${htmlAttrEscape(name)}">
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    const result = await Swal.fire({
      title: 'Bodegas para ' + formatLabel,
      html: `
        <div class="text-start">
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-primary" id="btnWarehouseSelectAll">Todas las bodegas</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnWarehouseClearAll">Limpiar</button>
          </div>
          <div class="small text-muted mb-2">Esta opción genera archivos separados por bodega.</div>
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
        const checkboxes = [...popup.querySelectorAll('.warehouse-export-checkbox')];
        popup.querySelector('#btnWarehouseSelectAll')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = true; });
        });
        popup.querySelector('#btnWarehouseClearAll')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = false; });
        });
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

  function buildPdfRows(rowsTr, variant = 'fleteros') {
    return rowsTr.map((tr, i) => {
      const codBar = tr.cells[COL_INDEX.barcode].innerText.trim();
      const nombre = tr.cells[COL_INDEX.name].innerText.trim();
      const codInv = tr.cells[COL_INDEX.inventoryCode].innerText.trim();
      const bodega = tr.cells[COL_INDEX.warehouse].innerText.trim();
      const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
      const despachado = getDispatchButton(tr)?.classList.contains('on') ? 'Sí' : 'No';

      if (variant === 'reporte') {
        return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, despachado];
      }

      return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, ''];
    });
  }

  function getPdfDispatchedRowHooks(doc, rowsTr, variant = 'fleteros') {
    if (variant !== 'fleteros') return {};

    const dispatchedFlags = rowsTr.map(tr => Boolean(getDispatchButton(tr)?.classList.contains('on')));

    return {
      didParseCell(data) {
        if (data.section !== 'body' || !dispatchedFlags[data.row.index]) return;
        data.cell.styles.textColor = [105, 105, 105];
        data.cell.styles.fillColor = [245, 245, 245];
      },
      didDrawCell(data) {
        if (data.section !== 'body' || !dispatchedFlags[data.row.index]) return;

        const previousDrawColor = doc.getDrawColor?.();
        const previousLineWidth = doc.getLineWidth?.();
        const strikeY = data.cell.y + (data.cell.height / 2);

        doc.setDrawColor(105, 105, 105);
        doc.setLineWidth(0.28);
        doc.line(
          data.cell.x + 0.8,
          strikeY,
          data.cell.x + data.cell.width - 0.8,
          strikeY
        );

        if (previousDrawColor !== undefined && previousDrawColor !== null) doc.setDrawColor(previousDrawColor);
        if (typeof previousLineWidth === 'number') doc.setLineWidth(previousLineWidth);
      }
    };
  }

  function getPdfHeadRow(variant = 'fleteros') {
    if (variant === 'reporte') {
      return ['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Despachado'];
    }
    return ['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Ajuste envío'];
  }

  function getPdfVariantMeta(variant = 'fleteros') {
    if (variant === 'reporte') {
      return {
        label: 'reporte',
        subtitle: 'Reporte',
        successGeneral: 'Se generó el PDF reporte general.',
        successWarehouse: 'Se generó el PDF reporte de la bodega seleccionada.',
        successZip: 'Se generó un ZIP con los PDFs reporte de las bodegas seleccionadas.',
        fileSuffixGeneral: 'Checklist_REPORTE_GENERAL',
        fileSuffixWarehouse: 'Checklist_REPORTE'
      };
    }

    return {
      label: 'fleteros',
      subtitle: 'Fleteros',
      successGeneral: 'Se generó el PDF para fleteros.',
      successWarehouse: 'Se generó el PDF para fleteros de la bodega seleccionada.',
      successZip: 'Se generó un ZIP con los PDFs para fleteros de las bodegas seleccionadas.',
      fileSuffixGeneral: 'Checklist_FLETEROS_GENERAL',
      fileSuffixWarehouse: 'Checklist_FLETEROS'
    };
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
  async function writePdfHeader(doc, tienda, requestDate, printDate, subtitle, extraLine = '') {
    const startX = 12;
    const topY = 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TRLista · ' + subtitle, startX, topY + 4);

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.text('Tienda: ' + (tienda || 'Tienda'), startX, topY + 9);
    doc.text('Fecha solicitud: ' + (requestDate || 'Sin fecha') + ' · Fecha impresión: ' + (printDate || ''), startX, topY + 14);

    if (extraLine) {
      const trimmed = String(extraLine || '').trim();
      if (trimmed) {
        doc.text(trimmed, startX, topY + 19);
        return 31;
      }
    }

    return 27;
  }

  function getPdfTableConfig(variant = 'fleteros') {
    const pdfBlue = [63, 133, 214];
    const isReporte = variant === 'reporte';
    return {
      headStyles: {
        fontStyle: 'bold',
        fillColor: pdfBlue,
        textColor: [255, 255, 255]
      },
      columnStyles: isReporte
        ? {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 30 },
            2: { cellWidth: 78 },
            3: { cellWidth: 24 },
            4: { cellWidth: 44 },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 24, halign: 'center' }
          }
        : {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 28 },
            2: { cellWidth: 70 },
            3: { cellWidth: 24 },
            4: { cellWidth: 40 },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 28, halign: 'center' }
          }
    };
  }

  async function exportPDFGeneral(variant = 'fleteros') {

    const exportMeta = getActiveRequestExportMeta();
    const fechaSolicitud = exportMeta.requestDate;
    const fechaImpresion = exportMeta.printDate;
    const tienda = exportMeta.storeName || storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const meta = getPdfVariantMeta(variant);

    const sourceRows = [...body.getElementsByTagName('tr')];
    const rows = buildPdfRows(sourceRows, variant);
    const startY = await writePdfHeader(doc, tienda, fechaSolicitud, fechaImpresion, meta.subtitle);

    const pdfTableConfig = getPdfTableConfig(variant);
    const dispatchedRowHooks = getPdfDispatchedRowHooks(doc, sourceRows, variant);
    doc.autoTable({
      startY,
      head: [getPdfHeadRow(variant)],
      body: rows,
      pageBreak: 'auto',
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
      headStyles: pdfTableConfig.headStyles,
      columnStyles: pdfTableConfig.columnStyles,
      ...dispatchedRowHooks
    });

    const fileName = `${sanitizeFilePart(tienda)}_${fechaSolicitud}_${meta.fileSuffixGeneral}.pdf`;
    doc.save(fileName);
    showScanToast('success', 'Éxito', meta.successGeneral);
  }

  async function exportPDFPorBodega(selectedWarehouses, variant = 'fleteros') {
    const exportMeta = getActiveRequestExportMeta();
    const fechaSolicitud = exportMeta.requestDate;
    const fechaImpresion = exportMeta.printDate;
    const tienda = exportMeta.storeName || storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await showScanToast('info', 'Sin datos', 'No hay productos para las bodegas seleccionadas.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const meta = getPdfVariantMeta(variant);

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = await writePdfHeader(doc, tienda, fechaSolicitud, fechaImpresion, meta.subtitle, `Bodega: ${bodega}`);
      const pdfTableConfig = getPdfTableConfig(variant);
      const dispatchedRowHooks = getPdfDispatchedRowHooks(doc, rowsTr, variant);
      doc.autoTable({
        startY,
        head: [getPdfHeadRow(variant)],
        body: buildPdfRows(rowsTr, variant),
        pageBreak: 'auto',
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: pdfTableConfig.headStyles,
        columnStyles: pdfTableConfig.columnStyles,
        ...dispatchedRowHooks
      });
      doc.save(`${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaSolicitud}_${meta.fileSuffixWarehouse}.pdf`);
      await showScanToast('success', 'Éxito', meta.successWarehouse);
      return;
    }

    const zip = new JSZip();
    for (const [bodega, rowsTr] of selectedGroups) {
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = await writePdfHeader(doc, tienda, fechaSolicitud, fechaImpresion, meta.subtitle, `Bodega: ${bodega}`);
      const pdfTableConfig = getPdfTableConfig(variant);
      const dispatchedRowHooks = getPdfDispatchedRowHooks(doc, rowsTr, variant);
      doc.autoTable({
        startY,
        head: [getPdfHeadRow(variant)],
        body: buildPdfRows(rowsTr, variant),
        pageBreak: 'auto',
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: pdfTableConfig.headStyles,
        columnStyles: pdfTableConfig.columnStyles,
        ...dispatchedRowHooks
      });
      zip.file(
        `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaSolicitud}_${meta.fileSuffixWarehouse}.pdf`,
        doc.output('arraybuffer')
      );
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlobFile(content, `${sanitizeFilePart(tienda)}_PDF_${meta.label.toUpperCase()}_BODEGAS_${fechaSolicitud}.zip`);
    await showScanToast('success', 'Éxito', meta.successZip);
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
    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await showScanToast('info', 'Sin datos', 'No hay productos para las bodegas seleccionadas.');
      return;
    }

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const wb = buildExcelWorkbook(rowsTr);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.xlsx`);
      await showScanToast('success', 'Éxito', 'Se generó el Excel de la bodega seleccionada.');
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
    await showScanToast('success', 'Éxito', 'Se generó un ZIP con los Excel de las bodegas seleccionadas.');
  }

  function parseExcelQuantityValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value ?? '').trim();
    const digits = raw.match(/\d+/g);
    return digits ? parseInt(digits.join(''), 10) : 0;
  }

  function buildExcelWorkbookFromItems(items = []) {
    const rows = (Array.isArray(items) ? items : []).map(item => [
      String(item?.codigo_inventario || item?.inventoryCode || '').trim(),
      String(item?.nombre || item?.descripcion || item?.name || '').trim(),
      parseExcelQuantityValue(item?.cantidad ?? item?.quantity ?? 0),
      '',
      new Date(1900, 0, 1)
    ]);
    const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...rows];
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

  function groupRequestItemsByWarehouse(items = []) {
    return (Array.isArray(items) ? items : []).reduce((groups, item) => {
      // En solicitudes ya finalizadas solo deben quedar productos despachados.
      // Si existe un flag explícito false (registro legacy), no se exporta para mantener
      // el mismo comportamiento del checklist visible después de "Finalizar despacho".
      if (item?.despachado === false) return groups;
      const warehouse = String(item?.bodega || item?.warehouse || '').trim() || 'SIN_BODEGA';
      if (!groups[warehouse]) groups[warehouse] = [];
      groups[warehouse].push(item);
      return groups;
    }, {});
  }

  function getBulkRequestExportName(req = {}) {
    const friendly = sanitizeFilePart(getFriendlyRequestCode(req));
    const rawId = sanitizeFilePart(req.id || req.requestId || 'solicitud');
    const uniqueTail = rawId.slice(-18);
    return uniqueTail && !friendly.endsWith(uniqueTail)
      ? `${friendly}_${uniqueTail}`
      : friendly;
  }

  function getPendingRequisitionExportRows(requests = []) {
    return (Array.isArray(requests) ? requests : [])
      .filter(req => normalizeRequestStatus(req?.status || '', '') === REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING)
      .map(req => {
        const warehouses = groupRequestItemsByWarehouse(req?.items || []);
        const itemCount = Object.values(warehouses).reduce((sum, rows) => sum + rows.length, 0);
        return { req, warehouses, itemCount };
      });
  }

  async function listAllPendingRequisitionRequests() {
    const db = getFirestoreDb();
    const snapshot = await db.collection('requests')
      .where('status', '==', REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING)
      .get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
      .sort((a, b) => String(b?.submittedAt || b?.requestDate || '').localeCompare(String(a?.submittedAt || a?.requestDate || '')));
  }

  function buildRequisitionDonePayload(req = {}, options = {}) {
    const now = String(options.now || new Date().toISOString());
    const user = options.user || window.TRAuth?.getCurrentUser?.() || {};
    const requestId = String(req?.id || req?.requestId || '').trim();
    const payload = {
      ...req,
      requestId,
      status: REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE,
      requisitionStatus: 'hecha',
      requisitionDone: true,
      requisitionDoneAt: now,
      requisitionDoneByUid: user.uid || null,
      requisitionDoneByEmail: user.email || null,
      requisitionExportedAt: now,
      requisitionExportedByUid: user.uid || null,
      requisitionExportedByEmail: user.email || null,
      requisitionExportMode: options.mode || 'individual',
      requisitionBatchId: options.batchId || null,
      requisitionBatchFileName: options.fileName || null,
      requisitionBatchSourceCount: Number(options.sourceCount || 1),
      requisitionConsolidated: String(options.mode || '').startsWith('consolidated'),
      requisitionConsolidationGroups: Array.isArray(options.requisitionGroups) ? options.requisitionGroups : [],
      statusUpdatedAt: now,
      statusUpdatedByUid: user.uid || null,
      statusUpdatedByEmail: user.email || null,
      lastWarehouseUpdateAt: now,
      lastWarehouseUpdateByUid: user.uid || null,
      lastWarehouseUpdateByEmail: user.email || null
    };
    delete payload.id;
    return payload;
  }

  async function markRequestsAsRequisitionDone(requests = [], optionsResolver = null) {
    const rows = (Array.isArray(requests) ? requests : []).filter(req => String(req?.id || req?.requestId || '').trim());
    if (!rows.length) return { updated: 0, payloads: new Map() };

    const db = getFirestoreDb();
    const now = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.() || {};
    const payloads = new Map();
    const chunkSize = 400;

    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      const batch = db.batch();

      chunk.forEach(req => {
        const requestId = String(req.id || req.requestId || '').trim();
        const extra = typeof optionsResolver === 'function' ? (optionsResolver(req) || {}) : (optionsResolver || {});
        const payload = buildRequisitionDonePayload(req, { ...extra, now, user });
        if (typeof validateRequestAccessForPayload === 'function') {
          validateRequestAccessForPayload(payload, 'write');
        }
        batch.set(db.collection('requests').doc(requestId), cleanFirestorePayload(payload), { merge: true });
        payloads.set(requestId, payload);
      });

      await batch.commit();
    }

    const activeId = String(activeWarehouseRequest?.requestId || '');
    if (activeId && payloads.has(activeId)) {
      const payload = payloads.get(activeId);
      activeWarehouseRequest = {
        ...activeWarehouseRequest,
        status: REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE,
        original: { ...(activeWarehouseRequest.original || {}), ...payload }
      };
      requisitionDone = true;
      requisitionDoneAt = payload.requisitionDoneAt || now;
      rememberActiveWarehouseSnapshot();
      updateRequisitionUI();
      updateRequestFlowUI();
    }

    return { updated: rows.length, payloads };
  }

  function aggregateItemsForConsolidation(items = []) {
    const map = new Map();
    let uncodedSequence = 0;

    (Array.isArray(items) ? items : []).forEach(item => {
      if (item?.despachado === false) return;

      const code = String(item?.codigo_inventario || item?.inventoryCode || '').trim();
      const normalizedCode = code.toLocaleUpperCase('es');
      const name = String(item?.nombre || item?.descripcion || item?.name || '').trim();
      const quantity = parseExcelQuantityValue(item?.cantidad ?? item?.quantity ?? 0);

      // Regla de consolidación: SOLO se suman cantidades cuando existe el mismo código
      // dentro del mismo grupo Sucursal + Bodega. Una línea sin código nunca se fusiona
      // por descripción para evitar combinar accidentalmente productos distintos.
      const key = normalizedCode ? `code:${normalizedCode}` : `uncoded:${uncodedSequence++}`;
      const existing = map.get(key);

      if (existing) {
        existing.cantidad = parseExcelQuantityValue(existing.cantidad) + quantity;
        if (!existing.nombre && name) existing.nombre = name;

        if (name) {
          const variants = Array.isArray(existing.__descriptionVariants)
            ? existing.__descriptionVariants
            : [String(existing.nombre || '').trim()].filter(Boolean);
          if (!variants.some(value => value.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
            variants.push(name);
          }
          existing.__descriptionVariants = variants;
        }
      } else {
        map.set(key, {
          ...item,
          codigo_inventario: code,
          nombre: name,
          cantidad: quantity,
          despachado: true,
          __missingCode: !normalizedCode,
          __descriptionVariants: name ? [name] : []
        });
      }
    });

    return [...map.values()];
  }

  function buildConsolidatedStoreWarehouseRows(exportableRows = []) {
    const groups = new Map();

    exportableRows.forEach(({ req, warehouses }) => {
      const storeKey = String(req?.storeKey || req?.destinationStoreKey || '').trim() || 'sin_sucursal';
      const storeName = String(req?.storeName || req?.destinationStoreName || getStoreLabel(storeKey) || storeKey).trim() || 'Sucursal';

      Object.entries(warehouses || {}).forEach(([warehouseRaw, items]) => {
        const warehouse = String(warehouseRaw || '').trim() || 'SIN_BODEGA';
        const rows = Array.isArray(items) ? items : [];
        if (!rows.length) return;

        const groupKey = `${storeKey}::${warehouse.toLocaleLowerCase('es')}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            groupKey,
            storeKey,
            storeName,
            warehouse,
            requestsById: new Map(),
            originalItems: []
          });
        }

        const group = groups.get(groupKey);
        const requestId = String(req?.id || req?.requestId || '').trim();
        if (requestId) group.requestsById.set(requestId, req);
        group.originalItems.push(...rows);
      });
    });

    return [...groups.values()]
      .map(group => ({
        ...group,
        requests: [...group.requestsById.values()],
        originalItemCount: group.originalItems.length,
        items: aggregateItemsForConsolidation(group.originalItems)
      }))
      .map(group => ({
        ...group,
        consolidatedItemCount: group.items.length,
        missingCodeCount: group.items.filter(item => item?.__missingCode).length,
        descriptionConflictCount: group.items.filter(item => Array.isArray(item?.__descriptionVariants) && item.__descriptionVariants.length > 1).length
      }))
      .sort((a, b) => {
        const byStore = a.storeName.localeCompare(b.storeName, 'es');
        return byStore || a.warehouse.localeCompare(b.warehouse, 'es');
      });
  }

  // Vista navegable: fecha -> tienda -> archivos de cada solicitud separados por bodega.
  async function openRequisitionsByDay() {
    closeWarehouseActionsMenu();
    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('consultar requisiciones por día', 'bodega o administradores');
      return;
    }
    if (!window.JSZip || !window.XLSX) {
      await showScanToast('error', 'Exportación no disponible', 'Faltan las librerías Excel/ZIP.');
      return;
    }
    const state = { date: null, store: null, busy: false, requests: [] };
    const refresh = async () => {
      const requests = await listAllPendingRequisitionRequests();
      state.requests = getPendingRequisitionExportRows(requests);
    };
    await withLoading('Consultando requisiciones pendientes...', refresh);

    const groupDates = () => {
      const dates = new Map();
      state.requests.forEach(row => {
        const date = getRequestDateKey(row.req) || 'sin_fecha';
        if (!dates.has(date)) dates.set(date, []);
        dates.get(date).push(row);
      });
      return dates;
    };
    const getStore = req => {
      const key = String(req.storeKey || req.destinationStoreKey || '').trim() || 'sin_sucursal';
      const name = String(req.storeName || req.destinationStoreName || getStoreLabel(key) || key).trim() || 'Sucursal';
      return { key, name };
    };
    const render = () => {
      const host = document.getElementById('requisitionDayExplorer');
      if (!host) return;
      const dates = groupDates();
      const back = state.store ? 'store' : state.date ? 'date' : '';
      let html = `<div class="text-start"><div class="d-flex justify-content-between align-items-center mb-3 gap-2"><span class="fw-semibold">${state.store ? escapeHtml(state.store.name) : state.date ? escapeHtml(state.date) : 'Fechas con requisiciones pendientes'}</span><span class="badge text-bg-secondary">${state.requests.length} pendientes</span></div>`;
      if (back) html += `<button type="button" class="btn btn-sm btn-outline-secondary mb-3" data-req-action="back">← Volver</button>`;
      if (!state.date) {
        const ordered = [...dates.entries()].sort(([a], [b]) => b.localeCompare(a));
        html += ordered.length ? ordered.map(([date, rows]) => `<button type="button" class="btn btn-outline-primary w-100 text-start mb-2 d-flex justify-content-between align-items-center" data-req-action="date" data-value="${escapeHtml(date)}"><strong>${escapeHtml(date)}</strong><span>${rows.length} requisición(es) · ${new Set(rows.map(r => getStore(r.req).key)).size} tienda(s) ›</span></button>`).join('') : '<p class="text-muted">No hay requisiciones pendientes.</p>';
      } else if (!state.store) {
        const stores = new Map();
        (dates.get(state.date) || []).forEach(row => {
          const store = getStore(row.req);
          if (!stores.has(store.key)) stores.set(store.key, { ...store, rows: [] });
          stores.get(store.key).rows.push(row);
        });
        html += [...stores.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(store => `<button type="button" class="btn btn-outline-primary w-100 text-start mb-2 d-flex justify-content-between align-items-center" data-req-action="store" data-value="${escapeHtml(store.key)}"><strong>${escapeHtml(store.name)}</strong><span>${store.rows.length} requisición(es) ›</span></button>`).join('');
      } else {
        const rows = (dates.get(state.date) || []).filter(row => getStore(row.req).key === state.store.key);
        const warehouses = new Map();
        rows.forEach(row => Object.entries(row.warehouses).forEach(([name, items]) => {
          if (!warehouses.has(name)) warehouses.set(name, { count: 0, lines: 0 });
          warehouses.get(name).count += 1; warehouses.get(name).lines += items.length;
        }));
        html += `<p class="small text-muted">El ZIP contendrá una carpeta por bodega y, dentro, un Excel por solicitud. No se fusionarán cantidades entre solicitudes diferentes.</p>`;
        html += [...warehouses.entries()].sort(([a],[b])=>a.localeCompare(b,'es')).map(([name, info]) => `<div class="border rounded p-2 mb-2 d-flex justify-content-between"><span>${escapeHtml(name)}</span><small class="text-muted">${info.count} archivo(s), ${info.lines} líneas</small></div>`).join('');
        const exportable = rows.filter(row => row.itemCount > 0);
        if (rows.length !== exportable.length) html += `<p class="small text-warning">${rows.length - exportable.length} solicitud(es) sin productos exportables permanecerán pendientes.</p>`;
        html += `<button type="button" class="btn btn-success w-100 mt-2" data-req-action="download" ${exportable.length && !state.busy ? '' : 'disabled'}><i class="fa-solid fa-download me-1"></i>Descargar ZIP de ${escapeHtml(state.store.name)} (${exportable.length})</button>`;
      }
      host.innerHTML = html + '</div>';
    };
    await Swal.fire({
      title: 'Requisiciones por día', width: 680,
      html: '<div id="requisitionDayExplorer"></div>',
      showConfirmButton: false, showCloseButton: true,
      didOpen: () => {
        const host = document.getElementById('requisitionDayExplorer');
        render();
        host.addEventListener('click', async e => {
          const target = e.target.closest('[data-req-action]');
          if (!target || state.busy) return;
          const action = target.dataset.reqAction;
          if (action === 'date') { state.date = target.dataset.value; state.store = null; render(); }
          if (action === 'store') {
            const row = state.requests.find(row => getRequestDateKey(row.req) === state.date && getStore(row.req).key === target.dataset.value);
            if (row) state.store = getStore(row.req);
            render();
          }
          if (action === 'back') {
            if (state.store) state.store = null;
            else state.date = null;
            render();
          }
          if (action === 'download' && state.date && state.store) {
            state.busy = true; render();
            try {
              // Refrescar justo antes de exportar para reducir duplicados por estados obsoletos.
              await refresh();
              const rows = state.requests.filter(row => getRequestDateKey(row.req) === state.date && getStore(row.req).key === state.store.key && row.itemCount > 0);
              if (!rows.length) { await showScanToast('info', 'Sin pendientes', 'Las requisiciones ya fueron procesadas.'); render(); return; }
              const zip = new JSZip();
              for (const { req, warehouses } of rows) {
                for (const [warehouse, items] of Object.entries(warehouses).sort(([a],[b]) => a.localeCompare(b,'es'))) {
                  const workbook = buildExcelWorkbookFromItems(items);
                  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                  const folder = zip.folder(sanitizeFilePart(warehouse));
                  folder.file(`${getBulkRequestExportName(req)}_${sanitizeFilePart(warehouse)}.xlsx`, data);
                }
              }
              const filename = `REQUISICIONES_${sanitizeFilePart(state.store.name)}_${state.date}.zip`;
              const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
              saveBlobFile(blob, filename);
              try {
                await markRequestsAsRequisitionDone(rows.map(row => row.req), { mode: 'by_day_store', fileName: filename, sourceCount: rows.length });
                await showScanToast('success', 'Requisiciones procesadas', `${rows.length} solicitud(es) marcadas como hechas.`);
              } catch (error) {
                console.error('Se inició la descarga pero falló la actualización:', error);
                await showScanToast('warning', 'Revisar estados', 'Se inició la descarga, pero no se pudo confirmar el cambio de estado. Revisa las solicitudes antes de repetirla.', { timeout: 7000 });
              }
              await refresh();
              if (!state.requests.some(row => getRequestDateKey(row.req) === state.date && getStore(row.req).key === state.store.key)) state.store = null;
            } catch (error) {
              console.error(error);
              await showScanToast('error', 'Error exportando', String(error?.message || error));
            } finally { state.busy = false; render(); }
          }
        });
      }
    });
  }

  async function exportAllPendingRequisitions() {
    closeWarehouseActionsMenu();

    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('exportar requisiciones pendientes', 'bodega o administradores');
      return;
    }
    if (!window.JSZip || !window.XLSX) {
      await showScanToast('error', 'Exportación no disponible', 'No se cargaron las librerías necesarias para crear Excel/ZIP.');
      return;
    }

    const requests = await withLoading('Buscando requisiciones pendientes...', listAllPendingRequisitionRequests);
    const pendingRows = getPendingRequisitionExportRows(requests);
    const exportableRows = pendingRows.filter(row => row.itemCount > 0 && Object.keys(row.warehouses).length > 0);
    const skippedRows = pendingRows.filter(row => row.itemCount <= 0 || !Object.keys(row.warehouses).length);

    if (!pendingRows.length) {
      await showScanToast('info', 'Sin requisiciones pendientes', 'No hay solicitudes en estado Despachado/Pendiente de requisición.');
      return;
    }
    if (!exportableRows.length) {
      await showScanToast('warning', 'Sin datos exportables', 'Hay requisiciones pendientes, pero ninguna contiene productos despachados para exportar.');
      return;
    }

    const branchMap = new Map();
    exportableRows.forEach(({ req, warehouses, itemCount }) => {
      const storeKey = String(req?.storeKey || req?.destinationStoreKey || '').trim() || 'sin_sucursal';
      const storeName = String(req?.storeName || req?.destinationStoreName || getStoreLabel(storeKey) || storeKey).trim() || 'Sucursal';
      const current = branchMap.get(storeKey) || { storeName, requestCount: 0, warehouseCount: 0, itemCount: 0 };
      current.requestCount += 1;
      current.warehouseCount += Object.keys(warehouses).length;
      current.itemCount += itemCount;
      branchMap.set(storeKey, current);
    });

    const branchSummary = [...branchMap.values()]
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'es'))
      .map(row => `<li><strong>${escapeHtml(row.storeName)}</strong>: ${row.requestCount} solicitud(es) · ${row.warehouseCount} Excel · ${row.itemCount} producto(s)</li>`)
      .join('');

    const result = await Swal.fire({
      title: 'Exportar pendientes por solicitud',
      width: 760,
      html: `
        <div class="text-start small">
          <p class="mb-2">Se generará un <strong>ZIP maestro</strong> conservando cada solicitud pendiente por separado.</p>
          <p class="mb-2">Estructura: <strong>Sucursal → ZIP de solicitud → Excel por bodega</strong>.</p>
          <ul class="mb-2">${branchSummary}</ul>
          <div class="alert alert-warning border py-2 mb-0">
            Total: <strong>${exportableRows.length}</strong> solicitud(es) en <strong>${branchMap.size}</strong> sucursal(es).
            ${skippedRows.length ? `<br>${skippedRows.length} solicitud(es) sin productos exportables se omitirán y permanecerán pendientes.` : ''}
            <br><strong>Después de iniciar la descarga, las solicitudes exportadas cambiarán a Despachado/Requisición hecha.</strong>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Exportar y marcar hechas',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const today = (typeof getTodayString === 'function' ? getTodayString() : new Date().toISOString().slice(0, 10));
    const masterFileName = `REQUISICIONES_PENDIENTES_${today}.zip`;
    const masterZip = new JSZip();

    const content = await withLoading('Generando ZIP de requisiciones pendientes...', async () => {
      for (const { req, warehouses } of exportableRows) {
        const storeKey = String(req?.storeKey || req?.destinationStoreKey || '').trim() || 'sin_sucursal';
        const storeName = String(req?.storeName || req?.destinationStoreName || getStoreLabel(storeKey) || storeKey).trim() || 'Sucursal';
        const requestDate = getRequestDateKey(req) || today;
        const requestExportName = getBulkRequestExportName(req);
        const requestZip = new JSZip();

        Object.entries(warehouses)
          .sort(([a], [b]) => a.localeCompare(b, 'es'))
          .forEach(([warehouse, items]) => {
            const wb = buildExcelWorkbookFromItems(items);
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            requestZip.file(
              `${sanitizeFilePart(storeName)}_${sanitizeFilePart(warehouse)}_${requestDate}_Checklist.xlsx`,
              wbout
            );
          });

        const requestZipBytes = await requestZip.generateAsync({
          type: 'uint8array',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const branchFolder = masterZip.folder(sanitizeFilePart(storeName));
        branchFolder.file(`${requestExportName}.zip`, requestZipBytes);
      }

      return masterZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
    });

    saveBlobFile(content, masterFileName);

    try {
      await withLoading('Marcando requisiciones como hechas...', async () => {
        await markRequestsAsRequisitionDone(
          exportableRows.map(row => row.req),
          { mode: 'individual', fileName: masterFileName, sourceCount: 1 }
        );
      });
    } catch (error) {
      console.error('El ZIP se generó, pero no se pudieron actualizar todos los estados:', error);
      await showScanToast('warning', 'ZIP descargado; revisa estados', 'El archivo se generó, pero hubo un error al marcar las solicitudes como requisición hecha. Revisa la bandeja antes de volver a exportar.', { timeout: 7000 });
      return;
    }

    await showScanToast(
      'success',
      'Exportación completada',
      `Se exportaron y marcaron como hechas ${exportableRows.length} solicitud(es) de ${branchMap.size} sucursal(es).`
    );
  }

  async function consolidatePendingRequisitionsByBranch() {
    closeWarehouseActionsMenu();

    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('consolidar requisiciones pendientes', 'bodega o administradores');
      return;
    }
    if (!window.JSZip || !window.XLSX) {
      await showScanToast('error', 'Exportación no disponible', 'No se cargaron las librerías necesarias para crear Excel/ZIP.');
      return;
    }

    const requests = await withLoading('Buscando requisiciones pendientes...', listAllPendingRequisitionRequests);
    const pendingRows = getPendingRequisitionExportRows(requests);
    const exportableRows = pendingRows.filter(row => row.itemCount > 0 && Object.keys(row.warehouses).length > 0);
    const skippedRows = pendingRows.filter(row => row.itemCount <= 0 || !Object.keys(row.warehouses).length);
    const groups = buildConsolidatedStoreWarehouseRows(exportableRows);

    if (!pendingRows.length) {
      await showScanToast('info', 'Sin requisiciones pendientes', 'No hay solicitudes en estado Despachado/Pendiente de requisición.');
      return;
    }
    if (!groups.length) {
      await showScanToast('warning', 'Sin datos exportables', 'Hay requisiciones pendientes, pero ninguna contiene productos despachados para consolidar.');
      return;
    }

    const groupsByStore = new Map();
    groups.forEach(group => {
      if (!groupsByStore.has(group.storeKey)) {
        groupsByStore.set(group.storeKey, { storeName: group.storeName, groups: [] });
      }
      groupsByStore.get(group.storeKey).groups.push(group);
    });

    const branchSummary = [...groupsByStore.values()]
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'es'))
      .map(branch => {
        const warehouseLines = branch.groups
          .map(group => `${escapeHtml(group.warehouse)}: ${group.requests.length} solicitud(es) → 1 archivo · ${group.originalItemCount} líneas → ${group.consolidatedItemCount} códigos/líneas${group.missingCodeCount ? ` · ${group.missingCodeCount} sin código` : ''}${group.descriptionConflictCount ? ` · ${group.descriptionConflictCount} código(s) con descripción distinta` : ''}`)
          .join('<br>');
        return `<li class="mb-2"><strong>${escapeHtml(branch.storeName)}</strong><br><span class="ms-2">${warehouseLines}</span></li>`;
      }).join('');

    const result = await Swal.fire({
      title: 'Consolidar pendientes por bodega',
      width: 860,
      html: `
        <div class="text-start small">
          <p class="mb-2">Se tomarán <strong>todas</strong> las solicitudes pendientes, sin importar la fecha, y se agruparán por <strong>Sucursal + Bodega</strong>.</p>
          <p class="mb-2">Dentro de cada sucursal y bodega, la cantidad se suma <strong>únicamente cuando coincide el Código del producto</strong>. La descripción no se utiliza como llave de consolidación.</p>
          <p class="mb-2">Las líneas sin código se exportarán por separado y <strong>no se sumarán por nombre</strong>.</p>
          <p class="mb-2">El ZIP maestro tendrá una <strong>carpeta por sucursal</strong> y dentro un <strong>Excel consolidado por bodega</strong>.</p>
          <ul class="mb-2">${branchSummary}</ul>
          <div class="alert alert-warning border py-2 mb-0">
            Se generarán <strong>${groups.length}</strong> requisición(es) consolidadas para <strong>${groupsByStore.size}</strong> sucursal(es).<br>
            Se cerrarán como <strong>Despachado/Requisición hecha</strong> las <strong>${exportableRows.length}</strong> solicitudes fuente incluidas.
            ${skippedRows.length ? `<br>${skippedRows.length} solicitud(es) sin productos exportables se omitirán y permanecerán pendientes.` : ''}
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Generar consolidado y cerrar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const today = (typeof getTodayString === 'function' ? getTodayString() : new Date().toISOString().slice(0, 10));
    const runId = `REQCONS_${today.replaceAll('-', '')}_${Date.now().toString(36).toUpperCase()}`;
    const masterFileName = `REQUISICIONES_CONSOLIDADAS_POR_BODEGA_${today}.zip`;
    const masterZip = new JSZip();
    const groupsByRequestId = new Map();

    const content = await withLoading('Consolidando requisiciones por sucursal y bodega...', async () => {
      for (const group of groups) {
        const batchId = `${runId}_${sanitizeFilePart(group.storeKey)}_${sanitizeFilePart(group.warehouse)}`;
        const excelFileName = `${sanitizeFilePart(group.storeName)}_${sanitizeFilePart(group.warehouse)}_${today}_REQUISICION_CONSOLIDADA.xlsx`;
        const wb = buildExcelWorkbookFromItems(group.items);
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const branchFolder = masterZip.folder(sanitizeFilePart(group.storeName));
        branchFolder.file(excelFileName, wbout);

        group.requests.forEach(req => {
          const requestId = String(req.id || req.requestId || '').trim();
          if (!requestId) return;
          if (!groupsByRequestId.has(requestId)) groupsByRequestId.set(requestId, []);
          groupsByRequestId.get(requestId).push({
            storeKey: group.storeKey,
            storeName: group.storeName,
            warehouse: group.warehouse,
            batchId,
            fileName: excelFileName,
            sourceCount: group.requests.length
          });
        });
      }

      return masterZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
    });

    saveBlobFile(content, masterFileName);

    try {
      await withLoading('Cerrando solicitudes consolidadas...', async () => {
        await markRequestsAsRequisitionDone(
          exportableRows.map(row => row.req),
          req => {
            const requestId = String(req.id || req.requestId || '').trim();
            const requisitionGroups = groupsByRequestId.get(requestId) || [];
            return {
              mode: 'consolidated_store_warehouse',
              batchId: runId,
              fileName: masterFileName,
              sourceCount: requisitionGroups.length || 1,
              requisitionGroups
            };
          }
        );
      });
    } catch (error) {
      console.error('La consolidación se descargó, pero no se pudieron actualizar todos los estados:', error);
      await showScanToast('warning', 'ZIP descargado; revisa estados', 'La consolidación se generó, pero hubo un error al cerrar algunas solicitudes. Revisa la bandeja antes de volver a consolidar.', { timeout: 7000 });
      return;
    }

    await showScanToast(
      'success',
      'Consolidación completada',
      `Se generaron ${groups.length} archivo(s) consolidado(s): uno por sucursal y bodega, sumando únicamente por código, y se cerraron ${exportableRows.length} solicitud(es) fuente.`
    );
  }

  function exportExcelGeneral() {
    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const wb = buildExcelWorkbook([...body.getElementsByTagName('tr')]);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${fechaActual}_Checklist_GENERAL.xlsx`);
    showScanToast('success', 'Éxito', 'Se generó el Excel general.');
  }

  async function promptUnifiedExportOptions(preferredFormat = '') {
    const warehouseNames = getWarehouseNames();
    const initialFormat = ['pdf', 'excel'].includes(String(preferredFormat || '').trim())
      ? String(preferredFormat || '').trim()
      : 'pdf';

    const optionsHtml = warehouseNames.map((name) => `
      <label class="warehouse-export-option">
        <input type="checkbox" class="form-check-input warehouse-export-checkbox" value="${htmlAttrEscape(name)}" checked>
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    const result = await Swal.fire({
      title: 'Exportar checklist',
      html: `
        <div class="export-unified-modal text-start">
          <p class="export-unified-help">Todo en una sola pantalla: formato, tipo y descarga.</p>

          <div class="export-unified-section">
            <div class="export-unified-label">Formato</div>
            <div class="export-choice-grid" role="radiogroup" aria-label="Formato de exportación">
              <label class="export-choice-card" data-choice-group="format">
                <input type="radio" name="exportFormat" value="pdf" ${initialFormat === 'pdf' ? 'checked' : ''}>
                <span class="export-choice-icon text-danger"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>PDF</strong><small>Imprimir</small></span>
              </label>
              <label class="export-choice-card" data-choice-group="format">
                <input type="radio" name="exportFormat" value="excel" ${initialFormat === 'excel' ? 'checked' : ''}>
                <span class="export-choice-icon text-success"><i class="fa-solid fa-file-excel" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>Excel</strong><small>Control</small></span>
              </label>
            </div>
          </div>

          <div class="export-unified-section" data-pdf-options>
            <div class="export-unified-label">Tipo de PDF</div>
            <div class="export-choice-grid" role="radiogroup" aria-label="Tipo de PDF">
              <label class="export-choice-card" data-choice-group="pdfVariant">
                <input type="radio" name="pdfVariant" value="fleteros" checked>
                <span class="export-choice-icon text-danger"><i class="fa-solid fa-truck-ramp-box" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>Fleteros</strong><small>Operativo</small></span>
              </label>
              <label class="export-choice-card" data-choice-group="pdfVariant">
                <input type="radio" name="pdfVariant" value="reporte">
                <span class="export-choice-icon text-secondary"><i class="fa-solid fa-file-lines" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>Reporte</strong><small>Estados</small></span>
              </label>
            </div>
          </div>

          <div class="export-unified-section">
            <div class="export-unified-label">Descarga</div>
            <div class="export-choice-grid" role="radiogroup" aria-label="Modo de exportación">
              <label class="export-choice-card" data-choice-group="mode">
                <input type="radio" name="exportMode" value="general" checked>
                <span class="export-choice-icon text-primary"><i class="fa-solid fa-file-lines" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>Un archivo</strong><small>Todo</small></span>
              </label>
              <label class="export-choice-card" data-choice-group="mode" ${warehouseNames.length ? '' : 'aria-disabled="true"'}>
                <input type="radio" name="exportMode" value="warehouses" ${warehouseNames.length ? '' : 'disabled'}>
                <span class="export-choice-icon text-primary"><i class="fa-solid fa-warehouse" aria-hidden="true"></i></span>
                <span class="export-choice-text"><strong>Por bodega</strong><small>${warehouseNames.length ? 'ZIP' : 'Sin bodegas'}</small></span>
              </label>
            </div>
          </div>

          <div class="export-unified-section export-warehouse-section d-none" data-warehouse-section>
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2 export-warehouse-head">
              <div>
                <div class="export-unified-label mb-0">Bodegas</div>
                <div class="small text-muted">Selecciona las necesarias.</div>
              </div>
              <div class="d-flex gap-1 flex-wrap justify-content-end">
                <button type="button" class="btn btn-sm btn-outline-primary" data-warehouse-select-all>Todas</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-warehouse-clear>Limpiar</button>
              </div>
            </div>
            <div class="warehouse-export-list">
              ${optionsHtml || '<div class="small text-muted py-2">No hay bodegas disponibles.</div>'}
            </div>
          </div>
        </div>
      `,
      customClass: { popup: 'tr-modal tr-export-modal' },
      showCancelButton: true,
      confirmButtonText: 'Descargar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: (popup) => {
        const syncCards = () => {
          popup.querySelectorAll('.export-choice-card').forEach(card => {
            const input = card.querySelector('input[type="radio"]');
            const disabled = Boolean(input?.disabled);
            card.classList.toggle('is-selected', Boolean(input?.checked));
            card.classList.toggle('is-disabled', disabled);
          });
        };

        const syncVisibility = () => {
          const format = popup.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
          const mode = popup.querySelector('input[name="exportMode"]:checked')?.value || 'general';
          const pdfOptions = popup.querySelector('[data-pdf-options]');
          const warehouseSection = popup.querySelector('[data-warehouse-section]');
          pdfOptions?.classList.toggle('d-none', format !== 'pdf');
          warehouseSection?.classList.toggle('d-none', mode !== 'warehouses');
          syncCards();
        };

        popup.querySelectorAll('input[type="radio"]').forEach(input => {
          input.addEventListener('change', syncVisibility);
        });

        const checkboxes = [...popup.querySelectorAll('.warehouse-export-checkbox')];
        popup.querySelector('[data-warehouse-select-all]')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = true; });
        });
        popup.querySelector('[data-warehouse-clear]')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = false; });
        });

        syncVisibility();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const format = popup?.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
        const mode = popup?.querySelector('input[name="exportMode"]:checked')?.value || 'general';
        const pdfVariant = popup?.querySelector('input[name="pdfVariant"]:checked')?.value || 'fleteros';
        const warehouses = [...(popup?.querySelectorAll('.warehouse-export-checkbox:checked') || [])]
          .map(cb => String(cb.value || '').trim())
          .filter(Boolean);

        if (mode === 'warehouses' && !warehouses.length) {
          Swal.showValidationMessage('Selecciona al menos una bodega o cambia a “Un archivo”.');
          return false;
        }

        return { format, mode, pdfVariant, warehouses };
      }
    });

    return result.isConfirmed ? result.value : null;
  }

  async function handleExportRequest(preferredFormat = '') {
    if (body.rows.length === 0) {
      await showScanToast('error', 'Error', 'No hay productos en la lista para exportar.');
      return;
    }

    const options = await promptUnifiedExportOptions(preferredFormat);
    if (!options) return;

    const format = options.format || 'pdf';
    const pdfVariant = options.pdfVariant || 'fleteros';
    const mode = options.mode || 'general';
    const warehouses = options.warehouses || [];

    if (mode === 'general') {
      if (format === 'pdf') {
        await withLoading('Generando PDF...', async () => {
          await exportPDFGeneral(pdfVariant);
        });
      } else {
        await withLoading('Generando Excel...', async () => {
          exportExcelGeneral();
        });
      }
      return;
    }

    if (format === 'pdf') {
      await withLoading('Generando PDF por bodega...', async () => {
        await exportPDFPorBodega(warehouses, pdfVariant);
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
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('exportar checklist', 'bodega o administradores');
        return;
      }
      if (!canWarehouseEditActiveRequest()) {
        await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de exportar.');
        return;
      }
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

  if (mobileFabClose) {
    mobileFabClose.addEventListener('click', closeMobileFab);
  }

  if (btnFabRequisition) {
    btnFabRequisition.addEventListener('click', () => {
      closeMobileFab();
      btnToggleRequisition?.click();
    });
  }

  if (btnFabClear) {
    btnFabClear.addEventListener('click', () => {
      closeMobileFab();
      btnClear?.click();
    });
  }

  if (btnFabSearchList) {
    btnFabSearchList.addEventListener('click', async () => {
      closeMobileFab();
      await openInsertedRowsSearch();
    });
  }

  const bindFabProxyClick = (fabButton, sourceButton) => {
    if (!fabButton) return;
    fabButton.addEventListener('click', () => {
      closeMobileFab();
      sourceButton?.click();
    });
  };

  bindFabProxyClick(btnFabDispatchRequest, btnMarkRequestDispatched);
  bindFabProxyClick(btnFabCancelRequest, btnCancelWarehouseRequest);
  bindFabProxyClick(btnFabMergeRequests, btnMergeWarehouseRequests);
  bindFabProxyClick(btnFabRequisitionsByDay, btnRequisitionsByDay);
  bindFabProxyClick(btnFabExportPendingRequisitions, btnExportPendingRequisitions);
  bindFabProxyClick(btnFabConsolidatePendingRequisitions, btnConsolidatePendingRequisitions);

  if (btnFabSortWarehouse) {
    btnFabSortWarehouse.addEventListener('click', async () => {
      closeMobileFab();
      const result = sortByBodega({ preserveSelection: true });
      await showScanToast(
        result.count ? 'success' : 'info',
        'Lista ordenada',
        result.count ? ('Orden por bodega aplicado a ' + result.count + ' fila(s).') : 'No hay productos para ordenar.'
      );
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
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('exportar checklist', 'bodega o administradores');
        return;
      }
      if (!canWarehouseEditActiveRequest()) {
        await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de exportar.');
        return;
      }
      await handleExportRequest();
    });
  }

  if (btnFabScrollTop) {
    btnFabScrollTop.addEventListener('click', async () => {
      closeMobileFab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await showScanToast('info', 'Ir arriba', 'Volviendo al inicio de la pantalla.');
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMobileFab();
    }
  });

  window.addEventListener('resize', () => {
    // El panel de acciones se usa también en PC; no se cierra automáticamente al cambiar de ancho.
  });


  // Sort by Bodega via header only
  function sortByBodega(options = {}) {
    const { preserveSelection = true } = options || {};
    const rows = Array.from(body.querySelectorAll('tr'));
    if (!rows.length) return { count: 0, direction: sortAsc ? 'asc' : 'desc' };

    const selectedRowIds = preserveSelection
      ? new Set(
          rows
            .filter(row => row.querySelector('.row-bulk-select-checkbox')?.checked)
            .map(row => String(row.dataset.rowId || ''))
            .filter(Boolean)
        )
      : new Set();

    rows.sort((a, b) => {
      const A = (a.cells[COL_INDEX.warehouse]?.innerText || '').trim().toLowerCase();
      const B = (b.cells[COL_INDEX.warehouse]?.innerText || '').trim().toLowerCase();
      return (sortAsc ? A.localeCompare(B) : B.localeCompare(A));
    });

    sortAsc = !sortAsc;
    body.innerHTML = '';
    rows.forEach(r => body.appendChild(r));

    if (selectedRowIds.size) {
      rows.forEach(row => {
        const checkbox = row.querySelector('.row-bulk-select-checkbox');
        if (!checkbox) return;
        checkbox.checked = selectedRowIds.has(String(row.dataset.rowId || ''));
      });
    }

    renumber();
    updateBulkSelectionUI();
    applyListSearchFilter();

    return {
      count: rows.length,
      direction: sortAsc ? 'desc' : 'asc'
    };
  }
  thBodega.addEventListener('click', async () => {
    const result = sortByBodega({ preserveSelection: true });
    await showScanToast(
      result.count ? 'success' : 'info',
      'Lista ordenada',
      result.count ? ('Orden por bodega aplicado a ' + result.count + ' fila(s).') : 'No hay productos para ordenar.'
    );
  });

  // Clear & persist empty (solo hoy)
  btnClear.addEventListener('click', async () => {
    closeMobileFab();
    closeMoreActionsMenu();

    if (isEditingLocked()) {
      await showEditingLockedAlert('limpiar la lista');
      return;
    }

    if (body.rows.length === 0) {
      await showScanToast('info', 'Lista vacía', 'No hay productos para limpiar.');
      return;
    }

    const targetDay = getTargetChecklistDate();
    const itemCount = body.rows.length;

    const res = await Swal.fire({
      title: '¿Limpiar todo?',
      html: '<div class="text-start small">Se eliminarán <strong>' + itemCount + '</strong> item(s) en pantalla y se guardará la fecha seleccionada vacía.<br><br>Esta acción requiere confirmación.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar todo',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!res.isConfirmed) {
      await showScanToast('info', 'Acción cancelada', 'No se limpió la lista.');
      return;
    }

    await withLoading('Limpiando checklist...', async () => {
      body.innerHTML = '';
      renumber();
      updateBulkSelectionUI();
      applyListSearchFilter();

      const docId = getDocIdForCurrentList();
      const payload = collectPayload();

      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);
      if (activeWarehouseRequest) await syncActiveWarehouseRequest();
      lastUpdateISO = payload.meta.updatedAt;
      lastSaved.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
        'Última actualización: ' +
        formatSV(lastUpdateISO);

      await refreshHistoryPicker();
    });

    await showScanToast('success', 'Lista limpiada', 'Se eliminaron ' + itemCount + ' item(s) y se guardó el checklist vacío.');
  });

  btnSave.addEventListener('click', async () => {
    closeMoreActionsMenu();
    try {
      await persistCurrentChecklist();
    } catch (e) {
      showScanToast('error', 'Error', String(e));
    }
  });

  const FINALIZE_DISPATCH_FLOW_TOKEN = Symbol('finalize-dispatch-flow');

  async function finalizeDispatchWithPendingRequisition(flowToken) {
    // Única ruta autorizada para crear el estado pendiente de requisición.
    if (flowToken !== FINALIZE_DISPATCH_FLOW_TOKEN) {
      await showScanToast('info', 'Acción no disponible', 'El estado pendiente de requisición solo puede generarse al finalizar el despacho.');
      return;
    }

    if (!activeWarehouseRequest?.requestId) {
      await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud antes de finalizar el despacho.');
      return;
    }

    const currentStatus = getActiveWarehouseRequestStatus('');
    const allowedStatuses = [
      REQUEST_STATUSES.SENT,
      REQUEST_STATUSES.REVIEW,
      REQUEST_STATUSES.PARTIAL_DISPATCH
    ];
    if (!allowedStatuses.includes(currentStatus)) {
      await showScanToast('info', 'Acción no disponible', 'Esta solicitud ya no admite finalizar el despacho.');
      return;
    }

    const rows = [...body.getElementsByTagName('tr')];
    const originalItems = rows.map(buildChecklistItemFromRow);
    const previousRequest = {
      status: activeWarehouseRequest.status,
      original: { ...(activeWarehouseRequest.original || {}) }
    };
    const previousRequisitionDone = requisitionDone;
    const previousRequisitionDoneAt = requisitionDoneAt;
    const dispatchedRows = rows.filter(tr => getDispatchButton(tr)?.classList.contains('on'));
    const pendingRows = rows.filter(tr => !getDispatchButton(tr)?.classList.contains('on'));

    if (!dispatchedRows.length) {
      await showScanToast('warning', 'Nada despachado', 'Marca al menos un producto como despachado antes de finalizar.');
      return;
    }

    const cleanupText = pendingRows.length
      ? 'Se conservarán <strong>' + dispatchedRows.length + '</strong> producto(s) despachados y se eliminarán de la lista <strong>' + pendingRows.length + '</strong> producto(s) no marcados como despachados. Los eliminados quedarán registrados para trazabilidad.'
      : 'Todos los productos están marcados como despachados, por lo que no se eliminará ninguno de la lista.';

    const result = await Swal.fire({
      title: '¿Finalizar despacho?',
      html: '<div class="text-start small">' + cleanupText + '<br><br>La solicitud pasará a <strong>Despachado/Pendiente de requisición</strong>. Después aparecerá la acción para marcar la requisición como hecha.</div>',
      icon: pendingRows.length ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Finalizar despacho',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const now = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.() || {};
    const removedItems = pendingRows.map(buildChecklistItemFromRow);
    pendingRows.forEach(tr => tr.remove());
    renumber();
    clearBulkSelection();
    updateBulkSelectionUI();
    applyListSearchFilter();

    const remainingRows = [...body.getElementsByTagName('tr')];
    const remainingPendingRows = remainingRows.filter(tr => !getDispatchButton(tr)?.classList.contains('on'));
    if (remainingPendingRows.length || remainingRows.length !== dispatchedRows.length) {
      body.innerHTML = '';
      renderChecklistItems(originalItems);
      throw new Error('No se pudo limpiar de forma segura los productos no despachados. No se guardó ningún cambio.');
    }

    requisitionDone = false;
    requisitionDoneAt = null;
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      requisitionStatus: 'pendiente',
      requisitionDone: false,
      requisitionDoneAt: null,
      requisitionPendingAt: now,
      dispatchedAt: activeWarehouseRequest.original?.dispatchedAt || now,
      dispatchedByUid: activeWarehouseRequest.original?.dispatchedByUid || user.uid || null,
      dispatchedByEmail: activeWarehouseRequest.original?.dispatchedByEmail || user.email || null,
      requisitionPendingByUid: user.uid || null,
      requisitionPendingByEmail: user.email || null,
      requisitionItems: removedItems,
      requisitionItemCount: removedItems.length,
      statusUpdatedAt: now,
      statusUpdatedByUid: user.uid || null,
      statusUpdatedByEmail: user.email || null
    };

    try {
      const saveResult = await persistWarehouseWorkflowTransition(
        REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING
      );
      if (!saveResult?.ok) {
        throw new Error('No se pudo guardar la solicitud antes de dejarla pendiente de requisición.');
      }
      resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: true });
      setHistoricalViewMode(false);
      updateRequisitionUI();
      await showScanToast('success', 'Despacho finalizado', 'La solicitud quedó en estado Despachado/Pendiente de requisición.');
    } catch (error) {
      body.innerHTML = '';
      renderChecklistItems(originalItems);
      requisitionDone = previousRequisitionDone;
      requisitionDoneAt = previousRequisitionDoneAt;
      activeWarehouseRequest.status = previousRequest.status;
      activeWarehouseRequest.original = previousRequest.original;
      setHistoricalViewMode(false);
      updateRequisitionUI();
      throw error;
    }
  }

  async function markRequisitionDone() {
    const currentStatus = getActiveWarehouseRequestStatus('');
    if (currentStatus !== REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING) {
      await showScanToast('info', 'Acción no disponible', 'La solicitud debe estar en estado Despachado/Pendiente de requisición.');
      return;
    }

    const now = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.() || {};
    const previousRequest = {
      status: activeWarehouseRequest?.status || REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      original: { ...(activeWarehouseRequest?.original || {}) }
    };
    const previousRequisitionDone = requisitionDone;
    const previousRequisitionDoneAt = requisitionDoneAt;
    const result = await Swal.fire({
      title: '¿Confirmar requisición hecha?',
      html: '<div class="text-start small">El estado cambiará a <strong>Despachado/Requisición hecha</strong>.</div>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Marcar como hecha',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    requisitionDone = true;
    requisitionDoneAt = now;
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      requisitionStatus: 'hecha',
      requisitionDone: true,
      requisitionDoneAt: now,
      requisitionDoneByUid: user.uid || null,
      requisitionDoneByEmail: user.email || null,
      statusUpdatedAt: now,
      statusUpdatedByUid: user.uid || null,
      statusUpdatedByEmail: user.email || null
    };

    try {
      const saveResult = await persistWarehouseWorkflowTransition(
        REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE
      );
      if (!saveResult?.ok) {
        throw new Error('No se pudo guardar la solicitud antes de confirmar la requisición.');
      }
      setHistoricalViewMode(false);
      updateRequisitionUI();
      await showScanToast('success', 'Requisición hecha', 'La solicitud cambió a Despachado/Requisición hecha.');
    } catch (error) {
      requisitionDone = previousRequisitionDone;
      requisitionDoneAt = previousRequisitionDoneAt;
      activeWarehouseRequest.status = previousRequest.status;
      activeWarehouseRequest.original = previousRequest.original;
      setHistoricalViewMode(false);
      throw error;
    }
  }

  if (btnToggleRequisition) {
    btnToggleRequisition.addEventListener('click', async () => {
      closeMoreActionsMenu();
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('marcar requisición', 'bodega o administradores');
        return;
      }
      const status = getActiveWarehouseRequestStatus('');
      if (status !== REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING) {
        await showScanToast('info', 'Acción no disponible', 'La requisición solo puede marcarse como hecha después de finalizar el despacho.');
        updateRequisitionUI();
        return;
      }
      try {
        await markRequisitionDone();
      } catch (e) {
        console.error(e);
        await showScanToast('error', 'Error', String(e?.message || e));
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

    const todayForPicker = (typeof getTodayString === 'function') ? parseDateISO(getTodayString()) : new Date();
    const state = {
      // Internamente currentViewDate=null sigue significando "hoy editable", pero visualmente mostramos hoy.
      selectedDate: currentViewDate ? parseDateISO(currentViewDate) : todayForPicker,
      visibleMonth: startOfMonth(currentViewDate ? parseDateISO(currentViewDate) || todayForPicker : todayForPicker),
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
      const today = (typeof getTodayString === 'function') ? parseDateISO(getTodayString()) : new Date();
      state.selectedDate = today;
      state.visibleMonth = startOfMonth(today || new Date());
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

  function ensureWarehouseFilterOption() {
    if (!requiresWarehouseRequestContext() || !storeSelect) return;
    if (!Array.from(storeSelect.options).some(option => option.value === '__all__')) {
      const opt = document.createElement('option');
      opt.value = '__all__';
      opt.textContent = 'Todas las sucursales';
      storeSelect.insertBefore(opt, storeSelect.firstChild);
      storeSelect.value = '__all__';
    }
  }

  function ensureWarehouseVersionFilterOption() {
    if (!requiresWarehouseRequestContext() || !versionSelect) return;
    if (!Array.from(versionSelect.options).some(option => option.value === '__all__')) {
      const opt = document.createElement('option');
      opt.value = '__all__';
      opt.textContent = 'Todos los tipos';
      versionSelect.insertBefore(opt, versionSelect.firstChild);
    }
    if (!activeWarehouseRequest?.requestId && !versionSelect.value) {
      versionSelect.value = '__all__';
    }
  }

  function setWarehouseFilterLabels() {
    const storeLabel = document.querySelector('label[for="storeSelect"]');
    const versionLabel = document.querySelector('label[for="versionSelect"]');
    const dateLabel = document.querySelector('label[for="histDateInput"]');
    const warehouseMode = requiresWarehouseRequestContext();
    if (storeLabel) storeLabel.textContent = warehouseMode ? 'Filtro de sucursal' : 'Tienda';
    if (versionLabel) versionLabel.textContent = warehouseMode ? 'Filtro de tipo' : 'Versión de lista';
    if (dateLabel) dateLabel.textContent = warehouseMode ? 'Filtro por fecha' : 'Recepciones por fecha';
  }

  function prepareWarehouseWorkspace() {
    if (!requiresWarehouseRequestContext()) return;
    cancelPendingAutoSave();
    ensureWarehouseFilterOption();
    ensureWarehouseVersionFilterOption();
    if (!histPicker && typeof createHistoryPicker === 'function') {
      histPicker = createHistoryPicker();
    }
    const histModeText = document.getElementById('histViewModeText');
    if (histModeText) {
      histModeText.textContent = currentViewDate
        ? ('Filtro de solicitudes: ' + currentViewDate)
        : 'Modo bodega: abre una solicitud desde la bandeja para revisar.';
      histModeText.classList.remove('text-primary', 'text-success');
      histModeText.classList.add('text-muted');
    }
    activeWarehouseRequest = null;
    activeWarehouseRequestSnapshot = '';
    if (storeSelect && Array.from(storeSelect.options).some(option => option.value === '__all__')) storeSelect.value = '__all__';
    if (versionSelect && Array.from(versionSelect.options).some(option => option.value === '__all__')) versionSelect.value = '__all__';
    requestFlowState = { status: REQUEST_STATUSES.NONE, requestId: null, submittedAt: null, createdAt: null, itemCount: 0, record: null };
    currentViewDate = null;
    if (histPicker && typeof histPicker.clear === 'function') {
      histPicker.clear();
    } else if (histDateInput) {
      histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';
    }
    resetHistoricalUnlock();
    clearHistoricalSelection();
    clearBulkSelection();
    resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
    body.innerHTML = '';
    renumber();
    updateLastSavedText(null, 'Abre una solicitud para comenzar.');
    resetAutoSaveBaseline();
    setHistoricalViewMode(false);
    updateBulkSelectionUI();
    updateRequestFlowUI();
    updateWarehouseTodayButtonLabel();
  }

  async function closeWarehouseRequest(options = {}) {
    if (!requiresWarehouseRequestContext()) return;
    const hadActiveRequest = !!activeWarehouseRequest?.requestId;
    if (hadActiveRequest && options.confirm !== false) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cerrar esta solicitud');
      if (!canLeave) return;
    }
    prepareWarehouseWorkspace();
    if (hadActiveRequest && options.notify !== false) {
      await showScanToast('info', 'Solicitud cerrada', 'El espacio de bodega quedó listo para abrir otra solicitud.');
    }
  }

  async function refreshHistoryPicker() {
    if (!histDateInput) return;

    const isWarehouseMode = requiresWarehouseRequestContext();
    const selectedStoreFilter = String(storeSelect?.value || '').trim();
    const selectedVersionFilter = String(versionSelect?.value || '').trim();
    const cacheKey = isWarehouseMode
      ? ['warehouse-requests', selectedStoreFilter || 'all', selectedVersionFilter || 'all'].join(':')
      : getDocIdForCurrentList();

    const cachedDates = readHistoryDatesCache(cacheKey);
    histDatesWithData = new Set(cachedDates);

    if (!histPicker) {
      histPicker = createHistoryPicker();
    } else if (typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }

    try {
      let fechas = [];

      if (isWarehouseMode) {
        if (typeof listRequestDatesForCurrentAccess === 'function') {
          fechas = await listRequestDatesForCurrentAccess({
            storeKey: selectedStoreFilter && selectedStoreFilter !== '__all__' ? selectedStoreFilter : '',
            versionKey: selectedVersionFilter && selectedVersionFilter !== '__all__' ? selectedVersionFilter : '',
            limit: 500
          });
        }
      } else {
        const docId = getDocIdForCurrentList();
        const historialDates = (typeof getHistoryDates === 'function') ? await getHistoryDates(docId) : [];
        let requestDates = [];
        if (typeof listRequestDatesForCurrentAccess === 'function') {
          requestDates = await listRequestDatesForCurrentAccess({
            storeKey: storeSelect?.value || '',
            versionKey: versionSelect?.value || 'base',
            limit: 500
          });
        }
        fechas = [...(historialDates || []), ...(requestDates || [])];
      }

      const fechasUnicas = Array.from(new Set((fechas || []).filter(Boolean))).sort();
      histDatesWithData = new Set(fechasUnicas);
      writeHistoryDatesCache(cacheKey, fechasUnicas);
    } catch (e) {
      console.error('Error al obtener fechas marcadas del calendario:', e);
    }

    if (histPicker && typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }
  }

  async function loadHistoryForDate(dateStr) {
    if (!dateStr) return;

    if (requiresWarehouseRequestContext()) {
      if (activeWarehouseRequest?.requestId) {
        await showScanToast('info', 'Solicitud activa', 'Cierra la solicitud activa antes de cambiar el filtro de fecha.', { timeout: 3600 });
        return false;
      }
      currentViewDate = dateStr;
      const histModeText = document.getElementById('histViewModeText');
      if (histModeText) histModeText.textContent = 'Filtro de solicitudes: ' + dateStr;
      updateRequestFlowUI();
      await openRequestsList({ title: 'Solicitudes de bodega' });
      return;
    }

    if (!(await enforceCurrentStoreAccess('consultar históricos'))) return;

    activeWarehouseRequest = null;
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
            histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';
          }

          await loadStoreStateForToday();
          setHistoricalViewMode(false);
          return;
        }

        currentViewDate = dateStr;
        if (mediaStream) {
          await stopScanner();
        }
        resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
        resetHistoricalUnlock();
        clearHistoricalSelection();

        body.innerHTML = '';
        renumber();
        updateBulkSelectionUI();

        const docId = getDocIdForCurrentList();
        const record = await loadChecklistFromFirestore(docId, dateStr);
        applyChecklistMeta(record?.meta || {});

        if (record && Array.isArray(record.items) && record.items.length) {
          renderChecklistItems(record.items);
          lastUpdateISO = record.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
        } else {
          lastUpdateISO = record?.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + 'Sin guardado para esa fecha.';
          showScanToast('info', 'Sin datos', 'No hay checklist guardado para esa fecha.');
        }

        const isHistorical = (today ? (dateStr !== today) : true);
        setHistoricalViewMode(isHistorical);
        applyListSearchFilter();
      } catch (e) {
        console.error('Error al cargar histórico:', e);
        showScanToast('error', 'Error', 'No se pudo cargar el histórico para esa fecha.');
      }
    });
  }

  if (btnHistToday) {
    btnHistToday.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (requiresWarehouseRequestContext() && hasActiveWarehouseRequest()) {
        await closeWarehouseRequest({ notify: true });
        return;
      }

      await withLoading('Volviendo a hoy...', async () => {
        if (histPicker) {
          histPicker.clear();
        } else if (histDateInput) {
          histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';
        }

        currentViewDate = null;
        resetHistoricalUnlock();
        clearHistoricalSelection();
        if (requiresWarehouseRequestContext()) {
          prepareWarehouseWorkspace();
        } else {
          await loadStoreStateForToday(); // vuelve a hoy
          setHistoricalViewMode(false);
        }
      });

    });
  }


  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
      closeMoreActionsMenu();
      const canUnlockHistorical = isPastHistoricalDateSelected();
      const canUnlockProtected = isProtectedVersionSelected();
      const canUnlockAny = canUnlockHistorical || canUnlockProtected;

      if (!canUnlockAny) {
        await showScanToast('info', 'No aplica', 'Este botón solo se usa cuando estás viendo una fecha anterior o una lista protegida.');
        return;
      }

      const deniedHistorical = canUnlockHistorical && !canUnlockHistoricalViews();
      const deniedProtected = canUnlockProtected && !canUseProtectedLists();
      if (deniedHistorical || deniedProtected) {
        await showRoleDeniedAlert('desbloquear esta vista', 'supervisores o administradores');
        return;
      }

      const hasActiveUnlock =
        (canUnlockHistorical && historicalUnlockEnabled) ||
        (canUnlockProtected && protectedVersionUnlockEnabled);

      if (hasActiveUnlock) {
        historicalUnlockEnabled = false;
        protectedVersionUnlockEnabled = false;
        setHistoricalViewMode(isHistoricalDateSelected());

        await showScanToast('success', 'Bloqueado', 'Los controles protegidos fueron bloqueados nuevamente.');
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

        await showScanToast('success', 'Desbloqueado', 'Ya puedes editar esta vista hasta que vuelvas a bloquearla.');
      }
    });
  }

  // ====== Barcode Scanner ======
  const NATIVE_BARCODE_FORMATS = [
    'ean_13',
    'ean_8',
    'upc_a',
    'upc_e',
    'code_128',
    'code_39',
    'itf',
    'qr_code'
  ];

  function getUserAgent() {
    return String(navigator.userAgent || navigator.vendor || '').toLowerCase();
  }

  function isIosOrIpadOS() {
    const ua = getUserAgent();
    const platform = String(navigator.platform || '').toLowerCase();
    return /iphone|ipad|ipod/.test(ua) || (platform === 'macintel' && Number(navigator.maxTouchPoints || 0) > 1);
  }

  function isAndroidChrome() {
    const ua = getUserAgent();
    if (!/android/.test(ua)) return false;
    if (!/chrome\//.test(ua)) return false;
    return !/edga|opr|opera|samsungbrowser|firefox|fxios/.test(ua);
  }

  function isMobileOrTouchScannerDevice() {
    const ua = getUserAgent();
    if (/android|iphone|ipad|ipod|mobile|tablet/.test(ua)) return true;
    if (isCompactScreen()) return true;
    return Number(navigator.maxTouchPoints || 0) > 1 && !/windows nt/.test(ua);
  }

  function getScannerPlatformMode() {
    if (isIosOrIpadOS()) return 'html5';
    if (isAndroidChrome()) {
      return isNativeBarcodeDetectorAvailable() ? 'native' : 'html5';
    }
    if (isMobileOrTouchScannerDevice()) return 'html5';
    return 'input';
  }

  function isNativeBarcodeDetectorAvailable() {
    return typeof window !== 'undefined'
      && typeof window.BarcodeDetector === 'function'
      && !!navigator.mediaDevices?.getUserMedia;
  }

  function setScanButtonState(isActive) {
    if (!btnScan) return;

    const mode = getScannerPlatformMode();
    btnScan.classList.remove('btn-outline-primary', 'btn-outline-danger', 'btn-outline-secondary', 'btn-danger', 'scanner-stop-btn');
    btnScan.removeAttribute('aria-pressed');

    if (isActive) {
      btnScan.classList.add('btn-danger', 'scanner-stop-btn');
      btnScan.title = 'Detener cámara';
      btnScan.setAttribute('aria-label', 'Detener cámara');
      btnScan.setAttribute('aria-pressed', 'true');
      btnScan.innerHTML = '<i class="fa-solid fa-stop" aria-hidden="true"></i>';
      return;
    }

    if (mode === 'input') {
      btnScan.classList.add('btn-outline-secondary');
      btnScan.title = 'Usar pistola lectora en la barra de búsqueda';
      btnScan.setAttribute('aria-label', 'Usar pistola lectora en la barra de búsqueda');
      btnScan.innerHTML = '<i class="fa-solid fa-keyboard" aria-hidden="true"></i>';
      return;
    }

    btnScan.classList.add('btn-outline-primary');
    btnScan.title = mode === 'native'
      ? 'Escanear con BarcodeDetector'
      : 'Escanear con html5-qrcode';
    btnScan.setAttribute('aria-label', btnScan.title);
    btnScan.innerHTML = '<i class="fa-solid fa-barcode" aria-hidden="true"></i>';
  }

  function canUseHtml5QrCode() {
    return typeof window !== 'undefined' && typeof window.Html5Qrcode === 'function';
  }

  function setScannerViewMode(mode = 'native') {
    if (!scanWrap) return;
    const nativeScanner = scanWrap.querySelector('.scanner-native-view') || scanWrap.querySelector('.scanner');
    if (nativeScanner) nativeScanner.classList.toggle('d-none', mode === 'html5');
    if (html5QrReader) html5QrReader.classList.toggle('d-none', mode !== 'html5');
  }

  function getHtml5QrFormats() {
    const formats = window.Html5QrcodeSupportedFormats || null;
    if (!formats) return undefined;
    return [
      formats.EAN_13,
      formats.EAN_8,
      formats.UPC_A,
      formats.UPC_E,
      formats.CODE_128,
      formats.CODE_39,
      formats.ITF,
      formats.QR_CODE
    ].filter(Boolean);
  }

  async function getSupportedNativeBarcodeFormats() {
    try {
      if (typeof window.BarcodeDetector?.getSupportedFormats !== 'function') {
        return NATIVE_BARCODE_FORMATS;
      }

      const supported = await window.BarcodeDetector.getSupportedFormats();
      const supportedSet = new Set((supported || []).map(format => String(format).toLowerCase()));
      const preferred = NATIVE_BARCODE_FORMATS.filter(format => supportedSet.has(format));
      return preferred.length ? preferred : NATIVE_BARCODE_FORMATS;
    } catch (_err) {
      return NATIVE_BARCODE_FORMATS;
    }
  }

  async function createNativeBarcodeDetector() {
    const formats = await getSupportedNativeBarcodeFormats();
    try {
      return new window.BarcodeDetector({ formats });
    } catch (_err) {
      return new window.BarcodeDetector();
    }
  }

  function prepareInputBarcodeScanner() {
    updatePrimarySearchModeUI();

    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = false;
      lastCatalogQuery = '';
      if (suggestions) suggestions.innerHTML = '';
      currentFocus = -1;

      if (!isCompactScreen()) {
        try {
          searchInput.focus({ preventScroll: true });
        } catch (_err) {
          try { searchInput.focus(); } catch (_) {}
        }
      }
    }

    const scannerHint = primarySearchMode === 'list'
      ? 'Escanea para buscar solamente dentro de la lista actual. No se agregará ninguna fila.'
      : 'Escanea directamente en la barra de búsqueda y confirma con Enter.';
    showScanToast('info', 'Pistola lista', scannerHint, { timeout: 3500 });
  }

  async function askForManualBarcodeEntry(message = 'Puedes escribirlo manualmente si la cámara no logra leerlo.') {
    const result = await Swal.fire({
      title: 'Ingresar código',
      text: message,
      input: 'text',
      inputLabel: 'Código de barras',
      inputPlaceholder: 'Escribe o pega el código',
      showCancelButton: true,
      confirmButtonText: 'Buscar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!String(value || '').trim()) {
          return 'Ingresa un código.';
        }
        return undefined;
      }
    });

    if (!result.isConfirmed) return false;
    const code = String(result.value || '').trim();
    if (!code) return false;
    await handleScannedOrImportedCode(code);
    return true;
  }

  async function startNativeBarcodeDetectorScanner() {
    if (!scanVideo || !isNativeBarcodeDetectorAvailable()) {
      await askForManualBarcodeEntry('BarcodeDetector no está disponible en este navegador. Ingresa el código manualmente.');
      return;
    }

    try {
      detector = await createNativeBarcodeDetector();
      setScannerViewMode('native');
      scanWrap?.classList.add('active');
      setScanButtonState(true);

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      scanVideo.srcObject = mediaStream;
      scanVideo.setAttribute('playsinline', 'true');
      await scanVideo.play();

      let detecting = false;
      scanInterval = window.setInterval(async () => {
        if (detecting || !detector || !scanVideo || scanVideo.readyState < 2) return;
        detecting = true;
        try {
          const results = await detector.detect(scanVideo);
          const raw = String(results?.[0]?.rawValue || '').trim();
          if (raw) await onBarcodeFound(raw);
        } catch (err) {
          console.warn('BarcodeDetector decode error:', err);
        } finally {
          detecting = false;
        }
      }, 180);

      showScanToast('info', 'BarcodeDetector activo', 'Apunta la cámara al código de barras.', { timeout: 2400 });
    } catch (err) {
      console.error('BarcodeDetector scanner error:', err);
      await stopScanner();
      showScanToast('info', 'Cámara no disponible', 'No se pudo iniciar BarcodeDetector. Puedes ingresar el código manualmente.')
        .then(() => askForManualBarcodeEntry());
    }
  }

  async function startHtml5QrScanner() {
    if (!html5QrReader || !canUseHtml5QrCode()) {
      await askForManualBarcodeEntry('El escáner alternativo no cargó. Ingresa el código manualmente.');
      return;
    }

    if (html5QrScannerActive) return;

    try {
      setScannerViewMode('html5');
      scanWrap?.classList.add('active');
      setScanButtonState(true);

      html5QrScanner = html5QrScanner || new window.Html5Qrcode('html5QrReader', {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      });

      const formatsToSupport = getHtml5QrFormats();
      const config = {
        fps: 10,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.7777778,
        disableFlip: false
      };
      if (formatsToSupport) config.formatsToSupport = formatsToSupport;

      html5QrScannerActive = true;
      await html5QrScanner.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          const raw = String(decodedText || '').trim();
          if (!raw) return;
          await onBarcodeFound(raw);
        },
        () => {}
      );

      showScanToast('info', 'html5-qrcode activo', 'Apunta la cámara al código de barras.', { timeout: 2400 });
    } catch (err) {
      console.error('html5-qrcode scanner error:', err);
      await stopScanner();
      showScanToast('info', 'Cámara no disponible', 'No se pudo iniciar el escáner en este dispositivo. Puedes ingresar el código manualmente.')
        .then(() => askForManualBarcodeEntry());
    }
  }

  async function stopHtml5QrScanner() {
    if (!html5QrScanner) {
      html5QrScannerActive = false;
      return;
    }

    try {
      if (html5QrScannerActive && typeof html5QrScanner.stop === 'function') {
        await html5QrScanner.stop();
      }
    } catch (_err) {}

    try {
      if (typeof html5QrScanner.clear === 'function') {
        html5QrScanner.clear();
      }
    } catch (_err) {}

    html5QrScannerActive = false;
  }

  async function startScanner() {
    if (mediaStream || html5QrScannerActive) return;

    const mode = getScannerPlatformMode();

    if (mode === 'input') {
      prepareInputBarcodeScanner();
      return;
    }

    if (mode === 'native') {
      await startNativeBarcodeDetectorScanner();
      return;
    }

    await startHtml5QrScanner();
  }

  async function stopScanner() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }

    await stopHtml5QrScanner();

    detector = null;

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }

    if (scanVideo) {
      try { scanVideo.pause(); } catch (_e) { }
      scanVideo.srcObject = null;
    }

    scanWrap?.classList.remove('active');
    setScannerViewMode('native');
    setScanButtonState(false);
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    await handleScannedOrImportedCode(code);
  }

  if (fileScan) {
    try {
      fileScan.removeAttribute('capture');
      fileScan.setAttribute('accept', '');
      fileScan.classList.add('d-none');
    } catch (_err) {}
  }

  if (btnScan) {
    btnScan.addEventListener('click', async () => {
      if (mediaStream || html5QrScannerActive) {
        await stopScanner();
      } else {
        await startScanner();
      }
    });
  }

  setScanButtonState(false);



  async function markActiveRequestDispatched() {
    if (!canUseWarehouseTools()) return;
    if (!activeWarehouseRequest?.requestId) {
      await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de finalizar el despacho.');
      return;
    }

    const currentStatus = getActiveWarehouseRequestStatus('');
    const allowedStatuses = [
      REQUEST_STATUSES.SENT,
      REQUEST_STATUSES.REVIEW,
      REQUEST_STATUSES.PARTIAL_DISPATCH
    ];
    if (!allowedStatuses.includes(currentStatus)) {
      await showScanToast('info', 'Acción no disponible', 'Esta solicitud ya no admite finalizar el despacho.');
      return;
    }

    const rows = [...body.getElementsByTagName('tr')];
    if (!rows.length) {
      await showScanToast('warning', 'Lista vacía', 'Agrega al menos un producto antes de finalizar el despacho.');
      return;
    }

    const dispatchedCount = rows.filter(tr => getDispatchButton(tr)?.classList.contains('on')).length;
    if (!dispatchedCount) {
      await showScanToast('warning', 'Nada despachado', 'Marca al menos un producto como despachado antes de finalizar.');
      return;
    }

    await finalizeDispatchWithPendingRequisition(FINALIZE_DISPATCH_FLOW_TOKEN);
  }


  async function cancelActiveWarehouseRequest() {
    if (!canUseWarehouseTools()) return;
    if (!activeWarehouseRequest?.requestId) {
      await showScanToast('info', 'Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de cancelarla.');
      return;
    }
    const result = await Swal.fire({
      title: '¿Cancelar solicitud?',
      html: '<div class="text-start small">La solicitud quedará en estado <strong>Cancelada</strong>. No se eliminará; seguirá disponible en el historial.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar solicitud',
      cancelButtonText: 'Volver'
    });
    if (!result.isConfirmed) return;
    const cancelledAt = new Date().toISOString();
    const cancelledByEmail = window.TRAuth?.getCurrentUser?.()?.email || null;
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      cancelledAt,
      cancelledByEmail
    };
    await updateRequestStatus(activeWarehouseRequest.requestId, REQUEST_STATUSES.CANCELLED, {
      cancelledAt,
      cancelledByEmail
    });
    await syncActiveWarehouseRequest(REQUEST_STATUSES.CANCELLED);
    resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: true });
    clearBulkSelection();
    setHistoricalViewMode(false);
    await showScanToast('success', 'Solicitud cancelada', 'La solicitud quedó cancelada y conservada en el historial.');
  }



  function getItemQuantityValue(item) {
    return item?.cantidad ?? item?.quantity ?? '';
  }

  function setItemQuantityValue(item, value) {
    if (!item) return;
    item.cantidad = value;
    if (Object.prototype.hasOwnProperty.call(item, 'quantity')) {
      item.quantity = value;
    }
  }

  function getItemNameValue(item) {
    return item?.nombre || item?.name || '';
  }

  function getItemWarehouseValue(item) {
    return item?.bodega || item?.warehouse || '';
  }

  function cloneChecklistItem(item) {
    return { ...(item || {}) };
  }

  function getMergeCodeValues(item) {
    const barcode = normalizeMatchValue(item?.codigo_barras || item?.barcode || item?.codigoBarras || '');
    const inventory = normalizeMatchValue(item?.codigo_inventario || item?.codigoInv || item?.inventoryCode || item?.codigoInventario || '');
    return {
      barcode: hasUsefulCode(barcode) ? barcode : '',
      inventory: hasUsefulCode(inventory) ? inventory : ''
    };
  }

  function hasMergeUsefulCode(item) {
    const codes = getMergeCodeValues(item);
    return !!(codes.barcode || codes.inventory);
  }

  function getMergeItemIdentityKeys(item) {
    const codes = getMergeCodeValues(item);
    const name = normalizeMatchValue(getItemNameValue(item));
    const warehouse = normalizeMatchValue(getItemWarehouseValue(item));
    const keys = [];

    if (codes.barcode) keys.push({ key: 'barcode:' + codes.barcode, label: 'código de barras', strength: 3, type: 'barcode' });
    if (codes.inventory) keys.push({ key: 'inventory:' + codes.inventory, label: 'código inventario', strength: 3, type: 'inventory' });
    if (name && warehouse) keys.push({ key: 'name-warehouse:' + name + '|' + warehouse, label: 'nombre + bodega', strength: 2, type: 'name-warehouse' });
    if (name) keys.push({ key: 'name:' + name, label: 'solo nombre', strength: 1, type: 'name' });

    return keys;
  }

  function getMergeItemKey(item) {
    return getMergeItemIdentityKeys(item)[0]?.key || '';
  }

  function getMergeItemLabel(item) {
    const name = String(getItemNameValue(item) || '').trim();
    const inventory = String(item?.codigo_inventario || item?.codigoInv || item?.inventoryCode || '').trim();
    const warehouse = String(getItemWarehouseValue(item) || '').trim();
    return [name || 'Producto sin nombre', inventory && inventory !== 'N/A' ? inventory : '', warehouse].filter(Boolean).join(' · ');
  }

  function parseMergeQuantity(value) {
    const normalized = String(value ?? '').replace(',', '.').trim();
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function formatMergeQuantity(value) {
    if (!Number.isFinite(value)) return '';
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  function mergeQuantityValues(existingValue, sourceValue) {
    const existingRaw = String(existingValue ?? '').trim();
    const sourceRaw = String(sourceValue ?? '').trim();
    const existingQty = parseMergeQuantity(existingRaw);
    const sourceQty = parseMergeQuantity(sourceRaw);

    if (existingQty !== null && sourceQty !== null) {
      return { value: formatMergeQuantity(existingQty + sourceQty), numeric: true };
    }

    if (!existingRaw) return { value: sourceRaw, numeric: false };
    if (!sourceRaw || normalizeMatchValue(existingRaw) === normalizeMatchValue(sourceRaw)) {
      return { value: existingRaw, numeric: false };
    }

    return { value: existingRaw, numeric: false, unresolved: true };
  }

  function createMergeIndex(items = []) {
    const index = new Map();
    const duplicatedKeys = new Set();

    (Array.isArray(items) ? items : []).forEach((item, idx) => {
      getMergeItemIdentityKeys(item).forEach((identity) => {
        if (!identity.key) return;
        const entry = { ...identity, index: idx, item };
        if (!index.has(identity.key)) {
          index.set(identity.key, [entry]);
        } else {
          index.get(identity.key).push(entry);
          duplicatedKeys.add(identity.key);
        }
      });
    });

    return { index, duplicatedKeys };
  }

  function registerMergeItemInIndex(indexInfo, item, idx) {
    if (!indexInfo || !indexInfo.index) return;
    getMergeItemIdentityKeys(item).forEach((identity) => {
      if (!identity.key) return;
      const entry = { ...identity, index: idx, item };
      if (!indexInfo.index.has(identity.key)) {
        indexInfo.index.set(identity.key, [entry]);
      } else {
        indexInfo.index.get(identity.key).push(entry);
        indexInfo.duplicatedKeys?.add?.(identity.key);
      }
    });
  }

  function getMergeCodeComparison(a, b) {
    const aCodes = getMergeCodeValues(a);
    const bCodes = getMergeCodeValues(b);
    const matchingTypes = [];
    const conflictingTypes = [];

    if (aCodes.barcode && bCodes.barcode) {
      if (aCodes.barcode === bCodes.barcode) matchingTypes.push('barcode');
      else conflictingTypes.push('barcode');
    }

    if (aCodes.inventory && bCodes.inventory) {
      if (aCodes.inventory === bCodes.inventory) matchingTypes.push('inventory');
      else conflictingTypes.push('inventory');
    }

    return {
      matchingTypes,
      conflictingTypes,
      hasStrongMatch: matchingTypes.length > 0,
      hasConflict: conflictingTypes.length > 0,
      hasBlockingConflict: matchingTypes.length > 0 && conflictingTypes.length > 0
    };
  }

  function hasMergeCodeConflict(a, b) {
    return getMergeCodeComparison(a, b).hasConflict;
  }

  function shouldBlockMergeMatchByCodes(identity, sourceItem, candidateItem) {
    const comparison = getMergeCodeComparison(sourceItem, candidateItem);
    const strength = Number(identity?.strength || 0);

    // Si la coincidencia es débil (nombre/bodega) y los códigos contradicen, no se mezcla.
    if (strength < 3 && comparison.hasConflict) return true;

    // Si coincide por un código fuerte, pero otro código confiable contradice, tampoco se suma.
    // Ejemplo: mismo código de barras pero código inventario distinto, o al revés.
    if (strength >= 3 && comparison.hasBlockingConflict) return true;

    return false;
  }

  function findMergeMatch(indexInfo, item) {
    if (!indexInfo || !indexInfo.index) return null;
    const keys = getMergeItemIdentityKeys(item);
    for (const identity of keys) {
      if (!identity.key) continue;
      const candidates = indexInfo.index.get(identity.key) || [];
      for (const candidate of candidates) {
        if (!Number.isInteger(candidate.index) || candidate.index < 0) continue;
        if (shouldBlockMergeMatchByCodes(identity, item, candidate.item)) continue;
        return {
          index: candidate.index,
          key: identity.key,
          label: identity.label,
          strength: identity.strength,
          type: identity.type,
          ambiguous: candidates.length > 1 || !!indexInfo.duplicatedKeys?.has?.(identity.key)
        };
      }
    }
    return null;
  }

  function mergeItemIntoExisting(existing, sourceItem) {
    const quantityMerge = mergeQuantityValues(getItemQuantityValue(existing), getItemQuantityValue(sourceItem));
    if (quantityMerge.unresolved) return quantityMerge;
    setItemQuantityValue(existing, quantityMerge.value);
    existing.despachado = Boolean(existing.despachado || sourceItem.despachado);
    return quantityMerge;
  }

  function mergeChecklistItems(destinationItems = [], sourceItems = [], options = {}) {
    const duplicateStrategy = String(options.duplicateStrategy || options.strategy || 'sum').trim().toLowerCase();
    const merged = Array.isArray(destinationItems) ? destinationItems.map(cloneChecklistItem) : [];
    const indexInfo = createMergeIndex(merged);
    const appliedSourceIndexes = [];
    const skippedSourceIndexes = [];
    let added = 0;
    let summed = 0;
    let keptSeparate = 0;
    let skippedDuplicates = 0;
    let unresolvedQuantities = 0;

    (Array.isArray(sourceItems) ? sourceItems : []).forEach((source, sourceIndex) => {
      const sourceItem = cloneChecklistItem(source);
      const match = findMergeMatch(indexInfo, sourceItem);

      if (match && duplicateStrategy === 'skip') {
        skippedDuplicates += 1;
        skippedSourceIndexes.push(sourceIndex);
        return;
      }

      if (match && duplicateStrategy === 'keep') {
        merged.push(sourceItem);
        keptSeparate += 1;
        appliedSourceIndexes.push(sourceIndex);
        return;
      }

      if (match) {
        if (match.ambiguous && duplicateStrategy === 'sum') {
          // Si el destino ya tiene duplicados con la misma clave, sumar contra el primero sería arbitrario.
          // Se mueve/agrega como línea separada para evitar pérdida o mezcla silenciosa.
          merged.push(sourceItem);
          registerMergeItemInIndex(indexInfo, sourceItem, merged.length - 1);
          keptSeparate += 1;
          unresolvedQuantities += 1;
          appliedSourceIndexes.push(sourceIndex);
          return;
        }

        const existing = merged[match.index];
        const quantityMerge = mergeItemIntoExisting(existing, sourceItem);
        if (quantityMerge.unresolved) {
          merged.push(sourceItem);
          registerMergeItemInIndex(indexInfo, sourceItem, merged.length - 1);
          keptSeparate += 1;
          unresolvedQuantities += 1;
          appliedSourceIndexes.push(sourceIndex);
          return;
        }
        summed += 1;
        appliedSourceIndexes.push(sourceIndex);
        return;
      }

      merged.push(sourceItem);
      registerMergeItemInIndex(indexInfo, sourceItem, merged.length - 1);
      added += 1;
      appliedSourceIndexes.push(sourceIndex);
    });

    return {
      items: merged,
      added,
      summed,
      keptSeparate,
      skippedDuplicates,
      unresolvedQuantities,
      appliedSourceIndexes,
      skippedSourceIndexes
    };
  }

  function analyzeMergeConflicts(destinationItems = [], sourceItems = []) {
    const destinationIndex = createMergeIndex(destinationItems);
    const sourceSeen = new Map();
    const sourceDuplicateKeys = new Set();
    const destinationMatches = [];
    const sourceDuplicates = [];
    let weakMatchCount = 0;

    (Array.isArray(sourceItems) ? sourceItems : []).forEach((item, idx) => {
      const match = findMergeMatch(destinationIndex, item);
      if (match) {
        if (Number(match.strength || 0) <= 1) weakMatchCount += 1;
        destinationMatches.push({ index: idx, item, match });
      }

      getMergeItemIdentityKeys(item).forEach(({ key, label, strength, type }) => {
        if (!key || sourceDuplicateKeys.has(key)) return;
        if (sourceSeen.has(key)) {
          if (Number(strength || 0) <= 1) weakMatchCount += 1;
          sourceDuplicateKeys.add(key);
          sourceDuplicates.push({ index: idx, item, firstIndex: sourceSeen.get(key), key, label, strength, type });
        } else {
          sourceSeen.set(key, idx);
        }
      });
    });

    const hasWeakSourceDuplicates = sourceDuplicates.some(conflict => Number(conflict.strength || 0) <= 1);

    return {
      destinationMatches,
      sourceDuplicates,
      destinationDuplicateKeyCount: destinationIndex.duplicatedKeys.size,
      weakMatchCount,
      hasWeakConflicts: weakMatchCount > 0 || hasWeakSourceDuplicates,
      count: destinationMatches.length + sourceDuplicates.length + destinationIndex.duplicatedKeys.size,
      hasConflicts: destinationMatches.length > 0 || sourceDuplicates.length > 0 || destinationIndex.duplicatedKeys.size > 0
    };
  }

  function buildMergeConflictPreviewHtml(conflicts, options = {}) {
    const items = [];
    (conflicts.destinationMatches || []).slice(0, 6).forEach(conflict => {
      const weakText = Number(conflict.match?.strength || 0) <= 1 ? ' · coincidencia débil' : '';
      const ambiguousText = conflict.match?.ambiguous ? ' · destino con duplicados' : '';
      items.push('<li>' + escapeHtml(getMergeItemLabel(conflict.item)) + ' <span class="text-muted">(' + escapeHtml((conflict.match?.label || 'coincidencia') + weakText + ambiguousText) + ')</span></li>');
    });
    (conflicts.sourceDuplicates || []).slice(0, Math.max(0, 6 - items.length)).forEach(conflict => {
      const weakText = Number(conflict.strength || 0) <= 1 ? ' · coincidencia débil' : '';
      items.push('<li>' + escapeHtml(getMergeItemLabel(conflict.item)) + ' <span class="text-muted">(duplicado en origen' + escapeHtml(weakText) + ')</span></li>');
    });

    if (!items.length && conflicts.destinationDuplicateKeyCount) {
      items.push('<li>Ya existen duplicados dentro de la solicitud destino.</li>');
    }

    const allowSkip = options.allowSkip !== false;
    const defaultStrategy = options.defaultStrategy || (conflicts.hasWeakConflicts ? 'keep' : 'sum');
    const checked = (value) => value === defaultStrategy ? ' checked' : '';
    const hiddenCount = Math.max(0, Number(conflicts.count || 0) - items.length);
    const weakWarning = conflicts.hasWeakConflicts
      ? '<div class="alert alert-warning py-2 mb-2">Hay coincidencias solo por nombre. Para evitar mezclar productos parecidos, se recomienda revisar antes de sumar.</div>'
      : '';
    const skipHelp = options.skipHelp || 'No mueve/agrega repetidos; se quedan en la solicitud origen cuando aplique.';
    const skipOption = allowSkip ? `
          <label class="border rounded p-2">
            <input class="form-check-input me-1" type="radio" name="mergeDuplicateStrategy" value="skip"${checked('skip')}>
            <strong>Omitir repetidos</strong>
            <div class="text-muted">${escapeHtml(skipHelp)}</div>
          </label>` : '';

    return `
      <div class="text-start small">
        <p class="mb-2">Se detectaron productos que podrían repetirse. Selecciona cómo resolverlos antes de continuar.</p>
        ${weakWarning}
        <ul class="mb-2 ps-3">${items.join('')}${hiddenCount ? '<li class="text-muted">Y ' + hiddenCount + ' coincidencia(s) más...</li>' : ''}</ul>
        <div class="d-grid gap-2 mt-3">
          <label class="border rounded p-2">
            <input class="form-check-input me-1" type="radio" name="mergeDuplicateStrategy" value="sum"${checked('sum')}>
            <strong>Sumar cantidades</strong>
            <div class="text-muted">Une productos iguales y suma cantidades cuando sean numéricas. Si una cantidad no se puede sumar con seguridad, se conserva como línea separada.</div>
          </label>
          <label class="border rounded p-2">
            <input class="form-check-input me-1" type="radio" name="mergeDuplicateStrategy" value="keep"${checked('keep')}>
            <strong>Mantener separados</strong>
            <div class="text-muted">Conserva cada línea aunque parezca el mismo producto.</div>
          </label>
          ${skipOption}
        </div>
      </div>
    `;
  }

  async function promptMergeConflictStrategy(conflicts, options = {}) {
    if (!conflicts?.hasConflicts) return 'sum';

    const result = await Swal.fire({
      title: options.title || 'Productos repetidos detectados',
      html: buildMergeConflictPreviewHtml(conflicts, options),
      icon: 'warning',
      width: 720,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Aplicar solución',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const selected = Swal.getPopup()?.querySelector('input[name="mergeDuplicateStrategy"]:checked')?.value || options.defaultStrategy || (conflicts.hasWeakConflicts ? 'keep' : 'sum');
        return selected;
      }
    });

    return result.isConfirmed ? (result.value || options.defaultStrategy || (conflicts.hasWeakConflicts ? 'keep' : 'sum')) : null;
  }

  async function chooseDuplicateStrategyForRequests(destinationId, sourceIds, allRequests = []) {
    const destination = await loadRequestFromFirestore(destinationId);
    if (!destination) throw new Error('No se encontró la solicitud destino.');
    const sourceItems = [];

    for (const sourceId of sourceIds) {
      const source = allRequests.find(req => String(req.id || req.requestId || '') === String(sourceId)) || await loadRequestFromFirestore(sourceId);
      if (source && Array.isArray(source.items)) sourceItems.push(...source.items);
    }

    const conflicts = analyzeMergeConflicts(Array.isArray(destination.items) ? destination.items : [], sourceItems);
    return promptMergeConflictStrategy(conflicts, {
      title: 'Validación de fusión',
      confirmButtonText: 'Continuar fusión',
      skipHelp: 'No agrega repetidos al destino; esos productos se conservarán en la solicitud origen.',
      defaultStrategy: conflicts.hasWeakConflicts ? 'keep' : 'sum'
    });
  }

  function isRequestTerminalForMerge(status) {
    const normalized = normalizeRequestStatus(status || REQUEST_STATUSES.SENT);
    return [
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_PENDING,
      REQUEST_STATUSES.DISPATCHED_REQUISITION_DONE,
      REQUEST_STATUSES.RECEIVED,
      REQUEST_STATUSES.CANCELLED,
      REQUEST_STATUSES.MERGED
    ].includes(normalized);
  }

  function isRequestOpenForWarehouseMerge(status) {
    const normalized = normalizeRequestStatus(status || REQUEST_STATUSES.SENT);
    return [
      REQUEST_STATUSES.SENT,
      REQUEST_STATUSES.REVIEW,
      REQUEST_STATUSES.PARTIAL_DISPATCH
    ].includes(normalized);
  }

  function requestHasMergeableItems(req) {
    const items = Array.isArray(req?.items) ? req.items : [];
    return items.length > 0 || Number(req?.itemCount || 0) > 0;
  }

  function isMergeEligibleSource(req) {
    if (!req || !(req.id || req.requestId)) return false;
    if (!isRequestOpenForWarehouseMerge(req.status)) return false;
    return requestHasMergeableItems(req);
  }

  function isMergeEligibleDestination(req) {
    if (!req || !(req.id || req.requestId)) return false;
    return isRequestOpenForWarehouseMerge(req.status);
  }

  function hasMergeCandidatePair(requests = []) {
    const destinations = (Array.isArray(requests) ? requests : []).filter(isMergeEligibleDestination);
    const sources = (Array.isArray(requests) ? requests : []).filter(isMergeEligibleSource);
    return destinations.some(dest => {
      const destId = String(dest.id || dest.requestId || '');
      const destStore = String(dest.storeKey || '');
      return sources.some(src => {
        const sourceId = String(src.id || src.requestId || '');
        return sourceId && sourceId !== destId && String(src.storeKey || '') === destStore;
      });
    });
  }

  function buildMergeDialogHtml(requests = [], destinationId = '') {
    const destinations = requests.filter(isMergeEligibleDestination);
    const sources = requests.filter(isMergeEligibleSource);
    const today = (typeof getTodayString === 'function') ? getTodayString() : '';

    if (!hasMergeCandidatePair(requests)) {
      return '<div class="text-start small text-muted">No hay suficientes solicitudes abiertas para fusionar. Necesitas al menos una solicitud destino y una solicitud origen pendientes o en revisión.</div>';
    }

    const destinationOptions = destinations.map(req => {
      const id = req.id || req.requestId || '';
      const date = getRequestDateKey(req) || 'sin fecha';
      const selected = id === destinationId ? ' selected' : '';
      const label = getFriendlyRequestCode(req) + ' · ' + (req.storeName || getStoreLabel(req.storeKey)) + ' · ' + getRequestTypeLabel(req) + ' · ' + date + (date === today ? ' · hoy' : '');
      return '<option value="' + htmlAttrEscape(id) + '"' + selected + '>' + escapeHtml(label) + '</option>';
    }).join('');

    const sourceRows = sources.map(req => {
      const id = req.id || req.requestId || '';
      const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
      const date = getRequestDateKey(req) || 'sin fecha';
      return `
        <label class="request-list-row merge-source-row" data-store-key="${htmlAttrEscape(req.storeKey || '')}" data-request-id="${htmlAttrEscape(id)}">
          <span class="merge-source-main">
            <span class="merge-source-check">
              <input class="form-check-input" type="checkbox" name="mergeSources" value="${htmlAttrEscape(id)}" aria-label="Fusionar solicitud ${htmlAttrEscape(getFriendlyRequestCode(req))}">
            </span>
            <span class="merge-source-content">
              <strong>${escapeHtml(getFriendlyRequestCode(req))}</strong>
              <small>${escapeHtml(req.storeName || getStoreLabel(req.storeKey))} · ${escapeHtml(getRequestTypeLabel(req))} · ${escapeHtml(date)} · ${count} item(s)</small>
            </span>
          </span>
          <span class="request-list-side"><span class="badge rounded-pill ${getRequestStatusBadgeClass(req.status)}">${escapeHtml(getRequestStatusLabel(req.status))}</span></span>
        </label>
      `;
    }).join('');

    return `
      <div class="text-start small mb-3">
        Selecciona una solicitud destino y marca una o varias solicitudes origen. Si se detectan productos repetidos, se abrirá una validación para decidir si se suman, se mantienen separados o se conservan en origen.
      </div>
      <div class="mb-3 text-start">
        <label class="form-label small fw-semibold" for="mergeDestinationRequest">Solicitud destino</label>
        <select id="mergeDestinationRequest" class="form-select form-select-sm">${destinationOptions}</select>
        <div class="form-text">Recomendado: usar la solicitud de hoy de la misma sucursal.</div>
      </div>
      <div class="text-start mb-2 d-flex justify-content-between align-items-center">
        <strong class="small">Solicitudes a fusionar</strong>
        <span id="mergeSourceHint" class="small text-muted"></span>
      </div>
      <div class="request-list-modal merge-source-list text-start">${sourceRows}</div>
    `;
  }

  async function mergeRequestsIntoDestination(destinationId, sourceIds, allRequests = [], options = {}) {
    const destination = await loadRequestFromFirestore(destinationId);
    if (!destination) throw new Error('No se encontró la solicitud destino.');
    if (!isMergeEligibleDestination(destination)) throw new Error('La solicitud destino no está abierta para fusión.');

    const loadedSources = [];
    for (const sourceId of sourceIds) {
      if (!sourceId || sourceId === destinationId) continue;
      const source = allRequests.find(req => String(req.id || req.requestId || '') === String(sourceId)) || await loadRequestFromFirestore(sourceId);
      if (!source) throw new Error('No se encontró la solicitud origen: ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId }));
      if (!isMergeEligibleSource(source)) throw new Error('La solicitud ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId }) + ' no está abierta para fusión.');
      if (String(source.storeKey || '') !== String(destination.storeKey || '')) {
        throw new Error('Solo se pueden fusionar solicitudes de la misma sucursal. Revisa ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId, storeKey: source.storeKey, versionKey: source.versionKey, requestDate: getRequestDateKey(source) }) + '.');
      }
      loadedSources.push(source);
    }

    if (!loadedSources.length) throw new Error('Selecciona al menos una solicitud origen diferente al destino.');

    const now = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.();
    const userEmail = user?.email || null;
    const userUid = user?.uid || null;
    const duplicateStrategy = String(options.duplicateStrategy || 'sum').trim().toLowerCase();
    let mergedItems = Array.isArray(destination.items) ? destination.items : [];
    let addedTotal = 0;
    let summedTotal = 0;
    let keptSeparateTotal = 0;
    let skippedDuplicatesTotal = 0;
    let partialSourceCount = 0;
    let fullyMergedSourceCount = 0;

    const mergeSteps = [];

    loadedSources.forEach(source => {
      const sourceItems = Array.isArray(source.items) ? source.items : [];
      const result = mergeChecklistItems(mergedItems, sourceItems, { duplicateStrategy });
      mergedItems = result.items;
      addedTotal += result.added;
      summedTotal += result.summed;
      keptSeparateTotal += result.keptSeparate || 0;
      skippedDuplicatesTotal += result.skippedDuplicates || 0;

      const appliedSet = new Set(result.appliedSourceIndexes || []);
      const remainingItems = sourceItems.filter((_item, idx) => !appliedSet.has(idx)).map(cloneChecklistItem);
      const appliedCount = appliedSet.size;
      const skippedCount = Math.max(0, sourceItems.length - appliedCount);

      if (appliedCount <= 0) return;
      if (remainingItems.length > 0) partialSourceCount += 1;
      else fullyMergedSourceCount += 1;

      mergeSteps.push({
        source,
        sourceId: source.id || source.requestId,
        sourceItems,
        appliedCount,
        skippedCount,
        remainingItems
      });
    });

    if (!mergeSteps.length) {
      return {
        destinationId,
        sourceCount: 0,
        itemCount: Array.isArray(destination.items) ? destination.items.length : 0,
        addedTotal,
        summedTotal,
        keptSeparateTotal,
        skippedDuplicatesTotal,
        partialSourceCount: 0,
        fullyMergedSourceCount: 0,
        noChanges: true
      };
    }

    const sourceRefs = mergeSteps.map(step => ({
      requestId: step.sourceId,
      storeKey: step.source.storeKey || destination.storeKey || '',
      requestDate: getRequestDateKey(step.source),
      itemCount: step.appliedCount,
      originalItemCount: step.sourceItems.length,
      remainingItemCount: step.remainingItems.length
    }));

    const existingMergedFrom = Array.isArray(destination.mergedFrom) ? destination.mergedFrom : [];
    const destinationOriginalStatus = normalizeRequestStatus(destination.status || REQUEST_STATUSES.REVIEW);
    const destinationNextStatus = destinationOriginalStatus === REQUEST_STATUSES.SENT
      ? REQUEST_STATUSES.REVIEW
      : (destinationOriginalStatus || REQUEST_STATUSES.REVIEW);
    const destinationPayload = {
      ...destination,
      requestId: destination.requestId || destination.id || destinationId,
      status: destinationNextStatus,
      ...(destinationNextStatus !== destinationOriginalStatus ? {
        statusUpdatedAt: now,
        statusUpdatedByUid: userUid,
        statusUpdatedByEmail: userEmail
      } : {}),
      items: mergedItems,
      itemCount: mergedItems.length,
      mergedFrom: [...existingMergedFrom, ...sourceRefs],
      lastMergeAt: now,
      lastMergeByEmail: userEmail,
      lastWarehouseUpdateAt: now,
      lastWarehouseUpdateByUid: userUid,
      lastWarehouseUpdateByEmail: userEmail
    };
    delete destinationPayload.id;

    const db = getFirestoreDb();
    const batch = db.batch();

    if (typeof validateRequestAccessForPayload === 'function') {
      validateRequestAccessForPayload(destinationPayload, 'write');
    }
    batch.set(db.collection('requests').doc(String(destinationId)), cleanFirestorePayload(destinationPayload), { merge: true });

    mergeSteps.forEach(step => {
      const source = step.source;
      const sourceId = step.sourceId;
      const fullyMerged = step.remainingItems.length === 0;
      const sourcePayload = fullyMerged
        ? {
            ...source,
            requestId: source.requestId || source.id || sourceId,
            status: REQUEST_STATUSES.MERGED,
            statusUpdatedAt: now,
            statusUpdatedByUid: userUid,
            statusUpdatedByEmail: userEmail,
            mergedAt: now,
            mergedByEmail: userEmail,
            mergedIntoRequestId: destinationId,
            lastWarehouseUpdateAt: now,
            lastWarehouseUpdateByUid: userUid,
            lastWarehouseUpdateByEmail: userEmail
          }
        : {
            ...source,
            requestId: source.requestId || source.id || sourceId,
            items: step.remainingItems,
            itemCount: step.remainingItems.length,
            partialMergedAt: now,
            partialMergedByEmail: userEmail,
            partialMergedIntoRequestId: destinationId,
            partialMergedCount: step.appliedCount,
            mergeSkippedCount: step.skippedCount,
            lastWarehouseUpdateAt: now,
            lastWarehouseUpdateByUid: userUid,
            lastWarehouseUpdateByEmail: userEmail
          };
      delete sourcePayload.id;

      if (typeof validateRequestAccessForPayload === 'function') {
        validateRequestAccessForPayload(sourcePayload, 'write');
      }
      batch.set(db.collection('requests').doc(String(sourceId)), cleanFirestorePayload(sourcePayload), { merge: true });
    });

    await batch.commit();

    return {
      destinationId,
      sourceCount: mergeSteps.length,
      itemCount: mergedItems.length,
      addedTotal,
      summedTotal,
      keptSeparateTotal,
      skippedDuplicatesTotal,
      partialSourceCount,
      fullyMergedSourceCount,
      noChanges: false
    };
  }

  async function openMergeRequestsDialog() {
    if (!canUseWarehouseTools()) return;
    if (activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('fusionar solicitudes');
      if (!canLeave) return;
    }

    // La fusión debe buscar solicitudes abiertas de todas las sucursales permitidas,
    // sin depender del filtro visible de la bandeja. Luego la modal restringe
    // automáticamente los orígenes a la misma sucursal de la solicitud destino.
    let requests = await listRequestsForCurrentAccess({ limit: 500 });
    requests = requests.filter(req => req && (req.id || req.requestId));

    if (!hasMergeCandidatePair(requests)) {
      await showScanToast('info', 'Sin solicitudes para fusionar', 'Necesitas al menos una solicitud destino y una solicitud origen abiertas de la misma sucursal.');
      return;
    }

    const today = (typeof getTodayString === 'function') ? getTodayString() : '';
    const suggestedDestination = activeWarehouseRequest?.requestId
      || (requests.find(req => getRequestDateKey(req) === today && isMergeEligibleDestination(req))?.id)
      || (requests.find(isMergeEligibleDestination)?.id)
      || '';

    const result = await Swal.fire({
      title: 'Fusionar solicitudes',
      width: 980,
      html: buildMergeDialogHtml(requests, suggestedDestination),
      customClass: { popup: 'tr-modal tr-merge-modal' },
      showCancelButton: true,
      confirmButtonText: 'Fusionar seleccionadas',
      cancelButtonText: 'Cancelar',
      didOpen: (popup) => {
        const destinationSelect = popup.querySelector('#mergeDestinationRequest');
        const hint = popup.querySelector('#mergeSourceHint');
        const refreshRows = () => {
          const destId = String(destinationSelect?.value || '');
          const dest = requests.find(req => String(req.id || req.requestId || '') === destId);
          const destStore = String(dest?.storeKey || '');
          let visibleCount = 0;
          popup.querySelectorAll('.merge-source-row').forEach(row => {
            const rowId = String(row.getAttribute('data-request-id') || '');
            const rowStore = String(row.getAttribute('data-store-key') || '');
            const visible = rowId !== destId && (!destStore || rowStore === destStore);
            row.classList.toggle('d-none', !visible);
            const input = row.querySelector('input[name="mergeSources"]');
            if (input) {
              input.disabled = !visible;
              if (!visible) input.checked = false;
            }
            if (visible) visibleCount += 1;
          });
          if (hint) hint.textContent = visibleCount + ' disponible(s) para la misma sucursal';
        };
        destinationSelect?.addEventListener('change', refreshRows);
        refreshRows();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const destinationId = String(popup?.querySelector('#mergeDestinationRequest')?.value || '').trim();
        const sourceIds = Array.from(popup?.querySelectorAll('input[name="mergeSources"]:checked') || []).map(input => String(input.value || '').trim()).filter(Boolean);
        if (!destinationId) {
          Swal.showValidationMessage('Selecciona una solicitud destino.');
          return false;
        }
        if (!sourceIds.length) {
          Swal.showValidationMessage('Selecciona al menos una solicitud origen.');
          return false;
        }
        return { destinationId, sourceIds };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    const duplicateStrategy = await chooseDuplicateStrategyForRequests(result.value.destinationId, result.value.sourceIds, requests);
    if (!duplicateStrategy) return;

    await withLoading('Fusionando solicitudes...', async () => {
      const mergeResult = await mergeRequestsIntoDestination(result.value.destinationId, result.value.sourceIds, requests, { duplicateStrategy });
      if (activeWarehouseRequest?.requestId) {
        const refreshedActive = await loadRequestFromFirestore(activeWarehouseRequest.requestId);
        if (refreshedActive) {
          await openWarehouseRequest(refreshedActive);
        }
      }
      await refreshHistoryPicker();
      updateRequestFlowUI();

      if (mergeResult.noChanges) {
        await showScanToast('info', 'Sin cambios', 'No se incorporaron productos porque todos quedaron conservados en sus solicitudes origen.', { timeout: 5000 });
        return;
      }

      const resolutionParts = [];
      if (mergeResult.summedTotal) resolutionParts.push('Sumados: ' + mergeResult.summedTotal);
      if (mergeResult.keptSeparateTotal) resolutionParts.push('Separados: ' + mergeResult.keptSeparateTotal);
      if (mergeResult.skippedDuplicatesTotal) resolutionParts.push('Conservados en origen: ' + mergeResult.skippedDuplicatesTotal);
      if (mergeResult.partialSourceCount) resolutionParts.push('Origen parcial: ' + mergeResult.partialSourceCount);
      const resolutionText = resolutionParts.length ? ' · ' + resolutionParts.join(' · ') : '';
      const friendlyDestination = getFriendlyRequestCode({ requestId: mergeResult.destinationId, id: mergeResult.destinationId });
      await showScanToast('success', 'Solicitudes fusionadas', mergeResult.sourceCount + ' solicitud(es) incorporada(s) con ' + friendlyDestination + '. Items destino: ' + mergeResult.itemCount + resolutionText + '.', { timeout: 5600 });
    });
  }



  async function startBranchList() {
    if (!isBranchOperator()) return;
    if (!(await enforceCurrentStoreAccess('iniciar lista'))) return;

    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    if (isRequestSentStatus(status)) {
      await showScanToast('info', 'Solicitud ya enviada', 'Esta sucursal ya envió una solicitud hoy. Mañana podrás iniciar una nueva.');
      return;
    }
    if (isRequestDraftStatus(status)) return;

    const requestId = getCurrentRequestIdForToday();
    const now = new Date().toISOString();
    requestFlowState = {
      status: REQUEST_STATUSES.DRAFT,
      requestId,
      createdAt: now,
      submittedAt: null,
      itemCount: 0,
      record: { items: [] }
    };

    await persistCurrentChecklist({
      successTitle: 'Lista iniciada',
      successMessage: 'Ya puedes agregar productos. Puedes guardar durante el proceso.',
      showSuccess: true
    });
    updateRequestFlowUI();
  }


  async function confirmBranchRequestReceived(requestLike = null, options = {}) {
    if (!isBranchOperator()) return;
    const status = normalizeRequestStatus(requestLike?.status || requestFlowState?.status || REQUEST_STATUSES.NONE);
    const requestId = requestLike?.requestId || requestLike?.id || requestFlowState?.requestId;
    if (!isReceivableRequestStatus(status) || !requestId) {
      await showScanToast('info', 'No disponible', 'Solo puedes confirmar recibido cuando la solicitud esté despachada y, si aplica, la requisición ya esté hecha.');
      return;
    }
    if (!options?.skipPrompt) {
      const result = await Swal.fire({
        title: '¿Confirmar recibido?',
        html: '<div class="text-start small">La solicitud quedará marcada como <strong>Recibida</strong> por la sucursal.</div>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar recibido',
        cancelButtonText: 'Cancelar'
      });
      if (!result.isConfirmed) return;
    }
    const receivedAt = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.() || null;
    await updateRequestStatus(requestId, REQUEST_STATUSES.RECEIVED, {
      receivedAt,
      receivedByUid: user?.uid || null,
      receivedByEmail: user?.email || null
    });
    if (!requestFlowState?.requestId || requestFlowState.requestId === requestId) {
      requestFlowState = {
        ...(requestFlowState || {}),
        requestId,
        status: REQUEST_STATUSES.RECEIVED,
        receivedAt,
        receivedByUid: user?.uid || null,
        receivedByEmail: user?.email || null
      };
      updateRequestFlowUI();
    }
    showScanToast('success', 'Recibido confirmado', 'La solicitud quedó marcada como recibida.', { timeout: 3500 });
  }

  async function createWarehouseRequest() {
    if (!canUseWarehouseTools()) return;
    if (activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('crear una solicitud de bodega');
      if (!canLeave) return;
    }

    const defaultStore = (storeSelect?.value && storeSelect.value !== '__all__') ? storeSelect.value : '';
    const defaultVersion = 'traslado';
    const result = await Swal.fire({
      title: 'Crear solicitud de bodega',
      width: 620,
      html: `
        <div class="text-start small">
          <p class="text-muted mb-3">Usa esto para registrar despachos esporádicos que bodega prepara para una sucursal.</p>
          <label class="form-label fw-semibold" for="warehouseRequestStore">Sucursal destino</label>
          <select id="warehouseRequestStore" class="form-select mb-3">
            <option value="">Selecciona una sucursal</option>
            ${buildStoreOptionsHtml(defaultStore)}
          </select>
          <label class="form-label fw-semibold" for="warehouseRequestVersion">Lista</label>
          <select id="warehouseRequestVersion" class="form-select" disabled>
            ${buildVersionOptionsHtml(defaultVersion, { includeProtected: true, onlyProtected: true })}
          </select>
          <div class="form-text">Las solicitudes creadas por bodega se registran como <strong>Traslado</strong> y comienzan vacías.</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Crear y abrir',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const popup = Swal.getPopup();
        const selectedStore = String(popup?.querySelector('#warehouseRequestStore')?.value || '').trim();
        const selectedVersion = 'traslado';
        if (!selectedStore) {
          Swal.showValidationMessage('Selecciona la sucursal destino.');
          return false;
        }
        return { storeKey: selectedStore, versionKey: 'traslado' };
      }
    });
    if (!result.isConfirmed || !result.value) return;

    await withLoading('Creando solicitud de bodega...', async () => {
      const now = new Date().toISOString();
      const day = getTodayString();
      const { storeKey, versionKey } = result.value;
      const previousStore = storeSelect?.value || '';
      const previousVersion = versionSelect?.value || '';
      if (storeSelect) storeSelect.value = storeKey;
      if (versionSelect) versionSelect.value = versionKey;
      const requestId = buildWarehouseCreatedRequestId(storeKey, versionKey, day);
      const payload = {
        requestId,
        storeKey,
        storeName: storeSelect?.options?.[storeSelect.selectedIndex]?.text || getStoreLabel(storeKey),
        destinationStoreKey: storeKey,
        destinationStoreName: storeSelect?.options?.[storeSelect.selectedIndex]?.text || getStoreLabel(storeKey),
        versionKey,
        versionLabel: getVersionLabel(versionKey),
        requestDate: day,
        status: REQUEST_STATUSES.REVIEW,
        origin: 'warehouse',
        createdAt: now,
        submittedAt: now,
        reviewStartedAt: now,
        reviewStartedByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
        itemCount: 0,
        items: [],
        createdByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
        createdByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
        createdByRole: currentUserRole
      };
      await saveRequestToFirestore(requestId, payload);
      await openWarehouseRequest({ id: requestId, ...payload });
      // openWarehouseRequest deja seleccionada la sucursal destino. No restaurar filtros aquí.
      if (!activeWarehouseRequest?.requestId) {
        if (storeSelect) storeSelect.value = previousStore;
        if (versionSelect) versionSelect.value = previousVersion;
      }
    });
    showScanToast('success', 'Solicitud de bodega creada', 'Agrega los productos, marca los despachados y luego finaliza el despacho.', { timeout: 4500 });
  }

  async function sendWarehousePushNotification(requestPayload) {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch('/api/send-warehouse-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({
          requestId: requestPayload.requestId,
          requestCode: getFriendlyRequestCode(requestPayload),
          storeKey: requestPayload.storeKey,
          storeName: requestPayload.storeName,
          itemCount: requestPayload.itemCount,
          status: requestPayload.status || REQUEST_STATUSES.SENT
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Push bodega no enviado:', data.error || response.statusText);
      }
    } catch (err) {
      console.warn('No se pudo disparar push a bodega:', err);
    }
  }

  async function submitBranchRequest() {
    if (!isBranchOperator()) return;
    if (!(await enforceCurrentStoreAccess('enviar solicitud'))) return;

    if (!isRequestDraftStatus(requestFlowState?.status)) {
      await showScanToast('info', 'Lista no disponible', 'Primero debes iniciar una lista para poder enviarla.');
      return;
    }

    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    if (!items.length) {
      await showScanToast('info', 'Lista vacía', 'Agrega al menos un producto antes de finalizar y enviar.');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Finalizar y enviar?',
      html: '<div class="text-start small">Se enviará esta lista a bodega y la sucursal ya no podrá editarla hoy.<br><br><strong>Items:</strong> ' + items.length + '</div>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar a bodega',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;
    cancelPendingAutoSave();

    await withLoading('Enviando solicitud a bodega...', async () => {
      const now = new Date().toISOString();
      const targetDay = getTargetChecklistDate();
      const requestId = requestFlowState?.requestId || getCurrentRequestIdForToday();
      const docId = getDocIdForCurrentList();
      const payload = collectPayload({
        requestStatus: 'enviado',
        requestId,
        requestCreatedAt: requestFlowState?.createdAt || now,
        requestSubmittedAt: now
      });

      const requestPayload = {
        requestId,
        storeKey: storeSelect.value,
        storeName: storeSelect.options[storeSelect.selectedIndex]?.text || getStoreLabel(storeSelect.value),
        versionKey: versionSelect.value,
        versionLabel: getVersionLabel(versionSelect.value),
        requestDate: targetDay,
        status: 'enviado',
        createdAt: requestFlowState?.createdAt || now,
        submittedAt: now,
        itemCount: items.length,
        items,
        sourceDocId: docId,
        createdByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
        createdByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
      };

      await saveRequestToFirestore(requestId, requestPayload);
      await sendWarehousePushNotification(requestPayload);
      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);
      requestFlowState = buildRequestSummaryFromRecord(payload);
      updateLastSavedText(payload.meta?.updatedAt || null);
      await refreshHistoryPicker();
      setHistoricalViewMode(false);
      updateRequestFlowUI();
    });

    await showScanToast('success', 'Solicitud enviada', 'La lista quedó enviada a bodega y bloqueada para la sucursal.');
  }

  if (btnStartList) {
    btnStartList.addEventListener('click', async () => {
      try { await startBranchList(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnSubmitRequest) {
    btnSubmitRequest.addEventListener('click', async () => {
      try { await submitBranchRequest(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnConfirmRequestReceived) {
    btnConfirmRequestReceived.addEventListener('click', async () => {
      try { await confirmBranchRequestReceived(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnViewCurrentRequest) {
    btnViewCurrentRequest.addEventListener('click', async () => {
      await showRequestDetail(requestFlowState);
    });
  }

  if (btnViewRequestHistory) {
    btnViewRequestHistory.addEventListener('click', async () => {
      try { await openRequestsList({ title: 'Mis solicitudes' }); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  const handleWarehouseNotificationClick = async () => {
    try { await requestWarehouseBrowserNotifications(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
  };

  if (btnWarehouseNotifications) {
    btnWarehouseNotifications.addEventListener('click', handleWarehouseNotificationClick);
  }

  if (btnAuthWarehouseNotifications) {
    btnAuthWarehouseNotifications.addEventListener('click', handleWarehouseNotificationClick);
  }

  if (btnCreateWarehouseRequest) {
    btnCreateWarehouseRequest.addEventListener('click', async () => {
      try { await createWarehouseRequest(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnWarehouseInbox) {
    btnWarehouseInbox.addEventListener('click', async () => {
      try { await openRequestsList({ title: 'Solicitudes recibidas' }); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnCloseWarehouseRequest) {
    btnCloseWarehouseRequest.addEventListener('click', async () => {
      try { await closeWarehouseRequest(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnMarkRequestDispatched) {
    btnMarkRequestDispatched.addEventListener('click', async () => {
      try { await markActiveRequestDispatched(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }


  if (btnRequisitionsByDay) {
    btnRequisitionsByDay.addEventListener('click', async () => {
      try { await openRequisitionsByDay(); } catch (err) { console.error(err); await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnExportPendingRequisitions) {
    btnExportPendingRequisitions.addEventListener('click', async () => {
      try { await exportAllPendingRequisitions(); } catch (err) { console.error(err); await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnConsolidatePendingRequisitions) {
    btnConsolidatePendingRequisitions.addEventListener('click', async () => {
      try { await consolidatePendingRequisitionsByBranch(); } catch (err) { console.error(err); await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnCancelWarehouseRequest) {
    btnCancelWarehouseRequest.addEventListener('click', async () => {
      try { await cancelActiveWarehouseRequest(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  if (btnMergeWarehouseRequests) {
    btnMergeWarehouseRequests.addEventListener('click', async () => {
      try { await openMergeRequestsDialog(); } catch (err) { await showScanToast('error', 'Error', String(err?.message || err)); }
    });
  }

  // ===== Carga inicial (hoy) =====
  async function loadStoreStateForToday(options = {}) {
    const { withLoader = false } = options || {};

    const run = async () => {
      if (requiresWarehouseRequestContext() && !options.allowWarehouseLegacyLoad) {
        prepareWarehouseWorkspace();
        return;
      }

      if (!(await enforceCurrentStoreAccess('cargar información'))) return;

      if (mediaStream) {
        await stopScanner();
      }
      resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
      clearHistoricalSelection();
      clearBulkSelection();
      body.innerHTML = '';

      activeWarehouseRequest = null;
      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId); // hoy
      applyChecklistMeta(record?.meta || {});
      requestFlowState = buildRequestSummaryFromRecord(record || {});

      if (isBranchOperator() && !isRequestDraftStatus(requestFlowState.status)) {
        try {
          const todayRequestId = requestFlowState?.requestId || getCurrentRequestIdForToday();
          const todayRequest = todayRequestId ? await loadRequestFromFirestore(todayRequestId) : null;
          if (todayRequest) {
            requestFlowState = {
              status: todayRequest.status || requestFlowState.status || 'enviado',
              requestId: todayRequest.id || todayRequest.requestId || todayRequestId,
              createdAt: todayRequest.createdAt || requestFlowState.createdAt || null,
              submittedAt: todayRequest.submittedAt || requestFlowState.submittedAt || null,
              dispatchedAt: todayRequest.dispatchedAt || null,
              receivedAt: todayRequest.receivedAt || null,
              cancelledAt: todayRequest.cancelledAt || null,
              mergedAt: todayRequest.mergedAt || null,
              mergedIntoRequestId: todayRequest.mergedIntoRequestId || null,
              itemCount: Number(todayRequest.itemCount || requestFlowState.itemCount || (Array.isArray(todayRequest.items) ? todayRequest.items.length : 0)),
              record: { items: Array.isArray(todayRequest.items) ? todayRequest.items : [] }
            };
          }
        } catch (requestLoadError) {
          console.warn('No se pudo validar solicitud del día:', requestLoadError);
        }
      }

      if (record && Array.isArray(record.items)) {
        renderChecklistItems(record.items);
        lastUpdateISO = record.meta?.updatedAt || null;
      } else {
        lastUpdateISO = null;
      }

      lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
      updateBulkSelectionUI();
      updateRequisitionUI();
      updateRequestFlowUI();
    };

    if (withLoader) {
      return withLoading('Cargando checklist actual...', run);
    }

    return run();
  }

  async function openWarehouseRequestFromUrlParam() {
    if (!canUseWarehouseTools()) return;
    try {
      const params = new URLSearchParams(window.location.search || '');
      const requestId = String(params.get('requestId') || '').trim();
      if (!requestId) return;
      const req = await loadRequestFromFirestore(requestId);
      if (req) await openWarehouseRequest(req);
      params.delete('requestId');
      const nextQuery = params.toString();
      const nextUrl = window.location.pathname + (nextQuery ? '?' + nextQuery : '') + (window.location.hash || '');
      window.history.replaceState({}, document.title, nextUrl);
    } catch (err) {
      console.warn('No se pudo abrir solicitud desde URL:', err);
    }
  }

  await withLoading('Cargando checklist...', async () => {
    const initialCatalogRows = await preloadCatalog();
    ensureCatalogSearchIndex(initialCatalogRows);

    resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
    ensureWarehouseFilterOption();
    if (requiresWarehouseRequestContext()) {
      prepareWarehouseWorkspace();
      await refreshHistoryPicker();
    } else {
      await loadStoreStateForToday();
      setHistoricalViewMode(false);
      await refreshHistoryPicker();
    }
    applyRolePermissions();
    updateWarehouseNotificationButton();
    startWarehouseInboxNotifications();
    if (canUseWarehouseTools() && getBrowserNotificationPermission() === 'granted') {
      registerWarehouseFcmToken({ silent: true }).catch(err => console.warn('No se pudo registrar FCM automáticamente:', err));
    }
    await openWarehouseRequestFromUrlParam();
  });

  // Store/version change: vuelve a hoy y refresca calendario para el docId nuevo
  storeSelect.addEventListener('change', async () => {
    if (replenishmentStatus) replenishmentStatus.textContent = 'Consulta los sugeridos de la sucursal seleccionada.';
    closeMoreActionsMenu();
    closeMobileFab();
    const requestedStoreValue = storeSelect.value;
    const previousStoreValue = activeWarehouseRequest?.storeKey || '';

    if (!(await enforceCurrentStoreAccess('cambiar de sucursal'))) {
      return;
    }

    if (requiresWarehouseRequestContext() && activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cambiar el filtro de tienda');
      if (!canLeave) {
        if (previousStoreValue && Array.from(storeSelect.options).some(option => option.value === previousStoreValue)) {
          storeSelect.value = previousStoreValue;
        }
        return;
      }
      storeSelect.value = requestedStoreValue;
    }

    await withLoading('Cambiando tienda...', async () => {
      if (mediaStream) {
        await stopScanner();
      }
      updateStoreUI();
      currentViewDate = null;
      resetHistoricalUnlock();
      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';

      if (requiresWarehouseRequestContext()) {
        prepareWarehouseWorkspace();
        await refreshHistoryPicker();
      } else {
        await loadStoreStateForToday();
        setHistoricalViewMode(false);
        await refreshHistoryPicker();
      }
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

    if (isProtectedRequest && requestedVersion !== previousVersion && !(requiresWarehouseRequestContext() && !activeWarehouseRequest?.requestId)) {
      if (!canUseProtectedLists()) {
        await showRoleDeniedAlert('abrir la lista protegida', 'bodega o administradores');
        versionSelect.value = previousVersion;
        return;
      }

      const hasProtectedAccess = await ensureProtectedDestinationAccess(
        requestedVersion,
        'abrir esta lista protegida'
      );

      if (!hasProtectedAccess) {
        versionSelect.value = previousVersion;
        return;
      }
    }

    if (requiresWarehouseRequestContext() && activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cambiar de lista');
      if (!canLeave) {
        versionSelect.value = previousVersion;
        return;
      }
    }

    await withLoading(requiresWarehouseRequestContext() ? 'Aplicando filtro...' : 'Cargando lista...', async () => {
      if (mediaStream) {
        await stopScanner();
      }
      currentViewDate = null;
      historicalUnlockEnabled = false;
      protectedVersionUnlockEnabled = !!isProtectedRequest;

      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';

      if (requiresWarehouseRequestContext()) {
        prepareWarehouseWorkspace();
        await refreshHistoryPicker();
      } else {
        await loadStoreStateForToday();
        setHistoricalViewMode(false);
        await refreshHistoryPicker();
      }
      lastCommittedVersionValue = versionSelect.value;
    });
  });
});
