(function (global) {
  'use strict';

  function formatDateISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateISO(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
    const [year, month, day] = String(iso).split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  function sameDay(a, b) {
    return !!(a && b && formatDateISO(a) === formatDateISO(b));
  }

  function getCalendarMonthLabel(date) {
    try {
      return new Intl.DateTimeFormat('es-SV', {
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  function getHistoryCacheKey(docId) {
    return `trlista:history-dates:${docId || 'default'}`;
  }

  function readHistoryDatesCache(docId) {
    if (!docId || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getHistoryCacheKey(docId));
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)));
    } catch (_) {
      return [];
    }
  }

  function writeHistoryDatesCache(docId, values) {
    if (!docId || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        getHistoryCacheKey(docId),
        JSON.stringify(Array.from(new Set((values || []).filter(Boolean))).sort())
      );
    } catch (_) {}
  }

  function createService(deps = {}) {
    const {
      elements: {
        histDateInput,
        histCalendarPanel,
        btnHistCalendar,
        body,
        lastSaved
      } = {},
      getDocIdForCurrentList,
      getHistoryDates,
      getTodayString,
      loadChecklistFromFirestore,
      addRowFromData,
      renumber,
      applyChecklistMeta,
      formatSV,
      resetHistoricalUnlock,
      clearHistoricalSelection,
      loadStoreStateForToday,
      setHistoricalViewMode,
      getCurrentViewDate,
      setCurrentViewDate,
      getHistDatesWithData,
      setHistDatesWithData,
      getHistPicker,
      setHistPicker,
      setLastUpdateISO
    } = deps;

    function redrawPicker() {
      const picker = getHistPicker();
      if (picker && typeof picker.redraw === 'function') {
        picker.redraw();
      }
    }

    function rememberHistoryDate(docId, isoDate) {
      if (!docId || !isoDate) return;
      const cached = new Set(readHistoryDatesCache(docId));
      cached.add(isoDate);
      writeHistoryDatesCache(docId, Array.from(cached));
      setHistDatesWithData(cached);
      redrawPicker();
    }

    function createHistoryPicker() {
      if (!histDateInput || !histCalendarPanel) return null;

      const wrapper = histDateInput.closest('.history-search-shell') || histDateInput.closest('.hist-date-wrapper') || histDateInput.parentElement;
      const shell = histDateInput.closest('.control-shell-history') || histDateInput.closest('.control-shell') || wrapper;
      const weekdayLabels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

      const initialSelected = getCurrentViewDate() ? parseDateISO(getCurrentViewDate()) : null;
      const state = {
        selectedDate: initialSelected,
        visibleMonth: startOfMonth(initialSelected || new Date()),
        isOpen: false
      };

      function syncInput() {
        histDateInput.value = state.selectedDate ? formatDateISO(state.selectedDate) : '';
        histDateInput.setAttribute('aria-expanded', String(state.isOpen));
        if (shell) {
          shell.classList.toggle('is-open', state.isOpen);
        }
        if (btnHistCalendar) {
          btnHistCalendar.innerHTML = state.isOpen
            ? '<i class="fa-solid fa-chevron-up"></i>'
            : '<i class="fa-solid fa-chevron-down"></i>';
          btnHistCalendar.setAttribute('aria-expanded', String(state.isOpen));
        }
      }

      function close() {
        state.isOpen = false;
        histCalendarPanel.classList.add('d-none');
        histCalendarPanel.setAttribute('aria-hidden', 'true');
        syncInput();
      }

      function open() {
        state.isOpen = true;
        histCalendarPanel.classList.remove('d-none');
        histCalendarPanel.setAttribute('aria-hidden', 'false');
        render();
        syncInput();
      }

      function toggle() {
        state.isOpen ? close() : open();
      }

      function setSelectedDate(isoDate, triggerChange = false) {
        const parsed = isoDate ? parseDateISO(isoDate) : null;
        state.selectedDate = parsed;
        if (parsed) {
          state.visibleMonth = startOfMonth(parsed);
        }
        syncInput();
        render();

        if (parsed && triggerChange) {
          void loadHistoryForDate(formatDateISO(parsed));
        }
      }

      function clear() {
        state.selectedDate = null;
        state.visibleMonth = startOfMonth(new Date());
        close();
        syncInput();
        render();
      }

      function destroy() {
        close();
        histCalendarPanel.innerHTML = '';
      }

      function changeMonth(offset) {
        state.visibleMonth = new Date(
          state.visibleMonth.getFullYear(),
          state.visibleMonth.getMonth() + offset,
          1,
          12, 0, 0, 0
        );
        render();
      }

      function render() {
        if (!histCalendarPanel) return;

        const today = parseDateISO(getTodayString()) || new Date();
        const firstDay = startOfMonth(state.visibleMonth);
        const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay(), 12, 0, 0, 0);
        const histDatesWithData = getHistDatesWithData();

        let html = `
          <div class="history-calendar-header">
            <button type="button" class="history-calendar-nav" data-cal-nav="-1" aria-label="Mes anterior">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="history-calendar-title">${getCalendarMonthLabel(firstDay)}</div>
            <button type="button" class="history-calendar-nav" data-cal-nav="1" aria-label="Mes siguiente">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          <div class="history-calendar-weekdays">
            ${weekdayLabels.map((label) => `<div class="history-calendar-weekday">${label}</div>`).join('')}
          </div>
          <div class="history-calendar-grid">
        `;

        for (let index = 0; index < 42; index++) {
          const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index, 12, 0, 0, 0);
          const iso = formatDateISO(date);
          const classes = ['history-calendar-day'];

          if (date.getMonth() !== firstDay.getMonth()) classes.push('is-outside');
          if (sameDay(date, today)) classes.push('is-today');
          if (state.selectedDate && sameDay(date, state.selectedDate)) classes.push('is-selected');
          if (histDatesWithData && histDatesWithData.has(iso)) classes.push('has-history');

          html += `
            <button type="button"
              class="${classes.join(' ')}"
              data-cal-date="${iso}"
              aria-label="Seleccionar ${iso}">
              ${date.getDate()}
            </button>
          `;
        }

        html += '</div>';

        if (!histDatesWithData || histDatesWithData.size === 0) {
          html += '<div class="history-calendar-empty">Aún no hay fechas marcadas para esta lista.</div>';
        }

        histCalendarPanel.innerHTML = html;

        histCalendarPanel.querySelectorAll('[data-cal-nav]').forEach((btn) => {
          btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            changeMonth(Number(btn.getAttribute('data-cal-nav') || 0));
          });
        });

        histCalendarPanel.querySelectorAll('[data-cal-date]').forEach((btn) => {
          btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const iso = btn.getAttribute('data-cal-date');
            setSelectedDate(iso, true);
            close();
          });
        });
      }

      histDateInput.addEventListener('click', (event) => {
        event.stopPropagation();
        toggle();
      });

      histDateInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        } else if (event.key === 'Escape') {
          close();
        }
      });

      if (shell) {
        shell.addEventListener('click', (event) => {
          if (event.target === histDateInput || event.target.closest('#btnHistToday')) {
            return;
          }

          event.preventDefault();
          toggle();
          histDateInput.focus({ preventScroll: true });
        });
      }

      if (btnHistCalendar) {
        btnHistCalendar.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        });
      }

      document.addEventListener('click', (event) => {
        if (!wrapper || !wrapper.contains(event.target)) {
          close();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });

      syncInput();
      render();

      return {
        clear,
        close,
        destroy,
        open,
        redraw: render,
        setDate: setSelectedDate
      };
    }

    async function refreshHistoryPicker() {
      if (!histDateInput) return;

      const docId = getDocIdForCurrentList();
      const cachedDates = readHistoryDatesCache(docId);
      setHistDatesWithData(new Set(cachedDates));

      const currentPicker = getHistPicker();
      if (!currentPicker) {
        setHistPicker(createHistoryPicker());
      } else if (typeof currentPicker.redraw === 'function') {
        currentPicker.redraw();
      }

      try {
        const fechas = await getHistoryDates(docId);
        const fechasUnicas = Array.from(new Set((fechas || []).filter(Boolean)));
        setHistDatesWithData(new Set(fechasUnicas));
        writeHistoryDatesCache(docId, fechasUnicas);
      } catch (error) {
        console.error('Error al obtener fechas de historial:', error);
      }

      redrawPicker();
    }

    async function loadHistoryForDate(dateStr) {
      if (!dateStr) return;

      try {
        const today = getTodayString();

        if (today && dateStr === today) {
          setCurrentViewDate(null);
          resetHistoricalUnlock();
          clearHistoricalSelection();
          clearHistoryPickerSelection();
          await loadStoreStateForToday();
          setHistoricalViewMode(false);
          return;
        }

        setCurrentViewDate(dateStr);
        resetHistoricalUnlock();
        clearHistoricalSelection();

        body.innerHTML = '';
        renumber();

        const docId = getDocIdForCurrentList();
        const record = await loadChecklistFromFirestore(docId, dateStr);
        applyChecklistMeta(record?.meta || {});

        const updatedAt = record?.meta?.updatedAt || null;
        setLastUpdateISO(updatedAt);

        if (record && Array.isArray(record.items) && record.items.length) {
          record.items.forEach(addRowFromData);
          renumber();
          lastSaved.innerHTML =
            '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
            (updatedAt ? ('Última actualización: ' + formatSV(updatedAt)) : 'Aún no guardado.');
        } else {
          lastSaved.innerHTML =
            '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
            (updatedAt ? ('Última actualización: ' + formatSV(updatedAt)) : 'Sin guardado para esa fecha.');
          await Swal.fire('Sin datos', 'No hay checklist guardado para esa fecha.', 'info');
        }

        const isHistorical = today ? (dateStr !== today) : true;
        setHistoricalViewMode(isHistorical);
      } catch (error) {
        console.error('Error al cargar histórico:', error);
        await Swal.fire('Error', 'No se pudo cargar el histórico para esa fecha.', 'error');
      }
    }

    function clearHistoryPickerSelection() {
      const picker = getHistPicker();
      if (picker) {
        try { picker.clear(); } catch (_) {}
      } else if (histDateInput) {
        histDateInput.value = '';
      }
    }

    return Object.freeze({
      rememberHistoryDate,
      refreshHistoryPicker,
      loadHistoryForDate,
      clearHistoryPickerSelection,
      getPicker: getHistPicker
    });
  }

  global.TRListaChecklistHistory = Object.freeze({
    createService
  });
})(window);
