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

  const manualModal = new bootstrap.Modal(document.getElementById('manualModal'));
  const mCodigo = $('mCodigo');
  const mNombre = $('mNombre');
  const mCodInv = $('mCodInv');
  const mCantidad = $('mCantidad');
  const mTotalSin = $('mTotalSin');
  const btnAddManual = $('btnAddManual');

  let SELECTED_DATE = getTodayString();
  let CURRENT_RECEPTION_ID = null;
  let CURRENT_STATUS = null;
  let CATALOG = [];
  let PROVIDERS = [];

  const fmtMoney = (n) => Number(n || 0).toFixed(2);

  function showMessage(text, ok = true) {
    if (!successMessage) return;
    successMessage.textContent = text;
    successMessage.className = `${ok ? 'text-success' : 'text-danger'} small mt-3 mb-0`;
    successMessage.style.display = text ? 'block' : 'none';
  }

  function setHeaderDate() {
    if (!fechaEl) return;
    fechaEl.textContent = `Fecha de trabajo: ${new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })}`;
  }

  function isEditable() {
    return SELECTED_DATE === getTodayString() && CURRENT_RECEPTION_ID && CURRENT_STATUS === 'draft';
  }

  function setControlsState() {
    const editable = !!isEditable();
    const hasItems = body.rows.length > 0;
    const hasActive = !!CURRENT_RECEPTION_ID;

    proveedorInput.disabled = !editable;
    numCreditoInput.disabled = !editable;
    searchInput.disabled = !editable;
    $('btnOpenManual').disabled = !editable;

    btnSave.disabled = !editable;
    btnFinalize.disabled = !editable || !hasItems;
    btnCancel.disabled = !hasActive || CURRENT_STATUS !== 'draft';
    btnClearDraft.disabled = !editable || !hasItems;

    btnPDF.disabled = !hasItems;
    btnPrint.disabled = !hasItems;
    btnExcel.disabled = !hasItems;

    [...body.querySelectorAll('input')].forEach((input) => {
      input.disabled = !editable;
    });
    [...body.querySelectorAll('.btn-delete-row')].forEach((btn) => {
      btn.disabled = !editable;
    });

    if (!CURRENT_RECEPTION_ID) {
      modeLabel.textContent = 'Sin recepción activa';
      modeLabel.className = 'badge text-bg-secondary';
      activeReceptionLabel.textContent = '';
      return;
    }

    if (CURRENT_STATUS === 'draft') {
      modeLabel.textContent = editable ? 'Borrador activo' : 'Borrador abierto en otra fecha';
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
      tr.querySelector('.row-index').textContent = String(idx + 1);

      const qtyInput = tr.querySelector('.qty');
      const totalSinInput = tr.querySelector('.totalSin');
      const unitCon = tr.querySelector('.unitCon');
      const unitSin = tr.querySelector('.unitSin');

      const qty = Number(qtyInput.value || 0);
      const lineTotalSin = Number(totalSinInput.value || 0);

      const safeQty = qty > 0 ? qty : 0;
      const safeTotalSin = lineTotalSin > 0 ? lineTotalSin : 0;
      const perUnitSin = safeQty ? safeTotalSin / safeQty : 0;
      const perUnitCon = perUnitSin * (1 + IVA);

      unitSin.textContent = fmtMoney(perUnitSin);
      unitCon.textContent = fmtMoney(perUnitCon);

      lineas += 1;
      cantidad += safeQty;
      totalSin += safeTotalSin;
      totalCon += safeTotalSin * (1 + IVA);
    });

    $('tLineas').textContent = String(lineas);
    $('tCantidad').textContent = String(cantidad);
    $('tSinIva').textContent = fmtMoney(totalSin);
    $('tConIva').textContent = fmtMoney(totalCon);
    setControlsState();
  }

  function getRowsPayload() {
    return [...body.rows].map((tr) => {
      const cantidad = Number(tr.querySelector('.qty').value || 0);
      const totalSin = Number(tr.querySelector('.totalSin').value || 0);
      const unitSin = cantidad > 0 ? totalSin / cantidad : 0;
      const unitCon = unitSin * (1 + IVA);

      return {
        codigoBarras: tr.dataset.codigoBarras || '',
        nombreProducto: tr.dataset.nombre || '',
        codigoInventario: tr.dataset.codigoInventario || '',
        cantidad,
        totalSinIva: Number(totalSin.toFixed(2)),
        unidadSinIva: Number(unitSin.toFixed(4)),
        unidadConIva: Number(unitCon.toFixed(4)),
        manual: tr.dataset.manual === 'true'
      };
    });
  }

  function buildPayload() {
    const items = getRowsPayload();
    const totalSin = items.reduce((sum, item) => sum + Number(item.totalSinIva || 0), 0);
    const totalCon = totalSin * (1 + IVA);
    const cantidadTotal = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);

    return {
      proveedor: proveedorInput.value.trim(),
      numeroCreditoFiscal: numCreditoInput.value.trim(),
      tienda: 'AVENIDA MORAZÁN',
      items,
      totales: {
        lineas: items.length,
        cantidad_total: Number(cantidadTotal.toFixed(2)),
        total_sin_iva: Number(totalSin.toFixed(2)),
        total_con_iva: Number(totalCon.toFixed(2))
      }
    };
  }

  function clearFormState() {
    proveedorInput.value = '';
    numCreditoInput.value = '';
    searchInput.value = '';
    body.innerHTML = '';
    updateTotals();
    showMessage('');
  }

  function appendRow(product, options = {}) {
    const tr = document.createElement('tr');
    tr.dataset.codigoBarras = product.codigoBarras || '';
    tr.dataset.nombre = product.nombre || product.nombreProducto || '';
    tr.dataset.codigoInventario = product.codigoInventario || '';
    tr.dataset.manual = options.manual ? 'true' : 'false';

    tr.innerHTML = `
      <td class="text-center row-index"></td>
      <td>${tr.dataset.codigoBarras || 'N/A'}</td>
      <td>${tr.dataset.nombre || 'Sin nombre'}</td>
      <td>${tr.dataset.codigoInventario || 'N/A'}</td>
      <td class="numeric-cell">
        <input type="number" min="0" step="1" class="form-control form-control-sm qty" value="${options.cantidad ?? 1}">
      </td>
      <td class="numeric-cell">
        <input type="number" min="0" step="0.01" class="form-control form-control-sm totalSin" value="${options.totalSinIva ?? 0}">
      </td>
      <td class="text-end">$<span class="unitCon">0.00</span></td>
      <td class="text-end">$<span class="unitSin">0.00</span></td>
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-row" title="Eliminar fila">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    tr.querySelector('.qty').addEventListener('input', updateTotals);
    tr.querySelector('.totalSin').addEventListener('input', updateTotals);
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
      tr.remove();
      updateTotals();
    });

    body.appendChild(tr);
    updateTotals();
    setControlsState();
    return tr;
  }

  function renderReception(data) {
    clearFormState();

    if (!data) {
      CURRENT_RECEPTION_ID = null;
      CURRENT_STATUS = null;
      setControlsState();
      renderListSelection();
      return;
    }

    CURRENT_RECEPTION_ID = data.receptionId || data.id;
    CURRENT_STATUS = data.status || 'draft';

    proveedorInput.value = data.proveedor || '';
    numCreditoInput.value = data.numeroCreditoFiscal || '';

    (data.items || []).forEach((item) => {
      appendRow({
        codigoBarras: item.codigoBarras,
        nombre: item.nombreProducto,
        codigoInventario: item.codigoInventario
      }, {
        cantidad: item.cantidad ?? 1,
        totalSinIva: item.totalSinIva ?? 0,
        manual: !!item.manual
      });
    });

    updateTotals();
    setControlsState();
    renderListSelection();
  }

  function renderListSelection() {
    [...listWrap.querySelectorAll('.reception-list-item')].forEach((el) => {
      el.classList.toggle('active', el.dataset.id === CURRENT_RECEPTION_ID);
    });
  }

  function statusBadgeClass(status) {
    if (status === 'draft') return 'status-draft';
    if (status === 'completed') return 'status-completed';
    if (status === 'cancelled') return 'status-cancelled';
    return 'text-bg-secondary';
  }

  function prettyStatus(status) {
    if (status === 'draft') return 'Borrador';
    if (status === 'completed') return 'Finalizada';
    if (status === 'cancelled') return 'Cancelada';
    return status || 'Sin estado';
  }

  function timestampText(ts) {
    if (!ts?.seconds) return '';
    return new Date(ts.seconds * 1000).toLocaleString('es-SV');
  }

  async function refreshList() {
    listWrap.innerHTML = '<div class="text-muted small py-2 px-1">Cargando recepciones...</div>';
    const rows = await listReceptionsByDate(SELECTED_DATE);

    if (!rows.length) {
      listWrap.innerHTML = '<div class="text-muted small py-2 px-1">No hay recepciones para esta fecha.</div>';
      renderListSelection();
      return;
    }

    listWrap.innerHTML = '';
    rows.forEach((row) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'reception-list-item w-100 text-start';
      item.dataset.id = row.receptionId || row.id;

      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${row.proveedor || 'Sin proveedor'}</div>
            <div class="reception-meta">${row.receptionId || row.id}</div>
          </div>
          <span class="badge badge-status ${statusBadgeClass(row.status)}">${prettyStatus(row.status)}</span>
        </div>
        <div class="reception-meta mt-2">
          Crédito fiscal: ${row.numeroCreditoFiscal || '—'}<br>
          Líneas: ${row.totales?.lineas ?? 0} · Cantidad: ${row.totales?.cantidad_total ?? 0}<br>
          Actualizada: ${timestampText(row.updatedAt) || 'sin fecha'}
        </div>
      `;

      item.addEventListener('click', async () => {
        const data = await loadReceptionById(SELECTED_DATE, item.dataset.id);
        renderReception(data);
      });

      listWrap.appendChild(item);
    });

    renderListSelection();
  }

  async function createNewReception() {
    clearFormState();
    const data = await createReceptionDraft(getTodayString());
    SELECTED_DATE = getTodayString();
    CURRENT_RECEPTION_ID = data.receptionId;
    CURRENT_STATUS = 'draft';
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: SELECTED_DATE, receptionId: CURRENT_RECEPTION_ID }));
    if (window.flatpickr && historyDateInput._flatpickr) {
      historyDateInput._flatpickr.setDate(SELECTED_DATE, false);
    } else {
      historyDateInput.value = SELECTED_DATE;
    }
    renderReception(data);
    await refreshList();
    showMessage('Nueva recepción creada.');
    showToast('success', 'Nueva recepción creada');
  }

  async function persistDraft({ finalize = false } = {}) {
    if (!CURRENT_RECEPTION_ID) {
      showMessage('Primero crea una recepción nueva.', false);
      return;
    }

    const payload = buildPayload();
    if (!payload.proveedor) {
      showMessage('Debes completar el proveedor.', false);
      proveedorInput.focus();
      return;
    }

    if (!payload.numeroCreditoFiscal) {
      showMessage('Debes completar el número de crédito fiscal.', false);
      numCreditoInput.focus();
      return;
    }

    if (!payload.items.length) {
      showMessage('Agrega al menos un producto.', false);
      return;
    }

    if (finalize) {
      await finalizeReception(SELECTED_DATE, CURRENT_RECEPTION_ID, payload);
      CURRENT_STATUS = 'completed';
      localStorage.removeItem(ACTIVE_KEY);
      showMessage('Recepción finalizada correctamente.');
      showToast('success', 'Recepción finalizada');
    } else {
      await saveReceptionDraft(SELECTED_DATE, CURRENT_RECEPTION_ID, payload);
      CURRENT_STATUS = 'draft';
      localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date: SELECTED_DATE, receptionId: CURRENT_RECEPTION_ID }));
      showMessage('Avance guardado correctamente.');
      showToast('success', 'Avance guardado');
    }

    setControlsState();
    await refreshList();
  }

  async function loadActiveDraftIfAny() {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.date || !parsed?.receptionId) return false;
      const data = await loadReceptionById(parsed.date, parsed.receptionId);
      if (!data || data.status !== 'draft') {
        localStorage.removeItem(ACTIVE_KEY);
        return false;
      }

      SELECTED_DATE = parsed.date;
      if (window.flatpickr && historyDateInput._flatpickr) {
        historyDateInput._flatpickr.setDate(SELECTED_DATE, false);
      } else {
        historyDateInput.value = SELECTED_DATE;
      }

      renderReception(data);
      return true;
    } catch (error) {
      console.error(error);
      localStorage.removeItem(ACTIVE_KEY);
      return false;
    }
  }

  function matchText(source, query) {
    return (source || '').toString().toLowerCase().includes((query || '').trim().toLowerCase());
  }

  function renderSuggestions(target, items, formatter, onClick) {
    target.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'list-group-item list-group-item-action suggestion-item';
      li.innerHTML = formatter(item);
      li.addEventListener('click', () => onClick(item));
      target.appendChild(li);
    });
  }

  proveedorInput.addEventListener('input', () => {
    if (!isEditable()) return;
    const q = proveedorInput.value.trim();
    if (!q) {
      provSuggestions.innerHTML = '';
      return;
    }

    const matched = PROVIDERS.filter((item) => matchText(item, q)).slice(0, 8);
    renderSuggestions(
      provSuggestions,
      matched,
      (item) => `<span>${item}</span>`,
      (item) => {
        proveedorInput.value = item;
        provSuggestions.innerHTML = '';
      }
    );
  });

  searchInput.addEventListener('input', () => {
    if (!isEditable()) return;
    const q = searchInput.value.trim();
    if (!q) {
      suggestions.innerHTML = '';
      return;
    }

    const rows = CATALOG
      .map(mapCatalogRow)
      .filter((item) =>
        matchText(item.nombre, q) ||
        matchText(item.codigoInventario, q) ||
        matchText(item.codigoBarras, q)
      )
      .slice(0, 12);

    renderSuggestions(
      suggestions,
      rows,
      (item) => `
        <div class="fw-semibold">${item.nombre || 'Sin nombre'}</div>
        <div class="small text-muted">
          Barras: ${item.codigoBarras || '—'} · Inventario: ${item.codigoInventario || '—'}
        </div>`,
      (item) => {
        appendRow(item, { cantidad: 1, totalSinIva: 0 });
        searchInput.value = '';
        suggestions.innerHTML = '';
      }
    );
  });

  document.addEventListener('click', (event) => {
    if (!provSuggestions.contains(event.target) && event.target !== proveedorInput) {
      provSuggestions.innerHTML = '';
    }
    if (!suggestions.contains(event.target) && event.target !== searchInput) {
      suggestions.innerHTML = '';
    }
  });

  $('btnOpenManual').addEventListener('click', () => {
    if (!isEditable()) return;
    mCodigo.value = '';
    mNombre.value = '';
    mCodInv.value = 'N/A';
    mCantidad.value = '';
    mTotalSin.value = '';
    manualModal.show();
  });

  btnAddManual.addEventListener('click', () => {
    if (!isEditable()) return;

    const nombre = mNombre.value.trim();
    const cantidad = Number(mCantidad.value || 0);
    const totalSin = Number(mTotalSin.value || 0);

    if (!nombre) {
      showToast('error', 'Debes escribir el nombre del producto');
      return;
    }

    if (cantidad <= 0) {
      showToast('error', 'La cantidad debe ser mayor que cero');
      return;
    }

    if (totalSin < 0) {
      showToast('error', 'El costo no puede ser negativo');
      return;
    }

    appendRow({
      codigoBarras: mCodigo.value.trim(),
      nombre,
      codigoInventario: mCodInv.value.trim() || 'N/A'
    }, {
      cantidad,
      totalSinIva: totalSin,
      manual: true
    });

    manualModal.hide();
  });

  btnNew.addEventListener('click', createNewReception);
  btnSave.addEventListener('click', () => persistDraft({ finalize: false }));
  btnFinalize.addEventListener('click', () => persistDraft({ finalize: true }));

  btnCancel.addEventListener('click', async () => {
    if (!CURRENT_RECEPTION_ID || CURRENT_STATUS !== 'draft') return;
    const payload = buildPayload();
    await cancelReception(SELECTED_DATE, CURRENT_RECEPTION_ID, payload);
    CURRENT_STATUS = 'cancelled';
    localStorage.removeItem(ACTIVE_KEY);
    setControlsState();
    await refreshList();
    showMessage('Recepción cancelada.');
    showToast('success', 'Recepción cancelada');
  });

  btnClearDraft.addEventListener('click', () => {
    if (!isEditable()) return;
    body.innerHTML = '';
    updateTotals();
    showMessage('Borrador vaciado en pantalla. Guarda si deseas persistir este cambio.');
  });

  btnToday.addEventListener('click', async () => {
    SELECTED_DATE = getTodayString();
    if (window.flatpickr && historyDateInput._flatpickr) {
      historyDateInput._flatpickr.setDate(SELECTED_DATE, false);
    } else {
      historyDateInput.value = SELECTED_DATE;
    }
    await refreshList();
  });

  if (window.flatpickr) {
    window.flatpickr(historyDateInput, {
      dateFormat: 'Y-m-d',
      defaultDate: SELECTED_DATE,
      onChange: async (_selected, dateStr) => {
        SELECTED_DATE = dateStr || getTodayString();
        CURRENT_RECEPTION_ID = null;
        CURRENT_STATUS = null;
        clearFormState();
        setControlsState();
        await refreshList();
      }
    });
  } else {
    historyDateInput.value = SELECTED_DATE;
    historyDateInput.addEventListener('change', async () => {
      SELECTED_DATE = historyDateInput.value || getTodayString();
      await refreshList();
    });
  }

  function getExportRows() {
    return getRowsPayload().map((item, idx) => ({
      '#': idx + 1,
      'Código de Barras': item.codigoBarras || '',
      'Nombre del Producto': item.nombreProducto || '',
      'Código Inventario': item.codigoInventario || '',
      'Cantidad': item.cantidad || 0,
      'Costo Total sin IVA': Number(item.totalSinIva || 0),
      'Ud. con IVA': Number(item.unidadConIva || 0),
      'Ud. sin IVA': Number(item.unidadSinIva || 0)
    }));
  }

  function getExportFilename(ext) {
    const prov = (proveedorInput.value || 'sin-proveedor')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
    return `${CURRENT_RECEPTION_ID || 'recepcion'}-${prov || 'sin-proveedor'}.${ext}`;
  }

  btnExcel.addEventListener('click', () => {
    const rows = getExportRows();
    if (!rows.length) return;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Recepción');
    XLSX.writeFile(wb, getExportFilename('xlsx'));
  });

  function buildPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const rows = getRowsPayload();

    doc.setFontSize(14);
    doc.text('TRRecepción - Avenida Morazán', 14, 14);
    doc.setFontSize(10);
    doc.text(`Recepción: ${CURRENT_RECEPTION_ID || 'N/A'}`, 14, 22);
    doc.text(`Proveedor: ${proveedorInput.value || 'N/A'}`, 14, 28);
    doc.text(`Crédito Fiscal: ${numCreditoInput.value || 'N/A'}`, 14, 34);
    doc.text(`Fecha: ${SELECTED_DATE}`, 14, 40);

    doc.autoTable({
      startY: 46,
      head: [[
        '#', 'Código Barras', 'Producto', 'Código Inventario',
        'Cantidad', 'Total sin IVA', 'Ud. con IVA', 'Ud. sin IVA'
      ]],
      body: rows.map((item, idx) => [
        idx + 1,
        item.codigoBarras || '',
        item.nombreProducto || '',
        item.codigoInventario || '',
        item.cantidad || 0,
        fmtMoney(item.totalSinIva || 0),
        fmtMoney(item.unidadConIva || 0),
        fmtMoney(item.unidadSinIva || 0)
      ])
    });

    const finalY = doc.lastAutoTable?.finalY || 60;
    doc.text(`Líneas: ${$('tLineas').textContent}`, 14, finalY + 10);
    doc.text(`Cantidad total: ${$('tCantidad').textContent}`, 70, finalY + 10);
    doc.text(`Total sin IVA: $${$('tSinIva').textContent}`, 140, finalY + 10);
    doc.text(`Total con IVA: $${$('tConIva').textContent}`, 220, finalY + 10);
    return doc;
  }

  btnPDF.addEventListener('click', () => {
    if (!body.rows.length) return;
    buildPdf().save(getExportFilename('pdf'));
  });

  btnPrint.addEventListener('click', () => {
    if (!body.rows.length) return;
    const doc = buildPdf();
    window.open(doc.output('bloburl'), '_blank');
  });

  setHeaderDate();
  CATALOG = await preloadCatalog();
  PROVIDERS = await preloadProviders();
  await refreshList();
  const restored = await loadActiveDraftIfAny();
  if (!restored) {
    setControlsState();
  }
});
