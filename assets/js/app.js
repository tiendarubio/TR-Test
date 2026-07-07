(function () {
  'use strict';

  const STORAGE_KEYS = {
    draft: 'tr_cotizaciones_draft_v1',
    history: 'tr_cotizaciones_history_v1',
    company: 'tr_cotizaciones_company_v1'
  };

  const DEFAULT_COMPANY = {
    companyName: 'TIENDA RUBIO',
    companyLegal: 'Reyes Rochez, S.A. de C.V.',
    companyCity: 'San Martín',
    sellerName: 'Marvin Pérez Rochac',
    sellerPhone: '63115609',
    checkPayee: 'Reyes Rochez, S.A. de C.V.'
  };

  const state = {
    items: [],
    catalogRows: [],
    catalogIndex: null,
    catalogLoadedAt: null,
    currentFocus: -1,
    searchMode: 'catalog',
    quoteSearchTerm: '',
    logoDataUrl: '',
    autosaveTimer: null
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    quoteNumber: $('quoteNumber'),
    quoteDate: $('quoteDate'),
    validityDays: $('validityDays'),
    clientName: $('clientName'),
    clientTaxName: $('clientTaxName'),
    clientContact: $('clientContact'),
    clientPhone: $('clientPhone'),
    clientEmail: $('clientEmail'),
    clientAddress: $('clientAddress'),
    paymentMethod: $('paymentMethod'),
    creditDays: $('creditDays'),
    discountAmount: $('discountAmount'),
    quoteNotes: $('quoteNotes'),
    includeIva: $('includeIva'),
    searchInput: $('searchInput'),
    suggestions: $('suggestions'),
    btnSearchModeToggle: $('btnSearchModeToggle'),
    searchLeadLabel: $('searchLeadLabel'),
    searchModeHint: $('searchModeHint'),
    quoteSearchCount: $('quoteSearchCount'),
    quoteItemsBody: $('quoteItemsBody'),
    quoteMobileCards: $('quoteMobileCards'),
    summaryItemsCount: $('summaryItemsCount'),
    summarySubtotal: $('summarySubtotal'),
    summaryDiscount: $('summaryDiscount'),
    summaryTotal: $('summaryTotal'),
    quoteStatusBadge: $('quoteStatusBadge'),
    btnClearSearch: $('btnClearSearch'),
    btnReloadCatalog: $('btnReloadCatalog'),
    btnOpenManualProduct: $('btnOpenManualProduct'),
    btnAddManualProduct: $('btnAddManualProduct'),
    btnClearItems: $('btnClearItems'),
    btnSaveQuote: $('btnSaveQuote'),
    btnGeneratePdf: $('btnGeneratePdf'),
    btnNewQuote: $('btnNewQuote'),
    btnOpenHistory: $('btnOpenHistory'),
    btnClearHistory: $('btnClearHistory'),
    btnResetCompany: $('btnResetCompany'),
    manualName: $('manualName'),
    manualQty: $('manualQty'),
    manualPrice: $('manualPrice'),
    manualCode: $('manualCode'),
    manualBarcode: $('manualBarcode'),
    historyList: $('historyList'),
    companyName: $('companyName'),
    companyLegal: $('companyLegal'),
    companyCity: $('companyCity'),
    sellerName: $('sellerName'),
    sellerPhone: $('sellerPhone'),
    checkPayee: $('checkPayee'),
    toastHost: $('toastHost')
  };

  let manualProductModal = null;
  let historyModal = null;

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid(prefix = 'item') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayInputValue() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function buildQuoteNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `COT-${y}${m}${d}-${hh}${min}`;
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const cleaned = raw
      .replace(/[^\d.,-]/g, '')
      .replace(/,(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const number = Number.parseFloat(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  function fix2(value) {
    const number = parseNumber(value);
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(fix2(value));
  }

  function formatPlainCurrency(value) {
    return `$${fix2(value).toFixed(2)}`;
  }

  function formatLongDate(dateValue) {
    const raw = String(dateValue || '').trim();
    const date = raw ? new Date(`${raw}T00:00:00`) : new Date();
    const formatted = new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    return formatted.replace(/ de /g, ' de ');
  }

  function sanitizeFileName(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 70) || 'cotizacion';
  }

  function showToast(type, title, message, timeout = 3000) {
    if (!els.toastHost) return;
    const toast = document.createElement('div');
    toast.className = `app-toast ${type || ''}`.trim();
    toast.innerHTML = `
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'danger' ? 'fa-triangle-exclamation' : type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-info'} mt-1"></i>
      <div>
        <div class="app-toast-title">${escapeHtml(title)}</div>
        <div class="app-toast-message">${escapeHtml(message || '')}</div>
      </div>
      <button type="button" class="app-toast-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
    `;
    const close = () => toast.remove();
    toast.querySelector('.app-toast-close')?.addEventListener('click', close);
    els.toastHost.appendChild(toast);
    while (els.toastHost.children.length > 3) els.toastHost.firstElementChild?.remove();
    if (timeout > 0) window.setTimeout(close, timeout);
  }

  function installModalScrollLock() {
    let locked = false;
    const lock = () => {
      if (locked) return;
      document.documentElement.classList.add('tr-modal-scroll-locked');
      document.body.classList.add('tr-modal-scroll-locked');
      locked = true;
    };
    const unlock = () => {
      document.documentElement.classList.remove('tr-modal-scroll-locked');
      document.body.classList.remove('tr-modal-scroll-locked');
      locked = false;
    };
    document.addEventListener('show.bs.modal', lock);
    document.addEventListener('hidden.bs.modal', () => {
      if (!document.querySelector('.modal.show')) unlock();
    });
  }

  function getCompanyValues() {
    return {
      companyName: String(els.companyName?.value || DEFAULT_COMPANY.companyName).trim(),
      companyLegal: String(els.companyLegal?.value || DEFAULT_COMPANY.companyLegal).trim(),
      companyCity: String(els.companyCity?.value || DEFAULT_COMPANY.companyCity).trim(),
      sellerName: String(els.sellerName?.value || DEFAULT_COMPANY.sellerName).trim(),
      sellerPhone: String(els.sellerPhone?.value || DEFAULT_COMPANY.sellerPhone).trim(),
      checkPayee: String(els.checkPayee?.value || DEFAULT_COMPANY.checkPayee).trim()
    };
  }

  function setCompanyValues(values = DEFAULT_COMPANY) {
    const data = { ...DEFAULT_COMPANY, ...(values || {}) };
    if (els.companyName) els.companyName.value = data.companyName;
    if (els.companyLegal) els.companyLegal.value = data.companyLegal;
    if (els.companyCity) els.companyCity.value = data.companyCity;
    if (els.sellerName) els.sellerName.value = data.sellerName;
    if (els.sellerPhone) els.sellerPhone.value = data.sellerPhone;
    if (els.checkPayee) els.checkPayee.value = data.checkPayee;
  }

  function saveCompanySettings() {
    localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(getCompanyValues()));
  }

  function loadCompanySettings() {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.company), null);
    setCompanyValues(saved || DEFAULT_COMPANY);
  }

  function detectPriceFromRow(row) {
    const preferred = [5, 4, 6, 7, 8, 9];
    for (const index of preferred) {
      if (row[index] === undefined) continue;
      const value = fix2(row[index]);
      if (value > 0) return value;
    }
    return 0;
  }

  function mapCatalogRow(row, fallbackCode = '') {
    const safe = Array.isArray(row) ? row : [];
    return {
      id: uid('cat'),
      nombre: String(safe[0] || '').trim(),
      codigoInventario: String(safe[1] || '').trim(),
      bodega: String(safe[2] || '').trim(),
      codigoBarras: String(safe[3] || fallbackCode || '').trim(),
      precioUnitario: detectPriceFromRow(safe),
      source: 'catalogo'
    };
  }

  function productKey(product) {
    const barcode = normalizeText(product.codigoBarras);
    const inv = normalizeText(product.codigoInventario);
    if (barcode && !['n/a', 'na', 'sin codigo', 'sin código', '0'].includes(barcode)) return `bar:${barcode}`;
    if (inv && !['n/a', 'na', 'sin codigo', 'sin código', '0'].includes(inv)) return `inv:${inv}`;
    return `name:${normalizeText(product.nombre)}`;
  }

  async function loadCatalog({ force = false } = {}) {
    if (!force && state.catalogRows.length) return state.catalogRows;
    if (els.btnReloadCatalog) {
      els.btnReloadCatalog.disabled = true;
      els.btnReloadCatalog.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Actualizando';
    }
    try {
      const resp = await fetch('/api/catalogo', { cache: force ? 'reload' : 'default' });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      state.catalogRows = Array.isArray(data.values) ? data.values : [];
      state.catalogIndex = null;
      state.catalogLoadedAt = new Date();
      if (!state.catalogRows.length) showToast('warning', 'Catálogo vacío', 'Sin productos en la hoja configurada.');
      else if (force) showToast('success', 'Catálogo actualizado', `${state.catalogRows.length} productos.`, 1500);
      return state.catalogRows;
    } catch (error) {
      console.error('No se pudo cargar catálogo:', error);
      showToast('danger', 'Catálogo no disponible', 'Revisá Google Sheets o la conexión.', 4200);
      state.catalogRows = [];
      state.catalogIndex = null;
      return [];
    } finally {
      if (els.btnReloadCatalog) {
        els.btnReloadCatalog.disabled = false;
        els.btnReloadCatalog.innerHTML = '<i class="fa-solid fa-rotate me-1"></i>Actualizar';
      }
    }
  }

  function ensureCatalogIndex(rows = state.catalogRows) {
    if (state.catalogIndex && state.catalogIndex.source === rows) return state.catalogIndex.items;
    const items = (Array.isArray(rows) ? rows : []).map((row) => {
      const product = mapCatalogRow(row);
      return {
        row,
        product,
        searchText: normalizeText([
          product.nombre,
          product.codigoInventario,
          product.bodega,
          product.codigoBarras,
          product.precioUnitario
        ].join(' '))
      };
    }).filter((entry) => entry.product.nombre);
    state.catalogIndex = { source: rows, items };
    return items;
  }

  function clearSuggestions() {
    if (els.suggestions) els.suggestions.innerHTML = '';
    state.currentFocus = -1;
    els.searchInput?.removeAttribute('aria-activedescendant');
  }

  function renderCatalogSuggestions(rawQuery) {
    if (!els.suggestions) return;
    const q = normalizeText(rawQuery);
    clearSuggestions();
    if (!q) return;

    const matches = ensureCatalogIndex()
      .filter((entry) => entry.searchText.includes(q))
      .slice(0, 50);

    els.suggestions.setAttribute('role', 'listbox');

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted small';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', 'true');
      li.textContent = 'Sin coincidencias.';
      els.suggestions.appendChild(li);
      return;
    }

    const frag = document.createDocumentFragment();
    matches.forEach((entry, index) => {
      const product = entry.product;
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.id = `catalog-suggestion-${index}`;
      li.setAttribute('role', 'option');
      li.innerHTML = `
        <span>
          <span class="suggestion-title">${escapeHtml(product.nombre)}</span>
          <span class="suggestion-meta">${escapeHtml(product.codigoBarras || 'sin código')} · ${escapeHtml(product.codigoInventario || 'N/A')} · ${escapeHtml(product.bodega || 'Sin bodega')}</span>
        </span>
        <span class="suggestion-price">${product.precioUnitario > 0 ? formatCurrency(product.precioUnitario) : 'Sin precio'}</span>
      `;
      li.addEventListener('click', () => addCatalogProduct(product));
      frag.appendChild(li);
    });
    els.suggestions.appendChild(frag);
  }

  function getQuoteValues() {
    return {
      quoteNumber: String(els.quoteNumber?.value || '').trim(),
      quoteDate: String(els.quoteDate?.value || '').trim(),
      validityDays: fix2(els.validityDays?.value || 0),
      clientName: String(els.clientName?.value || '').trim(),
      clientTaxName: String(els.clientTaxName?.value || '').trim(),
      clientContact: String(els.clientContact?.value || '').trim(),
      clientPhone: String(els.clientPhone?.value || '').trim(),
      clientEmail: String(els.clientEmail?.value || '').trim(),
      clientAddress: String(els.clientAddress?.value || '').trim(),
      paymentMethod: String(els.paymentMethod?.value || 'Contado').trim(),
      creditDays: fix2(els.creditDays?.value || 0),
      discountAmount: fix2(els.discountAmount?.value || 0),
      quoteNotes: String(els.quoteNotes?.value || '').trim(),
      includeIva: !!els.includeIva?.checked,
      company: getCompanyValues(),
      items: state.items.map((item) => ({ ...item }))
    };
  }

  function setQuoteValues(data = {}) {
    if (els.quoteNumber) els.quoteNumber.value = data.quoteNumber || buildQuoteNumber();
    if (els.quoteDate) els.quoteDate.value = data.quoteDate || todayInputValue();
    if (els.validityDays) els.validityDays.value = data.validityDays ?? 8;
    if (els.clientName) els.clientName.value = data.clientName || '';
    if (els.clientTaxName) els.clientTaxName.value = data.clientTaxName || '';
    if (els.clientContact) els.clientContact.value = data.clientContact || '';
    if (els.clientPhone) els.clientPhone.value = data.clientPhone || '';
    if (els.clientEmail) els.clientEmail.value = data.clientEmail || '';
    if (els.clientAddress) els.clientAddress.value = data.clientAddress || '';
    if (els.paymentMethod) els.paymentMethod.value = data.paymentMethod || 'Contado';
    if (els.creditDays) els.creditDays.value = data.creditDays || '';
    if (els.discountAmount) els.discountAmount.value = data.discountAmount || '';
    if (els.quoteNotes) els.quoteNotes.value = data.quoteNotes || '';
    if (els.includeIva) els.includeIva.checked = data.includeIva !== false;
    if (data.company) setCompanyValues(data.company);
    state.items = Array.isArray(data.items) ? data.items.map(normalizeItem).filter((item) => item.nombre) : [];
    renderAll();
  }

  function normalizeItem(item) {
    return {
      id: item.id || uid('item'),
      nombre: String(item.nombre || '').trim(),
      codigoInventario: String(item.codigoInventario || '').trim(),
      codigoBarras: String(item.codigoBarras || '').trim(),
      bodega: String(item.bodega || '').trim(),
      cantidad: fix2(item.cantidad || 1) || 1,
      precioUnitario: fix2(item.precioUnitario || 0),
      source: item.source || 'manual'
    };
  }

  function calculateTotals() {
    const subtotal = state.items.reduce((sum, item) => sum + (fix2(item.cantidad) * fix2(item.precioUnitario)), 0);
    const discount = Math.min(fix2(els.discountAmount?.value || 0), subtotal);
    const total = Math.max(0, subtotal - discount);
    return { subtotal: fix2(subtotal), discount: fix2(discount), total: fix2(total), count: state.items.length };
  }

  function addCatalogProduct(product) {
    const normalized = normalizeItem({ ...product, cantidad: 1 });
    if (!normalized.nombre) return;

    const key = productKey(normalized);
    const existing = state.items.find((item) => productKey(item) === key);
    if (existing) {
      existing.cantidad = fix2(existing.cantidad + 1);
      showToast('success', 'Cantidad actualizada', `${existing.nombre}: ${existing.cantidad}`, 1500);
      clearSearchUI();
      renderAll();
      flashItem(existing.id);
      scheduleAutosave();
      return;
    }

    state.items.push(normalized);
    clearSearchUI();
    renderAll();
    flashItem(normalized.id);
    showToast('success', 'Agregado', normalized.nombre, 1400);
    scheduleAutosave();
  }

  function addManualProduct() {
    const product = normalizeItem({
      nombre: els.manualName?.value,
      cantidad: els.manualQty?.value || 1,
      precioUnitario: els.manualPrice?.value || 0,
      codigoInventario: els.manualCode?.value,
      codigoBarras: els.manualBarcode?.value,
      source: 'manual'
    });

    if (!product.nombre) {
      Swal.fire('Falta descripción', 'Ingresá el producto.', 'warning');
      return;
    }

    state.items.push(product);
    renderAll();
    flashItem(product.id);
    scheduleAutosave();
    manualProductModal?.hide();
    clearManualModal();
    showToast('success', 'Agregado', product.nombre, 1400);
  }

  function clearManualModal() {
    if (els.manualName) els.manualName.value = '';
    if (els.manualQty) els.manualQty.value = '1';
    if (els.manualPrice) els.manualPrice.value = '';
    if (els.manualCode) els.manualCode.value = '';
    if (els.manualBarcode) els.manualBarcode.value = '';
  }

  function updateItem(id, field, value) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    if (field === 'cantidad') item.cantidad = Math.max(0.01, fix2(value));
    if (field === 'precioUnitario') item.precioUnitario = Math.max(0, fix2(value));
    renderAll({ keepInputs: true });
    scheduleAutosave();
  }

  function deleteItem(id) {
    const before = state.items.length;
    state.items = state.items.filter((item) => item.id !== id);
    if (state.items.length !== before) {
      renderAll();
      scheduleAutosave();
    }
  }

  function itemMatchesSearch(item) {
    if (!state.quoteSearchTerm) return true;
    const text = normalizeText([
      item.nombre,
      item.codigoInventario,
      item.codigoBarras,
      item.bodega,
      item.cantidad,
      item.precioUnitario
    ].join(' '));
    return text.includes(state.quoteSearchTerm);
  }

  function renderTable() {
    if (!els.quoteItemsBody) return;
    if (!state.items.length) {
      els.quoteItemsBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Sin productos.</td></tr>';
      return;
    }

    els.quoteItemsBody.innerHTML = state.items.map((item, index) => {
      const subtotal = fix2(item.cantidad * item.precioUnitario);
      const hidden = itemMatchesSearch(item) ? '' : ' is-hidden';
      return `
        <tr data-id="${escapeHtml(item.id)}" class="${hidden}">
          <td class="text-muted fw-semibold">${index + 1}</td>
          <td class="product-name-cell">
            <div class="product-name">${escapeHtml(item.nombre)}</div>
            <div class="product-meta">${escapeHtml(item.codigoBarras || 'sin código')} · ${escapeHtml(item.codigoInventario || 'N/A')} · ${escapeHtml(item.bodega || 'Sin bodega')}</div>
          </td>
          <td>
            <input class="form-control form-control-sm qty-input" type="number" min="0.01" step="0.01" value="${escapeHtml(item.cantidad)}" data-id="${escapeHtml(item.id)}" aria-label="Cantidad de ${escapeHtml(item.nombre)}">
          </td>
          <td>
            <input class="form-control form-control-sm price-input" type="number" min="0" step="0.01" value="${fix2(item.precioUnitario).toFixed(2)}" data-id="${escapeHtml(item.id)}" aria-label="Precio de ${escapeHtml(item.nombre)}">
          </td>
          <td class="text-end fw-bold">${formatCurrency(subtotal)}</td>
          <td class="text-center">
            <button type="button" class="btn btn-outline-danger btn-sm btn-delete-item" data-id="${escapeHtml(item.id)}" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderMobileCards() {
    if (!els.quoteMobileCards) return;
    if (!state.items.length) {
      els.quoteMobileCards.innerHTML = '<div class="empty-state">Sin productos.</div>';
      return;
    }

    els.quoteMobileCards.innerHTML = state.items.map((item, index) => {
      const subtotal = fix2(item.cantidad * item.precioUnitario);
      const hidden = itemMatchesSearch(item) ? '' : ' is-hidden';
      return `
        <article class="quote-mobile-card${hidden}" data-id="${escapeHtml(item.id)}">
          <div class="mobile-card-header">
            <div>
              <div class="mobile-card-title">${index + 1}. ${escapeHtml(item.nombre)}</div>
              <div class="mobile-card-meta">${escapeHtml(item.codigoBarras || 'sin código')} · ${escapeHtml(item.codigoInventario || 'N/A')}</div>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm btn-delete-item" data-id="${escapeHtml(item.id)}" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <div class="mobile-card-grid">
            <div>
              <label>Cantidad</label>
              <input class="form-control form-control-sm mobile-card-qty-input" type="number" min="0.01" step="0.01" value="${escapeHtml(item.cantidad)}" data-id="${escapeHtml(item.id)}">
            </div>
            <div>
              <label>Precio unitario</label>
              <input class="form-control form-control-sm mobile-card-price-input" type="number" min="0" step="0.01" value="${fix2(item.precioUnitario).toFixed(2)}" data-id="${escapeHtml(item.id)}">
            </div>
          </div>
          <div class="mobile-subtotal"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
        </article>
      `;
    }).join('');
  }

  function renderSummary() {
    const totals = calculateTotals();
    if (els.summaryItemsCount) els.summaryItemsCount.textContent = String(totals.count);
    if (els.summarySubtotal) els.summarySubtotal.textContent = formatCurrency(totals.subtotal);
    if (els.summaryDiscount) els.summaryDiscount.textContent = formatCurrency(totals.discount);
    if (els.summaryTotal) els.summaryTotal.textContent = formatCurrency(totals.total);
    updateSearchCount();
  }

  function updateSearchCount() {
    const visible = state.items.filter(itemMatchesSearch).length;
    if (els.quoteSearchCount) {
      els.quoteSearchCount.textContent = state.searchMode === 'quote'
        ? `${visible} / ${state.items.length} visibles`
        : `${state.items.length} productos`;
    }
  }

  function renderAll() {
    renderTable();
    renderMobileCards();
    renderSummary();
    bindDynamicItemEvents();
    updateStatusBadge();
  }

  function bindDynamicItemEvents() {
    document.querySelectorAll('.qty-input, .mobile-card-qty-input').forEach((input) => {
      input.addEventListener('change', () => updateItem(input.dataset.id, 'cantidad', input.value));
    });
    document.querySelectorAll('.price-input, .mobile-card-price-input').forEach((input) => {
      input.addEventListener('change', () => updateItem(input.dataset.id, 'precioUnitario', input.value));
    });
    document.querySelectorAll('.btn-delete-item').forEach((btn) => {
      btn.addEventListener('click', () => deleteItem(btn.dataset.id));
    });
  }

  function flashItem(id) {
    window.setTimeout(() => {
      const targets = document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`);
      targets.forEach((target) => {
        target.classList.add('row-highlight');
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        window.setTimeout(() => target.classList.remove('row-highlight'), 1400);
      });
    }, 50);
  }

  function clearSearchUI() {
    if (els.searchInput) els.searchInput.value = '';
    clearSuggestions();
    state.quoteSearchTerm = '';
    renderAll();
  }

  function setSearchMode(mode) {
    state.searchMode = mode === 'quote' ? 'quote' : 'catalog';
    const isQuote = state.searchMode === 'quote';
    if (els.searchLeadLabel) els.searchLeadLabel.textContent = isQuote ? 'Cotización' : 'Catálogo';
    if (els.btnSearchModeToggle) els.btnSearchModeToggle.dataset.searchMode = state.searchMode;
    if (els.searchModeHint) els.searchModeHint.textContent = isQuote ? 'Cotización' : 'Catálogo';
    if (els.searchInput) els.searchInput.placeholder = isQuote ? 'Buscar en cotización' : 'Buscar producto';
    clearSuggestions();
    state.quoteSearchTerm = isQuote ? normalizeText(els.searchInput?.value || '') : '';
    renderAll();
  }

  async function handleSearchInput() {
    const q = String(els.searchInput?.value || '').replace(/\r|\n/g, '').trim();
    clearSuggestions();
    if (state.searchMode === 'quote') {
      state.quoteSearchTerm = normalizeText(q);
      renderAll();
      return;
    }
    if (!q) return;
    await loadCatalog();
    renderCatalogSuggestions(q);
  }

  async function handleSearchSubmit() {
    const q = String(els.searchInput?.value || '').replace(/\r|\n/g, '').trim();
    if (!q) return;

    if (state.searchMode === 'quote') {
      state.quoteSearchTerm = normalizeText(q);
      renderAll();
      const first = state.items.find(itemMatchesSearch);
      if (first) flashItem(first.id);
      return;
    }

    await loadCatalog();
    const normalizedQ = normalizeText(q);
    const exact = ensureCatalogIndex().find((entry) => {
      const p = entry.product;
      return normalizeText(p.codigoBarras) === normalizedQ || normalizeText(p.codigoInventario) === normalizedQ;
    });
    if (exact) {
      addCatalogProduct(exact.product);
      return;
    }
    const selectable = els.suggestions ? [...els.suggestions.querySelectorAll('li:not(.text-muted)')] : [];
    if (selectable.length === 1) selectable[0].click();
  }

  function addActive(items) {
    if (!items || !items.length) return;
    [...items].forEach((item) => item.classList.remove('active'));
    if (state.currentFocus >= items.length) state.currentFocus = 0;
    if (state.currentFocus < 0) state.currentFocus = items.length - 1;
    items[state.currentFocus].classList.add('active');
    if (items[state.currentFocus].id) els.searchInput?.setAttribute('aria-activedescendant', items[state.currentFocus].id);
    items[state.currentFocus].scrollIntoView({ block: 'nearest' });
  }

  function snapshotQuote() {
    const totals = calculateTotals();
    return {
      id: String(els.quoteNumber?.value || buildQuoteNumber()).trim(),
      savedAt: new Date().toISOString(),
      totals,
      ...getQuoteValues()
    };
  }

  function saveDraft({ toast = true } = {}) {
    const data = snapshotQuote();
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(data));
    saveCompanySettings();
    updateStatusBadge('Guardado');
    if (toast) showToast('success', 'Guardado', data.quoteNumber || data.id, 1500);
    return data;
  }

  function scheduleAutosave() {
    updateStatusBadge('Sin guardar');
    if (state.autosaveTimer) window.clearTimeout(state.autosaveTimer);
    state.autosaveTimer = window.setTimeout(() => saveDraft({ toast: false }), 800);
  }

  function saveToHistory(data = snapshotQuote()) {
    const history = safeJsonParse(localStorage.getItem(STORAGE_KEYS.history), []);
    const next = [data, ...history.filter((item) => item.id !== data.id)].slice(0, 80);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
    return next;
  }

  function updateStatusBadge(label) {
    if (!els.quoteStatusBadge) return;
    const text = label || (state.items.length ? 'Borrador' : 'Nuevo');
    els.quoteStatusBadge.textContent = text;
  }

  function startNewQuote({ confirm = true } = {}) {
    const reset = () => {
      setQuoteValues({
        quoteNumber: buildQuoteNumber(),
        quoteDate: todayInputValue(),
        validityDays: 8,
        paymentMethod: 'Contado',
        includeIva: true,
        company: getCompanyValues(),
        items: []
      });
      localStorage.removeItem(STORAGE_KEYS.draft);
      clearSearchUI();
      updateStatusBadge('Nuevo');
    };

    if (!confirm || (!state.items.length && !els.clientName?.value)) {
      reset();
      return;
    }

    Swal.fire({
      title: '¿Nueva cotización?',
      text: 'Se reemplazará el borrador actual.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) reset();
    });
  }

  function loadDraftOrDefault() {
    const draft = safeJsonParse(localStorage.getItem(STORAGE_KEYS.draft), null);
    if (draft && (draft.items?.length || draft.clientName)) {
      setQuoteValues(draft);
      updateStatusBadge('Recuperado');
      return;
    }
    setQuoteValues({
      quoteNumber: buildQuoteNumber(),
      quoteDate: todayInputValue(),
      validityDays: 8,
      paymentMethod: 'Contado',
      includeIva: true,
      company: getCompanyValues(),
      items: []
    });
  }

  function renderHistory() {
    if (!els.historyList) return;
    const history = safeJsonParse(localStorage.getItem(STORAGE_KEYS.history), []);
    if (!history.length) {
      els.historyList.innerHTML = '<div class="empty-state">Sin cotizaciones guardadas.</div>';
      return;
    }
    els.historyList.innerHTML = history.map((entry) => `
      <div class="history-item">
        <div class="d-flex flex-column flex-md-row justify-content-between gap-2">
          <div>
            <div class="history-item-title">${escapeHtml(entry.quoteNumber || entry.id)} · ${escapeHtml(entry.clientName || 'Sin cliente')}</div>
            <div class="history-item-meta">${escapeHtml(formatLongDate(entry.quoteDate))} · ${entry.items?.length || 0} productos · ${formatCurrency(entry.totals?.total || 0)}</div>
          </div>
          <div class="d-flex gap-2 align-items-start">
            <button type="button" class="btn btn-outline-primary btn-sm btn-load-history" data-id="${escapeHtml(entry.id)}"><i class="fa-solid fa-rotate-left me-1"></i>Cargar</button>
            <button type="button" class="btn btn-primary btn-sm btn-pdf-history" data-id="${escapeHtml(entry.id)}"><i class="fa-solid fa-file-pdf me-1"></i>PDF</button>
          </div>
        </div>
      </div>
    `).join('');

    els.historyList.querySelectorAll('.btn-load-history').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = history.find((item) => item.id === btn.dataset.id);
        if (!entry) return;
        setQuoteValues(entry);
        saveDraft({ toast: false });
        historyModal?.hide();
        showToast('success', 'Cargada', entry.quoteNumber || entry.id, 1500);
      });
    });

    els.historyList.querySelectorAll('.btn-pdf-history').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const entry = history.find((item) => item.id === btn.dataset.id);
        if (!entry) return;
        await generatePdf(entry, { saveHistory: false });
      });
    });
  }

  async function loadLogoDataUrl() {
    if (state.logoDataUrl) return state.logoDataUrl;
    try {
      const resp = await fetch('assets/img/trlogo_b.png');
      if (!resp.ok) throw new Error('Logo no disponible');
      const blob = await resp.blob();
      state.logoDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return state.logoDataUrl;
    } catch (error) {
      console.warn('No se pudo cargar el logo para PDF:', error);
      return '';
    }
  }

  function splitText(doc, text, maxWidth) {
    return doc.splitTextToSize(String(text || ''), maxWidth);
  }

  function ensurePdfSpace(doc, y, needed = 30) {
    const height = doc.internal.pageSize.getHeight();
    if (y + needed <= height - 18) return y;
    doc.addPage();
    return 22;
  }

  function drawPdfHeader(doc, data) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const company = data.company || DEFAULT_COMPANY;
    const centerX = pageWidth / 2;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    const title = company.companyName || DEFAULT_COMPANY.companyName;
    const logoW = state.logoDataUrl ? 14 : 0;
    const logoGap = state.logoDataUrl ? 5 : 0;
    const titleWidth = doc.getTextWidth(title);
    const groupX = centerX - ((logoW + logoGap + titleWidth) / 2);

    if (state.logoDataUrl) {
      doc.addImage(state.logoDataUrl, 'PNG', groupX, 17, logoW, logoW, undefined, 'FAST');
    }

    if (state.logoDataUrl) {
      doc.text(title, groupX + logoW + logoGap, 26);
    } else {
      doc.text(title, centerX, 26, { align: 'center' });
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(company.companyLegal || DEFAULT_COMPANY.companyLegal, pageWidth - 18, 49, { align: 'right' });
    doc.text(`${company.companyCity || 'San Martín'}, ${formatLongDate(data.quoteDate)}`, pageWidth - 18, 57, { align: 'right' });
  }

  function drawPdfLetterIntro(doc, data) {
    const left = 18;
    let y = 74;
    const clientLine = data.clientName || data.clientTaxName || 'Cliente';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Señor (es).', left, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(String(clientLine).toUpperCase(), left, y, { maxWidth: 124 });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Presente.', left, y);
    y += 15;
    doc.text('Estimados (as):', left, y);
    y += 8;
    const intro = 'Reciban un cordial saludo, deseándoles éxitos en sus actividades diarias. Al mismo tiempo nos complace presentarles cotización de productos solicitados. Detalle a continuación.';
    const lines = splitText(doc, intro, 174);
    doc.text(lines, left, y);
    y += lines.length * 6 + 8;
    return y;
  }

  function drawPdfTable(doc, data, startY) {
    const rows = (data.items || []).map((item) => [
      String(item.nombre || '').toUpperCase(),
      fix2(item.cantidad).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      formatPlainCurrency(item.precioUnitario),
      formatPlainCurrency(fix2(item.cantidad * item.precioUnitario))
    ]);
    const subtotal = (data.items || []).reduce((sum, item) => sum + fix2(item.cantidad * item.precioUnitario), 0);
    const discount = Math.min(fix2(data.discountAmount || 0), subtotal);
    const total = Math.max(0, subtotal - discount);
    const foot = discount > 0
      ? [
          ['', '', 'SUBTOTAL', formatPlainCurrency(subtotal)],
          ['', '', 'DESCUENTO', `-${formatPlainCurrency(discount)}`],
          ['', '', 'TOTAL', formatPlainCurrency(total)]
        ]
      : [['', '', '', formatPlainCurrency(total)]];

    doc.autoTable({
      startY,
      margin: { left: 38, right: 38 },
      head: [['DESCRIPCION DEL PRODUCTO', 'CANTIDAD', 'PRECIO\nUNITARIO', 'SUB TOTAL']],
      body: rows,
      foot,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.8,
        cellPadding: 2.2,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [111, 169, 219],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 9
      },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [239, 242, 245] },
      footStyles: {
        fillColor: [111, 169, 219],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: {
        0: { cellWidth: 80, halign: 'left' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  function drawPdfFooterText(doc, data, startY) {
    const left = 18;
    const right = 190;
    const company = data.company || DEFAULT_COMPANY;
    let y = ensurePdfSpace(doc, startY, 86);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (data.includeIva !== false) {
      doc.text('Precios incluyen IVA', left, y);
      y += 8;
    }

    doc.text(`Forma de pago: ${data.paymentMethod || 'Contado'}`, left, y);
    y += 8;

    const creditDays = fix2(data.creditDays);
    if (creditDays > 0) {
      doc.text(`Crédito: ${creditDays.toLocaleString('en-US', { maximumFractionDigits: 0 })} días`, left, y);
      y += 8;
    }

    if (fix2(data.validityDays) > 0) {
      doc.text(`Validez de la oferta: ${fix2(data.validityDays).toLocaleString('en-US', { maximumFractionDigits: 0 })} días`, left, y);
      y += 8;
    }

    if (String(data.paymentMethod || '').toLowerCase() === 'cheque') {
      const chequeText = `Si el pago es con cheque emitirlo a nombre de ${company.checkPayee || DEFAULT_COMPANY.checkPayee}.`;
      const lines = splitText(doc, chequeText, right - left);
      doc.text(lines, left, y);
      y += lines.length * 6 + 4;
    }

    if (data.quoteNotes) {
      y = ensurePdfSpace(doc, y, 22);
      const lines = splitText(doc, data.quoteNotes, right - left);
      doc.text(lines, left, y);
      y += lines.length * 6 + 6;
    }

    y = ensurePdfSpace(doc, y, 52);
    const closing = 'Esperando que nuestra oferta satisfaga sus requerimientos y poder servirles como ustedes lo merecen, quedamos a sus apreciables órdenes.';
    const closingLines = splitText(doc, closing, right - left);
    doc.text(closingLines, left, y);
    y += closingLines.length * 6 + 24;

    y = ensurePdfSpace(doc, y, 32);
    doc.text('Atentamente,', left, y);
    doc.text(company.sellerName || DEFAULT_COMPANY.sellerName, 75, y + 8);
    if (company.sellerPhone) doc.text(`CEL. ${company.sellerPhone}`, 80, y + 16);
  }

  async function generatePdf(inputData = null, options = {}) {
    const data = inputData || snapshotQuote();

    if (!data.clientName && !data.clientTaxName) {
      Swal.fire('Falta cliente', 'Ingresá el cliente o institución para generar la cotización.', 'warning');
      return;
    }
    if (!data.items || !data.items.length) {
      Swal.fire('Sin productos', 'Agregá un producto.', 'warning');
      return;
    }

    if (els.btnGeneratePdf) {
      els.btnGeneratePdf.disabled = true;
      els.btnGeneratePdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Generando...';
    }

    try {
      await loadLogoDataUrl();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      drawPdfHeader(doc, data);
      const tableY = drawPdfLetterIntro(doc, data);
      const afterTableY = drawPdfTable(doc, data, tableY + 4);
      drawPdfFooterText(doc, data, afterTableY);

      if (options.saveHistory !== false) {
        const snapshot = snapshotQuote();
        saveDraft({ toast: false });
        saveToHistory(snapshot);
      }

      const client = sanitizeFileName(data.clientName || data.clientTaxName);
      const quoteNo = sanitizeFileName(data.quoteNumber || data.id || 'cotizacion');
      doc.save(`${quoteNo}_${client}.pdf`);
      showToast('success', 'PDF generado', 'Listo.', 1800);
    } catch (error) {
      console.error('Error generando PDF:', error);
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    } finally {
      if (els.btnGeneratePdf) {
        els.btnGeneratePdf.disabled = false;
        els.btnGeneratePdf.innerHTML = '<i class="fa-solid fa-file-pdf me-1"></i>Generar PDF';
      }
    }
  }

  function bindStaticEvents() {
    const fields = [
      els.quoteNumber, els.quoteDate, els.validityDays, els.clientName, els.clientTaxName,
      els.clientContact, els.clientPhone, els.clientEmail, els.clientAddress, els.paymentMethod,
      els.creditDays, els.discountAmount, els.quoteNotes, els.includeIva,
      els.companyName, els.companyLegal, els.companyCity, els.sellerName, els.sellerPhone, els.checkPayee
    ];
    fields.forEach((field) => field?.addEventListener('input', () => {
      renderSummary();
      scheduleAutosave();
      saveCompanySettings();
    }));
    fields.forEach((field) => field?.addEventListener('change', () => {
      renderSummary();
      scheduleAutosave();
      saveCompanySettings();
    }));

    els.btnSearchModeToggle?.addEventListener('click', () => {
      const next = state.searchMode === 'catalog' ? 'quote' : 'catalog';
      setSearchMode(next);
      els.searchInput?.focus({ preventScroll: true });
    });

    let searchTimer = null;
    els.searchInput?.addEventListener('input', () => {
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(handleSearchInput, 80);
    });

    els.searchInput?.addEventListener('keydown', async (event) => {
      if (state.searchMode === 'catalog') {
        const items = els.suggestions ? els.suggestions.getElementsByTagName('li') : [];
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          state.currentFocus += 1;
          addActive(items);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          state.currentFocus -= 1;
          addActive(items);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (state.currentFocus > -1 && items[state.currentFocus] && !items[state.currentFocus].classList.contains('text-muted')) {
            items[state.currentFocus].click();
          } else {
            await handleSearchSubmit();
          }
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        await handleSearchSubmit();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target === els.searchInput || els.suggestions?.contains(target)) return;
      clearSuggestions();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') clearSuggestions();
    });

    els.btnClearSearch?.addEventListener('click', clearSearchUI);
    els.btnReloadCatalog?.addEventListener('click', async () => {
      await loadCatalog({ force: true });
      if (state.searchMode === 'catalog' && els.searchInput?.value.trim()) renderCatalogSuggestions(els.searchInput.value);
    });
    els.btnOpenManualProduct?.addEventListener('click', () => {
      clearManualModal();
      manualProductModal?.show();
      window.setTimeout(() => els.manualName?.focus(), 180);
    });
    els.btnAddManualProduct?.addEventListener('click', addManualProduct);
    els.manualPrice?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') addManualProduct();
    });
    els.btnClearItems?.addEventListener('click', () => {
      if (!state.items.length) return;
      Swal.fire({
        title: '¿Limpiar productos?',
        text: 'Se quitarán todos los productos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      }).then((result) => {
        if (result.isConfirmed) {
          state.items = [];
          renderAll();
          scheduleAutosave();
        }
      });
    });
    els.btnSaveQuote?.addEventListener('click', () => saveDraft());
    els.btnGeneratePdf?.addEventListener('click', () => generatePdf());
    els.btnNewQuote?.addEventListener('click', () => startNewQuote({ confirm: true }));
    els.btnOpenHistory?.addEventListener('click', () => {
      renderHistory();
      historyModal?.show();
    });
    els.btnClearHistory?.addEventListener('click', () => {
      Swal.fire({
        title: '¿Limpiar histórico?',
        text: 'Se borrará el historial del navegador.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem(STORAGE_KEYS.history);
          renderHistory();
        }
      });
    });
    els.btnResetCompany?.addEventListener('click', () => {
      setCompanyValues(DEFAULT_COMPANY);
      saveCompanySettings();
      scheduleAutosave();
      showToast('success', 'Restaurado', 'Datos de empresa.', 1500);
    });
  }

  function init() {
    manualProductModal = new bootstrap.Modal($('manualProductModal'));
    historyModal = new bootstrap.Modal($('historyModal'));
    installModalScrollLock();
    loadCompanySettings();
    loadDraftOrDefault();
    bindStaticEvents();
    setSearchMode('catalog');
    loadCatalog().catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', init);
})();
