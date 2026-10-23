// assets/js/admin.js — Panel administrativo de TRLista
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const state = {
    loaded: false,
    loading: false,
    requests: [],
    summaries: [],
    costs: [],
    costIndex: null,
    lastGeneratedAt: null,
    topStoreFilter: '__all__',
    suggestionStoreFilter: '__all__',
    calendars: {}
  };

  const STATUS_META = {
    none: { label: 'Sin iniciar', badge: 'text-bg-secondary' },
    draft: { label: 'En edición', badge: 'text-bg-warning' },
    borrador: { label: 'En edición', badge: 'text-bg-warning' },
    enviado: { label: 'Enviada', badge: 'text-bg-primary' },
    en_revision: { label: 'En revisión', badge: 'text-bg-info' },
    despacho_parcial: { label: 'Parcial', badge: 'text-bg-warning' },
    despachado: { label: 'Despachado', badge: 'text-bg-success' },
    despachado_requisicion_pendiente: { label: 'Despachado/Pendiente de requisición', badge: 'text-bg-warning' },
    despachado_requisicion_hecha: { label: 'Despachado/Requisición hecha', badge: 'text-bg-success' },
    recibido: { label: 'Recibida', badge: 'text-bg-dark' },
    cancelado: { label: 'Cancelada', badge: 'text-bg-danger' },
    cancelada: { label: 'Cancelada', badge: 'text-bg-danger' },
    fusionado: { label: 'Fusionada', badge: 'text-bg-secondary' },
    fusionada: { label: 'Fusionada', badge: 'text-bg-secondary' }
  };

  function normalizeStatus(status) {
    const value = String(status || 'none').trim().toLowerCase();
    if (value === 'borrador') return 'draft';
    if (value === 'recibida') return 'recibido';
    if (value === 'cancelada') return 'cancelado';
    if (value === 'fusionada') return 'fusionado';
    if (['despachada_requisicion_pendiente', 'despachado/requisicion_pendiente', 'despachada/requisición_pendiente', 'despachado/pendiente_de_requisicion', 'despachado/pendiente de requisición'].includes(value)) return 'despachado_requisicion_pendiente';
    if (['despachada_requisicion_hecha', 'despachado/requisicion_hecha', 'despachada/requisición_hecha'].includes(value)) return 'despachado_requisicion_hecha';
    return value || 'none';
  }

  function getStatusLabel(status) {
    const key = normalizeStatus(status);
    return STATUS_META[key]?.label || key;
  }

  function getStatusBadge(status) {
    const key = normalizeStatus(status);
    return STATUS_META[key]?.badge || 'text-bg-secondary';
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function htmlAttrEscape(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function normalizeKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function hasUsefulCode(value) {
    const normalized = normalizeKey(value);
    return !!normalized
      && normalized !== 'n/a'
      && normalized !== 'na'
      && normalized !== 'sin codigo'
      && normalized !== 'sin código';
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const cleaned = raw.replace(/[$\s]/g, '').replace(/,/g, '.');
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!match) return 0;
    const number = Number(match[0]);
    return Number.isFinite(number) ? number : 0;
  }

  function parseOptionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = parseNumber(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatMoney(value) {
    const number = Number(value || 0);
    try {
      return number.toLocaleString('es-SV', { style: 'currency', currency: 'USD' });
    } catch (_) {
      return '$' + number.toFixed(2);
    }
  }

  function formatDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Sin fecha';
    const datePart = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    return raw;
  }

  function formatDateTime(value) {
    if (!value) return 'Sin fecha';
    try {
      const dt = new Date(value);
      return dt.toLocaleString('es-SV', {
        timeZone: 'America/El_Salvador',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(value);
    }
  }

  function getTodayString() {
    if (global.TRUtils?.getLocalDateString) return global.TRUtils.getLocalDateString(new Date());
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function addDays(dateString, offset) {
    const [year, month, day] = String(dateString || getTodayString()).split('-').map(Number);
    const dt = new Date(year, (month || 1) - 1, day || 1);
    dt.setDate(dt.getDate() + Number(offset || 0));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  const ADMIN_WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function parseDateISO(value) {
    const raw = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function formatDateISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function startOfMonth(date) {
    const base = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1, 12, 0, 0, 0);
  }

  function sameDay(a, b) {
    return a instanceof Date && b instanceof Date
      && a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function getCalendarMonthLabel(date) {
    try {
      return date.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
    } catch (_) {
      return formatDateISO(date).slice(0, 7);
    }
  }

  function getAdminDatesWithData() {
    return new Set((state.summaries || []).map(row => row.requestDate).filter(Boolean));
  }

  function closeAdminCalendars(exceptKey = '') {
    Object.entries(state.calendars || {}).forEach(([key, calendar]) => {
      if (key !== exceptKey && calendar && typeof calendar.close === 'function') calendar.close();
    });
  }

  function redrawAdminCalendars() {
    Object.values(state.calendars || {}).forEach(calendar => {
      if (calendar && typeof calendar.redraw === 'function') calendar.redraw();
    });
  }

  function createAdminDatePicker(inputId, panelId, key) {
    const input = $(inputId);
    const panel = $(panelId);
    if (!input || !panel || input.dataset.adminCalendarBound) return null;

    input.dataset.adminCalendarBound = 'true';

    const stateLocal = {
      visibleMonth: startOfMonth(parseDateISO(input.value) || parseDateISO(getTodayString()) || new Date())
    };

    function close() {
      panel.classList.add('d-none');
      panel.setAttribute('aria-hidden', 'true');
    }

    function open() {
      closeAdminCalendars(key);
      panel.classList.remove('d-none');
      panel.setAttribute('aria-hidden', 'false');
      render();
    }

    function toggle() {
      if (panel.classList.contains('d-none')) open();
      else close();
    }

    function changeMonth(offset) {
      stateLocal.visibleMonth = new Date(
        stateLocal.visibleMonth.getFullYear(),
        stateLocal.visibleMonth.getMonth() + Number(offset || 0),
        1, 12, 0, 0, 0
      );
      render();
    }

    function setDate(iso) {
      input.value = iso || '';
      const parsed = parseDateISO(iso);
      if (parsed) stateLocal.visibleMonth = startOfMonth(parsed);
      close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      render();
    }

    function render() {
      const firstDay = startOfMonth(stateLocal.visibleMonth);
      const today = parseDateISO(getTodayString()) || new Date();
      const selectedDate = parseDateISO(input.value);
      const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay(), 12, 0, 0, 0);
      const datesWithData = getAdminDatesWithData();

      let html = `
        <div class="history-calendar-header">
          <button type="button" class="history-calendar-nav" data-admin-cal-nav="-1" aria-label="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="history-calendar-title">${getCalendarMonthLabel(firstDay)}</div>
          <button type="button" class="history-calendar-nav" data-admin-cal-nav="1" aria-label="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="history-calendar-weekdays">
          ${ADMIN_WEEKDAY_LABELS.map(label => `<div class="history-calendar-weekday">${label}</div>`).join('')}
        </div>
        <div class="history-calendar-grid">
      `;

      for (let i = 0; i < 42; i += 1) {
        const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 12, 0, 0, 0);
        const iso = formatDateISO(date);
        const classes = ['history-calendar-day'];
        if (date.getMonth() !== firstDay.getMonth()) classes.push('is-outside');
        if (sameDay(date, today)) classes.push('is-today');
        if (selectedDate && sameDay(date, selectedDate)) classes.push('is-selected');
        if (datesWithData.has(iso)) classes.push('has-history');

        html += `
          <button type="button" class="${classes.join(' ')}" data-admin-cal-date="${iso}" aria-label="Seleccionar ${iso}">
            ${date.getDate()}
          </button>
        `;
      }

      html += '</div>';
      if (!datesWithData.size) {
        html += '<div class="history-calendar-empty">Aún no hay solicitudes cargadas para marcar fechas.</div>';
      }

      panel.innerHTML = html;
      panel.querySelectorAll('[data-admin-cal-nav]').forEach(button => {
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          changeMonth(button.getAttribute('data-admin-cal-nav'));
        });
      });
      panel.querySelectorAll('[data-admin-cal-date]').forEach(button => {
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          setDate(button.getAttribute('data-admin-cal-date'));
        });
      });
    }

    input.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', event => {
      if (!panel.contains(event.target) && event.target !== input) close();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });

    render();
    return { close, redraw: render, setDate };
  }

  function initAdminDatePickers() {
    if (!state.calendars.from) {
      state.calendars.from = createAdminDatePicker('adminDateFrom', 'adminDateFromCalendarPanel', 'from');
    }
    if (!state.calendars.to) {
      state.calendars.to = createAdminDatePicker('adminDateTo', 'adminDateToCalendarPanel', 'to');
    }
  }

  function getStoreName(storeKey, fallback = '') {
    if (typeof global.getStoreLabel === 'function') return global.getStoreLabel(storeKey);
    const labels = {
      lista_sexta_calle: 'Sexta Calle',
      lista_avenida_morazan: 'Avenida Morazán',
      lista_centro_comercial: 'Centro Comercial'
    };
    return labels[storeKey] || fallback || storeKey || 'Tienda';
  }

  function getVersionLabel(versionKey) {
    if (typeof global.getListLabel === 'function') return global.getListLabel(versionKey);
    const labels = { base: 'Principal', alterna: 'Alterna', traslado: 'Traslado' };
    return labels[versionKey] || versionKey || 'Principal';
  }

  function getRequestDate(req) {
    return String(req?.requestDate || req?.submittedAt || req?.createdAt || req?.dispatchedAt || '').slice(0, 10);
  }

  function getRequestCode(req) {
    const id = String(req?.requestId || req?.id || '').trim();
    if (!id) return 'Sin ID';
    const store = getStoreName(req.storeKey || '').replace(/^Lista\s+/i, '');
    const type = getVersionLabel(req.versionKey || 'base');
    const date = getRequestDate(req) || 'sin-fecha';
    return `${store} · ${type} · ${date}`;
  }

  function getItemRequestedQty(item) {
    return parseNumber(item?.cantidad ?? item?.quantity ?? item?.qty ?? 0);
  }

  function getItemDispatchQty(item, reqStatus) {
    const explicit = parseOptionalNumber(item?.cantidad_despachada ?? item?.cantidadDespachada ?? item?.dispatchedQuantity);
    if (explicit !== null) return explicit;

    const status = normalizeStatus(reqStatus);
    const requestedQty = getItemRequestedQty(item);
    const hasDispatchFlag = typeof item?.despachado === 'boolean';

    if (hasDispatchFlag) return item.despachado ? requestedQty : 0;
    if (['despachado', 'despachado_requisicion_pendiente', 'despachado_requisicion_hecha', 'recibido'].includes(status)) return requestedQty;
    if (status === 'despacho_parcial') return item?.despachado ? requestedQty : 0;
    return requestedQty;
  }

  function shouldCountAsDispatched(status) {
    const value = normalizeStatus(status);
    return ['despachado', 'despachado_requisicion_pendiente', 'despachado_requisicion_hecha', 'despacho_parcial', 'recibido'].includes(value);
  }

  function buildCostIndex(products) {
    const byInventory = new Map();
    const byBarcode = new Map();
    const byNameWarehouse = new Map();
    const byName = new Map();

    (products || []).forEach(product => {
      if (!product || product.costo === null || product.costo === undefined || Number.isNaN(Number(product.costo))) return;
      const normalizedProduct = { ...product, costo: Number(product.costo) };
      const inv = normalizeKey(product.codigo_inventario);
      const barcode = normalizeKey(product.codigo_barras);
      const name = normalizeKey(product.nombre);
      const warehouse = normalizeKey(product.bodega);

      if (hasUsefulCode(inv) && !byInventory.has(inv)) byInventory.set(inv, normalizedProduct);
      if (hasUsefulCode(barcode) && !byBarcode.has(barcode)) byBarcode.set(barcode, normalizedProduct);
      if (name && warehouse && !byNameWarehouse.has(name + '|' + warehouse)) byNameWarehouse.set(name + '|' + warehouse, normalizedProduct);
      if (name && !byName.has(name)) byName.set(name, normalizedProduct);
    });

    return { byInventory, byBarcode, byNameWarehouse, byName };
  }

  function findCostForItem(item) {
    const snapshot = parseOptionalNumber(item?.costo_unitario ?? item?.costoUnitario ?? item?.unitCost);
    if (snapshot !== null && snapshot > 0) {
      return { costo: snapshot, source: 'Snapshot', product: null };
    }

    const index = state.costIndex;
    if (!index) return { costo: null, source: 'Sin catálogo', product: null };

    const inv = normalizeKey(item?.codigo_inventario || item?.codigoInv || item?.inventoryCode);
    const barcode = normalizeKey(item?.codigo_barras || item?.barcode || item?.codigoBarras);
    const name = normalizeKey(item?.nombre || item?.name);
    const warehouse = normalizeKey(item?.bodega || item?.warehouse);

    if (hasUsefulCode(inv) && index.byInventory.has(inv)) {
      return { costo: index.byInventory.get(inv).costo, source: 'Cód. inv.', product: index.byInventory.get(inv) };
    }
    if (hasUsefulCode(barcode) && index.byBarcode.has(barcode)) {
      return { costo: index.byBarcode.get(barcode).costo, source: 'Cód. barras', product: index.byBarcode.get(barcode) };
    }
    if (name && warehouse && index.byNameWarehouse.has(name + '|' + warehouse)) {
      return { costo: index.byNameWarehouse.get(name + '|' + warehouse).costo, source: 'Nombre + bodega', product: index.byNameWarehouse.get(name + '|' + warehouse) };
    }
    if (name && index.byName.has(name)) {
      return { costo: index.byName.get(name).costo, source: 'Nombre', product: index.byName.get(name) };
    }

    return { costo: null, source: 'Sin costo', product: null };
  }

  function summarizeRequest(req) {
    const items = Array.isArray(req?.items) ? req.items : [];
    const status = normalizeStatus(req?.status || 'none');
    const shouldUseDispatchTotal = shouldCountAsDispatched(status);
    let totalCost = 0;
    let missingCostCount = 0;
    let costedItemCount = 0;
    let totalQty = 0;

    const detailRows = items.map((item, index) => {
      const requestedQty = getItemRequestedQty(item);
      const qtyForCost = getItemDispatchQty(item, status);
      const costMatch = findCostForItem(item);
      const unitCost = costMatch.costo;
      const hasCost = unitCost !== null && unitCost !== undefined && Number.isFinite(Number(unitCost));
      const lineTotal = hasCost ? qtyForCost * Number(unitCost) : 0;

      if (qtyForCost > 0) {
        totalQty += qtyForCost;
        if (hasCost) {
          totalCost += lineTotal;
          costedItemCount += 1;
        } else {
          missingCostCount += 1;
        }
      }

      return {
        index: index + 1,
        item,
        requestedQty,
        qtyForCost,
        unitCost: hasCost ? Number(unitCost) : null,
        lineTotal,
        hasCost,
        source: costMatch.source,
        matchedProduct: costMatch.product
      };
    });

    const requestDate = getRequestDate(req);
    const costSummary = req?.costSummary || req?.cost_summary || {};
    const snapshotTotal = parseOptionalNumber(costSummary.totalCost ?? costSummary.total_cost);

    return {
      id: String(req?.id || req?.requestId || '').trim(),
      request: req,
      requestCode: getRequestCode(req),
      requestDate,
      status,
      statusLabel: getStatusLabel(status),
      storeKey: String(req?.storeKey || '').trim(),
      storeName: req?.storeName || getStoreName(req?.storeKey || ''),
      versionKey: String(req?.versionKey || 'base').trim() || 'base',
      versionLabel: req?.versionLabel || getVersionLabel(req?.versionKey || 'base'),
      itemCount: Number(req?.itemCount || items.length || 0),
      totalQty,
      totalCost,
      snapshotTotal,
      missingCostCount,
      costedItemCount,
      shouldUseDispatchTotal,
      detailRows,
      submittedAt: req?.submittedAt || null,
      dispatchedAt: req?.dispatchedAt || null,
      receivedAt: req?.receivedAt || null
    };
  }

  function getFilteredSummaries() {
    const from = $('adminDateFrom')?.value || '';
    const to = $('adminDateTo')?.value || '';
    const store = $('adminStoreFilter')?.value || '__all__';
    const status = $('adminStatusFilter')?.value || '__all__';
    const onlyMissing = !!$('adminOnlyMissingCost')?.checked;

    return state.summaries.filter(summary => {
      const date = summary.requestDate || '';
      if (from && date && date < from) return false;
      if (to && date && date > to) return false;
      if (store !== '__all__' && summary.storeKey !== store) return false;
      if (status !== '__all__' && normalizeStatus(summary.status) !== status) return false;
      if (onlyMissing && summary.missingCostCount <= 0) return false;
      return true;
    });
  }

  function isRealRequestStatus(status) {
    const value = normalizeStatus(status);
    return !['none', 'draft', 'cancelado', 'fusionado'].includes(value);
  }

  function getProductIdentity(item) {
    const inv = String(item?.codigo_inventario || item?.codigoInv || item?.inventoryCode || '').trim();
    const barcode = String(item?.codigo_barras || item?.barcode || item?.codigoBarras || '').trim();
    const name = String(item?.nombre || item?.name || '').trim();
    const warehouse = String(item?.bodega || item?.warehouse || '').trim();
    const key = hasUsefulCode(inv)
      ? 'inv:' + normalizeKey(inv)
      : hasUsefulCode(barcode)
        ? 'bar:' + normalizeKey(barcode)
        : 'name:' + normalizeKey(name) + '|wh:' + normalizeKey(warehouse);
    return { key, inv, barcode, name, warehouse };
  }

  function getDateFromString(dateString) {
    const raw = String(dateString || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function diffDays(a, b) {
    const start = getDateFromString(a);
    const end = getDateFromString(b);
    if (!start || !end) return null;
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function median(numbers) {
    const values = (numbers || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }

  function getStoreOrder() {
    return ['lista_sexta_calle', 'lista_avenida_morazan', 'lista_centro_comercial'];
  }

  function getInsightRows() {
    return state.summaries || [];
  }

  function getVisibleStoreKeys(grouped, activeStore) {
    if (activeStore && activeStore !== '__all__') return [activeStore];
    return Array.from(new Set([...getStoreOrder(), ...grouped.keys()])).filter(key => grouped.has(key));
  }

  function syncAdminSubtabs(selector, activeValue) {
    document.querySelectorAll(selector).forEach(button => {
      const value = button.getAttribute(selector.includes('suggestion') ? 'data-admin-suggestion-store' : 'data-admin-top-store');
      button.classList.toggle('active', value === activeValue);
    });
  }

  function calculateTopProductsByStore(rows) {
    const storeBuckets = new Map();

    (rows || []).filter(row => isRealRequestStatus(row.status)).forEach(summary => {
      const storeKey = summary.storeKey || 'sin_tienda';
      if (!storeBuckets.has(storeKey)) storeBuckets.set(storeKey, new Map());
      const bucket = storeBuckets.get(storeKey);

      (summary.detailRows || []).forEach(detail => {
        const identity = getProductIdentity(detail.item || {});
        if (!identity.name && !identity.inv && !identity.barcode) return;
        const key = identity.key;
        const existing = bucket.get(key) || {
          ...identity,
          storeKey,
          storeName: summary.storeName || getStoreName(storeKey),
          requestCount: 0,
          totalRequestedQty: 0,
          totalDispatchQty: 0,
          totalCost: 0,
          missingCostCount: 0,
          dates: new Set()
        };

        existing.requestCount += 1;
        existing.totalRequestedQty += Number(detail.requestedQty || 0);
        existing.totalDispatchQty += Number(detail.qtyForCost || 0);
        existing.totalCost += Number(detail.lineTotal || 0);
        if (!detail.hasCost && Number(detail.qtyForCost || 0) > 0) existing.missingCostCount += 1;
        if (summary.requestDate) existing.dates.add(summary.requestDate);
        bucket.set(key, existing);
      });
    });

    const result = new Map();
    storeBuckets.forEach((bucket, storeKey) => {
      result.set(storeKey, Array.from(bucket.values())
        .map(row => ({ ...row, activeDays: row.dates.size }))
        .sort((a, b) => Number(b.totalDispatchQty || b.totalRequestedQty || 0) - Number(a.totalDispatchQty || a.totalRequestedQty || 0))
        .slice(0, 25));
    });
    return result;
  }

  function calculateDispatchSuggestions(rows) {
    const today = getTodayString();
    const buckets = new Map();

    (rows || []).filter(row => isRealRequestStatus(row.status)).forEach(summary => {
      if (!summary.requestDate) return;
      (summary.detailRows || []).forEach(detail => {
        const qty = Number(detail.requestedQty || 0);
        if (qty <= 0) return;
        const identity = getProductIdentity(detail.item || {});
        if (!identity.name && !identity.inv && !identity.barcode) return;
        const key = [summary.storeKey || 'sin_tienda', identity.key].join('::');
        const existing = buckets.get(key) || {
          ...identity,
          storeKey: summary.storeKey || 'sin_tienda',
          storeName: summary.storeName || getStoreName(summary.storeKey || ''),
          quantitiesByDate: new Map(),
          requestCount: 0
        };
        existing.quantitiesByDate.set(summary.requestDate, Number(existing.quantitiesByDate.get(summary.requestDate) || 0) + qty);
        existing.requestCount += 1;
        buckets.set(key, existing);
      });
    });

    return Array.from(buckets.values()).map(item => {
      const dates = Array.from(item.quantitiesByDate.keys()).sort();
      if (dates.length < 2) return null;
      const gaps = [];
      for (let i = 1; i < dates.length; i += 1) {
        const gap = diffDays(dates[i - 1], dates[i]);
        if (gap !== null && gap > 0) gaps.push(gap);
      }
      if (!gaps.length) return null;

      const medianInterval = Math.max(1, median(gaps));
      const averageInterval = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const quantities = Array.from(item.quantitiesByDate.values()).map(Number).filter(qty => qty > 0);
      const averageQty = quantities.reduce((sum, qty) => sum + qty, 0) / Math.max(1, quantities.length);
      const lastDate = dates[dates.length - 1];
      const daysSinceLast = diffDays(lastDate, today);
      if (daysSinceLast === null || daysSinceLast < 0) return null;
      const dueRatio = daysSinceLast / medianInterval;
      if (dueRatio < 0.85) return null;

      let confidence = 'Media';
      if (dates.length >= 5 && dueRatio >= 1.1) confidence = 'Alta';
      if (dates.length < 3 || dueRatio < 1) confidence = 'Baja';

      return {
        ...item,
        occurrences: dates.length,
        medianInterval,
        averageInterval,
        lastDate,
        daysSinceLast,
        dueRatio,
        suggestedQty: Math.max(1, Math.ceil(averageQty)),
        averageQty,
        confidence
      };
    }).filter(Boolean)
      .sort((a, b) => Number(b.dueRatio || 0) - Number(a.dueRatio || 0) || Number(b.occurrences || 0) - Number(a.occurrences || 0));
  }


  function getAdminOperationalRows(rows = state.summaries) {
    return (rows || []).filter(row => isRealRequestStatus(row.status));
  }

  function getDispatchedAdminRows(rows = state.summaries) {
    return getAdminOperationalRows(rows).filter(row => shouldCountAsDispatched(row.status));
  }

  function getStoreSummaryRows(rows) {
    const buckets = new Map();
    getAdminOperationalRows(rows).forEach(summary => {
      const storeKey = summary.storeKey || 'sin_tienda';
      const existing = buckets.get(storeKey) || {
        storeKey,
        storeName: summary.storeName || getStoreName(storeKey),
        requestCount: 0,
        dispatchedCount: 0,
        itemCount: 0,
        totalQty: 0,
        totalCost: 0,
        missingCostCount: 0,
        lastDate: '',
        pendingCount: 0
      };

      existing.requestCount += 1;
      existing.itemCount += Number(summary.itemCount || 0);
      existing.missingCostCount += Number(summary.missingCostCount || 0);
      if (summary.requestDate && summary.requestDate > existing.lastDate) existing.lastDate = summary.requestDate;

      if (shouldCountAsDispatched(summary.status)) {
        existing.dispatchedCount += 1;
        existing.totalQty += Number(summary.totalQty || 0);
        existing.totalCost += Number(summary.totalCost || 0);
      } else if (['enviado', 'en_revision'].includes(normalizeStatus(summary.status))) {
        existing.pendingCount += 1;
      }

      buckets.set(storeKey, existing);
    });

    return Array.from(buckets.values())
      .map(row => ({
        ...row,
        averageCostPerDispatch: row.dispatchedCount ? row.totalCost / row.dispatchedCount : 0
      }))
      .sort((a, b) => Number(b.totalCost || 0) - Number(a.totalCost || 0));
  }

  function getWarehouseSummaryRows(rows) {
    const buckets = new Map();

    getDispatchedAdminRows(rows).forEach(summary => {
      (summary.detailRows || []).forEach(detail => {
        const qty = Number(detail.qtyForCost || 0);
        if (qty <= 0) return;
        const warehouse = String(detail.item?.bodega || detail.item?.warehouse || 'Sin bodega').trim() || 'Sin bodega';
        const key = normalizeKey(warehouse) || 'sin_bodega';
        const existing = buckets.get(key) || {
          warehouse,
          productKeys: new Set(),
          itemLines: 0,
          totalQty: 0,
          totalCost: 0,
          missingCostCount: 0,
          storeKeys: new Set()
        };

        existing.itemLines += 1;
        existing.totalQty += qty;
        existing.totalCost += Number(detail.lineTotal || 0);
        if (!detail.hasCost) existing.missingCostCount += 1;
        if (summary.storeKey) existing.storeKeys.add(summary.storeKey);
        existing.productKeys.add(getProductIdentity(detail.item || {}).key);
        buckets.set(key, existing);
      });
    });

    return Array.from(buckets.values()).map(row => ({
      ...row,
      productCount: row.productKeys.size,
      storeCount: row.storeKeys.size
    })).sort((a, b) => Number(b.totalCost || 0) - Number(a.totalCost || 0));
  }

  function getMissingCostRows(rows) {
    const buckets = new Map();

    getAdminOperationalRows(rows).forEach(summary => {
      (summary.detailRows || []).forEach(detail => {
        const qty = Number(detail.qtyForCost || detail.requestedQty || 0);
        if (qty <= 0 || detail.hasCost) return;
        const identity = getProductIdentity(detail.item || {});
        if (!identity.name && !identity.inv && !identity.barcode) return;
        const key = identity.key;
        const existing = buckets.get(key) || {
          ...identity,
          requestCount: 0,
          totalQty: 0,
          storeKeys: new Set(),
          lastDate: ''
        };

        existing.requestCount += 1;
        existing.totalQty += qty;
        if (summary.storeKey) existing.storeKeys.add(summary.storeKey);
        if (summary.requestDate && summary.requestDate > existing.lastDate) existing.lastDate = summary.requestDate;
        buckets.set(key, existing);
      });
    });

    return Array.from(buckets.values()).map(row => ({
      ...row,
      storeCount: row.storeKeys.size,
      storesLabel: Array.from(row.storeKeys).map(key => getStoreName(key)).join(', ')
    })).sort((a, b) => Number(b.requestCount || 0) - Number(a.requestCount || 0) || Number(b.totalQty || 0) - Number(a.totalQty || 0));
  }

  function getSourceRiskCount(rows) {
    let count = 0;
    getAdminOperationalRows(rows).forEach(summary => {
      (summary.detailRows || []).forEach(detail => {
        if (detail.hasCost && ['Nombre', 'Nombre + bodega'].includes(detail.source)) count += 1;
      });
    });
    return count;
  }

  function renderOverview(rows) {
    const activeRows = getAdminOperationalRows(rows);
    const dispatchedRows = getDispatchedAdminRows(rows);
    const totalCost = dispatchedRows.reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
    const missingCost = activeRows.reduce((sum, row) => sum + Number(row.missingCostCount || 0), 0);
    const storeRows = getStoreSummaryRows(rows);
    const warehouseRows = getWarehouseSummaryRows(rows);
    const missingRows = getMissingCostRows(rows);

    if ($('adminTotalCost')) $('adminTotalCost').textContent = formatMoney(totalCost);
    if ($('adminRequestCount')) $('adminRequestCount').textContent = String(activeRows.length);
    if ($('adminMissingCostCount')) $('adminMissingCostCount').textContent = String(missingCost);
    if ($('adminCostCatalogCount')) $('adminCostCatalogCount').textContent = String((state.costs || []).filter(item => item.hasCost).length);

    const meta = $('adminOverviewMeta');
    if (meta) {
      const dateText = state.lastGeneratedAt ? 'Última carga: ' + formatDateTime(state.lastGeneratedAt) : 'Sin carga registrada.';
      meta.textContent = `${activeRows.length} solicitud(es) activas · ${dateText}`;
    }

    const storesEl = $('adminOverviewStores');
    if (storesEl) {
      storesEl.innerHTML = storeRows.length ? storeRows.map(row => `
        <div class="admin-store-mini-card">
          <span class="admin-store-mini-title">${escapeHtml(row.storeName)}</span>
          <strong>${formatMoney(row.totalCost)}</strong>
          <small>${row.dispatchedCount} despachada(s) · ${row.missingCostCount} item(s) sin costo</small>
        </div>
      `).join('') : '<div class="text-muted small">Sin datos de tiendas.</div>';
    }

    const alertEl = $('adminAlertsList');
    if (alertEl) {
      const pendingCount = activeRows.filter(row => ['enviado', 'en_revision', 'despacho_parcial'].includes(normalizeStatus(row.status))).length;
      const sourceRiskCount = getSourceRiskCount(rows);
      const alerts = [];
      if (missingRows.length) {
        alerts.push({ icon: 'fa-triangle-exclamation', tone: 'warning', title: `${missingRows.length} producto(s) sin costo`, text: 'Revisar columna F, código de inventario o código de barras.' });
      }
      if (pendingCount) {
        alerts.push({ icon: 'fa-clock', tone: 'primary', title: `${pendingCount} solicitud(es) pendientes`, text: 'Hay solicitudes enviadas, en revisión o parciales.' });
      }
      if (sourceRiskCount) {
        alerts.push({ icon: 'fa-magnifying-glass-chart', tone: 'info', title: `${sourceRiskCount} item(s) costeados por nombre`, text: 'Conviene validar códigos para evitar coincidencias débiles.' });
      }
      if (!alerts.length) {
        alerts.push({ icon: 'fa-circle-check', tone: 'success', title: 'Sin alertas principales', text: 'No se detectaron pendientes fuertes en la carga actual.' });
      }
      alertEl.innerHTML = alerts.map(alert => `
        <div class="admin-alert-item admin-alert-${alert.tone}">
          <i class="fa-solid ${alert.icon}" aria-hidden="true"></i>
          <div><strong>${escapeHtml(alert.title)}</strong><small>${escapeHtml(alert.text)}</small></div>
        </div>
      `).join('');
    }

    const statusEl = $('adminStatusBreakdown');
    if (statusEl) {
      const statusCounts = new Map();
      activeRows.forEach(row => statusCounts.set(row.statusLabel, Number(statusCounts.get(row.statusLabel) || 0) + 1));
      const statusHtml = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => `
        <div class="admin-pill-row"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>
      `).join('');
      statusEl.innerHTML = statusHtml || '<div class="text-muted small">Sin estados para mostrar.</div>';
    }

    const warehouseEl = $('adminOverviewWarehouses');
    if (warehouseEl) {
      warehouseEl.innerHTML = warehouseRows.slice(0, 5).map(row => `
        <div class="admin-pill-row"><span>${escapeHtml(row.warehouse)}</span><strong>${formatMoney(row.totalCost)}</strong></div>
      `).join('') || '<div class="text-muted small">Sin despachos costeados por bodega.</div>';
    }
  }

  function renderStoreSummary(rows) {
    const body = $('adminStoreSummaryBody');
    const meta = $('adminStoreSummaryMeta');
    if (!body) return 0;
    const storeRows = getStoreSummaryRows(rows);
    if (meta) meta.textContent = `${storeRows.length} tienda(s) con movimiento en el histórico cargado.`;
    if ($('adminStoresTabBadge')) $('adminStoresTabBadge').textContent = String(storeRows.length);

    body.innerHTML = storeRows.length ? storeRows.map(row => `
      <tr>
        <td><strong>${escapeHtml(row.storeName)}</strong></td>
        <td class="text-end">${row.requestCount}</td>
        <td class="text-end">${row.dispatchedCount}</td>
        <td class="text-end">${row.itemCount}</td>
        <td class="text-end"><strong>${formatMoney(row.totalCost)}</strong></td>
        <td class="text-end">${formatMoney(row.averageCostPerDispatch)}</td>
        <td class="text-end">${row.missingCostCount > 0 ? `<span class="badge text-bg-warning">${row.missingCostCount}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-end text-nowrap">${escapeHtml(row.lastDate || 'Sin fecha')}</td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="text-center text-muted py-4">No hay movimiento por tienda.</td></tr>';
    return storeRows.length;
  }

  function renderWarehouseSummary(rows) {
    const body = $('adminWarehouseSummaryBody');
    const meta = $('adminWarehouseSummaryMeta');
    if (!body) return 0;
    const warehouseRows = getWarehouseSummaryRows(rows);
    if (meta) meta.textContent = `${warehouseRows.length} bodega(s) con despachos costeados.`;
    if ($('adminWarehousesTabBadge')) $('adminWarehousesTabBadge').textContent = String(warehouseRows.length);

    body.innerHTML = warehouseRows.length ? warehouseRows.map(row => `
      <tr>
        <td><strong>${escapeHtml(row.warehouse)}</strong></td>
        <td class="text-end">${row.productCount}</td>
        <td class="text-end">${row.itemLines}</td>
        <td class="text-end">${row.totalQty}</td>
        <td class="text-end"><strong>${formatMoney(row.totalCost)}</strong></td>
        <td class="text-end">${row.missingCostCount > 0 ? `<span class="badge text-bg-warning">${row.missingCostCount}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-end">${row.storeCount}</td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">No hay despachos costeados por bodega.</td></tr>';
    return warehouseRows.length;
  }

  function renderMissingCosts(rows) {
    const body = $('adminMissingCostBody');
    const meta = $('adminMissingCostsMeta');
    if (!body) return 0;
    const missingRows = getMissingCostRows(rows);
    if (meta) meta.textContent = missingRows.length
      ? `${missingRows.length} producto(s) requieren costo o mejor coincidencia en bd.`
      : 'No se detectaron productos sin costo en la carga actual.';
    if ($('adminMissingCostsTabBadge')) $('adminMissingCostsTabBadge').textContent = String(missingRows.length);

    body.innerHTML = missingRows.length ? missingRows.slice(0, 250).map(row => `
      <tr>
        <td><strong>${escapeHtml(row.name || 'Producto')}</strong></td>
        <td>${escapeHtml(row.inv || '')}</td>
        <td>${escapeHtml(row.barcode || '')}</td>
        <td>${escapeHtml(row.warehouse || '')}</td>
        <td class="text-end">${row.requestCount}</td>
        <td class="text-end">${row.totalQty}</td>
        <td class="text-end" title="${htmlAttrEscape(row.storesLabel || '')}">${row.storeCount}</td>
        <td class="text-end text-nowrap">${escapeHtml(row.lastDate || 'Sin fecha')}</td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="text-center text-muted py-4">No hay productos sin costo.</td></tr>';
    return missingRows.length;
  }

  function renderTopProducts(rows) {
    const body = $('adminTopProductsBody');
    const meta = $('adminTopProductsMeta');
    if (!body) return 0;

    const grouped = calculateTopProductsByStore(rows);
    const activeStore = state.topStoreFilter || '__all__';
    const storeKeys = getVisibleStoreKeys(grouped, activeStore);

    syncAdminSubtabs('[data-admin-top-store]', activeStore);

    if (meta) {
      meta.textContent = activeStore === '__all__'
        ? 'Top por tienda calculado con el histórico cargado, sin los filtros de despachos.'
        : `Top de ${getStoreName(activeStore)} calculado con el histórico cargado.`;
    }

    const html = [];
    let visibleCount = 0;
    storeKeys.forEach(storeKey => {
      const products = grouped.get(storeKey) || [];
      if (!products.length) return;
      if (activeStore === '__all__') {
        html.push(`<tr class="admin-section-row"><td colspan="8">${escapeHtml(getStoreName(storeKey, products[0]?.storeName || storeKey))}</td></tr>`);
      }
      products.forEach((product, index) => {
        visibleCount += 1;
        const missing = product.missingCostCount > 0 ? `<span class="badge text-bg-warning">${product.missingCostCount}</span>` : '<span class="text-muted">0</span>';
        html.push(`
          <tr>
            <td class="text-end">${index + 1}</td>
            <td>
              <strong>${escapeHtml(product.name || product.inv || product.barcode || 'Producto')}</strong>
              <div class="small text-muted">${escapeHtml(product.barcode || '')}</div>
            </td>
            <td>${escapeHtml(product.inv || '')}</td>
            <td>${escapeHtml(product.warehouse || '')}</td>
            <td class="text-end">${Number(product.requestCount || 0)}</td>
            <td class="text-end">${Number(product.totalRequestedQty || 0)}</td>
            <td class="text-end"><strong>${formatMoney(product.totalCost)}</strong></td>
            <td class="text-end">${missing}</td>
          </tr>`);
      });
    });

    body.innerHTML = html.length
      ? html.join('')
      : '<tr><td colspan="8" class="text-center text-muted py-4">No hay productos suficientes para esta tienda.</td></tr>';

    if ($('adminTopProductsTabBadge')) $('adminTopProductsTabBadge').textContent = String(visibleCount);
    return visibleCount;
  }

  function groupSuggestionsByStore(suggestions) {
    const grouped = new Map();
    (suggestions || []).forEach(item => {
      const storeKey = item.storeKey || 'sin_tienda';
      if (!grouped.has(storeKey)) grouped.set(storeKey, []);
      grouped.get(storeKey).push(item);
    });
    grouped.forEach((items, storeKey) => {
      grouped.set(storeKey, items
        .sort((a, b) => Number(b.dueRatio || 0) - Number(a.dueRatio || 0) || Number(b.occurrences || 0) - Number(a.occurrences || 0))
        .slice(0, 25));
    });
    return grouped;
  }

  function renderDispatchSuggestions(rows) {
    const body = $('adminDispatchSuggestionsBody');
    const meta = $('adminDispatchSuggestionsMeta');
    if (!body) return 0;

    const activeStore = state.suggestionStoreFilter || '__all__';
    const grouped = groupSuggestionsByStore(calculateDispatchSuggestions(rows));
    const storeKeys = getVisibleStoreKeys(grouped, activeStore);

    syncAdminSubtabs('[data-admin-suggestion-store]', activeStore);

    const html = [];
    let visibleCount = 0;

    storeKeys.forEach(storeKey => {
      const suggestions = grouped.get(storeKey) || [];
      if (!suggestions.length) return;
      if (activeStore === '__all__') {
        html.push(`<tr class="admin-section-row"><td colspan="9">${escapeHtml(getStoreName(storeKey, suggestions[0]?.storeName || storeKey))}</td></tr>`);
      }
      suggestions.forEach((item, index) => {
        visibleCount += 1;
        const badgeClass = item.confidence === 'Alta' ? 'text-bg-success' : item.confidence === 'Media' ? 'text-bg-primary' : 'text-bg-secondary';
        html.push(`
          <tr>
            <td class="text-end">${index + 1}</td>
            <td>
              <strong>${escapeHtml(item.name || item.inv || item.barcode || 'Producto')}</strong>
              <div class="small text-muted">${escapeHtml(item.barcode || item.inv || '')}</div>
            </td>
            <td>${escapeHtml(item.storeName)}</td>
            <td>${escapeHtml(item.warehouse || '')}</td>
            <td class="text-end"><strong>${Number(item.suggestedQty || 0)}</strong></td>
            <td class="text-end">${Number(item.medianInterval || 0).toFixed(1)} d</td>
            <td class="text-end">${Number(item.daysSinceLast || 0)} d</td>
            <td class="text-end">${escapeHtml(item.lastDate)}</td>
            <td><span class="badge rounded-pill ${badgeClass}">${escapeHtml(item.confidence)}</span></td>
          </tr>`);
      });
    });

    if (meta) {
      meta.textContent = visibleCount
        ? 'Sugerencia = intervalo mediano vencido + cantidad promedio redondeada. No usa los filtros de despachos.'
        : 'Sin sugerencias suficientes para esta tienda. Se necesitan repeticiones históricas por producto.';
    }

    body.innerHTML = html.length
      ? html.join('')
      : '<tr><td colspan="9" class="text-center text-muted py-4">No hay suficientes repeticiones por producto para sugerir despachos.</td></tr>';

    if ($('adminSuggestionsTabBadge')) $('adminSuggestionsTabBadge').textContent = String(visibleCount);
    return visibleCount;
  }

  function renderInsights(rows) {
    renderOverview(rows);
    renderStoreSummary(rows);
    renderWarehouseSummary(rows);
    renderTopProducts(rows);
    renderDispatchSuggestions(rows);
    renderMissingCosts(rows);
  }

  function renderStats(rows) {
    const dispatchedRows = rows.filter(row => shouldCountAsDispatched(row.status));
    const totalCost = dispatchedRows.reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
    const missingCost = rows.reduce((sum, row) => sum + Number(row.missingCostCount || 0), 0);

    if ($('adminTotalCost')) $('adminTotalCost').textContent = formatMoney(totalCost);
    if ($('adminRequestCount')) $('adminRequestCount').textContent = String(rows.length);
    if ($('adminMissingCostCount')) $('adminMissingCostCount').textContent = String(missingCost);
    if ($('adminCostCatalogCount')) $('adminCostCatalogCount').textContent = String((state.costs || []).filter(item => item.hasCost).length);
    if ($('adminDispatchTabBadge')) $('adminDispatchTabBadge').textContent = String(rows.length);
  }

  function renderTable() {
    const body = $('adminRequestsBody');
    const meta = $('adminTableMeta');
    const rows = getFilteredSummaries();

    renderInsights(getInsightRows());
    if ($('adminDispatchTabBadge')) $('adminDispatchTabBadge').textContent = String(rows.length);
    redrawAdminCalendars();

    if (meta) {
      const dateText = state.lastGeneratedAt ? 'Última carga: ' + formatDateTime(state.lastGeneratedAt) : 'Sin carga registrada.';
      meta.textContent = `${rows.length} solicitud(es) · ${dateText}`;
    }

    if (!body) return;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay solicitudes con esos filtros.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(summary => {
      const missingBadge = summary.missingCostCount > 0
        ? `<span class="badge text-bg-warning">${summary.missingCostCount}</span>`
        : '<span class="text-muted">0</span>';
      const costClass = summary.missingCostCount > 0 ? 'admin-cost-warning' : '';
      return `
        <tr>
          <td class="text-nowrap">${escapeHtml(formatDate(summary.requestDate))}</td>
          <td>
            <strong>${escapeHtml(summary.requestCode)}</strong>
            <div class="small text-muted">${escapeHtml(summary.id || 'Sin ID')}</div>
          </td>
          <td>${escapeHtml(summary.storeName)}</td>
          <td>${escapeHtml(summary.versionLabel)}</td>
          <td><span class="badge rounded-pill ${getStatusBadge(summary.status)}">${escapeHtml(summary.statusLabel)}</span></td>
          <td class="text-end">${summary.itemCount}</td>
          <td class="text-end ${costClass}"><strong>${formatMoney(summary.totalCost)}</strong></td>
          <td class="text-end">${missingBadge}</td>
          <td class="text-center">
            <button type="button" class="btn btn-outline-primary btn-sm admin-detail-btn" data-request-id="${htmlAttrEscape(summary.id)}">
              <i class="fa-solid fa-eye" aria-hidden="true"></i>
              <span class="d-none d-lg-inline ms-1">Ver</span>
            </button>
          </td>
        </tr>`;
    }).join('');

    body.querySelectorAll('.admin-detail-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = String(button.getAttribute('data-request-id') || '').trim();
        const summary = state.summaries.find(row => row.id === id);
        if (summary) showRequestCostDetail(summary);
      });
    });
  }

  function showRequestCostDetail(summary) {
    const rowsHtml = summary.detailRows.length
      ? summary.detailRows.map(row => `
          <tr class="${row.hasCost ? '' : 'table-warning'}">
            <td>${row.index}</td>
            <td>
              <strong>${escapeHtml(row.item?.nombre || row.item?.name || '')}</strong>
              <div class="small text-muted">${escapeHtml(row.item?.codigo_barras || row.item?.barcode || '')}</div>
            </td>
            <td>${escapeHtml(row.item?.codigo_inventario || row.item?.codigoInv || row.item?.inventoryCode || '')}</td>
            <td>${escapeHtml(row.item?.bodega || row.item?.warehouse || '')}</td>
            <td class="text-end">${row.requestedQty}</td>
            <td class="text-end">${row.qtyForCost}</td>
            <td class="text-end">${row.hasCost ? formatMoney(row.unitCost) : '<span class="badge text-bg-warning">Sin costo</span>'}</td>
            <td class="text-end"><strong>${formatMoney(row.lineTotal)}</strong></td>
            <td>${escapeHtml(row.source)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="9" class="text-center text-muted py-4">Sin productos.</td></tr>';

    const html = `
      <div class="text-start admin-detail-modal">
        <div class="row g-2 mb-3 small">
          <div class="col-12 col-lg-6"><strong>Solicitud:</strong> ${escapeHtml(summary.requestCode)}</div>
          <div class="col-12 col-lg-3"><strong>Estado:</strong> ${escapeHtml(summary.statusLabel)}</div>
          <div class="col-12 col-lg-3"><strong>Total:</strong> ${formatMoney(summary.totalCost)}</div>
          <div class="col-12 col-lg-6"><strong>ID:</strong> ${escapeHtml(summary.id || 'Sin ID')}</div>
          <div class="col-12 col-lg-3"><strong>Items sin costo:</strong> ${summary.missingCostCount}</div>
          <div class="col-12 col-lg-3"><strong>Fecha:</strong> ${escapeHtml(formatDate(summary.requestDate))}</div>
        </div>
        <div class="table-responsive admin-detail-table-wrap">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Cód. inv.</th>
                <th>Bodega</th>
                <th class="text-end">Solicitada</th>
                <th class="text-end">Usada costo</th>
                <th class="text-end">Costo unit.</th>
                <th class="text-end">Total</th>
                <th>Origen costo</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        ${summary.missingCostCount > 0 ? '<div class="alert alert-warning mt-3 mb-0 small"><i class="fa-solid fa-triangle-exclamation me-2" aria-hidden="true"></i>Hay productos sin costo. Revisa código inventario, código de barras o columna F en la hoja bd.</div>' : ''}
      </div>
    `;

    if (global.Swal) {
      Swal.fire({
        title: 'Detalle de costo',
        width: 1180,
        html,
        confirmButtonText: 'Cerrar'
      });
    }
  }

  function setLoading(isLoading, message = 'Cargando consolidado...') {
    state.loading = !!isLoading;
    const btn = $('adminRefreshBtn');
    if (btn) {
      btn.disabled = !!isLoading;
      btn.innerHTML = isLoading
        ? '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span><span>Cargando...</span>'
        : '<i class="fa-solid fa-rotate me-1" aria-hidden="true"></i><span>Actualizar</span>';
    }
    const meta = $('adminTableMeta');
    if (meta && isLoading) meta.textContent = message;
  }

  async function getIdToken() {
    const user = global.TRAuth?.getCurrentUser?.();
    if (!user || typeof user.getIdToken !== 'function') throw new Error('Sesión no disponible.');
    return user.getIdToken();
  }

  async function loadCosts() {
    const idToken = await getIdToken();
    const response = await fetch('/api/admin-product-costs', {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + idToken }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudieron cargar los costos.');
    state.costs = Array.isArray(data.products) ? data.products : [];
    state.costIndex = buildCostIndex(state.costs);
    state.lastGeneratedAt = data.generatedAt || new Date().toISOString();
    return state.costs;
  }

  async function loadRequests() {
    if (typeof global.listRequestsForCurrentAccess !== 'function') {
      throw new Error('No está disponible la lectura de solicitudes.');
    }
    const rows = await global.listRequestsForCurrentAccess({ limit: 800 });
    state.requests = Array.isArray(rows) ? rows : [];
    state.summaries = state.requests.map(summarizeRequest)
      .sort((a, b) => String(b.requestDate || b.submittedAt || '').localeCompare(String(a.requestDate || a.submittedAt || '')));
    return state.summaries;
  }

  async function refreshAdminPanel() {
    if (!isAdmin()) return;
    setLoading(true);
    try {
      await loadCosts();
      await loadRequests();
      state.loaded = true;
      renderTable();
    } catch (error) {
      console.error('Error cargando admin:', error);
      const body = $('adminRequestsBody');
      if (body) {
        body.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${escapeHtml(error?.message || error || 'No se pudo cargar el panel.')}</td></tr>`;
      }
      if (global.Swal) {
        Swal.fire('No se pudo cargar', String(error?.message || error), 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    const rows = getFilteredSummaries();
    const insightRows = getInsightRows();
    if (!rows.length && !insightRows.length) {
      if (global.Swal) Swal.fire('Sin datos', 'No hay datos cargados para exportar.', 'info');
      return;
    }

    const summaryRows = rows.map(row => ({
      Fecha: row.requestDate || '',
      Solicitud: row.requestCode,
      ID: row.id,
      Tienda: row.storeName,
      Tipo: row.versionLabel,
      Estado: row.statusLabel,
      Items: row.itemCount,
      Cantidad_Usada_Costo: row.totalQty,
      Costo_Total: Number(row.totalCost || 0),
      Items_Sin_Costo: row.missingCostCount,
      Enviada: row.submittedAt || '',
      Despachada: row.dispatchedAt || '',
      Recibida: row.receivedAt || ''
    }));

    const detailRows = rows.flatMap(row => row.detailRows.map(detail => ({
      Fecha: row.requestDate || '',
      Solicitud: row.requestCode,
      ID: row.id,
      Tienda: row.storeName,
      Tipo: row.versionLabel,
      Estado: row.statusLabel,
      Producto: detail.item?.nombre || '',
      Codigo_Inventario: detail.item?.codigo_inventario || '',
      Codigo_Barras: detail.item?.codigo_barras || '',
      Bodega: detail.item?.bodega || '',
      Cantidad_Solicitada: detail.requestedQty,
      Cantidad_Usada_Costo: detail.qtyForCost,
      Costo_Unitario: detail.unitCost ?? '',
      Total: detail.lineTotal,
      Origen_Costo: detail.source,
      Sin_Costo: detail.hasCost ? 'No' : 'Sí'
    })));

    const topProductRows = [];
    const topGrouped = calculateTopProductsByStore(insightRows);
    getVisibleStoreKeys(topGrouped, state.topStoreFilter || '__all__').forEach(storeKey => {
      const products = topGrouped.get(storeKey) || [];
      products.forEach((product, index) => {
        topProductRows.push({
          Tienda: getStoreName(storeKey, product.storeName),
          Ranking: index + 1,
          Producto: product.name || '',
          Codigo_Inventario: product.inv || '',
          Codigo_Barras: product.barcode || '',
          Bodega: product.warehouse || '',
          Veces_Solicitado: product.requestCount,
          Cantidad_Solicitada: product.totalRequestedQty,
          Cantidad_Despachada_Usada: product.totalDispatchQty,
          Costo_Total: Number(product.totalCost || 0),
          Items_Sin_Costo: product.missingCostCount
        });
      });
    });

    const suggestionRows = [];
    const suggestionGrouped = groupSuggestionsByStore(calculateDispatchSuggestions(insightRows));
    getVisibleStoreKeys(suggestionGrouped, state.suggestionStoreFilter || '__all__').forEach(storeKey => {
      const suggestions = suggestionGrouped.get(storeKey) || [];
      suggestions.forEach((item, index) => {
        suggestionRows.push({
          Ranking: index + 1,
          Tienda: item.storeName,
          Producto: item.name || '',
          Codigo_Inventario: item.inv || '',
          Codigo_Barras: item.barcode || '',
          Bodega: item.warehouse || '',
          Cantidad_Sugerida: item.suggestedQty,
          Intervalo_Mediano_Dias: Number(item.medianInterval || 0),
          Intervalo_Promedio_Dias: Number(item.averageInterval || 0),
          Dias_Desde_Ultima_Solicitud: item.daysSinceLast,
          Ultima_Solicitud: item.lastDate,
          Veces_En_Rango: item.occurrences,
          Confianza: item.confidence
        });
      });
    });


    const storeSummaryRows = getStoreSummaryRows(insightRows).map(row => ({
      Tienda: row.storeName,
      Solicitudes: row.requestCount,
      Despachadas: row.dispatchedCount,
      Items: row.itemCount,
      Costo_Total: Number(row.totalCost || 0),
      Promedio_Por_Despacho: Number(row.averageCostPerDispatch || 0),
      Items_Sin_Costo: row.missingCostCount,
      Pendientes: row.pendingCount,
      Ultima_Solicitud: row.lastDate || ''
    }));

    const warehouseSummaryRows = getWarehouseSummaryRows(insightRows).map(row => ({
      Bodega: row.warehouse,
      Productos: row.productCount,
      Items: row.itemLines,
      Cantidad: row.totalQty,
      Costo_Total: Number(row.totalCost || 0),
      Items_Sin_Costo: row.missingCostCount,
      Tiendas: row.storeCount
    }));

    const missingCostRows = getMissingCostRows(insightRows).map(row => ({
      Producto: row.name || '',
      Codigo_Inventario: row.inv || '',
      Codigo_Barras: row.barcode || '',
      Bodega: row.warehouse || '',
      Veces: row.requestCount,
      Cantidad: row.totalQty,
      Tiendas: row.storesLabel || '',
      Ultima_Solicitud: row.lastDate || ''
    }));

    if (!global.XLSX) {
      const csv = summaryRows.map(row => Object.values(row).map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'consolidado-admin-trlista.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Consolidado');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Detalle');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(storeSummaryRows), 'Tiendas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(warehouseSummaryRows), 'Bodegas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topProductRows), 'Top 25 productos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suggestionRows), 'Sugerencias');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(missingCostRows), 'Costos incompletos');
    XLSX.writeFile(wb, 'consolidado-admin-trlista.xlsx');
  }

  function isAdmin() {
    return String(global.TRAuth?.getCurrentRole?.() || '').trim().toLowerCase() === 'admin';
  }

  function hideDropdown() {
    const toggle = $('authUserMenuToggle');
    try {
      const instance = global.bootstrap?.Dropdown?.getInstance(toggle) || global.bootstrap?.Dropdown?.getOrCreateInstance(toggle);
      instance?.hide?.();
    } catch (_) {}
  }

  function setAdminView(active) {
    const adminAllowed = isAdmin();
    const shouldShow = !!active && adminAllowed;
    const operationalView = $('operationalView');
    const adminView = $('adminPanelView');
    const mobileFabMenu = $('mobileFabMenu');
    const mobileFabBackdrop = $('mobileFabBackdrop');

    if (operationalView) operationalView.classList.toggle('d-none', shouldShow);
    if (adminView) adminView.classList.toggle('d-none', !shouldShow);
    document.body.classList.toggle('admin-view-open', shouldShow);

    if (mobileFabMenu && shouldShow) {
      mobileFabMenu.classList.add('d-none');
      mobileFabMenu.setAttribute('aria-hidden', 'true');
    }
    if (mobileFabBackdrop && shouldShow) {
      mobileFabBackdrop.classList.add('d-none');
      mobileFabBackdrop.setAttribute('aria-hidden', 'true');
    }

    if (shouldShow && !state.loaded && !state.loading) {
      refreshAdminPanel();
    }
  }

  function handleHashRoute() {
    const wantsAdmin = String(global.location.hash || '').replace('#', '') === 'admin';
    if (wantsAdmin && !isAdmin()) {
      global.location.hash = '';
      setAdminView(false);
      return;
    }
    setAdminView(wantsAdmin);
  }

  function bindEvents() {
    const btnAdmin = $('btnAdminPanel');
    const btnOperational = $('btnOperationalView');
    const btnRefresh = $('adminRefreshBtn');
    const btnExport = $('adminExportBtn');

    if (btnAdmin && !btnAdmin.dataset.adminBound) {
      btnAdmin.dataset.adminBound = 'true';
      btnAdmin.addEventListener('click', () => {
        hideDropdown();
        global.location.hash = 'admin';
        setAdminView(true);
      });
    }

    if (btnOperational && !btnOperational.dataset.adminBound) {
      btnOperational.dataset.adminBound = 'true';
      btnOperational.addEventListener('click', () => {
        hideDropdown();
        global.location.hash = '';
        setAdminView(false);
      });
    }

    if (btnRefresh && !btnRefresh.dataset.adminBound) {
      btnRefresh.dataset.adminBound = 'true';
      btnRefresh.addEventListener('click', refreshAdminPanel);
    }

    if (btnExport && !btnExport.dataset.adminBound) {
      btnExport.dataset.adminBound = 'true';
      btnExport.addEventListener('click', exportExcel);
    }

    ['adminDateFrom', 'adminDateTo', 'adminStoreFilter', 'adminStatusFilter', 'adminOnlyMissingCost'].forEach(id => {
      const el = $(id);
      if (el && !el.dataset.adminBound) {
        el.dataset.adminBound = 'true';
        el.addEventListener('change', renderTable);
      }
    });

    document.querySelectorAll('[data-admin-top-store]').forEach(button => {
      if (button.dataset.adminBound) return;
      button.dataset.adminBound = 'true';
      button.addEventListener('click', () => {
        state.topStoreFilter = button.getAttribute('data-admin-top-store') || '__all__';
        renderInsights(getInsightRows());
      });
    });

    document.querySelectorAll('[data-admin-suggestion-store]').forEach(button => {
      if (button.dataset.adminBound) return;
      button.dataset.adminBound = 'true';
      button.addEventListener('click', () => {
        state.suggestionStoreFilter = button.getAttribute('data-admin-suggestion-store') || '__all__';
        renderInsights(getInsightRows());
      });
    });

    global.addEventListener('hashchange', handleHashRoute);
  }

  function setDefaultFilters() {
    const today = getTodayString();
    if ($('adminDateTo') && !$('adminDateTo').value) $('adminDateTo').value = today;
    if ($('adminDateFrom') && !$('adminDateFrom').value) $('adminDateFrom').value = addDays(today, -30);
  }

  async function init() {
    if (global.TRAuth?.waitForReady) {
      try { await global.TRAuth.waitForReady(); } catch (_) {}
    }

    const btnAdmin = $('btnAdminPanel');
    const btnOperational = $('btnOperationalView');
    if (btnAdmin) btnAdmin.classList.toggle('d-none', !isAdmin());
    if (btnOperational) btnOperational.classList.toggle('d-none', !isAdmin());

    setDefaultFilters();
    initAdminDatePickers();
    bindEvents();
    handleHashRoute();
  }

  document.addEventListener('DOMContentLoaded', init);

  global.TRAdmin = {
    refresh: refreshAdminPanel,
    show: () => { global.location.hash = 'admin'; setAdminView(true); },
    hide: () => { global.location.hash = ''; setAdminView(false); }
  };
})(window);
