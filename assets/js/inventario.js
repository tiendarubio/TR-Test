// assets/js/inventario.js
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  function getWizardConfig() {
    try { return JSON.parse(localStorage.getItem('TR_AVM_WIZARD_CONFIG') || '{}') || {}; }
    catch (_) { return {}; }
  }

  // =========================
  // Elementos principales (DECLARAR ANTES DE USAR)
  // =========================
  const body           = $('recepcionBody');
  const proveedorInput = $('proveedorInput');
  const ubicacionInput = $('ubicacionInput');
  const ubicacionLockHint = $('ubicacionLockHint');

  const btnSave        = $('saveReception');
  const btnPDF         = $('exportPDF');
  const btnPrint       = $('printPDF');
  const btnExcel       = $('exportExcel');
  const btnClear       = $('clearReception');

  const inventarioSelect = $('inventarioSelect');
  const searchInput   = $('searchInput');
  const btnScan       = $('btnScan');
  const scanWrap      = $('scanWrap');
  const scanVideo     = $('scanVideo');
  const btnScanStop   = $('btnScanStop');
  const fileScan      = $('fileScan');

  const suggestions   = $('suggestions');
  const provSuggestions = $('provSuggestions');

  // Modal manual
  const mCodigo       = $('mCodigo');
  const mNombre       = $('mNombre');
  const mCodInv       = $('mCodInv');
  const mBodega       = $('mBodega');
  const mVencimiento  = $('mVencimiento');
  const mCantidad     = $('mCantidad');
  const manualModalEl = document.getElementById('manualModal');
  const manualModal   = new bootstrap.Modal(manualModalEl);

  // En algunos móviles el foco se "pierde" al abrir el modal; lo forzamos cuando ya está visible.
  if (manualModalEl) {
    manualModalEl.addEventListener('shown.bs.modal', () => {
      const tryFocus = () => {
        if (!mCodigo) return;
        try { mCodigo.focus({ preventScroll: true }); } catch (_) { mCodigo.focus(); }
      };
      requestAnimationFrame(() => requestAnimationFrame(tryFocus));
      setTimeout(tryFocus, 80);
    });
  }

  // Wizard modal
  const wizardModalEl = document.getElementById('wizardModal');
  const wizProveedor = $('wizProveedor');
  const wizProvSuggestions = $('wizProvSuggestions');
  let wizProvFocus = -1;

  function bindWizardProveedorAutocomplete() {
    if (!wizProveedor || !wizProvSuggestions) return;

    wizProveedor.addEventListener('input', () => {
      const q = (wizProveedor.value || '').trim().toLowerCase();
      wizProvSuggestions.innerHTML = '';
      wizProvFocus = -1;
      if (!q) return;

      loadProvidersFromGoogleSheets().then(list => {
        (list || [])
          .filter(p => p.toLowerCase().includes(q))
          .slice(0, 50)
          .forEach(name => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = name;
            li.addEventListener('click', () => {
              wizProveedor.value = name;
              wizProvSuggestions.innerHTML = '';
            });
            wizProvSuggestions.appendChild(li);
          });

        if (!wizProvSuggestions.children.length) {
          const li = document.createElement('li');
          li.className = 'list-group-item list-group-item-light no-results';
          li.textContent = 'Sin resultados. Escriba el nombre completo del proveedor.';
          wizProvSuggestions.appendChild(li);
        }
      }).catch(() => {});
    });

    wizProveedor.addEventListener('keydown', (e) => {
      const items = wizProvSuggestions.getElementsByTagName('li');
      if (e.key === 'ArrowDown') { wizProvFocus++; addActiveWizardProv(items); }
      else if (e.key === 'ArrowUp') { wizProvFocus--; addActiveWizardProv(items); }
      else if (e.key === 'Enter') {
        if (wizProvFocus > -1 && items[wizProvFocus]) {
          e.preventDefault();
          items[wizProvFocus].click();
        }
      }
    });

    function addActiveWizardProv(items) {
      if (!items || !items.length) return;
      [...items].forEach(x => x.classList.remove('active'));
      if (wizProvFocus >= items.length) wizProvFocus = 0;
      if (wizProvFocus < 0) wizProvFocus = items.length - 1;
      items[wizProvFocus].classList.add('active');
      items[wizProvFocus].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t === wizProveedor || wizProvSuggestions.contains(t)) return;
      wizProvSuggestions.innerHTML = '';
      wizProvFocus = -1;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        wizProvSuggestions.innerHTML = '';
        wizProvFocus = -1;
      }
    });
  }


  const wizardModal   = new bootstrap.Modal(wizardModalEl, { backdrop: 'static', keyboard: false });

  const wizTipo = $('wizTipo');
  const wizUbicacion = $('wizUbicacion');
  const wizDependiente = $('wizDependiente');
  const wizSala = $('wizSala');
  const wizEstante = $('wizEstante');

  const wizAlmacenWrap = $('wizAlmacenWrap');
  const wizDependienteWrap = $('wizDependienteWrap');
  const wizSalaWrap = $('wizSalaWrap');
  const wizEstanteWrap = $('wizEstanteWrap');

  const wizStartBtn = $('wizStartBtn');
  const wizStatus = $('wizStatus');

  // Fecha UI
  const fechaEl = $('fechaInventario');
  if (fechaEl) {
    fechaEl.textContent = 'Fecha de inventario: ' + new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
  }

  // =========================
  // Config / bins
  // =========================
  const INVENTARIO_BINS = {
    inventario1: '692091aa43b1c97be9bc18dd',
    inventario2: '692091efd0ea881f40f71767',
    inventario3: '69209205ae596e708f67d3f6',
    inventario4: '6920921ed0ea881f40f717a1',
    inventario5: '69209234ae596e708f67d43d',
    inventario6: '6920924f43b1c97be9bc19f8',
    inventario7: '6920927143b1c97be9bc1a36',
    inventario8: '692092d9ae596e708f67d551',
    inventario9: '6920930243b1c97be9bc1b38',
    inventario10:'69209315ae596e708f67d5da'
  };

  let CURRENT_INVENTARIO = localStorage.getItem('TR_AVM_CURRENT_INVENTARIO') || 'inventario1';
  if (inventarioSelect) inventarioSelect.value = CURRENT_INVENTARIO;

  function getCurrentDocId() {
    return INVENTARIO_BINS[CURRENT_INVENTARIO];
  }

  // =========================
  // Wizard (tipo inventario)
  // =========================
  const WIZ_KEY_PREFIX = 'TR_AVM_WIZ_DONE_';
  const WIZ_CFG_KEY    = 'TR_AVM_WIZARD_CONFIG';

  function getToday() {
    return (typeof getTodayString === 'function') ? getTodayString() : new Date().toISOString().split('T')[0];
  }

  function wizardDoneKey() {
    return `${WIZ_KEY_PREFIX}${getCurrentDocId()}_${getToday()}`;
  }

  function setControlsEnabled(enabled) {
    const dis = !enabled;
    const disable = (el) => { if (el) el.disabled = dis; };
    disable(btnSave); disable(btnClear);
    disable(proveedorInput); disable(ubicacionInput);
    disable(searchInput); disable(btnScan);
    const btnOpenManual = document.getElementById('btnOpenManual');
    disable(btnOpenManual);
  }

  function lockUbicacion(lock, value) {
    if (!ubicacionInput) return;
    const isLock = !!lock;
    ubicacionInput.disabled = isLock;
    if (isLock) ubicacionInput.dataset.locked = '1';
    else delete ubicacionInput.dataset.locked;
    if (typeof value === 'string') ubicacionInput.value = value;
    if (ubicacionLockHint) ubicacionLockHint.classList.toggle('d-none', !isLock);
  }

  function fillSelect(selectEl, values, placeholder='Selecciona...') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);
    (values || []).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  let ESTANTES_DATA = {};
  async function initWizardData() {
    wizStatus.textContent = 'Cargando listas...';
    ESTANTES_DATA = await (typeof preloadEstantes === 'function' ? preloadEstantes() : Promise.resolve({})) || {};
    const tipos = (ESTANTES_DATA.tipos || []).filter(Boolean);
    fillSelect(wizTipo, tipos, 'Selecciona tipo...');
    fillSelect(wizUbicacion, (ESTANTES_DATA.ubicaciones || []).filter(Boolean), 'Selecciona ubicación...');
    fillSelect(wizDependiente, (ESTANTES_DATA.dependientes || []).filter(Boolean), 'Selecciona dependiente...');
    // sala tiene opciones fijas en el HTML
    fillSelect(wizEstante, [], 'Selecciona estante...');
    wizStatus.textContent = '';
  }

  function resetWizardVisibility() {
    wizAlmacenWrap.classList.add('d-none');
    wizDependienteWrap.classList.add('d-none');
    wizSalaWrap.classList.add('d-none');
    wizEstanteWrap.classList.add('d-none');
    wizUbicacion.value = '';
    wizDependiente.value = '';
    wizSala.value = '';
    wizEstante.value = '';
  }

  function updateWizardByTipo() {
    const tipo = (wizTipo.value || '').trim();
    resetWizardVisibility();

    if (!tipo) return;

    if (tipo === 'Averías' || tipo === 'Averias') {
      // directo
      return;
    }

    if (tipo === 'Almacén' || tipo === 'Almacen') {
      wizAlmacenWrap.classList.remove('d-none');
      return;
    }

    if (tipo === 'Sala de venta') {
      wizDependienteWrap.classList.remove('d-none');
      wizSalaWrap.classList.remove('d-none');
      // estante aparece cuando haya sala seleccionada
      return;
    }

    // otros tipos: por ahora directo
  }

  function updateEstantesBySala() {
    const sala = (wizSala.value || '').trim();
    wizEstanteWrap.classList.add('d-none');
    fillSelect(wizEstante, [], 'Selecciona estante...');

    if (!sala) return;

    let list = [];
    if (sala === 'Sexta Calle') list = ESTANTES_DATA.estantes_sexta || [];
    else if (sala === 'Centro Comercial') list = ESTANTES_DATA.estantes_cc || [];
    else if (sala === 'Avenida Morazán') list = ESTANTES_DATA.estantes_avm || [];

    list = (list || []).filter(Boolean);
    fillSelect(wizEstante, list, 'Selecciona estante...');
    wizEstanteWrap.classList.remove('d-none');
  }

  function validateWizard() {
    const tipo = (wizTipo.value || '').trim();
    if (!tipo) return { ok:false, msg:'Selecciona el tipo de inventario.' };

    if (tipo === 'Almacén' || tipo === 'Almacen') {
      const u = (wizUbicacion.value || '').trim();
      if (!u) return { ok:false, msg:'Selecciona la ubicación del Almacén.' };
      return { ok:true };
    }

    if (tipo === 'Sala de venta') {
      const dep = (wizDependiente.value || '').trim();
      const sala = (wizSala.value || '').trim();
      const est = (wizEstante.value || '').trim();
      if (!dep) return { ok:false, msg:'Selecciona el dependiente responsable.' };
      if (!sala) return { ok:false, msg:'Selecciona la sala de venta.' };
      if (!est) return { ok:false, msg:'Selecciona el estante.' };
      return { ok:true };
    }

    // Averías u otros
    return { ok:true };
  }
  function updateSummaryUI(cfg) {
    const wrap = $('wizSummary');
    if (!wrap) return;

    const tipo = (cfg && cfg.tipo) ? String(cfg.tipo) : '';
    const ubic = (cfg && (cfg.ubicacionTexto || cfg.ubicacion)) ? String(cfg.ubicacionTexto || cfg.ubicacion) : (ubicacionInput ? (ubicacionInput.value || '') : '');
    const dep  = (cfg && cfg.dependiente) ? String(cfg.dependiente) : '';
    const sala = (cfg && cfg.sala) ? String(cfg.sala) : '';
    const est  = (cfg && cfg.estante) ? String(cfg.estante) : '';

    const set = (id, val) => { const el = $(id); if (el) el.textContent = val || '-'; };
    set('sumTipo', tipo);
    set('sumUbicacion', ubic);
    set('sumProveedor', (cfg && cfg.proveedor) ? String(cfg.proveedor) : '');
    set('sumDependiente', dep);
    set('sumSala', sala);
    set('sumEstante', est);

    wrap.classList.remove('d-none');
  }


  function applyWizardConfig(cfg) {
    // Guarda y aplica los bloqueos (especialmente ubicación)
    localStorage.setItem(WIZ_CFG_KEY, JSON.stringify(cfg));
    localStorage.setItem(wizardDoneKey(), '1');

    // Aplicar ubicación “forzada” si corresponde
    if (cfg.tipo === 'Almacén' || cfg.tipo === 'Almacen') {
      cfg.ubicacionTexto = cfg.ubicacion || '';
      lockUbicacion(true, cfg.ubicacion || '');
    } else if (cfg.tipo === 'Sala de venta') {
      // Ubicación la definimos como: "Sala - Estante"
      const ub = [cfg.sala, cfg.estante].filter(Boolean).join(' — ');
      cfg.ubicacionTexto = ub;
      lockUbicacion(true, ub);
    } else {
      // Averías u otros: libre
      lockUbicacion(false);
    }

    updateSummaryUI(cfg);

    setControlsEnabled(true);
    wizardModal.hide();
    setTimeout(() => { if (searchInput && !searchInput.disabled) searchInput.focus(); }, 150);
  }

  function showWizardIfNeeded() {
    const done = localStorage.getItem(wizardDoneKey()) === '1';
    if (done) {
      // si ya hay config, reaplicar locks
      try {
        const cfg = JSON.parse(localStorage.getItem(WIZ_CFG_KEY) || '{}');
        if (cfg && cfg.tipo) applyWizardConfig(cfg);
      } catch (_) {
        setControlsEnabled(true);
      }
      return;
    }

    // bloquear controles hasta iniciar
    setControlsEnabled(false);
    lockUbicacion(false); // mostrar editable pero deshabilitado por setControlsEnabled
    wizardModal.show();
  }

  // Eventos wizard
  wizTipo.addEventListener('change', () => {
    updateWizardByTipo();
  });
  wizSala.addEventListener('change', () => {
    updateEstantesBySala();
  });
  wizStartBtn.addEventListener('click', () => {
    const v = validateWizard();
    if (!v.ok) {
      Swal.fire('Faltan datos', v.msg, 'info');
      return;
    }

    const tipo = (wizTipo.value || '').trim();
    const cfg = { tipo };

    if (tipo === 'Almacén' || tipo === 'Almacen') {
      cfg.ubicacion = (wizUbicacion.value || '').trim();
    } else if (tipo === 'Sala de venta') {
      cfg.dependiente = (wizDependiente.value || '').trim();
      cfg.sala = (wizSala.value || '').trim();
      cfg.estante = (wizEstante.value || '').trim();
    }

    applyWizardConfig(cfg);
  });

  // =========================
  // Historial por día
  // =========================
  const historyDateEl = $('historyDate');
  const btnToday      = $('btnToday');
  const historyHint   = $('historyHint');

  let SELECTED_DATE = getToday();
  let IS_HISTORY    = false;

  function setReadOnlyMode(readOnly) {
    IS_HISTORY = !!readOnly;

    const disable = (el, val) => { if (el) el.disabled = !!val; };
    disable(btnSave, readOnly);
    disable(btnClear, readOnly);
    disable(btnPDF, false);
    disable(btnPrint, false);
    disable(btnExcel, false);

    disable(proveedorInput, readOnly);
    // ubicación puede estar lockeada por wizard; aquí solo no tocar si está lock
    if (ubicacionInput) {
      if (!ubicacionInput.dataset.locked) disable(ubicacionInput, readOnly);
    }

    disable(searchInput, readOnly);
    disable(btnScan, readOnly);
    const btnOpenManual = document.getElementById('btnOpenManual');
    disable(btnOpenManual, readOnly);

    if (readOnly) {
      try { stopScanner(); } catch (_) {}
      if (scanWrap) scanWrap.classList.remove('active');
    }

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = tr.querySelector('.qty');
      const venc = tr.querySelector('.vencimiento');
      const del = tr.querySelector('button');
      if (qty) qty.disabled = readOnly;
      if (venc) venc.disabled = readOnly;
      if (del) del.disabled = readOnly;
    });

    if (historyHint) historyHint.classList.toggle('d-none', !readOnly);
  }

  let fpHistory = null;
  let historySet = new Set();

  async function refreshHistoryDates() {
    const docId = getCurrentDocId();
    const dates = await getHistoryDates(docId).catch(() => []);
    historySet = new Set((dates || []).filter(Boolean));
    if (fpHistory) fpHistory.redraw();
  }

  function parseNum(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function recalcTotals() {
    let lineas = 0;
    let tCantidad = 0;

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = parseNum(tr.querySelector('.qty') && tr.querySelector('.qty').value);
      if (qty > 0) { lineas++; tCantidad += qty; }
    });

    $('tLineas').textContent   = lineas;
    $('tCantidad').textContent = tCantidad;

    updateButtons();
  }

  function updateButtons() {
    const hasRows = body.rows.length > 0;
    btnPDF.disabled   = !hasRows;
    btnPrint.disabled = !hasRows;
    btnExcel.disabled = !hasRows;
    btnClear.disabled = !hasRows;
  }

  function renumber() {
    [...body.getElementsByTagName('tr')].forEach((row, idx) => {
      row.cells[0].textContent = (body.rows.length - idx);
    });
  }

  // =========================
  // Fix bug foco móvil en "Sumar cantidades"
  // =========================
  let LAST_DUPLICATE_QTY_INPUT = null;
  let LOCK_SEARCH_FOCUS_UNTIL = 0;

  function lockSearchFocusFor(ms, qtyInput) {
    LAST_DUPLICATE_QTY_INPUT = qtyInput || null;
    LOCK_SEARCH_FOCUS_UNTIL = Date.now() + (ms || 800);
  }

  function maybeBlockSearchFocus(target) {
    if (target !== searchInput) return false;
    if (Date.now() <= LOCK_SEARCH_FOCUS_UNTIL && LAST_DUPLICATE_QTY_INPUT) {
      // devolver foco a la cantidad
      setTimeout(() => {
        try { LAST_DUPLICATE_QTY_INPUT.focus({ preventScroll: true }); } catch (_) { LAST_DUPLICATE_QTY_INPUT.focus(); }
      }, 0);
      return true;
    }
    return false;
  }

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
    if (maybeBlockSearchFocus(t)) return;

    if (t === searchInput || (t && t.classList && t.classList.contains('qty'))) {
      centerOnElement(t);
    }
  });

  // =========================
  // Agregar filas / duplicados
  // =========================
  function findExistingRow(barcode, codInvent) {
    const barcodeTrim = (barcode || '').toString().trim();
    const codInvTrim  = (codInvent || '').toString().trim();
    const rows = [...body.getElementsByTagName('tr')];
    for (const tr of rows) {
      const rowBarcode = tr.cells[1]?.innerText.trim() || '';
      const rowCodInv  = tr.cells[3]?.innerText.trim() || '';
      const sameBarcode = barcodeTrim && rowBarcode && rowBarcode === barcodeTrim;
      const sameCodInv  = codInvTrim && rowCodInv && rowCodInv === codInvTrim;
      if ((sameBarcode && sameCodInv) || sameBarcode || sameCodInv) return tr;
    }
    return null;
  }

  function addRow({ barcode, nombre, codInvent, bodega = '', fechaVenc = '', cantidad = '', skipDuplicateCheck = false }) {
    if (!skipDuplicateCheck) {
      const existing = findExistingRow(barcode, codInvent);
      if (existing) {
        Swal.fire({
          title: 'Producto ya agregado',
          text: 'Este producto ya existe en la tabla. ¿Desea sumar la cantidad a la existente o cancelar?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sumar cantidades',
          cancelButtonText: 'Cancelar'
        }).then(res => {
          if (res.isConfirmed) {
            const qtyInput = existing.querySelector('.qty');
            const currentQty = parseNum(qtyInput && qtyInput.value);
            const addQty = parseNum(cantidad);
            if (addQty > 0 && qtyInput) {
              qtyInput.value = currentQty + addQty;
              recalcTotals();
            }
            // asegurar foco en cantidad y bloquear refocus accidental al searchInput en móvil
            if (qtyInput) {
              lockSearchFocusFor(1200, qtyInput);
              setTimeout(() => {
                try { qtyInput.focus({ preventScroll: true }); } catch (_) { qtyInput.focus(); }
              }, 0);
            }
            existing.classList.add('table-warning');
            setTimeout(() => existing.classList.remove('table-warning'), 800);
          }
        });
        return;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td></td>' +
      '<td>' + (barcode || '') + '</td>' +
      '<td>' + (nombre || '') + '</td>' +
      '<td>' + (codInvent || 'N/A') + '</td>' +
      '<td>' + (bodega || '') + '</td>' +
      '<td><input type="number" class="form-control form-control-sm qty" inputmode="numeric" min="0" step="1" value="' + (cantidad || '') + '"></td>' +
      '<td><input type="date" class="form-control form-control-sm vencimiento" value="' + (fechaVenc || '') + '"></td>' +
      '<td><button class="btn btn-outline-danger btn-sm" title="Eliminar fila"><i class="fas fa-trash"></i></button></td>';

    body.insertBefore(tr, body.firstChild);
    renumber();
    if (suggestions) suggestions.innerHTML = '';
    if (searchInput) searchInput.value = '';

    const venc   = tr.querySelector('.vencimiento');
    const qty    = tr.querySelector('.qty');
    const delBtn = tr.querySelector('button');

    if (venc) {
      venc.addEventListener('focus', () => { try { if (venc.showPicker) venc.showPicker(); } catch (_) {} });
      venc.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (searchInput) searchInput.focus(); }
      });
    }

    if (qty) {
      qty.addEventListener('input', recalcTotals);
      qty.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (venc) venc.focus(); }
      });
    }

    delBtn.addEventListener('click', () => {
      Swal.fire({
        title: '¿Eliminar ítem?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar'
      }).then(res => {
        if (res.isConfirmed) {
          tr.remove();
          renumber();
          recalcTotals();
          updateButtons();
        }
      });
    });

    recalcTotals();
    updateButtons();
  }

  function addRowAndFocus({ barcode, nombre, codInvent, bodega, fechaVenc }) {
    addRow({ barcode, nombre, codInvent, bodega, fechaVenc });
    const firstRow = body.firstElementChild;
    if (firstRow) {
      const qty  = firstRow.querySelector('.qty');
      if (qty) qty.focus();
    }
  }

  function sanitizeName(s) {
    return (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^\w\-.]/g, '_');
  }

  // =========================
  // Carga por fecha
  // =========================
  async function loadForDate(dateStr) {
    const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getToday();
    SELECTED_DATE = day;

    body.innerHTML = '';
    proveedorInput.value = '';
    if (ubicacionInput && !ubicacionInput.dataset.locked) ubicacionInput.value = '';
    recalcTotals();
    updateButtons();

    const isHistory = day !== getToday();
    setReadOnlyMode(isHistory);

    try {
      const record = await loadInventoryFromFirestore(getCurrentDocId(), day);
      if (record && record.items && Array.isArray(record.items)) {
        if (record.meta && record.meta.proveedor) proveedorInput.value = record.meta.proveedor;
        if (record.meta && record.meta.ubicacion) {
          // solo escribir si no está lockeada por wizard
          if (ubicacionInput && !ubicacionInput.dataset.locked) ubicacionInput.value = record.meta.ubicacion;
        }
        record.items.forEach(it => {
          addRow({
            barcode:   it.codigo_barras || '',
            nombre:    it.nombre || '',
            codInvent: it.codigo_inventario || 'N/A',
            bodega:    it.bodega || '',
            fechaVenc: it.fecha_vencimiento || '',
            cantidad:  (it.cantidad !== undefined && it.cantidad !== null) ? Number(it.cantidad) : '',
            skipDuplicateCheck: true
          });
        });
        recalcTotals();
      }
    } catch (e) {
      console.error('Error al cargar historial:', e);
    }

    if (isHistory) {
      [...body.querySelectorAll('input,button')].forEach(el => el.disabled = true);
    }
  }

  // =========================
  // Calendario historial
  // =========================
  await refreshHistoryDates();

  if (historyDateEl && window.flatpickr) {
    fpHistory = window.flatpickr(historyDateEl, {
      dateFormat: 'Y-m-d',
      defaultDate: SELECTED_DATE,
      locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.es) ? window.flatpickr.l10ns.es : undefined,
      onChange: async (_selectedDates, dateStr) => {
        if (!dateStr) return;
        await loadForDate(dateStr);
      },
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        const d = dayElem.dateObj;
        if (!d) return;
        const key = d.toISOString().split('T')[0];
        if (historySet.has(key)) dayElem.classList.add('has-history');
      }
    });
    fpHistory.redraw();
  }

  if (btnToday) {
    btnToday.addEventListener('click', async () => {
      const today = getToday();
      if (fpHistory) fpHistory.setDate(today, true);
      else await loadForDate(today);
    });
  }

  // =========================
  // Proveedores + Catálogo (preload)
  // =========================
  await (typeof preloadProviders === 'function' ? preloadProviders().catch(() => {}) : Promise.resolve());
  await (typeof preloadCatalog === 'function' ? preloadCatalog().catch(() => {}) : Promise.resolve());

  // Proveedores: ahora se capturan en el Wizard (paso Almacén). No se usa autocomplete aquí.

  function openManualModalFromSearch(rawQuery) {
    const q = (rawQuery || '').trim();
    mCodigo.value = '';
    mNombre.value = '';
    mCodInv.value = 'N/A';
    mBodega.value = '';
    mCantidad.value = '';
    if (q) {
      if (/^\d+$/.test(q)) mCodigo.value = q;
      else mNombre.value = q;
    }
    manualModal.show();
  }

  const btnOpenManual = document.getElementById('btnOpenManual');
  btnOpenManual.addEventListener('click', () => {
    const raw = (searchInput.value || '').replace(/\r|\n/g, '').trim();
    openManualModalFromSearch(raw);
  });

  $('btnAddManual').addEventListener('click', () => {
    const codigo = (mCodigo.value || '').trim();
    const nombre = (mNombre.value || '').trim();
    const codInv = (mCodInv.value || 'N/A').trim() || 'N/A';
    const bodega = (mBodega.value || '').trim();
    const fechaVenc = (mVencimiento.value || '').trim();
    const qty = parseNum(mCantidad.value);

    if (!codigo || !nombre) {
      Swal.fire('Campos faltantes', 'Ingrese código de barras y nombre.', 'info');
      return;
    }
    if (!(qty > 0)) {
      Swal.fire('Cantidad inválida', 'La cantidad debe ser mayor que 0.', 'warning');
      return;
    }

    addRow({ barcode: codigo, nombre, codInvent: codInv, bodega, fechaVenc, cantidad: qty });
    manualModal.hide();
    searchInput.focus();
  });

  // =========================
  // Scanner
  // =========================
  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  async function startScanner() {
    if (!btnScan || !scanWrap) return;

    if (!('BarcodeDetector' in window)) {
      Swal.fire('Escáner limitado', 'Este navegador no soporta escaneo en vivo. Usa la opción de archivo o la pistola de códigos.', 'info');
      if (fileScan) fileScan.click();
      return;
    }

    try {
      detector = new window.BarcodeDetector({ formats: ['ean_13','code_128','code_39','ean_8','upc_a','upc_e'] });
    } catch (_) { detector = null; }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!scanVideo) return;
      scanVideo.srcObject = mediaStream;
      await scanVideo.play();
      scanWrap.classList.add('active');

      if (detector) {
        if (scanInterval) clearInterval(scanInterval);
        scanInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(scanVideo);
            if (barcodes && barcodes.length) {
              const raw = String(barcodes[0].rawValue || '').trim();
              if (raw) await onBarcodeFound(raw);
            }
          } catch (_) {}
        }, 250);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Cámara no disponible', 'No se pudo acceder a la cámara.', 'error');
    }
  }

  async function stopScanner() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    if (scanWrap) scanWrap.classList.remove('active');
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    if (!searchInput) return;
    searchInput.value = code;
    // Disparar el handler de Enter
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    searchInput.dispatchEvent(e);
  }

  if (fileScan) {
    fileScan.addEventListener('change', async () => {
      const f = fileScan.files && fileScan.files[0];
      if (!f) return;
      const m = (f.name || '').match(/\d{8,}/);
      if (m) {
        searchInput.value = m[0];
        const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        searchInput.dispatchEvent(e);
      } else {
        Swal.fire('Atención', 'No se pudo leer el código desde la imagen. Prueba con la cámara o la pistola.', 'info');
      }
    });
  }

  if (btnScan) btnScan.addEventListener('click', startScanner);
  if (btnScanStop) btnScanStop.addEventListener('click', stopScanner);

  // =========================
  // Guardar / limpiar / exportar
  // =========================
  btnSave.addEventListener('click', async () => {
    const wizCfgNow = getWizardConfig();
    const ubicWizard = (wizCfgNow.ubicacionTexto || wizCfgNow.ubicacion || '').toString().trim();
    if (!ubicWizard) {
      Swal.fire('Ubicación requerida', 'Complete el asistente inicial para definir la ubicación.', 'info');
      return;
    }
    if (body.rows.length === 0) {
      Swal.fire('Sin ítems', 'Agregue al menos un producto.', 'error');
      return;
    }

    let wizCfg = {};
    try { wizCfg = JSON.parse(localStorage.getItem(WIZ_CFG_KEY) || '{}'); } catch (_) { wizCfg = {}; }

    const items = [...body.getElementsByTagName('tr')].map(tr => {
      const qty = parseNum(tr.querySelector('.qty').value);
      const fechaVenc = (tr.querySelector('.vencimiento')?.value || '').trim();
      return {
        codigo_barras: tr.cells[1].innerText.trim(),
        nombre: tr.cells[2].innerText.trim(),
        codigo_inventario: tr.cells[3].innerText.trim(),
        bodega: tr.cells[4].innerText.trim(),
        fecha_vencimiento: fechaVenc,
        cantidad: qty
      };
    });

    const payload = {
      meta: {
        tienda: 'AVENIDA MORAZÁN',
        proveedor: (getWizardConfig().proveedor || '').toString().trim(),
        ubicacion: ( (getWizardConfig().ubicacionTexto || getWizardConfig().ubicacion || '') ).toString().trim(),
        hoja_inventario: CURRENT_INVENTARIO,
        fechaInventario: new Date().toISOString(),
        wizard: wizCfg || {}
      },
      items,
      totales: {
        lineas: Number($('tLineas').textContent),
        cantidad_total: Number($('tCantidad').textContent)
      }
    };

    try {
      await saveInventoryToFirestore(getCurrentDocId(), payload);
      const msgEl = $('successMessage');
      if (msgEl) {
        msgEl.textContent = 'Inventario guardado correctamente.';
        msgEl.style.display = 'block';
        setTimeout(() => msgEl.style.display = 'none', 4000);
      }
      Swal.fire('Guardado', 'El inventario ha sido guardado.', 'success');
      await refreshHistoryDates();
      if (fpHistory && fpHistory.redraw) fpHistory.redraw();
    } catch (e) {
      Swal.fire('Error', String(e), 'error');
    }
  });

  btnClear.addEventListener('click', () => {
    if (body.rows.length === 0 && !(proveedorInput.value.trim() || (ubicacionInput && ubicacionInput.value.trim()))) return;
    Swal.fire({
      title: '¿Vaciar y comenzar nuevo inventario?',
      text: 'Esto guardará el estado vacío en esta hoja (hoy).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar y guardar'
    }).then(async res => {
      if (res.isConfirmed) {
        body.innerHTML = '';
        proveedorInput.value = '';
        if (ubicacionInput && !ubicacionInput.dataset.locked) ubicacionInput.value = '';
        recalcTotals();
        updateButtons();

        const payload = {
          meta: {
            tienda: 'AVENIDA MORAZÁN',
            proveedor: '',
            ubicacion: ubicacionInput ? (ubicacionInput.value || '') : '',
            hoja_inventario: CURRENT_INVENTARIO,
            fechaInventario: new Date().toISOString()
          },
          items: [],
          totales: { lineas: 0, cantidad_total: 0 }
        };

        try {
          await saveInventoryToFirestore(getCurrentDocId(), payload);
          Swal.fire('Listo', 'Se limpió y guardó el estado vacío.', 'success');
          await refreshHistoryDates();
          if (fpHistory && fpHistory.redraw) fpHistory.redraw();
        } catch (e) {
          Swal.fire('Error', String(e), 'error');
        }
      }
    });
  });

  btnPDF.addEventListener('click', () => exportPDF(false));
  btnPrint.addEventListener('click', () => exportPDF(true));

  function exportPDF(openWindow) {
    if (body.rows.length === 0) return;
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();
    const fecha = new Date().toISOString().split('T')[0];

    doc.setFontSize(12);
    doc.text('Tienda: AVENIDA MORAZÁN', 10, 10);
    const wizCfgPdf = getWizardConfig();
    const ubicPdf = (wizCfgPdf.ubicacionTexto || wizCfgPdf.ubicacion || '').toString().trim() || '-';
    doc.text('Ubicación: ' + ubicPdf, 10, 18);
    const provPdf = (wizCfgPdf.proveedor || '').toString().trim();
    if (provPdf) doc.text('Proveedor: ' + provPdf, 10, 26);
    if (proveedorInput.value.trim()) doc.text('Proveedor: ' + proveedorInput.value, 10, 26);
    doc.text('Hoja de inventario: ' + (inventarioSelect ? inventarioSelect.value : ''), 10, 34);

    const rows = [...body.getElementsByTagName('tr')].map((tr, i) => {
      const bodega = tr.cells[4].innerText;
      const qty = tr.querySelector('.qty').value;
      const fechaV = (tr.querySelector('.vencimiento')?.value || '');
      return [i + 1, tr.cells[1].innerText, tr.cells[2].innerText, tr.cells[3].innerText, bodega, qty, fechaV];
    });

    const startTableY = (typeof yInfo === 'number' ? (yInfo + 6) : 40);

    doc.autoTable({
      startY: startTableY,
      head: [['#','Código barras','Producto','Cod. Inv.','Bodega','Cant.','F. vencimiento']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 }
    });

    const y = doc.lastAutoTable.finalY + 6;
    doc.text('Líneas: ' + $('tLineas').textContent + '  |  Cantidad total: ' + $('tCantidad').textContent, 10, y);

    const name = 'INVENTARIO_AVM_' + sanitizeName(ubicacionInput ? (ubicacionInput.value || '') : '') + '_' +
      (inventarioSelect ? inventarioSelect.value : '') + '_' + fecha + '.pdf';

    if (openWindow) doc.output('dataurlnewwindow');
    else doc.save(name);
  }

  btnExcel.addEventListener('click', () => {
    if (body.rows.length === 0) return;

    const fechaFis = new Date().toISOString().split('T')[0];
    const wizCfgX = getWizardConfig();
    const ubicacionValor = (wizCfgX.ubicacionTexto || wizCfgX.ubicacion || '').toString();

    const data = [[
      'fechafis','idgrupo','idsubgrupo','idarticulo','descrip','codigobarra','cod_unidad','ubicacion','Bodega_5'
    ]];

    const catalogo = (window.CATALOGO_CACHE || []);

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const nombreUI = tr.cells[2].innerText.trim();
      const codInventUI = tr.cells[3].innerText.trim();
      const codigoBarrasUI = tr.cells[1].innerText.trim();
      const qty = parseNum(tr.querySelector('.qty').value);

      let match = null;
      if (catalogo && catalogo.length) {
        match = catalogo.find(r => {
          const idartCatalogo = (r[1] || '').toString().trim();
          const codBarCatalog = (r[3] || '').toString().trim();
          const sameCodInv = codInventUI && idartCatalogo && idartCatalogo === codInventUI;
          const sameBar = codigoBarrasUI && codBarCatalog && codBarCatalog === codigoBarrasUI;
          if (sameCodInv && sameBar) return true;
          if (sameBar) return true;
          if (sameCodInv) return true;
          return false;
        }) || null;
      }

      const descrip = match ? ((match[0] || '').toString().trim() || nombreUI) : nombreUI;
      const idart = match ? ((match[1] || '').toString().trim() || codInventUI) : codInventUI;
      const codBar = match ? ((match[3] || '').toString().trim() || codigoBarrasUI) : codigoBarrasUI;
      const idgrupo = match ? ((match[4] || '').toString().trim()) : '';
      const idsubgr = match ? ((match[5] || '').toString().trim()) : '';
      const codUnidad = 6;

      data.push([fechaFis, idgrupo, idsubgr, idart, descrip, codBar, codUnidad, ubicacionValor, qty]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const fechaArchivo = new Date().toISOString().split('T')[0];
    const nombreArchivo = 'INVENTARIO_AVM_' + sanitizeName(ubicacionValor) + '_' +
      (inventarioSelect ? inventarioSelect.value : '') + '_' + fechaArchivo + '.xlsx';

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // =========================
  // Inventario select change
  // =========================
  inventarioSelect.addEventListener('change', async () => {
    CURRENT_INVENTARIO = inventarioSelect.value;
    localStorage.setItem('TR_AVM_CURRENT_INVENTARIO', CURRENT_INVENTARIO);

    // Forzar wizard nuevo por hoja + día
    setControlsEnabled(false);
    lockUbicacion(false);
    await refreshHistoryDates();
    if (fpHistory && fpHistory.redraw) fpHistory.redraw();
    await loadForDate(SELECTED_DATE);

    // abrir wizard de nuevo
    resetWizardVisibility();
    await initWizardData();
    showWizardIfNeeded();
  });

  // =========================
  // Inicialización
  // =========================
  const modalInputs = [mCodigo, mNombre, mCodInv, mBodega, mVencimiento, mCantidad];
  modalInputs.forEach((inp, idx) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx < modalInputs.length - 1) modalInputs[idx + 1].focus();
        else $('btnAddManual').click();
      }
    });
  });

  // Cargar estado inicial (fecha seleccionada)
  await loadForDate(SELECTED_DATE);

  // Wizard: cargar data y mostrar si hace falta
  await initWizardData();
  showWizardIfNeeded();

  if (searchInput) searchInput.focus();
});
