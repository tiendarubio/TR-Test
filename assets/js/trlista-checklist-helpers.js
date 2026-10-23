// assets/js/trlista-checklist-helpers.js
(function (global) {
  'use strict';

  const sharedUtils = global.TRUtils || {};
  const normalizeText = sharedUtils.normalizeText || ((value) => String(value || '').trim().toLowerCase());
  const hasUsefulCode = sharedUtils.hasUsefulCode || ((value) => {
    const normalized = normalizeText(value);
    return !!normalized
      && normalized !== 'n/a'
      && normalized !== 'na'
      && normalized !== 'sin código'
      && normalized !== 'sin codigo';
  });

  function normalizeListSearchTerm(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function buildRowSearchText(row, colIndex) {
    if (!row?.cells || !colIndex) return '';
    return normalizeListSearchTerm([
      row.cells[colIndex.barcode]?.innerText || '',
      row.cells[colIndex.name]?.innerText || '',
      row.cells[colIndex.inventoryCode]?.innerText || '',
      row.cells[colIndex.warehouse]?.innerText || '',
      row.querySelector('.qty')?.value || ''
    ].join(' '));
  }

  function getDispatchButton(row) {
    return row?.querySelector('.btn-toggle-dispatch') || null;
  }

  function getMoveButton(row) {
    return row?.querySelector('.btn-move-list') || null;
  }

  function getDeleteButton(row) {
    return row?.querySelector('.btn-delete-row') || null;
  }

  function buildChecklistItemFromRow(row, colIndex) {
    if (!row?.cells || !colIndex) {
      return {
        codigo_barras: '',
        nombre: '',
        codigo_inventario: '',
        bodega: '',
        cantidad: '',
        despachado: false
      };
    }

    const dispatchButton = getDispatchButton(row);

    return {
      codigo_barras: row.cells[colIndex.barcode]?.innerText?.trim?.() || '',
      nombre: row.cells[colIndex.name]?.innerText?.trim?.() || '',
      codigo_inventario: row.cells[colIndex.inventoryCode]?.innerText?.trim?.() || '',
      bodega: row.cells[colIndex.warehouse]?.innerText?.trim?.() || '',
      cantidad: (row.querySelector('.qty')?.value || '').trim(),
      despachado: dispatchButton ? dispatchButton.classList.contains('on') : false
    };
  }

  function buildItemFromCatalogRow(row, fallbackCode = '') {
    return {
      codigo_barras: row?.[3] || fallbackCode || '',
      nombre: row?.[0] || '',
      codigo_inventario: row?.[1] || 'N/A',
      bodega: row?.[2] || '',
      cantidad: '',
      despachado: false
    };
  }

  function itemsMatch(itemA, itemB) {
    const barcodeA = normalizeText(itemA?.codigo_barras);
    const barcodeB = normalizeText(itemB?.codigo_barras);
    const inventoryA = normalizeText(itemA?.codigo_inventario);
    const inventoryB = normalizeText(itemB?.codigo_inventario);

    if (hasUsefulCode(barcodeA) && hasUsefulCode(barcodeB) && barcodeA === barcodeB) return true;
    if (hasUsefulCode(inventoryA) && hasUsefulCode(inventoryB) && inventoryA === inventoryB) return true;
    return false;
  }

  function findMatchingItemInArray(items, item) {
    return (items || []).find((existingItem) => itemsMatch(existingItem, item)) || null;
  }

  global.TRChecklistHelpers = {
    normalizeListSearchTerm,
    buildRowSearchText,
    getDispatchButton,
    getMoveButton,
    getDeleteButton,
    buildChecklistItemFromRow,
    buildItemFromCatalogRow,
    itemsMatch,
    findMatchingItemInArray
  };
})(window);
