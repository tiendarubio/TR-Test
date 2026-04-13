document.addEventListener('DOMContentLoaded', async () => {
  const ACTIVE_KEY = 'TR_INVENTARIO_ACTIVE_V2';
  const $ = (id) => document.getElementById(id);

  const fechaEl = $('fechaInventario');
  const modeLabel = $('modeLabel');
  const activeInventoryLabel = $('activeInventoryLabel');
  const successMessage = $('successMessage');
  const historyDateInput = $('historyDate');
  const btnToday = $('btnToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const historyHint = $('historyHint');
  const histViewModeText = $('histViewModeText');
  const listWrap = $('inventoriesList');

  const proveedorInput = $('proveedorInput');
  const ubicacionInput = $('ubicacionInput');
  const searchInput = $('searchInput');
  const provSuggestions = $('provSuggestions');
  const suggestions = $('suggestions');

  const body = $('recepcionBody');
  const btnNew = $('btnNewInventory');
  const btnSave = $('saveInventory');
  const btnFinalize = $('finalizeInventory');
  const btnCancel = $('cancelInventory');
  const btnClearDraft = $('clearDraft');
  const btnPDF = $('exportPDF');
  const btnPrint = $('printPDF');
  const btnExcel = $('exportExcel');

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
  const mBodega = $('mBodega');
  const mVencimiento = $('mVencimiento');
  const mCantidad = $('mCantidad');
  const btnAddManual = $('btnAddManual');

  let SELECTED_DATE = getTodayString();
  let CURRENT_INVENTORY_ID = null;
  let CURRENT_STATUS = null;
  let historySet = new Set();
  let fpHistory = null;
  let historicalUnlockEnabled = false;
  let mediaStream = null;
  let scanInterval = null;
  let detector = null;

  function parseNum(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
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

  function isHistoricalDateSelected() {
    const today = getTodayString();
    return !!(SELECTED_DATE && today && SELECTED_DATE !== today);
  }

  function isPastHistoricalDateSelected() {
    const today = getTodayString();
    return !!(SELECTED_DATE && today && SELECTED_DATE < today);
  }

  function canEditHistoricalInventory() {
    return !!(CURRENT_INVENTORY_ID && isPastHistoricalDateSelected() && historicalUnlockEnabled);
  }

  function isEditable() {
    if (!CURRENT_INVENTORY_ID) return false;
    if (SELECTED_DATE === getTodayString()) {
      return CURRENT_STATUS === 'draft';
    }
    return canEditHistoricalInventory();
  }

  function updateHistoricalLockUI() {
    if (btnToday) {
      const isHistorical = isHistoricalDateSelected();
      btnToday.disabled = !isHistorical;
      btnToday.setAttribute('aria-disabled', String(!isHistorical));
    }

    if (!btnToggleHistLock) return;

    const isPastHistorical = isPastHistoricalDateSelected();
    const hasActiveInventory = !!CURRENT_INVENTORY_ID;

    btnToggleHistLock.classList.toggle('d-none', !isPastHistorical);
    btnToggleHistLock.disabled = !isPastHistorical || !hasActiveInventory;
    btnToggleHistLock.setAttribute('aria-disabled', String(btnToggleHistLock.disabled));
    btnToggleHistLock.classList.remove('btn-outline-warning', 'btn-outline-success', 'btn-outline-secondary');

    if (!isPastHistorical) {
      btnToggleHistLock.classList.add('btn-outline-secondary');
      btnToggleHistLock.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-1"></i>Desbloquear histórico';
      return;
    }

    if (historicalUnlockEnabled) {
      btnToggleHistLock.classList.add('btn-outline-success');
      btnToggleHistLock.innerHTML = '<i class="fa-solid fa-lock me-1"></i>Bloquear histórico';
      return;
    }

    btnToggleHistLock.classList.add('btn-outline-warning');
    btnToggleHistLock.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-1"></i>Desbloquear histórico';
  }

  function setHistoricalViewMode() {
    const isHistorical = isHistoricalDateSelected();
    const hasInventory = !!CURRENT_INVENTORY_ID;

    if (histViewModeText) {
      histViewModeText.classList.remove('text-muted', 'text-primary', 'text-success');

      if (!isHistorical) {
        histViewModeText.textContent = 'Modo: inventario del día actual (editable si está en borrador).';
        histViewModeText.classList.add('text-muted');
      } else if (!hasInventory) {
        histViewModeText.textContent = SELECTED_DATE
          ? `Modo histórico (${SELECTED_DATE}): selecciona un inventario para ver su detalle.`
          : 'Modo histórico: selecciona un inventario para ver su detalle.';
        histViewModeText.classList.add('text-primary');
      } else if (historicalUnlockEnabled) {
        histViewModeText.textContent = SELECTED_DATE
          ? `Modo histórico (${SELECTED_DATE}): edición habilitada temporalmente.`
          : 'Modo histórico: edición habilitada temporalmente.';
        histViewModeText.classList.add('text-success');
      } else {
        histViewModeText.textContent = SELECTED_DATE
          ? `Modo histórico (${SELECTED_DATE}): solo lectura.`
          : 'Modo histórico: solo lectura.';
        histViewModeText.classList.add('text-primary');
      }
    }

    if (!canEditHistoricalInventory() && mediaStream) {
      stopScanner();
    }

    updateHistoricalLockUI();
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
    if (t === searchInput || t.classList.contains('qty') || t.classList.contains('vencimiento')) {
      centerOnElement(t);
    }
  });

  function setControlsState() {
    const editable = isEditable();
    const hasItems = body.rows.length > 0;
    const hasActive = !!CURRENT_INVENTORY_ID;
    const isHistorical = isHistoricalDateSelected();
    const readOnly = hasActive && !editable;

    proveedorInput.disabled = !editable;
    ubicacionInput.disabled = !editable;
    searchInput.disabled = !editable;
    $('btnOpenManual').disabled = !editable;
    btnScan.disabled = !editable;

    btnSave.disabled = !editable;
    btnFinalize.disabled = !editable || !hasItems || isHistorical;
    btnCancel.disabled = !hasActive || CURRENT_STATUS !== 'draft' || isHistorical;
    btnClearDraft.disabled = !editable || (!hasItems && !(proveedorInput.value.trim() || ubicacionInput.value.trim()));

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

    if (!CURRENT_INVENTORY_ID) {
      modeLabel.textContent = SELECTED_DATE === getTodayString() ? 'Sin inventario activo' : 'Sin inventario abierto';
      modeLabel.className = 'badge text-bg-secondary';
      activeInventoryLabel.textContent = '';
      setHistoricalViewMode();
      return;
    }

    if (CURRENT_STATUS === 'draft') {
      modeLabel.textContent = editable ? 'Borrador activo' : 'Borrador en solo lectura';
      modeLabel.className = 'badge text-bg-warning';
    } else if (CURRENT_STATUS === 'completed') {
      modeLabel.textContent = 'Inventario finalizado';
      modeLabel.className = 'badge text-bg-success';
    } else if (CURRENT_STATUS === 'cancelled') {
      modeLabel.textContent = 'Inventario cancelado';
      modeLabel.className = 'badge text-bg-danger';
    } else {
      modeLabel.textContent = CURRENT_STATUS || 'Inventario';
      modeLabel.className = 'badge text-bg-secondary';
    }

    if (isHistorical && historicalUnlockEnabled) {
      activeInventoryLabel.textContent = CURRENT_INVENTORY_ID ? `ID: ${CURRENT_INVENTORY_ID} · edición habilitada` : '';
    } else {
      activeInventoryLabel.textContent = CURRENT_INVENTORY_ID ? `ID: ${CURRENT_INVENTORY_ID}` : '';
    }

    setHistoricalViewMode();
  }

  function updateTotals() {
    let lineas = 0;
    let cantidad = 0;

    [...body.rows].forEach((tr, idx) => {
      const indexCell = tr.querySelector('.row-index');
      if (indexCell) indexCell.textContent = String(body.rows.length - idx);

      const qty = parseNum(tr.querySelector('.qty')?.value);
      if (qty > 0) {
        lineas += 1;
        cantidad += qty;
      }
    });

    $('tLineas').textContent = String(lineas);
    $('tCantidad').textContent = String(cantidad);
    setControlsState();
  }

  function clearEditor() {
    body.innerHTML = '';
    proveedorInput.value = '';
    ubicacionInput.value = '';
    searchInput.value = '';
    suggestions.innerHTML = '';
    provSuggestions.innerHTML = '';
    updateTotals();
  }

  function getPayload() {
    const items = [...body.getElementsByTagName('tr')].map((tr) => ({
      codigo_barras: tr.cells[1].innerText.trim(),
      nombre: tr.cells[2].innerText.trim(),
      codigo_inventario: tr.cells[3].innerText.trim(),
      bodega: tr.cells[4].innerText.trim(),
      cantidad: parseNum(tr.querySelector('.qty')?.value),
      fecha_vencimiento: (tr.querySelector('.vencimiento')?.value || '').trim()
    }));

    return {
      proveedor: proveedorInput.value.trim(),
      ubicacion: ubicacionInput.value.trim(),
      tienda: 'AVENIDA MORAZÁN',
      fechaInventario: new Date().toISOString(),
      items,
      totales: {
        lineas: Number($('tLineas').textContent || 0),
        cantidad_total: Number($('tCantidad').textContent || 0)
      }
    };
  }

  function findExistingRow(barcode, codInvent) {
    const barcodeTrim = String(barcode || '').trim();
    const codInvTrim = String(codInvent || '').trim();

    return [...body.getElementsByTagName('tr')].find((tr) => {
      const rowBarcode = tr.cells[1]?.innerText.trim() || '';
      const rowCodInv = tr.cells[3]?.innerText.trim() || '';
      const sameBarcode = barcodeTrim && rowBarcode && rowBarcode === barcodeTrim;
      const sameCodInv = codInvTrim && rowCodInv && rowCodInv === codInvTrim;
      return (sameBarcode && sameCodInv) || sameBarcode || sameCodInv;
    }) || null;
  }

  function addRow({
    barcode = '',
    nombre = '',
    codInvent = 'N/A',
    bodega = '',
    cantidad = '',
    fechaVenc = '',
    skipDuplicateCheck = false
  } = {}) {
    if (!skipDuplicateCheck) {
      const existing = findExistingRow(barcode, codInvent);
      if (existing) {
        Swal.fire({
          title: 'Producto ya agregado',
          text: 'Este producto ya existe en el inventario. ¿Desea sumar la cantidad a la existente o cancelar?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sumar cantidades',
          cancelButtonText: 'Cancelar'
        }).then((res) => {
          if (!res.isConfirmed) return;
          const qtyInput = existing.querySelector('.qty');
          const vencInput = existing.querySelector('.vencimiento');
          const currentQty = parseNum(qtyInput?.value);
          const addQty = parseNum(cantidad);
          if (qtyInput) qtyInput.value = currentQty + addQty;
          if (vencInput && !vencInput.value && fechaVenc) vencInput.value = fechaVenc;
          updateTotals();
          if (qtyInput) qtyInput.focus();
          existing.classList.add('table-warning');
          setTimeout(() => existing.classList.remove('table-warning'), 800);
        });
        return null;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center row-index"></td>
      <td>${barcode}</td>
      <td>${nombre}</td>
      <td>${codInvent || 'N/A'}</td>
      <td>${bodega || ''}</td>
      <td><input type="number" class="form-control form-control-sm text-center qty" min="0" step="1" value="${cantidad !== '' ? cantidad : ''}"></td>
      <td><input type="date" class="form-control form-control-sm text-center vencimiento" value="${fechaVenc || ''}"></td>
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-row" title="Eliminar ítem">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    body.prepend(tr);

    const qtyInput = tr.querySelector('.qty');
    const vencInput = tr.querySelector('.vencimiento');
    const delBtn = tr.querySelector('.btn-delete-row');

    qtyInput.addEventListener('input', updateTotals);
    qtyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        vencInput.focus();
      }
    });

    vencInput.addEventListener('focus', () => {
      try {
        if (typeof vencInput.showPicker === 'function') vencInput.showPicker();
      } catch (_) {}
    });
    vencInput.addEventListener('change', updateTotals);
    vencInput.addEventListener('keydown', (e) => {
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
    return tr;
  }

  function addRowAndFocus({ barcode, nombre, codInvent, bodega = '', fechaVenc = '' }) {
    if (!isEditable()) return;
    const row = addRow({ barcode, nombre, codInvent, bodega, fechaVenc });
    searchInput.value = '';
    suggestions.innerHTML = '';
    if (!row) return;
    const qtyInput = row.querySelector('.qty');
    if (qtyInput) qtyInput.focus();
  }

  function renderInventory(record) {
    clearEditor();
    if (!record || !record.inventoryId) {
      setControlsState();
      return;
    }

    proveedorInput.value = record.proveedor || '';
    ubicacionInput.value = record.ubicacion || '';

    (record.items || []).forEach((it) => {
      addRow({
        barcode: it.codigo_barras || '',
        nombre: it.nombre || '',
        codInvent: it.codigo_inventario || 'N/A',
        bodega: it.bodega || '',
        cantidad: it.cantidad ?? '',
        fechaVenc: it.fecha_vencimiento || '',
        skipDuplicateCheck: true
      });
    });

    updateTotals();
  }

  async function openInventory(dateStr, inventoryId) {
    const record = await loadInventoryById(dateStr, inventoryId);
    if (!record || !record.inventoryId) {
      Swal.fire('No encontrado', 'No se pudo cargar el inventario seleccionado.', 'error');
      return;
    }

    resetHistoricalUnlock();
    SELECTED_DATE = dateStr;
    CURRENT_INVENTORY_ID = record.inventoryId;
    CURRENT_STATUS = record.status || 'draft';
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: dateStr, inventoryId: CURRENT_INVENTORY_ID }));
    renderInventory(record);
    setControlsState();
    await renderInventoriesList();
  }

  async function renderInventoriesList() {
    const items = await listInventoriesByDate(SELECTED_DATE);
    listWrap.innerHTML = '';

    if (!items.length) {
      listWrap.innerHTML = '<div class="text-muted small py-2 px-1">No hay inventarios para esta fecha.</div>';
      if (historyHint) historyHint.textContent = 'No se encontraron inventarios registrados para la fecha seleccionada.';
      return;
    }

    if (historyHint) historyHint.textContent = `${items.length} inventario(s) registrado(s) para ${SELECTED_DATE}.`;

    items.forEach((item) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'inventory-item reception-item w-100 text-start bg-white';
      if (item.inventoryId === CURRENT_INVENTORY_ID) div.classList.add('active');

      const statusClass = item.status === 'completed'
        ? 'text-bg-success'
        : item.status === 'cancelled'
          ? 'text-bg-danger'
          : 'text-bg-warning';

      const ubicacion = item.ubicacion || 'Sin ubicación';
      const proveedor = item.proveedor ? ` · ${item.proveedor}` : '';
      const lines = item.totales?.lineas || 0;
      const qty = item.totales?.cantidad_total || 0;

      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="title">${ubicacion}</div>
          <span class="badge ${statusClass}">${item.status || 'draft'}</span>
        </div>
        <div class="meta mt-1">${item.inventoryId}</div>
        <div class="meta mt-1">Líneas: ${lines} · Cantidad total: ${qty}${proveedor}</div>
        <div class="meta">${fmtDateTime(item.updatedAt) || SELECTED_DATE}</div>
      `;

      div.addEventListener('click', async () => {
        if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
        await openInventory(SELECTED_DATE, item.inventoryId);
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
    mBodega.value = '';
    mVencimiento.value = '';
    mCantidad.value = '';

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

  const modalInputs = [mCodigo, mNombre, mCodInv, mBodega, mVencimiento, mCantidad];
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

    addRow({ barcode: codigo, nombre, codInvent: codInv, bodega, cantidad: qty, fechaVenc });
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
        const bodega = prod?.[2] || '';
        const barcode = prod?.[3] || 'sin código';
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${nombre} (${barcode}) [${codInvent}] — ${bodega}`;
        li.addEventListener('click', () => addRowAndFocus({ barcode, nombre, codInvent, bodega }));
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
          codInvent: match[1] || 'N/A',
          bodega: match[2] || ''
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
    } catch (_) {
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
    if (CURRENT_INVENTORY_ID && CURRENT_STATUS === 'draft' && isEditable() && (body.rows.length > 0 || proveedorInput.value.trim() || ubicacionInput.value.trim())) {
      const res = await Swal.fire({
        title: 'Hay un borrador activo',
        text: 'Crear un nuevo inventario limpiará el editor actual. El borrador actual seguirá guardado si ya lo habías guardado.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Crear nuevo'
      });
      if (!res.isConfirmed) return;
    }

    const created = await createInventoryDraft(getTodayString());
    resetHistoricalUnlock();
    SELECTED_DATE = getTodayString();
    CURRENT_INVENTORY_ID = created.inventoryId;
    CURRENT_STATUS = 'draft';
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: SELECTED_DATE, inventoryId: CURRENT_INVENTORY_ID }));
    if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
    clearEditor();
    setControlsState();
    await refreshHistoryDates();
    await renderInventoriesList();
    showMessage(`Nuevo inventario creado: ${CURRENT_INVENTORY_ID}`);
  });

  btnSave.addEventListener('click', async () => {
    if (!CURRENT_INVENTORY_ID || !isEditable()) return;
    if (!ubicacionInput.value.trim()) {
      Swal.fire('Ubicación requerida', 'Ingrese la ubicación del inventario.', 'info');
      return;
    }
    if (body.rows.length === 0) {
      Swal.fire('Sin ítems', 'Agregue al menos un producto.', 'error');
      return;
    }

    if (isHistoricalDateSelected()) {
      await saveInventoryRecord(SELECTED_DATE, CURRENT_INVENTORY_ID, getPayload(), {
        status: CURRENT_STATUS || 'draft'
      });
      await refreshHistoryDates();
      await renderInventoriesList();
      showMessage('Cambios históricos guardados correctamente.');
      Swal.fire('Guardado', 'Los cambios del inventario histórico se guardaron correctamente.', 'success');
      return;
    }

    await saveInventoryDraft(SELECTED_DATE, CURRENT_INVENTORY_ID, getPayload());
    await refreshHistoryDates();
    await renderInventoriesList();
    showMessage('Avance guardado correctamente.');
    Swal.fire('Guardado', 'El inventario se guardó como borrador.', 'success');
  });

  btnFinalize.addEventListener('click', async () => {
    if (!CURRENT_INVENTORY_ID || !isEditable()) return;
    if (!ubicacionInput.value.trim()) {
      Swal.fire('Ubicación requerida', 'Ingrese la ubicación del inventario.', 'info');
      return;
    }
    if (body.rows.length === 0) {
      Swal.fire('Sin ítems', 'Agregue al menos un producto.', 'error');
      return;
    }

    const res = await Swal.fire({
      title: '¿Finalizar inventario?',
      text: 'Después quedará en solo lectura.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar'
    });
    if (!res.isConfirmed) return;

    await finalizeInventory(SELECTED_DATE, CURRENT_INVENTORY_ID, getPayload());
    CURRENT_STATUS = 'completed';
    setControlsState();
    await refreshHistoryDates();
    await renderInventoriesList();
    showMessage('Inventario finalizado.');
    Swal.fire('Finalizado', 'El inventario quedó cerrado.', 'success');
  });

  btnCancel.addEventListener('click', async () => {
    if (!CURRENT_INVENTORY_ID || CURRENT_STATUS !== 'draft') return;
    const res = await Swal.fire({
      title: '¿Cancelar inventario?',
      text: 'El inventario quedará marcado como cancelado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar'
    });
    if (!res.isConfirmed) return;

    await cancelInventory(SELECTED_DATE, CURRENT_INVENTORY_ID, getPayload());
    CURRENT_STATUS = 'cancelled';
    setControlsState();
    await refreshHistoryDates();
    await renderInventoriesList();
    showMessage('Inventario cancelado.');
    Swal.fire('Cancelado', 'El inventario fue cancelado.', 'success');
  });

  btnClearDraft.addEventListener('click', async () => {
    if (!isEditable()) return;
    if (body.rows.length === 0 && !(proveedorInput.value.trim() || ubicacionInput.value.trim())) return;

    const res = await Swal.fire({
      title: '¿Vaciar borrador?',
      text: 'Se limpiará el contenido del borrador actual pero se conservará el mismo inventario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar'
    });
    if (!res.isConfirmed) return;

    clearEditor();
    await saveInventoryDraft(SELECTED_DATE, CURRENT_INVENTORY_ID, getPayload());
    await renderInventoriesList();
    showMessage('Borrador vaciado.');
  });

  function exportPDF(openWindow) {
    if (body.rows.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fecha = SELECTED_DATE || getTodayString();

    doc.setFontSize(14);
    doc.text('TRInventario — Avenida Morazán', 10, 10);
    doc.setFontSize(10);
    doc.text(`Ubicación: ${ubicacionInput.value || '-'}`, 10, 18);
    doc.text(`Proveedor: ${proveedorInput.value || '-'}`, 10, 26);
    doc.text(`Fecha: ${fecha}`, 10, 34);
    doc.text(`Inventario ID: ${CURRENT_INVENTORY_ID || '-'}`, 10, 42);

    const rows = [...body.getElementsByTagName('tr')].map((tr, i) => ([
      i + 1,
      tr.cells[1].innerText,
      tr.cells[2].innerText,
      tr.cells[3].innerText,
      tr.cells[4].innerText,
      tr.querySelector('.qty')?.value || '',
      tr.querySelector('.vencimiento')?.value || ''
    ]));

    doc.autoTable({
      startY: 48,
      head: [['#', 'Código Barras', 'Producto', 'Cod. Inv.', 'Bodega', 'Cant.', 'F. vencimiento']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 }
    });

    const y = doc.lastAutoTable.finalY + 6;
    doc.text(
      `Líneas: ${$('tLineas').textContent}  |  Cantidad total: ${$('tCantidad').textContent}`,
      10,
      y
    );

    const name = `INVENTARIO_AVM_${sanitizeName(ubicacionInput.value)}_${fecha}_${sanitizeName(CURRENT_INVENTORY_ID)}.pdf`;
    if (openWindow) doc.output('dataurlnewwindow');
    else doc.save(name);
  }

  btnPDF.addEventListener('click', () => exportPDF(false));
  btnPrint.addEventListener('click', () => exportPDF(true));

  btnExcel.addEventListener('click', () => {
    if (body.rows.length === 0) return;
    const fecha = SELECTED_DATE || getTodayString();
    const ubicacion = ubicacionInput.value || '';

    const data = [[
      'fechafis',
      'idgrupo',
      'idsubgrupo',
      'idarticulo',
      'descrip',
      'codigobarra',
      'cod_unidad',
      'ubicacion',
      'Bodega_5'
    ]];

    const catalogo = window.CATALOGO_CACHE || [];

    [...body.getElementsByTagName('tr')].forEach((tr) => {
      const nombreUI = tr.cells[2].innerText.trim();
      const codInventUI = tr.cells[3].innerText.trim();
      const codigoBarrasUI = tr.cells[1].innerText.trim();
      const qty = parseNum(tr.querySelector('.qty')?.value);

      let match = null;
      if (catalogo.length) {
        match = catalogo.find((r) => {
          const idartCatalogo = String(r?.[1] || '').trim();
          const codBarCatalog = String(r?.[3] || '').trim();
          const sameCodInv = codInventUI && idartCatalogo && idartCatalogo === codInventUI;
          const sameBar = codigoBarrasUI && codBarCatalog && codBarCatalog === codigoBarrasUI;
          return (sameCodInv && sameBar) || sameBar || sameCodInv;
        }) || null;
      }

      const descrip = match ? (String(match[0] || '').trim() || nombreUI) : nombreUI;
      const idart = match ? (String(match[1] || '').trim() || codInventUI) : codInventUI;
      const codBar = match ? (String(match[3] || '').trim() || codigoBarrasUI) : codigoBarrasUI;
      const idgrupo = match ? String(match[4] || '').trim() : '';
      const idsubgr = match ? String(match[5] || '').trim() : '';
      const codUnidad = 6;

      data.push([
        fecha,
        idgrupo,
        idsubgr,
        idart,
        descrip,
        codBar,
        codUnidad,
        ubicacion,
        qty
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `INVENTARIO_AVM_${sanitizeName(ubicacion)}_${fecha}_${sanitizeName(CURRENT_INVENTORY_ID)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  if (historyDateInput && window.flatpickr) {
    fpHistory = window.flatpickr(historyDateInput, {
      dateFormat: 'Y-m-d',
      defaultDate: SELECTED_DATE,
      locale: 'es',
      onChange: async (_sel, dateStr) => {
        resetHistoricalUnlock();
        SELECTED_DATE = dateStr || getTodayString();
        CURRENT_INVENTORY_ID = null;
        CURRENT_STATUS = null;
        clearEditor();
        setControlsState();
        await renderInventoriesList();
      },
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        try {
          const key = dayElem.dateObj.toLocaleDateString('en-CA');
          if (historySet.has(key)) dayElem.classList.add('has-history');
        } catch (_) {}
      }
    });
  }

  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
      if (!isPastHistoricalDateSelected()) {
        await Swal.fire('No aplica', 'Este botón solo se usa cuando estás viendo una fecha anterior.', 'info');
        return;
      }

      if (!CURRENT_INVENTORY_ID) {
        await Swal.fire('Selecciona un inventario', 'Primero abre un inventario histórico para poder desbloquearlo.', 'info');
        return;
      }

      if (historicalUnlockEnabled) {
        historicalUnlockEnabled = false;
        setControlsState();
        await Swal.fire('Bloqueado', 'Los controles del inventario histórico fueron bloqueados nuevamente.', 'success');
        return;
      }

      const result = await Swal.fire({
        title: 'Desbloquear inventario histórico',
        text: 'Ingresa la misma contraseña usada en TRLista para habilitar edición en esta fecha.',
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
        setControlsState();
        await Swal.fire('Desbloqueado', 'Ya puedes editar este inventario histórico hasta que vuelvas a bloquearlo.', 'success');
      }
    });
  }

  btnToday.addEventListener('click', async () => {
    resetHistoricalUnlock();
    SELECTED_DATE = getTodayString();
    CURRENT_INVENTORY_ID = null;
    CURRENT_STATUS = null;
    clearEditor();
    setControlsState();
    if (fpHistory) fpHistory.setDate(SELECTED_DATE, true);
    else await renderInventoriesList();
  });

  await refreshHistoryDates();
  setHeaderDate();

  const activeRaw = localStorage.getItem(ACTIVE_KEY);
  if (activeRaw) {
    try {
      const active = JSON.parse(activeRaw);
      if (active?.date && active?.inventoryId) {
        SELECTED_DATE = active.date;
        if (fpHistory) fpHistory.setDate(SELECTED_DATE, false);
        await renderInventoriesList();
        await openInventory(active.date, active.inventoryId);
      } else {
        await renderInventoriesList();
      }
    } catch (_) {
      await renderInventoriesList();
    }
  } else {
    await renderInventoriesList();
  }

  setControlsState();
  searchInput.focus();

  window.addEventListener('beforeunload', () => {
    stopScanner();
  });
});
