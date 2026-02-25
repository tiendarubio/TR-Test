// assets/js/inventario.js (Sesiones multiusuario sin login)
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  function _normText(s) {
    return (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ===== Config tienda =====
  const TIENDA = 'AVENIDA MORAZÁN';

  // ===== UI refs =====
  const fechaEl = $('fechaInventario');
  if (fechaEl) {
    fechaEl.textContent = 'Fecha/hora: ' + new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
  }

  const body           = $('recepcionBody');
  const proveedorInput = $('proveedorInput'); // oculto, se llena desde wizard
  const ubicacionInput = $('ubicacionInput'); // oculto, se llena desde wizard
  const btnSaveToolbar = $('saveReception');  // Guardar progreso (toolbar)
  const btnFinalizeTb  = $('finalizeReception'); // Finalizar (toolbar)
  const btnPDF         = $('exportPDF');
  const btnPrint       = $('printPDF');
  const btnExcel       = $('exportExcel');
  const btnClear       = $('clearReception');

  const btnStartInv    = $('btnStartInventory');
  const btnSaveInv     = $('btnSaveProgress');
  const btnFinalizeInv = $('btnFinalizeInventory');
  const btnResumeInv   = $('btnResumeInventory');

  const curSessionIdEl = $('curSessionId');
  const curStatusEl    = $('curSessionStatus');
  const curUpdatedEl   = $('curSessionUpdated');

  const sessionsList   = $('sessionsList');

  // Resumen UI
  const sumTipo = $('sumTipo');
  const sumProveedor = $('sumProveedor');
  const sumUbicacion = $('sumUbicacion');
  const sumDependiente = $('sumDependiente');
  const sumSala = $('sumSala');
  const sumEstante = $('sumEstante');

  // ===== Wizard modal refs =====
  const wizardEl = document.getElementById('wizardModal');
  const wizardModal = wizardEl ? new bootstrap.Modal(wizardEl, { backdrop: 'static', keyboard: false }) : null;
  if (wizardEl) {
    wizardEl.addEventListener('hide.bs.modal', () => {
      try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) {}
    });
  }

  const wizTipo       = $('wizTipo');
  const wizUbicacion  = $('wizUbicacion');
  const wizDependiente= $('wizDependiente');
  const wizSala       = $('wizSala');
  const wizEstante    = $('wizEstante');
  const wizStepEstante = $('wizEstanteWrap');
  const wizProveedorWrap = $('wizProveedorWrap');
  const wizProveedor  = $('wizProveedor');
  const wizProvSuggestions = $('wizProvSuggestions');

  const wizStepAlmacen = $('wizAlmacenWrap');
  const wizStepSala    = $('wizDependienteWrap');
  const wizStepSalaSel = $('wizSalaWrap');
  const wizEstanteLabel= null; // label no usado en HTML actual

  const wizStartBtn = $('wizStartBtn');
  const wizCancelBtn = null; // wizard obligatorio
  const wizStatus = $('wizStatus');

  // ===== Manual product modal =====
  const mCodigo       = $('mCodigo');
  const mNombre       = $('mNombre');
  const mCodInv       = $('mCodInv');
  const mBodega       = $('mBodega');
  const mVencimiento  = $('mVencimiento');
  const mCantidad     = $('mCantidad');
  const manualModalEl = document.getElementById('manualModal');
  const manualModal   = manualModalEl ? new bootstrap.Modal(manualModalEl, { focus: false }) : null;

  if (manualModalEl) {
    manualModalEl.addEventListener('shown.bs.modal', () => {
      const target = mCodigo;
      if (!target) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
        }, 0);
        setTimeout(() => {
          try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
        }, 120);
      });
    });
  }

  // Enter navigation in manual modal
  const modalInputs = [mCodigo, mNombre, mCodInv, mBodega, mVencimiento, mCantidad].filter(Boolean);
  modalInputs.forEach((inp, idx) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx < modalInputs.length - 1) modalInputs[idx + 1].focus();
        else $('btnAddManual')?.click();
      }
    });
  });

  // ===== Search + scanner refs =====
  const searchInput = $('searchInput');
  const btnScan     = $('btnScan');
  const scanWrap    = $('scanWrap');
  const scanVideo   = $('scanVideo');
  const btnScanStop = $('btnScanStop');
  const fileScan    = $('fileScan');
  const btnOpenManual = $('btnOpenManual');

  const suggestions = $('suggestions');
  let currentFocus  = -1;

  // ===== Local IDs =====
  const CURRENT_SESSION_KEY = 'TR_INV_CURRENT_SESSION_ID';
  const CLIENT_ID_KEY = 'TR_INV_CLIENT_ID';

  function getClientId() {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = 'C-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }

  function genSessionId() {
    const day = getTodayString();
    const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${day}-${rnd}`;
  }

  // ===== State =====
  let CURRENT_SESSION_ID = localStorage.getItem(CURRENT_SESSION_KEY) || '';
  let CURRENT_SESSION = null;
  let SELECTED_DAY = getTodayString();
  let IS_READONLY = true;

  // ===== Helpers =====
  function parseNum(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function sanitizeName(s) {
    return (s || '').toString().trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-.]/g, '_');
  }

  function setSuccess(msg) {
    const el = $('successMessage');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3500);
  }

  function setSessionHeader() {
    if (curSessionIdEl) curSessionIdEl.textContent = CURRENT_SESSION_ID || '—';
    if (curStatusEl) curStatusEl.textContent = (CURRENT_SESSION && CURRENT_SESSION.status) ? CURRENT_SESSION.status : '—';
    if (curUpdatedEl) {
      const u = CURRENT_SESSION && (CURRENT_SESSION.updatedAtClient || CURRENT_SESSION.updatedAt);
      curUpdatedEl.textContent = u ? String(u).slice(0, 19).replace('T',' ') : '—';
    }
  }

  function setSummaryFromWizard(w) {
    if (!w) w = {};
    if (sumTipo) sumTipo.textContent = w.tipo || '-';
    if (sumProveedor) sumProveedor.textContent = w.proveedor || '-';
    if (sumDependiente) sumDependiente.textContent = w.dependiente || '-';
    if (sumSala) sumSala.textContent = w.sala || '-';
    if (sumEstante) sumEstante.textContent = w.estante || '-';
    if (sumUbicacion) sumUbicacion.textContent = (w.ubicacion || (ubicacionInput ? ubicacionInput.value : '') || '-') || '-';
  }

  function setReadOnlyMode(readOnly) {
    IS_READONLY = !!readOnly;

    const disable = (el, val) => { if (el) el.disabled = !!val; };

    disable(btnSaveToolbar, readOnly);
    disable(btnFinalizeTb, readOnly);
    disable(btnClear, readOnly);

    disable(btnSaveInv, readOnly);
    disable(btnFinalizeInv, readOnly);

    disable(searchInput, readOnly);
    disable(btnScan, readOnly);
    disable(btnOpenManual, readOnly);

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = tr.querySelector('.qty');
      const venc = tr.querySelector('.vencimiento');
      const del = tr.querySelector('button');
      if (qty) qty.disabled = readOnly;
      if (venc) venc.disabled = readOnly;
      if (del) del.disabled = readOnly;
    });

    updateButtons();
  }

  function updateButtons() {
    const hasRows = body.rows.length > 0;
    if (btnPDF) btnPDF.disabled = !hasRows;
    if (btnPrint) btnPrint.disabled = !hasRows;
    if (btnExcel) btnExcel.disabled = !hasRows;
    if (btnClear) btnClear.disabled = IS_READONLY || (!hasRows && !(proveedorInput?.value.trim() || ubicacionInput?.value.trim()));
  }

  function renumber() {
    [...body.getElementsByTagName('tr')].forEach((row, idx) => {
      row.cells[0].textContent = (body.rows.length - idx);
    });
  }

  function recalcTotals() {
    let lineas    = 0;
    let tCantidad = 0;

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const qty = parseNum(tr.querySelector('.qty') && tr.querySelector('.qty').value);
      if (qty > 0) { lineas++; tCantidad += qty; }
    });

    $('tLineas').textContent   = lineas;
    $('tCantidad').textContent = tCantidad;

    updateButtons();
  }

  function clearUI() {
    body.innerHTML = '';
    if (proveedorInput) proveedorInput.value = '';
    if (ubicacionInput) ubicacionInput.value = '';
    recalcTotals();
    updateButtons();
  }

  function getItemsFromUI() {
    return [...body.getElementsByTagName('tr')].map(tr => {
      const qty       = parseNum(tr.querySelector('.qty')?.value);
      const fechaVenc = (tr.querySelector('.vencimiento')?.value || '').trim();
      return {
        codigo_barras:     tr.cells[1].innerText.trim(),
        nombre:            tr.cells[2].innerText.trim(),
        codigo_inventario: tr.cells[3].innerText.trim(),
        bodega:            tr.cells[4].innerText.trim(),
        fecha_vencimiento: fechaVenc,
        cantidad:          qty
      };
    });
  }

  function renderItemsToUI(items, readOnly) {
    body.innerHTML = '';
    (items || []).forEach(it => {
      addRow({
        barcode: it.codigo_barras || '',
        nombre: it.nombre || '',
        codInvent: it.codigo_inventario || 'N/A',
        bodega: it.bodega || '',
        fechaVenc: it.fecha_vencimiento || '',
        cantidad: (it.cantidad !== undefined && it.cantidad !== null) ? Number(it.cantidad) : '',
        skipDuplicateCheck: true,
        forceReadOnly: !!readOnly
      });
    });
    recalcTotals();
    setReadOnlyMode(!!readOnly);
  }

  // ===== Duplicate handling (fix foco móvil) =====
  let __LAST_DUPLICATE_FOCUS__ = null;

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

  function forceStableFocus(el) {
    if (!el) return;
    __LAST_DUPLICATE_FOCUS__ = el;
    try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    setTimeout(() => {
      if (__LAST_DUPLICATE_FOCUS__ === el) {
        try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
      }
    }, 160);
  }

  function addRow({ barcode, nombre, codInvent, bodega = '', fechaVenc = '', cantidad = '', skipDuplicateCheck = false, forceReadOnly = false }) {
    if (!skipDuplicateCheck && !IS_READONLY) {
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
            if (qtyInput) forceStableFocus(qtyInput);
            existing.classList.add('table-warning');
            setTimeout(() => existing.classList.remove('table-warning'), 800);
          }
        });
        return;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = '' +
      '<td></td>' +
      '<td>' + (barcode || '') + '</td>' +
      '<td>' + (nombre || '') + '</td>' +
      '<td>' + (codInvent || 'N/A') + '</td>' +
      '<td>' + (bodega || '') + '</td>' +
      '<td><input type="number" class="form-control form-control-sm qty" min="0" step="1" value="' + (cantidad || '') + '"></td>' +
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
      venc.addEventListener('focus', () => { try { venc.showPicker && venc.showPicker(); } catch (_) {} });
      venc.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); searchInput && searchInput.focus(); }
      });
    }

    if (qty) {
      qty.addEventListener('input', recalcTotals);
      qty.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); venc && venc.focus(); }
      });
    }

    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (IS_READONLY) return;
        Swal.fire({ title: '¿Eliminar ítem?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar' })
          .then(res => {
            if (res.isConfirmed) {
              tr.remove();
              renumber();
              recalcTotals();
              updateButtons();
            }
          });
      });
    }

    if (forceReadOnly || IS_READONLY) {
      if (qty) qty.disabled = true;
      if (venc) venc.disabled = true;
      if (delBtn) delBtn.disabled = true;
    }

    recalcTotals();
    updateButtons();
  }

  function addRowAndFocus({ barcode, nombre, codInvent, bodega, fechaVenc }) {
    addRow({ barcode, nombre, codInvent, bodega, fechaVenc });
    const firstRow = body.firstElementChild;
    if (firstRow) {
      const qty  = firstRow.querySelector('.qty');
      const venc = firstRow.querySelector('.vencimiento');
      if (qty) qty.focus();
      else if (venc) venc.focus();
    }
  }

  // ===== Catalog search =====
  await preloadCatalog().catch(() => {});
  searchInput?.addEventListener('input', () => {
    const raw = (searchInput.value || '').replace(/\r|\n/g, '').trim();
    const q   = raw.toLowerCase();
    if (!suggestions) return;
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (!q) return;

    loadProductsFromGoogleSheets().then(rows => {
      const filtered = (rows || []).filter(r => {
        const nombre    = (r[0] || '').toLowerCase();
        const codInvent = (r[1] || '').toLowerCase();
        const barcode   = (r[3] || '').toLowerCase();
        return nombre.includes(q) || barcode.includes(q) || codInvent.includes(q);
      });

      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-light no-results';
        li.innerHTML = '<strong>Sin resultados</strong>. Usa el botón + para agregar producto manual.';
        suggestions.appendChild(li);
        return;
      }

      filtered.slice(0, 50).forEach(prod => {
        const li        = document.createElement('li');
        li.className    = 'list-group-item';
        const nombre    = prod[0] || '';
        const codInvent = prod[1] || 'N/A';
        const bodega    = prod[2] || '';
        const barcode   = prod[3] || 'sin código';
        li.textContent  = nombre + ' (' + barcode + ') [' + codInvent + '] — ' + bodega;
        li.addEventListener('click', () => addRowAndFocus({ barcode, nombre, codInvent, bodega }));
        suggestions.appendChild(li);
      });
    }).catch(() => {});
  });

  searchInput?.addEventListener('keydown', (e) => {
    const items = suggestions ? suggestions.getElementsByTagName('li') : [];
    if (e.key === 'ArrowDown') { currentFocus++; addActive(items); }
    else if (e.key === 'ArrowUp') { currentFocus--; addActive(items); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1 && items[currentFocus]) { items[currentFocus].click(); return; }

      const raw = (searchInput.value || '').replace(/\r|\n/g, '').trim();
      if (!raw) return;

      const rows = (window.CATALOGO_CACHE || []);
      let match  = null;
      for (const r of rows) {
        const barcode   = r[3] ? String(r[3]).trim() : '';
        const codInvent = r[1] ? String(r[1]).trim() : '';
        if (barcode === raw || codInvent === raw) { match = r; break; }
      }
      if (match) {
        const nombre    = match[0] || '';
        const codInvent = match[1] || 'N/A';
        const bodega    = match[2] || '';
        const barcode   = match[3] || raw;
        addRowAndFocus({ barcode, nombre, codInvent, bodega });
      }
    } else if (e.key === 'Escape') {
      if (suggestions) suggestions.innerHTML = '';
      currentFocus = -1;
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

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target === searchInput || (suggestions && suggestions.contains(target))) return;
    if (suggestions) suggestions.innerHTML = '';
    currentFocus = -1;
  });

  // ===== Manual product add =====
  function openManualModalFromSearch(rawQuery) {
    const q = (rawQuery || '').trim();
    if (!manualModal) return;

    mCodigo.value   = '';
    mNombre.value   = '';
    mCodInv.value   = 'N/A';
    mBodega.value   = '';
    mCantidad.value = '';
    mVencimiento.value = '';

    if (q) {
      if (/^\d+$/.test(q)) mCodigo.value = q;
      else mNombre.value = q;
    }
    manualModal.show();
  }

  btnOpenManual?.addEventListener('click', () => {
    const raw = (searchInput?.value || '').replace(/\r|\n/g, '').trim();
    openManualModalFromSearch(raw);
  });

  $('btnAddManual')?.addEventListener('click', () => {
    const codigo   = (mCodigo.value || '').trim();
    const nombre   = (mNombre.value || '').trim();
    const codInv   = (mCodInv.value || 'N/A').trim() || 'N/A';
    const bodega   = (mBodega.value || '').trim();
    const fechaVenc= (mVencimiento.value || '').trim();
    const qty      = parseNum(mCantidad.value);

    if (!codigo || !nombre) { Swal.fire('Campos faltantes', 'Ingrese código de barras y nombre.', 'info'); return; }
    if (!(qty > 0)) { Swal.fire('Cantidad inválida', 'La cantidad debe ser mayor que 0.', 'warning'); return; }

    addRow({ barcode: codigo, nombre, codInvent: codInv, bodega, fechaVenc, cantidad: qty });
    manualModal.hide();
    searchInput && searchInput.focus();
  });

  // ===== Scanner (live) =====
  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  async function startScanner() {
    if (IS_READONLY) return;

    if (!('BarcodeDetector' in window)) {
      Swal.fire('Escáner limitado', 'Este navegador no soporta escaneo en vivo. Usa archivo o pistola de códigos.', 'info');
      fileScan && fileScan.click();
      return;
    }

    try {
      detector = new window.BarcodeDetector({ formats: ['ean_13','code_128','code_39','ean_8','upc_a','upc_e'] });
    } catch (_) { detector = null; }

    if (!navigator.mediaDevices?.getUserMedia) {
      Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!scanVideo) return;
      scanVideo.srcObject = mediaStream;
      await scanVideo.play();
      scanWrap && scanWrap.classList.add('active');

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
    scanWrap && scanWrap.classList.remove('active');
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    if (!searchInput) return;
    searchInput.value = code;
    const e = new KeyboardEvent('keydown', { key: 'Enter' });
    searchInput.dispatchEvent(e);
  }

  btnScan?.addEventListener('click', startScanner);
  btnScanStop?.addEventListener('click', stopScanner);

  fileScan?.addEventListener('change', async () => {
    const f = fileScan.files && fileScan.files[0];
    if (!f) return;
    const m = (f.name || '').match(/\d{8,}/);
    if (m) {
      if (searchInput) {
        searchInput.value = m[0];
        const e = new KeyboardEvent('keydown', { key: 'Enter' });
        searchInput.dispatchEvent(e);
      }
    } else {
      Swal.fire('Atención', 'No se pudo leer el código desde la imagen. Prueba con cámara o pistola.', 'info');
    }
  });

  // ===== Wizard lists (estantes) + Proveedor autocomplete in wizard =====
  let ESTANTES_DATA = null;

  async function fetchEstantes() {
    if (ESTANTES_DATA) return ESTANTES_DATA;
    const r = await fetch('/api/estantes');
    if (!r.ok) throw new Error('No se pudo cargar estantes');
    ESTANTES_DATA = await r.json();
    return ESTANTES_DATA;
  }

  async function initWizardData() {
    if (!wizStatus) return;
    try {
      wizStatus.textContent = 'Cargando listas…';
      const data = await fetchEstantes();
      const tipos = (data?.tipos || []).filter(Boolean);
      const ubic  = (data?.ubicaciones || []).filter(Boolean);
      const deps  = (data?.dependientes || []).filter(Boolean);

      wizTipo.innerHTML = '<option value="">Seleccione…</option>' + tipos.map(x => `<option value="${x}">${x}</option>`).join('');
      wizUbicacion.innerHTML = '<option value="">Seleccione…</option>' + ubic.map(x => `<option value="${x}">${x}</option>`).join('');
      wizDependiente.innerHTML = '<option value="">Seleccione…</option>' + deps.map(x => `<option value="${x}">${x}</option>`).join('');

      wizSala.innerHTML = '<option value="">Seleccione…</option>' +
        ['Sexta Calle','Centro Comercial','Avenida Morazán'].map(x => `<option value="${x}">${x}</option>`).join('');

      wizEstante.innerHTML = '<option value="">Seleccione…</option>';
      wizStatus.textContent = '';
      await preloadProviders().catch(() => {});
    } catch (e) {
      console.error(e);
      wizStatus.textContent = 'Error cargando listas. Intenta recargar.';
    }
  }

  let wizProvFocus = -1;
  function renderWizardProvSuggestions(query) {
    if (!wizProvSuggestions) return;
    const q = (query || '').trim().toLowerCase();
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
  }

  function addActiveWizProv(items) {
    if (!items || !items.length) return;
    [...items].forEach(x => x.classList.remove('active'));
    if (wizProvFocus >= items.length) wizProvFocus = 0;
    if (wizProvFocus < 0) wizProvFocus = items.length - 1;
    items[wizProvFocus].classList.add('active');
    items[wizProvFocus].scrollIntoView({ block: 'nearest' });
  }

  wizProveedor?.addEventListener('input', () => renderWizardProvSuggestions(wizProveedor.value));
  wizProveedor?.addEventListener('keydown', (e) => {
    const items = wizProvSuggestions ? wizProvSuggestions.getElementsByTagName('li') : [];
    if (e.key === 'ArrowDown') { wizProvFocus++; addActiveWizProv(items); }
    else if (e.key === 'ArrowUp') { wizProvFocus--; addActiveWizProv(items); }
    else if (e.key === 'Enter') {
      if (wizProvFocus > -1 && items[wizProvFocus]) {
        e.preventDefault();
        items[wizProvFocus].click();
      }
    } else if (e.key === 'Escape') {
      if (wizProvSuggestions) wizProvSuggestions.innerHTML = '';
      wizProvFocus = -1;
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!wizProvSuggestions || !wizProveedor) return;
    if (t === wizProveedor || wizProvSuggestions.contains(t)) return;
    wizProvSuggestions.innerHTML = '';
    wizProvFocus = -1;
  });

  function resetWizardSteps() {
    // Ocultar todos los pasos (se muestran según tipo)
    wizStepAlmacen?.classList.add('d-none');
    wizStepSala?.classList.add('d-none');
    wizStepSalaSel?.classList.add('d-none');
    wizStepEstante?.classList.add('d-none');
    wizProveedorWrap?.classList.add('d-none');

    // Limpiar selects/inputs dependientes
    if (wizUbicacion) wizUbicacion.value = '';
    if (wizDependiente) wizDependiente.value = '';
    if (wizSala) wizSala.value = '';
    if (wizEstante) {
      wizEstante.innerHTML = '<option value="">Selecciona...</option>';
      wizEstante.value = '';
    }
    if (wizProveedor) {
      wizProveedor.value = '';
      if (wizProvSuggestions) wizProvSuggestions.innerHTML = '';
    }
  }

  function updateEstantesOptionsForSala(sala) {
    if (!ESTANTES_DATA) return;
    const s = (sala || '').trim();
    let arr = [];
    if (s === 'Sexta Calle') arr = (ESTANTES_DATA?.estantes_sexta || []);
    else if (s === 'Centro Comercial') arr = (ESTANTES_DATA?.estantes_cc || []);
    else if (s === 'Avenida Morazán') arr = (ESTANTES_DATA?.estantes_avm || []);
    arr = (arr || []).filter(Boolean);

    // label fijo en HTML, solo actualizamos opciones
    if (wizEstante) wizEstante.innerHTML = '<option value="">Seleccione…</option>' + arr.map(x => `<option value="${x}">${x}</option>`).join('');
  }

  wizTipo?.addEventListener('change', () => {
    resetWizardSteps();
    const tipo = (wizTipo.value || '').trim();
    if (!tipo) return;

    if (tipo === 'Almacén') {
      wizStepAlmacen?.classList.remove('d-none');
      wizProveedorWrap?.classList.remove('d-none');
    } else if (tipo === 'Sala de venta') {
      wizStepSala?.classList.remove('d-none');
      wizStepSalaSel?.classList.remove('d-none');
      wizStepEstante?.classList.remove('d-none');
    }
  });

  wizSala?.addEventListener('change', () => { wizStepEstante?.classList.remove('d-none'); updateEstantesOptionsForSala(wizSala.value); });

  function validateWizard() {
    const tipo = (wizTipo?.value || '').trim();
    if (!tipo) return 'Seleccione el tipo de inventario.';

    if (tipo === 'Almacén') {
      const u = (wizUbicacion?.value || '').trim();
      if (!u) return 'Seleccione la ubicación (Almacén).';
    }

    if (tipo === 'Sala de venta') {
      const d = (wizDependiente?.value || '').trim();
      if (!d) return 'Seleccione el/la dependiente.';
      const s = (wizSala?.value || '').trim();
      if (!s) return 'Seleccione la sala de venta.';
      const e = (wizEstante?.value || '').trim();
      if (!e) return 'Seleccione el estante.';
    }
    return '';
  }

  function buildWizardConfig() {
    const rawTipo = wizTipo ? (wizTipo.value || '').trim() : '';
    const tipoN = _normText(rawTipo);
    const cfg = { tipo: rawTipo };

    if (tipoN === 'almacen') {
      if (wizUbicacion && (wizUbicacion.value || '').trim()) cfg.ubicacion = (wizUbicacion.value || '').trim();
      if (wizProveedor && (wizProveedor.value || '').trim()) cfg.proveedor = (wizProveedor.value || '').trim();
    }

    if (tipoN === 'sala de venta' || tipoN === 'saladeventa' || tipoN === 'sala venta' || tipoN === 'salaventa') {
      if (wizDependiente && (wizDependiente.value || '').trim()) cfg.dependiente = (wizDependiente.value || '').trim();
      if (wizSala && (wizSala.value || '').trim()) cfg.sala = (wizSala.value || '').trim();
      if (wizEstante && (wizEstante.value || '').trim()) cfg.estante = (wizEstante.value || '').trim();
    }

    return cfg;
  } else if (tipo === 'Sala de venta') {
      cfg.dependiente = (wizDependiente?.value || '').trim();
      cfg.sala = (wizSala?.value || '').trim();
      cfg.estante = (wizEstante?.value || '').trim();
      cfg.ubicacion = `${cfg.sala} — ${cfg.estante}`;
    } else if (tipo === 'Averías') {
      cfg.ubicacion = 'Averías';
    }
    return cfg;
  }

  function applyWizardToHiddenInputs(cfg) {
    if (proveedorInput) proveedorInput.value = (cfg.proveedor || '').trim();
    if (ubicacionInput) ubicacionInput.value = (cfg.ubicacion || '').trim();
    setSummaryFromWizard(cfg);
  }

  async function openWizardAndWait() {
    if (!wizardModal) throw new Error('Wizard no disponible.');
    await initWizardData();
    resetWizardSteps();
    if (wizTipo) wizTipo.value = '';
    if (wizProveedor) wizProveedor.value = '';
    if (wizProvSuggestions) wizProvSuggestions.innerHTML = '';
    return new Promise((resolve) => {
      const onStart = () => {
        const err = validateWizard();
        if (err) { Swal.fire('Faltan datos', err, 'info'); return; }
        const cfg = buildWizardConfig();
        cleanup();
        wizardModal.hide();
        resolve(cfg);
      };
      function cleanup() {
        wizStartBtn?.removeEventListener('click', onStart);
      }
      wizStartBtn?.addEventListener('click', onStart);
      wizardModal.show();
    });
  }

  // ===== Sessions =====
  async function createNewSession() {
    const cfg = await openWizardAndWait();
    applyWizardToHiddenInputs(cfg);

    const sessionId = genSessionId();
    const day = getTodayString();
    const clientId = getClientId();

    const payload = {
      tienda: TIENDA,
      day,
      status: 'draft',
      createdBy: clientId,
      createdAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
      updatedAtClient: new Date().toISOString(),
      wizard: cfg,
      proveedor: (cfg.proveedor || '').trim(),
      ubicacion: (cfg.ubicacion || '').trim(),
      items: [],
      totales: { lineas: 0, cantidad_total: 0 }
    };

    await createInventorySession(sessionId, payload);
    CURRENT_SESSION_ID = sessionId;
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);

    CURRENT_SESSION = payload;
    clearUI();
    setReadOnlyMode(false);

    setSessionHeader();
    setSuccess('Inventario iniciado: ' + sessionId);

    await refreshHistoryDays();
    await loadSessionsListForDay(SELECTED_DAY);

    toggleSessionButtons();
    searchInput && searchInput.focus();
  }

  function toggleSessionButtons() {
    const canEdit = !!(CURRENT_SESSION_ID && CURRENT_SESSION && CURRENT_SESSION.status === 'draft' && SELECTED_DAY === getTodayString());
    btnSaveInv && (btnSaveInv.disabled = !canEdit);
    btnFinalizeInv && (btnFinalizeInv.disabled = !canEdit);
    btnSaveToolbar && (btnSaveToolbar.disabled = !canEdit);
    btnFinalizeTb && (btnFinalizeTb.disabled = !canEdit);
    btnClear && (btnClear.disabled = !canEdit);
    updateButtons();
  }

  function buildWizardSnapshot() {
    return {
      tipo: sumTipo?.textContent && sumTipo.textContent !== '-' ? sumTipo.textContent : (CURRENT_SESSION?.wizard?.tipo || ''),
      proveedor: (proveedorInput?.value || '').trim(),
      ubicacion: (ubicacionInput?.value || '').trim(),
      dependiente: sumDependiente?.textContent && sumDependiente.textContent !== '-' ? sumDependiente.textContent : (CURRENT_SESSION?.wizard?.dependiente || ''),
      sala: sumSala?.textContent && sumSala.textContent !== '-' ? sumSala.textContent : (CURRENT_SESSION?.wizard?.sala || ''),
      estante: sumEstante?.textContent && sumEstante.textContent !== '-' ? sumEstante.textContent : (CURRENT_SESSION?.wizard?.estante || '')
    };
  }

  async function saveProgress(showToast = true) {
    if (!CURRENT_SESSION_ID) { Swal.fire('Sin sesión', 'Primero inicia un inventario.', 'info'); return; }
    if (!ubicacionInput?.value.trim()) { Swal.fire('Ubicación requerida', 'Completa el wizard para definir la ubicación.', 'info'); return; }
    if (body.rows.length === 0) { Swal.fire('Sin ítems', 'Agrega al menos un producto.', 'info'); return; }

    const items = getItemsFromUI();
    const payload = {
      updatedAt: getServerTimestamp(),
      updatedAtClient: new Date().toISOString(),
      wizard: buildWizardSnapshot(),
      proveedor: (proveedorInput?.value || '').trim(),
      ubicacion: (ubicacionInput?.value || '').trim(),
      items,
      totales: {
        lineas: Number($('tLineas').textContent),
        cantidad_total: Number($('tCantidad').textContent)
      }
    };

    await updateInventorySession(CURRENT_SESSION_ID, payload);
    CURRENT_SESSION = { ...(CURRENT_SESSION || {}), ...(payload || {}) };
    setSessionHeader();
    if (showToast) Swal.fire('Guardado', 'Progreso guardado.', 'success');
    setSuccess('Progreso guardado.');
    await refreshHistoryDays();
    await loadSessionsListForDay(SELECTED_DAY);
  }

  async function finalizeCurrentSession() {
    if (!CURRENT_SESSION_ID) return;
    if (body.rows.length === 0) { Swal.fire('Sin ítems', 'No puedes finalizar un inventario vacío.', 'info'); return; }

    const res = await Swal.fire({
      title: '¿Finalizar inventario?',
      text: 'Al finalizar, quedará en modo solo lectura.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar'
    });
    if (!res.isConfirmed) return;

    await saveProgress(false);

    await updateInventorySession(CURRENT_SESSION_ID, {
      status: 'final',
      updatedAt: getServerTimestamp(),
      updatedAtClient: new Date().toISOString()
    });

    CURRENT_SESSION.status = 'final';
    setReadOnlyMode(true);
    toggleSessionButtons();
    setSessionHeader();

    Swal.fire('Finalizado', 'Inventario finalizado.', 'success');
    setSuccess('Inventario finalizado.');
    await loadSessionsListForDay(SELECTED_DAY);
  }

  async function tryResumeDraft() {
    const sid = localStorage.getItem(CURRENT_SESSION_KEY) || '';
    if (!sid) return false;
    const data = await loadInventorySession(sid);
    if (!data) return false;
    if (data.status !== 'draft') return false;
    if (String(data.day) !== getTodayString()) return false;

    CURRENT_SESSION_ID = sid;
    CURRENT_SESSION = data;

    applyWizardToHiddenInputs(data.wizard || {});
    renderItemsToUI(data.items || [], false);

    setReadOnlyMode(false);
    setSessionHeader();
    toggleSessionButtons();
    btnResumeInv?.classList.add('d-none');
    setSuccess('Borrador reanudado.');
    return true;
  }

  async function loadSessionToView(sessionId) {
    const data = await loadInventorySession(sessionId);
    if (!data) { Swal.fire('No encontrado', 'No se pudo cargar el inventario.', 'error'); return; }

    CURRENT_SESSION_ID = sessionId;
    CURRENT_SESSION = data;
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);

    applyWizardToHiddenInputs(data.wizard || {});
    const readOnly = (String(data.day) !== getTodayString()) || (data.status === 'final');
    renderItemsToUI(data.items || [], readOnly);

    setSessionHeader();
    toggleSessionButtons();

    if (readOnly) setSuccess('Vista en modo lectura.');
  }

  // ===== History calendar + list =====
  const historyDateEl = $('historyDate');
  const btnToday      = $('btnToday');

  let fpHistory = null;
  let historyDaysSet = new Set();

  async function refreshHistoryDays() {
    const days = await getHistoryDays(TIENDA, 700).catch(() => []);
    historyDaysSet = new Set((days || []).filter(Boolean));
    fpHistory && fpHistory.redraw();
  }

  async function loadSessionsListForDay(day) {
    SELECTED_DAY = day || getTodayString();
    if (!sessionsList) return;

    sessionsList.innerHTML = '';
    const list = await listSessionsByDay(TIENDA, SELECTED_DAY).catch(() => []);
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'list-group-item text-muted';
      empty.textContent = 'Sin inventarios guardados para este día.';
      sessionsList.appendChild(empty);
      return;
    }

    list.forEach(s => {
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
      const status = s.status || 'draft';
      const badge = status === 'final'
        ? '<span class="badge bg-success ms-2">Final</span>'
        : '<span class="badge bg-secondary ms-2">Draft</span>';

      const created = s.createdAtClient || s.updatedAtClient || '';
      const time = created ? created.slice(11,16) : '';

      const tipo = s.wizard?.tipo || '-';
      const ubic = s.ubicacion || s.wizard?.ubicacion || '-';

      a.innerHTML = `
        <div class="me-2">
          <div class="fw-semibold">${tipo} — ${ubic}</div>
          <div class="text-muted small">${time ? (time + ' • ') : ''}${s.id}</div>
        </div>
        ${badge}
      `;
      a.addEventListener('click', () => loadSessionToView(s.id));
      sessionsList.appendChild(a);
    });
  }

  await refreshHistoryDays();

  if (historyDateEl && window.flatpickr) {
    fpHistory = window.flatpickr(historyDateEl, {
      dateFormat: 'Y-m-d',
      defaultDate: SELECTED_DAY,
      locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.es) ? window.flatpickr.l10ns.es : undefined,
      onChange: async (_selectedDates, dateStr) => { if (dateStr) await loadSessionsListForDay(dateStr); },
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        const d = dayElem.dateObj;
        if (!d) return;
        const key = d.toISOString().split('T')[0];
        if (historyDaysSet.has(key)) dayElem.classList.add('has-history');
      }
    });
  }

  btnToday?.addEventListener('click', async () => {
    const today = getTodayString();
    fpHistory ? fpHistory.setDate(today, true) : null;
    await loadSessionsListForDay(today);
  });

  // ===== Buttons wiring =====
  btnStartInv?.addEventListener('click', async () => {
    try {
      if (CURRENT_SESSION_ID) {
        const d = await loadInventorySession(CURRENT_SESSION_ID).catch(() => null);
        if (d && d.status === 'draft' && String(d.day) === getTodayString()) {
          const r = await Swal.fire({
            title: 'Ya hay un borrador',
            text: 'Tienes un inventario en borrador. ¿Deseas reanudarlo o iniciar uno nuevo?',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Reanudar',
            denyButtonText: 'Nuevo',
            cancelButtonText: 'Cancelar'
          });
          if (r.isConfirmed) { await tryResumeDraft(); return; }
          if (!r.isDenied) return;
        }
      }
      await createNewSession();
    } catch (e) {
      Swal.fire('Error', String(e), 'error');
    }
  });

  btnSaveInv?.addEventListener('click', () => saveProgress(true));
  btnFinalizeInv?.addEventListener('click', () => finalizeCurrentSession());
  btnSaveToolbar?.addEventListener('click', () => saveProgress(true));
  btnFinalizeTb?.addEventListener('click', () => finalizeCurrentSession());
  btnResumeInv?.addEventListener('click', () => tryResumeDraft());

  btnClear?.addEventListener('click', async () => {
    if (IS_READONLY) return;
    if (body.rows.length === 0) return;
    const res = await Swal.fire({
      title: '¿Vaciar inventario actual?',
      text: 'Esto limpia la tabla (no finaliza). Puedes guardar progreso luego.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar'
    });
    if (!res.isConfirmed) return;
    body.innerHTML = '';
    recalcTotals();
    updateButtons();
    setSuccess('Tabla vaciada.');
  });

  // ===== Export PDF / Excel =====
  btnPDF?.addEventListener('click', () => exportPDF(false));
  btnPrint?.addEventListener('click', () => exportPDF(true));

  function exportPDF(openWindow) {
    if (body.rows.length === 0) return;
    const jsPDF = window.jspdf.jsPDF;
    const doc   = new jsPDF();
    const fecha = getTodayString();

    const w = buildWizardSnapshot();
    doc.setFontSize(12);
    doc.text('Tienda: ' + TIENDA, 10, 10);
    doc.text('ID: ' + (CURRENT_SESSION_ID || '-'), 10, 18);
    doc.text('Ubicación: ' + (w.ubicacion || '-'), 10, 26);

    let y = 34;
    if (w.proveedor) { doc.text('Proveedor: ' + w.proveedor, 10, y); y += 8; }
    if (w.tipo) { doc.text('Tipo: ' + w.tipo, 10, y); y += 8; }
    if (w.dependiente) { doc.text('Dependiente: ' + w.dependiente, 10, y); y += 8; }
    if (w.sala) { doc.text('Sala: ' + w.sala, 10, y); y += 8; }
    if (w.estante) { doc.text('Estante: ' + w.estante, 10, y); y += 8; }

    const rows = [...body.getElementsByTagName('tr')].map((tr, i) => {
      const qty    = tr.querySelector('.qty')?.value || '';
      const fechaV = tr.querySelector('.vencimiento')?.value || '';
      return [ i + 1, tr.cells[1].innerText, tr.cells[2].innerText, tr.cells[3].innerText, tr.cells[4].innerText, qty, fechaV ];
    });

    doc.autoTable({
      startY: y + 4,
      head: [['#','Código barras','Producto','Cod. Inv.','Bodega','Cant.','F. vencimiento']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 }
    });

    const yy = doc.lastAutoTable.finalY + 6;
    doc.text('Líneas: ' + $('tLineas').textContent + '  |  Cantidad total: ' + $('tCantidad').textContent, 10, yy);

    const name = 'INVENTARIO_' + sanitizeName(TIENDA) + '_' + sanitizeName(w.ubicacion) + '_' + (CURRENT_SESSION_ID || 'SIN_ID') + '_' + fecha + '.pdf';
    if (openWindow) doc.output('dataurlnewwindow');
    else doc.save(name);
  }

  btnExcel?.addEventListener('click', () => {
    if (body.rows.length === 0) return;

    const fechaFis = getTodayString();
    const w = buildWizardSnapshot();
    const ubicacionValor = w.ubicacion || (ubicacionInput ? (ubicacionInput.value || '') : '');

    const data = [[ 'fechafis','idgrupo','idsubgrupo','idarticulo','descrip','codigobarra','cod_unidad','ubicacion','Bodega_5' ]];
    const catalogo = (window.CATALOGO_CACHE || []);

    [...body.getElementsByTagName('tr')].forEach(tr => {
      const codInventUI    = tr.cells[3].innerText.trim();
      const codigoBarrasUI = tr.cells[1].innerText.trim();
      const nombreUI       = tr.cells[2].innerText.trim();
      const qty            = parseNum(tr.querySelector('.qty')?.value);

      let match = null;
      if (catalogo && catalogo.length) {
        match = catalogo.find(r => {
          const idartCatalogo = (r[1] || '').toString().trim();
          const codBarCatalog = (r[3] || '').toString().trim();
          const sameCodInv    = codInventUI && idartCatalogo && idartCatalogo === codInventUI;
          const sameBar       = codigoBarrasUI && codBarCatalog && codBarCatalog === codigoBarrasUI;
          return (sameCodInv && sameBar) || sameBar || sameCodInv;
        }) || null;
      }

      const descrip   = match ? ((match[0] || '').toString().trim() || nombreUI) : nombreUI;
      const idart     = match ? ((match[1] || '').toString().trim() || codInventUI) : codInventUI;
      const codBar    = match ? ((match[3] || '').toString().trim() || codigoBarrasUI) : codigoBarrasUI;
      const idgrupo   = match ? ((match[4] || '').toString().trim()) : '';
      const idsubgr   = match ? ((match[5] || '').toString().trim()) : '';
      const codUnidad = 6;

      data.push([ fechaFis, idgrupo, idsubgr, idart, descrip, codBar, codUnidad, ubicacionValor, qty ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const nombreArchivo =
      'INVENTARIO_' +
      sanitizeName(TIENDA) + '_' +
      sanitizeName(ubicacionValor) + '_' +
      (CURRENT_SESSION_ID || 'SIN_ID') + '_' +
      fechaFis + '.xlsx';

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob  = new Blob([wbout], { type: 'application/octet-stream' });
    const a     = document.createElement('a');
    a.href      = URL.createObjectURL(blob);
    a.download  = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // ===== Initial load =====
  clearUI();
  setReadOnlyMode(true);
  setSummaryFromWizard({});
  setSessionHeader();

  await loadSessionsListForDay(SELECTED_DAY);

  (async () => {
    const sid = localStorage.getItem(CURRENT_SESSION_KEY) || '';
    if (!sid) return;
    const data = await loadInventorySession(sid).catch(() => null);
    if (data && data.status === 'draft' && String(data.day) === getTodayString()) {
      btnResumeInv && btnResumeInv.classList.remove('d-none');
    }
  })();

  toggleSessionButtons();
  updateButtons();
});
