
document.addEventListener('DOMContentLoaded', async () => {
  const IVA = 0.13;
  const ACTIVE_KEY = 'TR_RECEPCION_ACTIVE';
  const $ = (id) => document.getElementById(id);

  const fechaEl = $('fechaRecepcion');
  const modeLabel = $('modeLabel');
  const activeReceptionLabel = $('activeReceptionLabel');
  const successMessage = $('successMessage');
  const historyDateInput = $('historyDate');
  const btnToday = $('btnToday');
  const historyHint = $('historyHint');
  const listWrap = $('receptionsList');

  const proveedorInput = $('proveedorInput');
  const numCreditoInput = $('numCreditoInput');
  const searchInput = $('searchInput');
  const provSuggestions = $('provSuggestions');
  const suggestions = $('suggestions');

  const body = $('recepcionBody');
  const btnNew = $('btnNewReception');
  const btnSave = $('saveReception');
  const btnFinalize = $('finalizeReception');
  const btnCancel = $('cancelReception');
  const btnClearDraft = $('clearDraft');
  const btnPDF = $('exportPDF');
  const btnPrint = $('printPDF');
  const btnExcel = $('exportExcel');

  const receptionActionsAnchor = $('receptionActionsAnchor');
  const receptionActionsGroup = $('receptionActionsGroup');
  const mobileReceptionDock = $('mobileReceptionDock');

  const btnScan = $('btnScan');
  const scanWrap = $('scanWrap');
  const scanVideo = $('scanVideo');
  const btnScanStop = $('btnScanStop');
  const fileScan = $('fileScan');

  const manualModalEl = $('manualModal');
  const manualModal = new bootstrap.Modal(manualModalEl);
  const mCodigo = $('mCodigo');
  const mNombre = $('mNombre');
  const mCodInv = $('mCodInv');
  const mCantidad = $('mCantidad');
  const mTotalSin = $('mTotalSin');
  const btnAddManual = $('btnAddManual');

  function syncReceptionActionsPlacement() {
    if (!receptionActionsAnchor || !receptionActionsGroup || !mobileReceptionDock) return;

    const shouldDock = window.matchMedia('(max-width: 991.98px)').matches;
    const target = shouldDock ? mobileReceptionDock : receptionActionsAnchor;

    if (receptionActionsGroup.parentElement !== target) {
      target.appendChild(receptionActionsGroup);
    }

    receptionActionsGroup.classList.toggle('is-mobile-docked', shouldDock);
  }

  let SELECTED_DATE = getTodayString();
  let CURRENT_RECEPTION_ID = null;
  let CURRENT_STATUS = null;
  let historySet = new Set();
  let fpHistory = null;
  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  function parseNum(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fix2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function fmtDateTime(v) {
    if (!v) return '';
    try {
      if (typeof v.toDate === 'function') return v.toDate().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
    } catch (_) {
      return '';
    }
  }

  function sanitizeName(s) {
    return (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^\w\-.]/g, '_');
  }

  function showMessage(text, ok = true) {
    if (!successMessage) return;
    successMessage.textContent = text;
    successMessage.className = `${ok ? 'text-success' : 'text-danger'} small mt-3 mb-0`;
    successMessage.style.display = text ? 'block' : 'none';
    if (text) {
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3500);
    }
  }

  function setHeaderDate() {
    if (!fechaEl) return;
    fechaEl.textContent = `Fecha de trabajo: ${new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })}`;
  }

  function isEditable() {
    return SELECTED_DATE === getTodayString() && !!CURRENT_RECEPTION_ID && CURRENT_STATUS === 'draft';
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
    if (t === searchInput || t.classList.contains('qty') || t.classList.contains('totalSin')) {
      centerOnElement(t);
    }
  });

  syncReceptionActionsPlacement();
  const receptionDockMedia = window.matchMedia('(max-width: 991.98px)');
  if (typeof receptionDockMedia.addEventListener === 'function') {
    receptionDockMedia.addEventListener('change', syncReceptionActionsPlacement);
  } else if (typeof receptionDockMedia.addListener === 'function') {
    receptionDockMedia.addListener(syncReceptionActionsPlacement);
  }
  window.addEventListener('orientationchange', syncReceptionActionsPlacement);

  function setControlsState() {
    const editable = isEditable();
    const hasItems = body.rows.length > 0;
    const hasActive = !!CURRENT_RECEPTION_ID;
    const readOnly = hasActive && !editable;

    proveedorInput.disabled = !editable;
    numCreditoInput.disabled = !editable;
    searchInput.disabled = !editable;
    $('btnOpenManual').disabled = !editable;
    btnScan.disabled = !editable;

    btnSave.disabled = !editable;
    btnFinalize.disabled = !editable || !hasItems;
    btnCancel.disabled = !hasActive || CURRENT_STATUS !== 'draft';
    btnClearDraft.disabled = !editable || (!hasItems && !(proveedorInput.value.trim() || numCreditoInput.value.trim()));

    btnPDF.disabled = !hasItems;
    btnPrint.disabled = !hasItems;
    btnExcel.disabled = !hasItems;

    body.classList.toggle('readonly-mask', readOnly);

    [...body.querySelectorAll('input')].forEach((input) => {
      input.disabled = !editable;
    });
    [...body.querySelectorAll('.btn-delete-row')].forEach((btn) => {
      btn.disabled = !editable;
    });

    if (!CURRENT_RECEPTION_ID) {
      modeLabel.textContent = SELECTED_DATE === getTodayString() ? 'Sin recepción activa' : 'Sin recepción abierta';
      modeLabel.className = 'badge text-bg-secondary';
      activeReceptionLabel.textContent = '';
      return;
    }

    if (CURRENT_STATUS === 'draft') {
      modeLabel.textContent = editable ? 'Borrador activo' : 'Borrador en solo lectura';
      modeLabel.className = 'badge text-bg-warning';
    } else if (CURRENT_STATUS === 'completed') {
      modeLabel.textContent = 'Recepción finalizada';
      modeLabel.className = 'badge text-bg-success';
    } else if (CURRENT_STATUS === 'cancelled') {
      modeLabel.textContent = 'Recepción cancelada';
      modeLabel.className = 'badge text-bg-danger';
    } else {
      modeLabel.textContent = CURRENT_STATUS || 'Recepción';
      modeLabel.className = 'badge text-bg-secondary';
    }

    activeReceptionLabel.textContent = CURRENT_RECEPTION_ID ? `ID: ${CURRENT_RECEPTION_ID}` : '';
  }

  function updateTotals() {
    let lineas = 0;
    let cantidad = 0;
    let totalSin = 0;
    let totalCon = 0;

    [...body.rows].forEach((tr, idx) => {
      tr.querySelector('.row-index').textContent = String(body.rows.length - idx);

      const qtyInput = tr.querySelector('.qty');
      const totalSinInput = tr.querySelector('.totalSin');
      const unitCon = tr.querySelector('.unitCon');
      const unitSin = tr.querySelector('.unitSin');

      const qty = parseNum(qtyInput.value);
      const lineTotalSin = parseNum(totalSinInput.value);

      const safeQty = qty > 0 ? qty : 0;
      const safeTotalSin = lineTotalSin > 0 ? lineTotalSin : 0;
      const perUnitSin = safeQty ? safeTotalSin / safeQty : 0;
      const perUnitCon = perUnitSin * (1 + IVA);

      unitSin.value = perUnitSin ? fix2(perUnitSin).toFixed(2) : '';
      unitCon.value = perUnitCon ? fix2(perUnitCon).toFixed(2) : '';

      lineas += 1;
      cantidad += safeQty;
      totalSin += safeTotalSin;
      totalCon += safeTotalSin * (1 + IVA);
    });

    $('tLineas').textContent = String(lineas);
    $('tCantidad').textContent = String(cantidad);
    $('tSinIva').textContent = fix2(totalSin).toFixed(2);
    $('tConIva').textContent = fix2(totalCon).toFixed(2);
    setControlsState();
  }

  function clearEditor() {
    body.innerHTML = '';
    proveedorInput.value = '';
    numCreditoInput.value = '';
    searchInput.value = '';
    suggestions.innerHTML = '';
    provSuggestions.innerHTML = '';
    updateTotals();
  }

  function getPayload() {
    const items = [...body.getElementsByTagName('tr')].map((tr) => {
      const qty = parseNum(tr.querySelector('.qty').value);
      const totalSin = parseNum(tr.querySelector('.totalSin').value);
      const unitSin = parseNum(tr.querySelector('.unitSin').value);
      const unitCon = parseNum(tr.querySelector('.unitCon').value);

      return {
        codigo_barras: tr.cells[1].innerText.trim(),
        nombre: tr.cells[2].innerText.trim(),
        codigo_inventario: tr.cells[3].innerText.trim(),
        cantidad: qty,
        unit_con_iva: fix2(unitCon),
        unit_sin_iva: fix2(unitSin),
        total_sin_iva: fix2(totalSin),
        total_con_iva: fix2(totalSin * (1 + IVA))
      };
    });

    return {
      proveedor: proveedorInput.value.trim(),
      numeroCreditoFiscal: numCreditoInput.value.trim(),
      tienda: 'AVENIDA MORAZÁN',
      fechaRecepcion: new Date().toISOString(),
      items,
      totales: {
        lineas: Number($('tLineas').textContent || 0),
        cantidad_total: Number($('tCantidad').textContent || 0),
        total_sin_iva: Number($('tSinIva').textContent || 0),
        total_con_iva: Number($('tConIva').textContent || 0)
      }
    };
  }

  function addRow({ barcode = '', nombre = '', codInvent = 'N/A', cantidad = '', totalSin = 0 } = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center row-index"></td>
      <td>${barcode}</td>
      <td>${nombre}</td>
      <td>${codInvent || 'N/A'}</td>
      <td><input type="number" class="form-control form-control-sm text-center qty" min="0" step="1" value="${cantidad !== '' ? cantidad : ''}"></td>
      <td><input type="number" class="form-control form-control-sm text-center totalSin" min="0" step="0.01" value="${totalSin ? fix2(totalSin).toFixed(2) : ''}"></td>
      <td><input type="text" class="form-control form-control-sm text-center unitCon bg-light" readonly></td>
      <td><input type="text" class="form-control form-control-sm text-center unitSin bg-light" readonly></td>
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-row" title="Eliminar ítem">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    body.prepend(tr);

    const qty = tr.querySelector('.qty');
    const totalSinInput = tr.querySelector('.totalSin');
    const delBtn = tr.querySelector('.btn-delete-row');

    const recalcRow = () => updateTotals();
    qty.addEventListener('input', recalcRow);
    totalSinInput.addEventListener('input', recalcRow);

    qty.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        totalSinInput.focus();
      }
    });
    totalSinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    delBtn.addEventListener('click', () => {
      Swal.fire({
        title: '¿Eliminar ítem?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar'
      }).then((res) => {
        if (res.isConfirmed) {
          tr.remove();
          updateTotals();
        }
      });
    });

    updateTotals();
    qty.focus();
  }

  function addRowAndFocus({ barcode, nombre, codInvent }) {
    if (!isEditable()) return;
    addRow({ barcode, nombre, codInvent });
    searchInput.value = '';
    suggestions.innerHTML = '';
  }

  function renderReception(record) {
    clearEditor();
    if (!record || !record.receptionId) {
      setControlsState();
      return;
    }

    proveedorInput.value = record.proveedor || '';
    numCreditoInput.value = record.numeroCreditoFiscal || '';

    (record.items || []).forEach((it) => {
      addRow({
        barcode: it.codigo_barras || '',
        nombre: it.nombre || '',
        codInvent: it.codigo_inventario || 'N/A',
        cantidad: it.cantidad ?? '',
        totalSin: Number(it.total_sin_iva || 0)
      });
    });

    updateTotals();
  }

  async function openReception(dateStr, receptionId) {
    const record = await loadReceptionById(dateStr, receptionId);
    if (!record || !record.receptionId) {
      Swal.fire('No encontrada', 'No se pudo cargar la recepción seleccionada.', 'error');
      return;
    }

    SELECTED_DATE = dateStr;
    CURRENT_RECEPTION_ID = record.receptionId;
    CURRENT_STATUS = record.status || 'draft';
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: dateStr, receptionId: CURRENT_RECEPTION_ID }));
    renderReception(record);
    setControlsState();
    await renderReceptionsList();
  }

  async function renderReceptionsList() {
    const items = await listReceptionsByDate(SELECTED_DATE);
    listWrap.innerHTML = '';

    if (!items.length) {
      listWrap.innerHTML = '<div class="text-muted small py-2 px-1">No hay recepciones para esta fecha.</div>';
      if (historyHint) historyHint.textContent = 'No se encontraron recepciones registradas para la fecha seleccionada.';
      return;
    }

    if (historyHint) historyHint.textContent = `${items.length} recepción(es) registradas para ${SELECTED_DATE}.`;

    items.forEach((item) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'reception-item w-100 text-start bg-white';
      if (item.receptionId === CURRENT_RECEPTION_ID) div.classList.add('active');

      const statusClass = item.status === 'completed'
        ? 'text-bg-success'
        : item.status === 'cancelled'
          ? 'text-bg-danger'
          : 'text-bg-warning';

      const provider = item.proveedor || 'Sin proveedor';
      const amount = item.totales?.total_sin_iva ? `$${Number(item.totales.total_sin_iva).toFixed(2)}` : '$0.00';
      const lines = item.totales?.lineas || 0;

      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="title">${provider}</div>
          <span class="badge ${statusClass}">${item.status || 'draft'}</span>
        </div>
        <div class="meta mt-1">${item.receptionId}</div>
        <div class="meta mt-1">Líneas: ${lines} · Total sin IVA: ${amount}</div>
        <div class="meta">${fmtDateTime(item.updatedAt) || SELECTED_DATE}</div>
      `;
      div.addEventListener('click', async () => {
        if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
        await openReception(SELECTED_DATE, item.receptionId);
      });
      listWrap.appendChild(div);
    });
  }

  async function refreshHistoryDates() {
    const dates = await getHistoryDates();
    historySet = new Set((dates || []).filter(Boolean));
    if (fpHistory) fpHistory.redraw();
  }

  function addActiveProv(items, provFocus) {
    if (!items || !items.length) return provFocus;
    [...items].forEach((x) => x.classList.remove('active'));
    if (provFocus >= items.length) provFocus = 0;
    if (provFocus < 0) provFocus = items.length - 1;
    items[provFocus].classList.add('active');
    items[provFocus].scrollIntoView({ block: 'nearest' });
    return provFocus;
  }

  let provFocus = -1;
  await preloadProviders().catch(() => {});
  proveedorInput.addEventListener('input', () => {
    const q = (proveedorInput.value || '').trim().toLowerCase();
    provSuggestions.innerHTML = '';
    provFocus = -1;
    if (!q) return;

    loadProvidersFromGoogleSheets().then((list) => {
      (list || [])
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 50)
        .forEach((name) => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.textContent = name;
          li.addEventListener('click', () => {
            proveedorInput.value = name;
            provSuggestions.innerHTML = '';
          });
          provSuggestions.appendChild(li);
        });

      if (!provSuggestions.children.length) {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-light no-results';
        li.textContent = 'Sin resultados. Escriba el nombre completo del proveedor.';
        provSuggestions.appendChild(li);
      }
    }).catch(() => {});
  });

  proveedorInput.addEventListener('keydown', (e) => {
    const items = provSuggestions.getElementsByTagName('li');
    if (e.key === 'ArrowDown') {
      provFocus += 1;
      provFocus = addActiveProv(items, provFocus);
    } else if (e.key === 'ArrowUp') {
      provFocus -= 1;
      provFocus = addActiveProv(items, provFocus);
    } else if (e.key === 'Enter' && provFocus > -1 && items[provFocus]) {
      e.preventDefault();
      items[provFocus].click();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target === proveedorInput || provSuggestions.contains(target)) return;
    provSuggestions.innerHTML = '';
    provFocus = -1;
  });

  function openManualModalFromSearch(rawQuery) {
    const q = (rawQuery || '').trim();
    mCodigo.value = '';
    mNombre.value = '';
    mCodInv.value = 'N/A';
    mCantidad.value = '';
    mTotalSin.value = '';

    if (q) {
      if (/^\d+$/.test(q)) mCodigo.value = q;
      else mNombre.value = q;
    }

    manualModal.show();
    setTimeout(() => mCodigo.focus(), 200);
  }

  $('btnOpenManual').addEventListener('click', () => {
    openManualModalFromSearch((searchInput.value || '').trim());
  });

  const modalInputs = [mCodigo, mNombre, mCodInv, mCantidad, mTotalSin];
  modalInputs.forEach((inp, idx) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx < modalInputs.length - 1) {
          modalInputs[idx + 1].focus();
        } else {
          btnAddManual.click();
        }
      }
    });
  });

  btnAddManual.addEventListener('click', () => {
    if (!isEditable()) return;
    const codigo = (mCodigo.value || '').trim();
    const nombre = (mNombre.value || '').trim();
    const codInv = (mCodInv.value || 'N/A').trim() || 'N/A';
    const qty = parseNum(mCantidad.value);
    const tSin = parseNum(mTotalSin.value);

    if (!codigo || !nombre) {
      Swal.fire('Campos faltantes', 'Ingrese código de barra y nombre.', 'info');
      return;
    }
    if (!(qty > 0)) {
      Swal.fire('Cantidad inválida', 'La cantidad debe ser mayor que 0.', 'warning');
      return;
    }
    if (!(tSin >= 0)) {
      Swal.fire('Costo inválido', 'El costo total sin IVA debe ser 0 o mayor.', 'warning');
      return;
    }

    addRow({ barcode: codigo, nombre, codInvent: codInv, cantidad: qty, totalSin: tSin });
    manualModal.hide();
    searchInput.focus();
  });

  let currentFocus = -1;
  await preloadCatalog().catch(() => {});

  function addActive(items) {
    if (!items || !items.length) return;
    [...items].forEach((x) => x.classList.remove('active'));
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('active');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('input', () => {
    const raw = (searchInput.value || '').replace(/\r|\n/g, '').trim();
    const q = raw.toLowerCase();
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (!q) return;

    loadProductsFromGoogleSheets().then((rows) => {
      const filtered = (rows || []).filter((r) => {
        const nombre = String(r?.[0] || '').toLowerCase();
        const codInvent = String(r?.[1] || '').toLowerCase();
        const barcode = String(r?.[3] || '').toLowerCase();
        return nombre.includes(q) || barcode.includes(q) || codInvent.includes(q);
      });

      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-light no-results';
        li.innerHTML = '<strong>Sin resultados</strong>. Usa el botón + para agregar producto manual.';
        suggestions.appendChild(li);
        return;
      }

      filtered.slice(0, 50).forEach((prod) => {
        const nombre = prod?.[0] || '';
        const codInvent = prod?.[1] || 'N/A';
        const barcode = prod?.[3] || 'sin código';
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${nombre} (${barcode}) [${codInvent}]`;
        li.addEventListener('click', () => addRowAndFocus({ barcode, nombre, codInvent }));
        suggestions.appendChild(li);
      });
    }).catch(() => {});
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = suggestions.getElementsByTagName('li');
    if (e.key === 'ArrowDown') {
      currentFocus += 1;
      addActive(items);
    } else if (e.key === 'ArrowUp') {
      currentFocus -= 1;
      addActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1 && items[currentFocus]) {
        items[currentFocus].click();
        return;
      }

      const raw = (searchInput.value || '').replace(/\r|\n/g, '').trim();
      if (!raw) return;

      const rows = window.CATALOGO_CACHE || [];
      let match = null;
      for (const r of rows) {
        const barcode = r?.[3] ? String(r[3]).trim() : '';
        const codInvent = r?.[1] ? String(r[1]).trim() : '';
        if (barcode === raw || codInvent === raw) {
          match = r;
          break;
        }
      }
      if (match) {
        addRowAndFocus({
          barcode: match[3] || raw,
          nombre: match[0] || '',
          codInvent: match[1] || 'N/A'
        });
      }
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target === searchInput || suggestions.contains(target)) return;
    suggestions.innerHTML = '';
    currentFocus = -1;
  });

  async function stopScanner() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    scanWrap.classList.remove('active');
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    if (!searchInput) return;
    searchInput.value = code;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    searchInput.dispatchEvent(event);
  }

  async function startScanner() {
    if (!isEditable()) return;

    if (!('BarcodeDetector' in window)) {
      Swal.fire(
        'Escáner limitado',
        'Este navegador no soporta escaneo en vivo. Usa la opción de archivo o la pistola de códigos.',
        'info'
      );
      if (fileScan) fileScan.click();
      return;
    }

    try {
      detector = new window.BarcodeDetector({
        formats: ['ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'upc_e']
      });
    } catch (_error) {
      detector = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      scanVideo.srcObject = mediaStream;
      await scanVideo.play();
      scanWrap.classList.add('active');

      if (detector) {
        if (scanInterval) clearInterval(scanInterval);
        scanInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(scanVideo);
            if (barcodes?.length) {
              const raw = String(barcodes[0].rawValue || '').trim();
              if (raw) await onBarcodeFound(raw);
            }
          } catch (_) {}
        }, 250);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Cámara no disponible', 'No se pudo acceder a la cámara.', 'error');
    }
  }

  if (fileScan) {
    fileScan.addEventListener('change', async () => {
      const f = fileScan.files?.[0];
      if (!f) return;
      const match = (f.name || '').match(/\d{8,}/);
      if (match) {
        searchInput.value = match[0];
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        searchInput.dispatchEvent(event);
      } else {
        Swal.fire(
          'Atención',
          'No se pudo leer el código desde la imagen. Prueba con la cámara o la pistola.',
          'info'
        );
      }
      fileScan.value = '';
    });
  }

  btnScan.addEventListener('click', startScanner);
  btnScanStop.addEventListener('click', stopScanner);

  btnNew.addEventListener('click', async () => {
    if (CURRENT_RECEPTION_ID && CURRENT_STATUS === 'draft' && isEditable() && (body.rows.length > 0 || proveedorInput.value.trim() || numCreditoInput.value.trim())) {
      const res = await Swal.fire({
        title: 'Hay un borrador activo',
        text: 'Crear una nueva recepción limpiará el editor actual. El borrador actual seguirá guardado si ya lo habías guardado.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Crear nueva'
      });
      if (!res.isConfirmed) return;
    }

    const created = await createReceptionDraft(getTodayString());
    SELECTED_DATE = getTodayString();
    CURRENT_RECEPTION_ID = created.receptionId;
    CURRENT_STATUS = 'draft';
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: SELECTED_DATE, receptionId: CURRENT_RECEPTION_ID }));
    if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
    clearEditor();
    setControlsState();
    await refreshHistoryDates();
    await renderReceptionsList();
    showMessage(`Nueva recepción creada: ${CURRENT_RECEPTION_ID}`);
  });

  btnSave.addEventListener('click', async () => {
    if (!CURRENT_RECEPTION_ID || !isEditable()) return;
    if (!proveedorInput.value.trim()) {
      Swal.fire('Proveedor requerido', 'Ingrese o seleccione un proveedor.', 'info');
      return;
    }
    if (!numCreditoInput.value.trim()) {
      Swal.fire('Crédito Fiscal requerido', 'Ingrese el número de crédito fiscal.', 'info');
      return;
    }
    if (body.rows.length === 0) {
      Swal.fire('Sin ítems', 'Agregue al menos un producto.', 'error');
      return;
    }

    await saveReceptionDraft(SELECTED_DATE, CURRENT_RECEPTION_ID, getPayload());
    await refreshHistoryDates();
    await renderReceptionsList();
    showMessage('Avance guardado correctamente.');
    Swal.fire('Guardado', 'La recepción se guardó como borrador.', 'success');
  });

  btnFinalize.addEventListener('click', async () => {
    if (!CURRENT_RECEPTION_ID || !isEditable()) return;
    if (!proveedorInput.value.trim()) {
      Swal.fire('Proveedor requerido', 'Ingrese o seleccione un proveedor.', 'info');
      return;
    }
    if (!numCreditoInput.value.trim()) {
      Swal.fire('Crédito Fiscal requerido', 'Ingrese el número de crédito fiscal.', 'info');
      return;
    }
    if (body.rows.length === 0) {
      Swal.fire('Sin ítems', 'Agregue al menos un producto.', 'error');
      return;
    }

    const res = await Swal.fire({
      title: '¿Finalizar recepción?',
      text: 'Después quedará en solo lectura.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar'
    });
    if (!res.isConfirmed) return;

    await finalizeReception(SELECTED_DATE, CURRENT_RECEPTION_ID, getPayload());
    CURRENT_STATUS = 'completed';
    setControlsState();
    await refreshHistoryDates();
    await renderReceptionsList();
    showMessage('Recepción finalizada.');
    Swal.fire('Finalizada', 'La recepción quedó cerrada.', 'success');
  });

  btnCancel.addEventListener('click', async () => {
    if (!CURRENT_RECEPTION_ID || CURRENT_STATUS !== 'draft') return;
    const res = await Swal.fire({
      title: '¿Cancelar recepción?',
      text: 'La recepción quedará marcada como cancelada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar'
    });
    if (!res.isConfirmed) return;

    await cancelReception(SELECTED_DATE, CURRENT_RECEPTION_ID, getPayload());
    CURRENT_STATUS = 'cancelled';
    setControlsState();
    await refreshHistoryDates();
    await renderReceptionsList();
    showMessage('Recepción cancelada.');
    Swal.fire('Cancelada', 'La recepción fue cancelada.', 'success');
  });

  btnClearDraft.addEventListener('click', async () => {
    if (!isEditable()) return;
    if (body.rows.length === 0 && !(proveedorInput.value.trim() || numCreditoInput.value.trim())) return;

    const res = await Swal.fire({
      title: '¿Vaciar borrador?',
      text: 'Se limpiará el contenido del borrador actual pero se conservará la misma recepción.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar'
    });
    if (!res.isConfirmed) return;

    clearEditor();
    await saveReceptionDraft(SELECTED_DATE, CURRENT_RECEPTION_ID, getPayload());
    await renderReceptionsList();
    showMessage('Borrador vaciado.');
  });

  function exportPDF(openWindow) {
    if (body.rows.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fecha = SELECTED_DATE || getTodayString();

    doc.setFontSize(14);
    doc.text('TRRecepción — Avenida Morazán', 10, 10);
    doc.setFontSize(10);
    doc.text(`Proveedor: ${proveedorInput.value || '-'}`, 10, 18);
    doc.text(`Crédito Fiscal: ${numCreditoInput.value || '-'}`, 10, 26);
    doc.text(`Fecha: ${fecha}`, 10, 34);
    doc.text(`Recepción ID: ${CURRENT_RECEPTION_ID || '-'}`, 10, 42);

    const rows = [...body.getElementsByTagName('tr')].map((tr, i) => ([
      i + 1,
      tr.cells[1].innerText,
      tr.cells[2].innerText,
      tr.cells[3].innerText,
      tr.querySelector('.qty').value,
      (parseNum(tr.querySelector('.unitSin').value)).toFixed(2),
      (parseNum(tr.querySelector('.unitCon').value)).toFixed(2),
      (parseNum(tr.querySelector('.totalSin').value)).toFixed(2),
      (parseNum(tr.querySelector('.totalSin').value) * (1 + IVA)).toFixed(2)
    ]));

    doc.autoTable({
      startY: 48,
      head: [['#', 'Código Barras', 'Producto', 'Cod. Inv.', 'Cant.', 'Ud. sin IVA', 'Ud. con IVA', 'Total sin IVA', 'Total con IVA']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 }
    });

    const y = doc.lastAutoTable.finalY + 6;
    doc.text(
      `Líneas: ${$('tLineas').textContent}  |  Cantidad total: ${$('tCantidad').textContent}  |  Total sin IVA: $${$('tSinIva').textContent}  |  Total con IVA: $${$('tConIva').textContent}`,
      10,
      y
    );

    const name = `${sanitizeName(proveedorInput.value)}_${sanitizeName(numCreditoInput.value)}_${fecha}_${sanitizeName(CURRENT_RECEPTION_ID)}_RECEPCION_AVM.pdf`;
    if (openWindow) doc.output('dataurlnewwindow');
    else doc.save(name);
  }

  btnPDF.addEventListener('click', () => exportPDF(false));
  btnPrint.addEventListener('click', () => exportPDF(true));

  btnExcel.addEventListener('click', () => {
    if (body.rows.length === 0) return;
    const fecha = SELECTED_DATE || getTodayString();
    const data = [['codigo', 'unidad', 'cantidad', 'totalcosto']];

    [...body.getElementsByTagName('tr')].forEach((tr) => {
      const codInvent = String(tr.cells[3].innerText || '');
      const qty = parseNum(tr.querySelector('.qty').value);
      const totalSin = parseNum(tr.querySelector('.totalSin').value);
      data.push([codInvent, 6, Number(qty), Number(fix2(totalSin))]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Recepcion');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sanitizeName(proveedorInput.value)}_${sanitizeName(numCreditoInput.value)}_${fecha}_${sanitizeName(CURRENT_RECEPTION_ID)}_RECEPCION_AVM.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  if (historyDateInput && window.flatpickr) {
    const flatpickrLocaleEs = window.flatpickr?.l10ns?.es || undefined;

    fpHistory = window.flatpickr(historyDateInput, {
      dateFormat: 'Y-m-d',
      defaultDate: SELECTED_DATE,
      ...(flatpickrLocaleEs ? { locale: flatpickrLocaleEs } : {}),
      onChange: async (_sel, dateStr) => {
        SELECTED_DATE = dateStr || getTodayString();
        CURRENT_RECEPTION_ID = null;
        CURRENT_STATUS = null;
        clearEditor();
        setControlsState();
        await renderReceptionsList();
      },
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        try {
          const key = dayElem.dateObj.toLocaleDateString('en-CA');
          if (historySet.has(key)) dayElem.classList.add('has-history');
        } catch (_) {}
      }
    });
  }

  btnToday.addEventListener('click', async () => {
    SELECTED_DATE = getTodayString();
    CURRENT_RECEPTION_ID = null;
    CURRENT_STATUS = null;
    clearEditor();
    setControlsState();
    if (fpHistory) fpHistory.setDate(SELECTED_DATE, true);
    else await renderReceptionsList();
  });

  await refreshHistoryDates();
  setHeaderDate();

  const activeRaw = localStorage.getItem(ACTIVE_KEY);
  if (activeRaw) {
    try {
      const active = JSON.parse(activeRaw);
      if (active?.date && active?.receptionId) {
        SELECTED_DATE = active.date;
        if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
        await renderReceptionsList();
        await openReception(active.date, active.receptionId);
      } else {
        await renderReceptionsList();
      }
    } catch (_) {
      await renderReceptionsList();
    }
  } else {
    await renderReceptionsList();
  }

  setControlsState();
  searchInput.focus();

  window.addEventListener('beforeunload', () => {
    stopScanner();
  });
});
