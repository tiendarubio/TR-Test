// assets/js/trlista-utils.js
(function (global) {
  'use strict';

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function htmlAttrEscape(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function hasUsefulCode(value) {
    const normalized = normalizeText(value);
    const placeholders = new Set([
      'n/a', 'na', 's/a', 's/c', 'sc', 'sn',
      'sin código', 'sin codigo', 'sin cod', 'sin cod.',
      'sin codigo de barras', 'sin código de barras',
      '-', '--', '.', '0', '00', '000', '0000', '00000', '000000'
    ]);
    return !!normalized && !placeholders.has(normalized);
  }

  function setToggleState(button, shouldBeOn) {
    if (!button) return;
    button.classList.toggle('on', !!shouldBeOn);
    button.classList.toggle('off', !shouldBeOn);
  }

  function toggleButtonState(button) {
    if (!button) return;
    setToggleState(button, !button.classList.contains('on'));
  }

  function isCompactViewport(breakpoint = 767.98) {
    return global.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  }


  function installTRModalScrollLock() {
    if (global.__trListaModalScrollLockInstalled) return;
    global.__trListaModalScrollLockInstalled = true;

    let isLocked = false;
    let syncTimer = null;

    const isInteractiveOverlayTarget = (target) => {
      if (!target || !target.closest) return false;
      return !!target.closest('.swal2-popup, .swal2-toast, .flatpickr-calendar, .datepicker, .dropdown-menu');
    };

    const isVisibleBlockingPopup = (popup) => {
      if (!popup || popup.classList.contains('tr-swal-toast')) return false;
      const container = popup.closest('.swal2-container');
      if (!container) return false;
      const containerStyle = global.getComputedStyle ? global.getComputedStyle(container) : null;
      const popupStyle = global.getComputedStyle ? global.getComputedStyle(popup) : null;
      return containerStyle?.display !== 'none'
        && popupStyle?.display !== 'none'
        && popupStyle?.visibility !== 'hidden'
        && !popup.classList.contains('swal2-hide');
    };

    const hasBlockingModal = () => {
      return Array.from(document.querySelectorAll('.swal2-container .swal2-popup:not(.tr-swal-toast)')).some(isVisibleBlockingPopup);
    };

    const lockBackgroundScroll = () => {
      if (isLocked) return;
      document.documentElement.classList.add('tr-modal-scroll-locked');
      document.body.classList.add('tr-modal-scroll-locked');
      // No usamos position: fixed en body: en móviles puede quedarse “pegado” si una modal
      // se cierra mientras se carga otra vista. El bloqueo se controla con overflow + touchmove.
      document.body.style.top = '';
      isLocked = true;
    };

    const unlockBackgroundScroll = () => {
      document.documentElement.classList.remove('tr-modal-scroll-locked');
      document.body.classList.remove('tr-modal-scroll-locked');
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      isLocked = false;
    };

    const syncLockState = () => {
      if (hasBlockingModal()) lockBackgroundScroll();
      else unlockBackgroundScroll();
    };

    const scheduleSyncLockState = (delays = [0, 80, 240]) => {
      if (syncTimer) {
        global.clearTimeout(syncTimer);
        syncTimer = null;
      }
      const queue = Array.isArray(delays) && delays.length ? [...delays] : [0];
      const runNext = () => {
        syncLockState();
        const delay = queue.shift();
        if (delay === undefined) return;
        syncTimer = global.setTimeout(runNext, delay);
      };
      global.requestAnimationFrame(runNext);
    };

    const forceReleaseModalScrollLock = () => {
      unlockBackgroundScroll();
      scheduleSyncLockState([120, 300]);
    };

    const preventBackgroundTouchScroll = (event) => {
      if (!isLocked) return;
      if (isInteractiveOverlayTarget(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundTouchScroll, { passive: false });
    document.addEventListener('trlista:release-modal-scroll-lock', forceReleaseModalScrollLock);

    const observer = new MutationObserver(() => {
      scheduleSyncLockState();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        scheduleSyncLockState();
      }, { once: true });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') scheduleSyncLockState();
    });

    global.TRModalScrollLock = {
      sync: scheduleSyncLockState,
      release: forceReleaseModalScrollLock
    };

    scheduleSyncLockState();
  }

  global.TRUtils = {
    getLocalDateString,
    htmlAttrEscape,
    escapeHtml,
    normalizeText,
    hasUsefulCode,
    setToggleState,
    toggleButtonState,
    isCompactViewport,
    installTRModalScrollLock,
    syncModalScrollLock: () => global.TRModalScrollLock?.sync?.(),
    releaseModalScrollLock: () => global.TRModalScrollLock?.release?.()
  };

  installTRModalScrollLock();
})(window);
