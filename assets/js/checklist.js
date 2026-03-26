document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    storeSelect: $('storeSelect'),
    versionSelect: $('versionSelect'),
    storeBadge: $('storeBadge'),
    storeBadgeText: $('storeBadgeText'),
    lastSaved: $('lastSaved'),
    body: $('chkBody'),
    searchInput: $('searchInput'),
    suggestions: $('suggestions'),
    btnSave: $('btnSave'),
    btnExcel: $('btnExcel'),
    btnPDF: $('btnPDF'),
    btnClear: $('btnClear'),
    thBodega: $('thBodega'),
    histDateInput: $('histDateInput'),
    btnHistToday: $('btnHistToday'),
    btnToggleHistLock: $('btnToggleHistLock'),
    btnHistCalendar: $('btnHistCalendar'),
    histCalendarPanel: $('histCalendarPanel'),
    btnScan: $('btnScan'),
    scanWrap: $('scanWrap'),
    scanVideo: $('scanVideo'),
    btnFilePick: $('btnFilePick'),
    fileScan: $('fileScan'),
    histViewModeText: $('histViewModeText')
  };

  const {
    storeSelect,
    versionSelect,
    storeBadge,
    storeBadgeText,
    lastSaved,
    body,
    searchInput,
    suggestions,
    btnSave,
    btnExcel,
    btnPDF,
    btnClear,
    thBodega,
    histDateInput,
    btnHistToday,
    btnToggleHistLock,
    btnHistCalendar,
    histCalendarPanel,
    btnScan,
    scanWrap,
    scanVideo,
    btnFilePick,
    fileScan,
    histViewModeText
  } = elements;

  const appState = (window.TRListaModules && typeof window.TRListaModules.createAppState === 'function')
    ? window.TRListaModules.createAppState()
    : {
        ui: { sortAsc: true, lastUpdateISO: null },
        scanner: { mediaStream: null, scanInterval: null, detector: null },
        history: { picker: null, currentViewDate: null, availableDates: new Set(), unlockEnabled: false }
      };

  const services = (window.TRListaModules && typeof window.TRListaModules.createAppServices === 'function')
    ? window.TRListaModules.createAppServices()
    : null;

  if (!services) {
    throw new Error('No se pudieron inicializar los servicios de la aplicación.');
  }

  const historyTools = (window.TRListaModules && typeof window.TRListaModules.createHistoryTools === 'function')
    ? window.TRListaModules.createHistoryTools()
    : null;

  const storeUI = window.TRListaModules?.createStoreUI
    ? window.TRListaModules.createStoreUI({ storeSelect, storeBadge, storeBadgeText })
    : null;

  let scannerModule = null;
  let exportModule = null;
  let checklistTable = null;
  let productSearch = null;

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

  function getDocIdForCurrentList() {
    return services.getBinId(storeSelect.value, versionSelect.value);
  }

  function getVersionLabel(versionKey) {
    return services.getListLabel(versionKey);
  }

  function getTargetChecklistDate() {
    return appState.history.currentViewDate || services.getTodayString();
  }

  function isHistoricalDateSelected() {
    const today = services.getTodayString();
    return !!(appState.history.currentViewDate && appState.history.currentViewDate !== today);
  }

  function isPastHistoricalDateSelected() {
    const today = services.getTodayString();
    return !!(appState.history.currentViewDate && appState.history.currentViewDate < today);
  }

  function isHistoricalEditingLocked() {
    return isHistoricalDateSelected() && !appState.history.unlockEnabled;
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
      btnToggleHistLock.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-1"></i> Desbloquear';
      return;
    }

    if (appState.history.unlockEnabled) {
      btnToggleHistLock.classList.add('btn-outline-success');
      btnToggleHistLock.innerHTML = '<i class="fa-solid fa-lock me-1"></i> Bloquear';
      return;
    }

    btnToggleHistLock.classList.add('btn-outline-warning');
    btnToggleHistLock.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-1"></i> Desbloquear';
  }

  function setHistoricalViewMode(isHistorical) {
    const labelDate = appState.history.currentViewDate || '';
    const disableEditing = isHistorical && !appState.history.unlockEnabled;

    if (histViewModeText) {
      histViewModeText.classList.remove('text-muted', 'text-primary', 'text-success');

      if (isHistorical) {
        if (appState.history.unlockEnabled) {
          histViewModeText.textContent = labelDate
            ? ('Modo histórico (' + labelDate + '): edición habilitada temporalmente.')
            : 'Modo histórico: edición habilitada temporalmente.';
          histViewModeText.classList.add('text-success');
        } else {
          histViewModeText.textContent = labelDate
            ? ('Modo histórico (' + labelDate + '): solo lectura.')
            : 'Modo histórico: solo lectura.';
          histViewModeText.classList.add('text-primary');
        }
      } else {
        histViewModeText.textContent = 'Modo: checklist del día actual (editable).';
        histViewModeText.classList.add('text-muted');
      }
    }

    if (searchInput) searchInput.disabled = disableEditing;
    if (btnScan) btnScan.disabled = disableEditing;
    if (btnFilePick) btnFilePick.disabled = disableEditing;
    if (fileScan) fileScan.disabled = disableEditing;
    if (btnSave) btnSave.disabled = disableEditing;
    if (btnClear) btnClear.disabled = disableEditing;

    if (disableEditing && appState.scanner.mediaStream && scannerModule && typeof scannerModule.stop === 'function') {
      scannerModule.stop();
    }

    if (checklistTable && typeof checklistTable.setRowsDisabled === 'function') {
      checklistTable.setRowsDisabled(disableEditing);
    }

    updateHistoricalLockUI();
  }

  function resetHistoricalUnlock() {
    appState.history.unlockEnabled = false;
    updateHistoricalLockUI();
  }

  function resetHistoricalSelectionUI() {
    if (appState.history.picker) {
      try {
        appState.history.picker.clear();
        return;
      } catch (_) {}
    }

    if (histDateInput) {
      histDateInput.value = '';
    }
  }

  async function loadCurrentChecklistRecord(dateStr) {
    const docId = getDocIdForCurrentList();
    return services.loadChecklistFromFirestore(docId, dateStr);
  }

  async function applyChecklistRecord(record, emptyText = 'Aún no guardado.') {
    if (record && Array.isArray(record.items)) {
      checklistTable.renderRows(record.items);
      checklistTable.updateLastSavedText(record.meta?.updatedAt || null, emptyText);
      return;
    }

    checklistTable.clearRows();
    checklistTable.updateLastSavedText(null, emptyText);
  }

  async function refreshHistoryPicker() {
    if (!histDateInput || typeof services.getHistoryDates !== 'function') return;

    const docId = getDocIdForCurrentList();
    const cachedDates = historyTools?.readHistoryDatesCache
      ? historyTools.readHistoryDatesCache(docId)
      : [];

    appState.history.availableDates = new Set(cachedDates);

    if (!appState.history.picker && window.TRListaModules?.createHistoryPicker) {
      appState.history.picker = window.TRListaModules.createHistoryPicker({
        elements: {
          histDateInput,
          histCalendarPanel,
          btnHistCalendar,
          btnHistToday
        },
        getCurrentViewDate: () => appState.history.currentViewDate,
        getHistoryDatesSet: () => appState.history.availableDates,
        onDateSelected: (isoDate) => loadHistoryForDate(isoDate)
      });
    } else if (typeof appState.history.picker?.syncFromCurrentView === 'function') {
      appState.history.picker.syncFromCurrentView();
    } else if (typeof appState.history.picker?.redraw === 'function') {
      appState.history.picker.redraw();
    }

    try {
      const fetchedDates = await services.getHistoryDates(docId);
      const uniqueDates = Array.from(new Set((fetchedDates || []).filter(Boolean)));
      appState.history.availableDates = new Set(uniqueDates);

      if (historyTools?.writeHistoryDatesCache) {
        historyTools.writeHistoryDatesCache(docId, uniqueDates);
      }
    } catch (e) {
      console.error('Error al obtener fechas de historial:', e);
    }

    if (typeof appState.history.picker?.redraw === 'function') {
      appState.history.picker.redraw();
    }
  }

  async function loadStoreStateForToday() {
    const record = await loadCurrentChecklistRecord();
    await applyChecklistRecord(record);
  }

  async function switchToTodayView(options = {}) {
    const {
      refreshPicker = false,
      focusSearch = false
    } = options || {};

    appState.history.currentViewDate = null;
    resetHistoricalUnlock();
    resetHistoricalSelectionUI();

    await loadStoreStateForToday();
    setHistoricalViewMode(false);

    if (refreshPicker) {
      await refreshHistoryPicker();
    }

    if (focusSearch && productSearch) {
      productSearch.focus();
    }
  }

  async function loadHistoryForDate(dateStr) {
    if (!dateStr) return;

    try {
      const today = services.getTodayString();

      if (dateStr === today) {
        await switchToTodayView();
        return;
      }

      appState.history.currentViewDate = dateStr;
      resetHistoricalUnlock();

      const record = await loadCurrentChecklistRecord(dateStr);

      if (record && Array.isArray(record.items) && record.items.length) {
        await applyChecklistRecord(record);
      } else {
        checklistTable.clearRows();
        checklistTable.updateLastSavedText(null, 'Sin guardado para esa fecha.');
        await Swal.fire('Sin datos', 'No hay checklist guardado para esa fecha.', 'info');
      }

      setHistoricalViewMode(true);
    } catch (e) {
      console.error('Error al cargar histórico:', e);
      await Swal.fire('Error', 'No se pudo cargar el histórico para esa fecha.', 'error');
    }
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
        'Estás viendo el checklist del ' + appState.history.currentViewDate + '. Desbloquea los controles o vuelve a hoy para guardar cambios.',
        'info'
      );
      return { ok: false, reason: 'locked' };
    }

    const docId = getDocIdForCurrentList();
    const targetDay = getTargetChecklistDate();
    const payload = checklistTable.collectPayload();

    await services.saveChecklistToFirestore(docId, payload, targetDay);

    if (historyTools?.rememberHistoryDate) {
      historyTools.rememberHistoryDate(docId, targetDay);
    }

    checklistTable.updateLastSavedText(payload.meta?.updatedAt || null);
    await refreshHistoryPicker();

    if (showSuccess) {
      await Swal.fire(successTitle, successMessage, successIcon);
    }

    return { ok: true, docId, payload, targetDay };
  }

  async function clearChecklistPersisted() {
    if (isHistoricalEditingLocked()) {
      await Swal.fire(
        'Vista histórica',
        'Para limpiar esta fecha, primero desbloquea los controles o vuelve al día actual.',
        'info'
      );
      return;
    }

    if (!checklistTable || checklistTable.getRowCount() === 0) return;

    const res = await Swal.fire({
      title: '¿Limpiar checklist?',
      text: 'Se eliminarán todos los items en pantalla y se guardará la fecha seleccionada vacía.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Limpiar'
    });

    if (!res.isConfirmed) return;

    checklistTable.clearRows();

    const docId = getDocIdForCurrentList();
    const targetDay = getTargetChecklistDate();
    const payload = checklistTable.collectPayload();

    await services.saveChecklistToFirestore(docId, payload, targetDay);

    if (historyTools?.rememberHistoryDate) {
      historyTools.rememberHistoryDate(docId, targetDay);
    }

    checklistTable.updateLastSavedText(payload.meta?.updatedAt || null);
    await refreshHistoryPicker();

    await Swal.fire('Listo', 'Checklist guardado vacío correctamente.', 'success');
  }

  async function reloadCurrentListContext(options = {}) {
    const {
      refreshPicker = true,
      refreshStoreUI = false
    } = options || {};

    if (refreshStoreUI && storeUI) {
      storeUI.update();
    }

    await switchToTodayView({ refreshPicker });
  }

  storeUI?.update();
  await services.preloadCatalog();

  checklistTable = window.TRListaModules?.createChecklistTable
    ? window.TRListaModules.createChecklistTable({
        body,
        searchInput,
        lastSaved,
        storeSelect,
        versionSelect,
        uiState: appState.ui,
        services,
        getTargetChecklistDate,
        getVersionLabel,
        isHistoricalEditingLocked,
        persistCurrentChecklist,
        refreshHistoryPicker
      })
    : null;

  if (!checklistTable) {
    throw new Error('No se pudo inicializar el módulo de tabla del checklist.');
  }

  productSearch = window.TRListaModules?.createProductSearch
    ? window.TRListaModules.createProductSearch({
        searchInput,
        suggestions,
        loadProducts: () => services.loadProductsFromGoogleSheets(),
        onItemSelected: async (item) => {
          await checklistTable.handleProductSelection(item);
          if (productSearch && typeof productSearch.clear === 'function') {
            productSearch.clear();
          }
        },
        buildItemFromCatalogRow: checklistTable.buildItemFromCatalogRow
      })
    : null;

  exportModule = window.TRListaModules?.createChecklistExportModule
    ? window.TRListaModules.createChecklistExportModule({
        body,
        storeSelect,
        getLastUpdateISO: () => appState.ui.lastUpdateISO,
        getCurrentViewDate: () => appState.history.currentViewDate,
        formatSV: services.formatSV
      })
    : null;

  scannerModule = window.TRListaModules?.createScannerModule
    ? window.TRListaModules.createScannerModule({
        elements: {
          btnScan,
          scanWrap,
          scanVideo,
          btnFilePick,
          fileScan
        },
        state: appState.scanner,
        onCodeDetected: async (code) => {
          searchInput.value = code;
          const e = new KeyboardEvent('keydown', { key: 'Enter' });
          searchInput.dispatchEvent(e);
        }
      })
    : null;

  if (scannerModule?.init) {
    scannerModule.init();
  }

  thBodega?.addEventListener('click', () => {
    checklistTable.sortByBodega();
  });

  btnSave?.addEventListener('click', async () => {
    try {
      await persistCurrentChecklist();
    } catch (e) {
      await Swal.fire('Error', String(e), 'error');
    }
  });

  btnClear?.addEventListener('click', async () => {
    await clearChecklistPersisted();
  });

  btnPDF?.addEventListener('click', async () => {
    await exportModule?.handlePdfExport?.();
  });

  btnExcel?.addEventListener('click', async () => {
    await exportModule?.handleExcelExport?.();
  });

  btnHistToday?.addEventListener('click', async () => {
    await switchToTodayView({ focusSearch: true });
  });

  btnToggleHistLock?.addEventListener('click', async () => {
    if (!isHistoricalDateSelected()) {
      await Swal.fire(
        'No aplica',
        'Este botón solo se usa cuando estás viendo una fecha anterior.',
        'info'
      );
      return;
    }

    if (appState.history.unlockEnabled) {
      appState.history.unlockEnabled = false;
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
          const ok = await services.validateHistoricalPassword(password);
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
      appState.history.unlockEnabled = true;
      setHistoricalViewMode(true);

      await Swal.fire(
        'Desbloqueado',
        'Ya puedes editar la lista histórica hasta que vuelvas a bloquearla.',
        'success'
      );
    }
  });

  storeSelect.addEventListener('change', async () => {
    await reloadCurrentListContext({
      refreshPicker: true,
      refreshStoreUI: true
    });
  });

  versionSelect.addEventListener('change', async () => {
    await reloadCurrentListContext({ refreshPicker: true });
  });

  await loadStoreStateForToday();
  setHistoricalViewMode(false);
  await refreshHistoryPicker();
  productSearch?.focus();
});
