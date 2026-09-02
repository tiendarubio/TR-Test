
(() => {
  'use strict';

  const BLANK = '-';
  const COMPANY_NAME = 'REYES ROCHEZ, S.A. DE C.V.';
  const HEADER_ALIASES = {
    nombreEmpleado: ['NOMBRE DEL EMPLEADO'],
    diasTrabajados: ['DIAS TRABAJADOS'],
    salarioDevengado: ['SALARIO DEVENGADO'],
    otrosIngresos: ['OTROS INGRESOS'],
    vacaciones: ['VACACIONES'],
    totalIngresos: ['TOTAL INGRESOS'],
    isss: ['ISSS'],
    afp: ['AFP'],
    renta: ['RENTA'],
    anticipoSalarial: ['ANTICIPO SALARIAL'],
    prestamosInternos: ['PRESTAMOS INTERNOS'],
    cxc: ['CXC'],
    totalDescuentos: ['TOTAL'],
    liquidoRecibir: ['LIQUIDO A RECIBIR']
  };

  const state = {
    workbook: null,
    fileName: '',
    logoDataUrl: null
  };

  const $ = (id) => document.getElementById(id);

  const excelFile = $('excelFile');
  const fileLabel = $('fileLabel');
  const sheetSelect = $('sheetSelect');
  const btnGenerate = $('btnGenerate');

  const metaCompany = $('metaCompany');
  const metaTitle = $('metaTitle');
  const metaPeriod = $('metaPeriod');
  const metaCount = $('metaCount');
  const metaAreas = $('metaAreas');
  const metaHeaderRow = $('metaHeaderRow');
  const metaGeneratedOn = $('metaGeneratedOn');
  const sheetChip = $('sheetChip');
  const appAlert = $('appAlert');

  init();

  function init() {
    excelFile?.addEventListener('change', handleFileChange);
    sheetSelect?.addEventListener('change', analyzeSelectedSheet);
    btnGenerate?.addEventListener('click', handleGeneratePdf);
    loadLogo();
    metaGeneratedOn.textContent = formatEmissionDate();
  }

  async function loadLogo() {
    const attempts = ['assets/img/trlogo_bn.png', 'assets/img/trlogo.png'];

    for (const path of attempts) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const blob = await res.blob();
        state.logoDataUrl = await blobToDataUrl(blob);
        return;
      } catch (_) {
        // continúa
      }
    }

    state.logoDataUrl = null;
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    resetUi();

    if (!file) {
      setAlert('No se seleccionó ningún archivo.', 'secondary');
      return;
    }

    try {
      fileLabel.textContent = file.name;
      state.fileName = file.name;

      const buffer = await file.arrayBuffer();
      state.workbook = XLSX.read(buffer, {
        type: 'array',
        cellNF: true,
        cellText: true,
        cellFormula: true
      });

      populateSheetSelect(state.workbook.SheetNames);
      sheetSelect.disabled = false;
      btnGenerate.disabled = false;
      analyzeSelectedSheet();
    } catch (error) {
      console.error(error);
      setAlert(`No se pudo leer el archivo: ${error.message || error}`, 'danger');
      btnGenerate.disabled = true;
      sheetSelect.disabled = true;
    }
  }

  function populateSheetSelect(sheetNames) {
    sheetSelect.innerHTML = '';

    if (!sheetNames?.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No se encontraron hojas';
      sheetSelect.appendChild(option);
      return;
    }

    sheetNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name.trim() || `Hoja ${index + 1}`;
      sheetSelect.appendChild(option);
    });

    sheetSelect.value = sheetNames[sheetNames.length - 1];
  }

  function analyzeSelectedSheet() {
    if (!state.workbook || !sheetSelect.value) return;

    try {
      const analysis = extractPayrollData(state.workbook, sheetSelect.value);
      paintAnalysis(analysis);
      setAlert(`${analysis.employees.length} empleado(s) detectado(s).`, 'success');
    } catch (error) {
      console.error(error);
      clearAnalysis();
      setAlert(`No se pudo analizar la hoja: ${error.message || error}`, 'danger');
    }
  }

  function paintAnalysis(analysis) {
    metaCompany.textContent = analysis.company || COMPANY_NAME;
    metaTitle.textContent = analysis.displayTitle || 'Planilla de pagos quincenal';
    metaPeriod.textContent = analysis.payLabel || BLANK;
    metaCount.textContent = String(analysis.employees.length);
    metaAreas.textContent = analysis.areas.length ? analysis.areas.join(', ') : BLANK;
    metaHeaderRow.textContent = analysis.headerRowNumber ? `Fila ${analysis.headerRowNumber}` : BLANK;
    metaGeneratedOn.textContent = formatEmissionDate();
    sheetChip.textContent = analysis.sheetName || 'Sin hoja';
  }

  function clearAnalysis() {
    metaCompany.textContent = BLANK;
    metaTitle.textContent = BLANK;
    metaPeriod.textContent = BLANK;
    metaCount.textContent = BLANK;
    metaAreas.textContent = BLANK;
    metaHeaderRow.textContent = BLANK;
    metaGeneratedOn.textContent = formatEmissionDate();
    sheetChip.textContent = 'Sin hoja';
  }

  function handleGeneratePdf() {
    if (!state.workbook || !sheetSelect.value) {
      setAlert('Primero carga un archivo y selecciona una hoja.', 'warning');
      return;
    }

    btnGenerate.disabled = true;
    const originalLabel = btnGenerate.textContent;
    btnGenerate.textContent = 'Generando PDF...';

    try {
      const analysis = extractPayrollData(state.workbook, sheetSelect.value);
      if (!analysis.employees.length) {
        throw new Error('La hoja seleccionada no contiene empleados válidos.');
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
        compress: true
      });

      for (let groupStart = 0; groupStart < analysis.employees.length; groupStart += 2) {
        const employeeGroup = analysis.employees.slice(groupStart, groupStart + 2);

        if (groupStart > 0) doc.addPage();

        drawEmployeeOriginalsPage(
          doc,
          analysis,
          employeeGroup,
          groupStart,
          analysis.employees.length
        );

        employeeGroup.forEach((employee, groupIndex) => {
          doc.addPage();
          drawEmployeeArchivePage(
            doc,
            analysis,
            employee,
            groupStart + groupIndex + 1,
            analysis.employees.length
          );
        });
      }

      const safeSheet = sanitizeFilePart(analysis.sheetName || 'boletas');
      doc.save(`boletas-${safeSheet}.pdf`);
      setAlert(`PDF generado: ${analysis.employees.length} empleado(s).`, 'success');
    } catch (error) {
      console.error(error);
      setAlert(`No se pudo generar el PDF: ${error.message || error}`, 'danger');
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.textContent = originalLabel;
    }
  }

  function extractPayrollData(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error('No se encontró la hoja seleccionada.');

    const rows = worksheetToDisplayRows(worksheet);
    const headerRowIndex = findHeaderRowIndex(rows);

    if (headerRowIndex === -1) {
      throw new Error('No se encontró la fila de encabezados de la planilla.');
    }

    const headerIndex = buildHeaderIndex(rows[headerRowIndex]);
    if (headerIndex.nombreEmpleado === -1 || headerIndex.liquidoRecibir === -1) {
      throw new Error('La hoja no contiene las columnas mínimas requeridas.');
    }

    const topInfo = collectTopInfo(rows, headerRowIndex);
    const preHeaderArea = findPreHeaderArea(rows, headerRowIndex, topInfo.topInfoLastRowIndex);

    const company = topInfo.company || COMPANY_NAME;
    const title = topInfo.title || 'PLANILLA DE PAGOS QUINCENAL';
    const period = topInfo.period || BLANK;
    const payLabel = summarizePayLabel(title, period);

    const employees = [];
    const areas = new Set();
    let currentArea = preHeaderArea || BLANK;

    if (currentArea !== BLANK) areas.add(currentArea);

    for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
      const row = rows[r];
      if (!row || isDisplayRowEmpty(row)) continue;

      if (isAreaRow(row)) {
        currentArea = safeDisplay(row[0]);
        if (currentArea !== BLANK) areas.add(currentArea);
        continue;
      }

      const firstCell = safeDisplay(row[0]);
      if (isTotalRow(firstCell)) continue;

      const employeeName = cellTextAt(row, headerIndex.nombreEmpleado);
      if (!employeeName || employeeName === BLANK) continue;

      const totalIngresos = cellTextAt(row, headerIndex.totalIngresos);
      const totalDescuentos = cellTextAt(row, headerIndex.totalDescuentos);
      const liquidoRecibir = cellTextAt(row, headerIndex.liquidoRecibir);
      const cxc = cellTextAt(row, resolveFixedOrHeaderIndex(headerIndex.cxc, 14));

      employees.push({
        area: currentArea || BLANK,
        nombreEmpleado: employeeName,
        diasTrabajados: cellTextAt(row, headerIndex.diasTrabajados),
        salarioDevengado: cellTextAt(row, headerIndex.salarioDevengado),
        otrosIngresos: cellTextAt(row, headerIndex.otrosIngresos),
        vacaciones: cellTextAt(row, headerIndex.vacaciones),
        totalIngresos,
        isss: cellTextAt(row, headerIndex.isss),
        afp: cellTextAt(row, headerIndex.afp),
        renta: cellTextAt(row, headerIndex.renta),
        anticipoSalarial: cellTextAt(row, headerIndex.anticipoSalarial),
        prestamosInternos: cellTextAt(row, headerIndex.prestamosInternos),
        cxc,
        totalDescuentos,
        liquidoRecibir
      });
    }

    return {
      sheetName,
      company,
      title,
      period,
      payLabel,
      displayTitle: 'Planilla de pagos quincenal',
      headerRowNumber: headerRowIndex + 1,
      areas: Array.from(areas),
      employees
    };
  }

  function worksheetToDisplayRows(worksheet) {
    const ref = worksheet['!ref'];
    if (!ref) return [];

    const range = XLSX.utils.decode_range(ref);
    const rows = [];

    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        row.push(getCellDisplay(worksheet[cellAddress]));
      }
      rows.push(row);
    }

    return rows;
  }

  function getCellDisplay(cell) {
    if (!cell) return '';
    if (cell.w !== undefined && String(cell.w).trim() !== '') {
      return String(cell.w).trim();
    }

    try {
      const formatted = XLSX.utils.format_cell(cell);
      if (formatted !== undefined && formatted !== null && String(formatted).trim() !== '') {
        return String(formatted).trim();
      }
    } catch (_) {
      // sin formato
    }

    if (cell.v === undefined || cell.v === null) return '';
    return String(cell.v).trim();
  }

  function findHeaderRowIndex(rows) {
    return rows.findIndex((row) => {
      const normalized = (row || []).map(normalizeText);
      return normalized.includes('NOMBRE DEL EMPLEADO') && normalized.includes('LIQUIDO A RECIBIR');
    });
  }

  function buildHeaderIndex(headerRow) {
    const normalized = (headerRow || []).map(normalizeText);
    const index = {};

    Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
      index[key] = normalized.findIndex((value) => aliases.includes(value));
    });

    return index;
  }

  function collectTopInfo(rows, headerRowIndex) {
    const info = [];
    let topInfoLastRowIndex = -1;

    for (let r = 0; r < headerRowIndex; r += 1) {
      const row = rows[r] || [];
      const nonEmpty = row.filter((cell) => String(cell || '').trim() !== '');
      if (nonEmpty.length !== 1) continue;

      const value = safeDisplay(nonEmpty[0]);
      if (!isTopInfoLabel(value)) continue;

      info.push(value);
      topInfoLastRowIndex = r;
      if (info.length === 3) break;
    }

    return {
      company: info[0] || COMPANY_NAME,
      title: info[1] || 'PLANILLA DE PAGOS QUINCENAL',
      period: info[2] || BLANK,
      topInfoLastRowIndex
    };
  }

  function findPreHeaderArea(rows, headerRowIndex, startAfterRow = -1) {
    let lastArea = BLANK;

    for (let r = Math.max(0, startAfterRow + 1); r < headerRowIndex; r += 1) {
      const row = rows[r];
      if (!row || isDisplayRowEmpty(row)) continue;
      if (isAreaRow(row)) {
        lastArea = safeDisplay(row[0]);
      }
    }

    return lastArea;
  }

  function isTopInfoLabel(value) {
    const normalized = normalizeText(value);
    if (!normalized || normalized === BLANK) return false;
    return (
      normalized.includes('REYES ROCHEZ') ||
      normalized.includes('PLANILLA DE PAGOS') ||
      normalized.includes('QUINCENA') ||
      normalized.includes('CORRESPONDIENTE')
    );
  }

  function isAreaRow(row) {
    const nonEmpty = (row || []).filter((cell) => String(cell || '').trim() !== '');
    if (nonEmpty.length !== 1) return false;

    const value = safeDisplay(nonEmpty[0]);
    if (!value || value === BLANK) return false;

    const normalized = normalizeText(value);

    if (normalized.startsWith('TOTAL')) return false;
    if (normalized.includes('REYES ROCHEZ')) return false;
    if (normalized.includes('PLANILLA DE PAGOS')) return false;
    if (normalized.includes('CORRESPONDIENTE')) return false;
    if (normalized.includes('QUINCENA')) return false;
    if (normalized.includes('MES DE')) return false;
    if (normalized.includes('ANO')) return false;
    if (normalized.includes('AÑO')) return false;

    return true;
  }

  function isTotalRow(firstCell) {
    return normalizeText(firstCell).startsWith('TOTAL');
  }

  function isDisplayRowEmpty(row) {
    return !(row || []).some((cell) => String(cell || '').trim() !== '');
  }

  function cellTextAt(row, index) {
    if (index === undefined || index === null || index < 0) return BLANK;
    const value = safeDisplay(row[index]);
    return value || BLANK;
  }

  function safeDisplay(value) {
    const text = String(value ?? '').trim();
    return text || BLANK;
  }

  function resolveFixedOrHeaderIndex(headerIdx, fallbackIdx) {
    return Number.isInteger(headerIdx) && headerIdx >= 0 ? headerIdx : fallbackIdx;
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function summarizePayLabel(title, period) {
    const source = `${title || ''} ${period || ''}`;
    const normalized = normalizeText(source);
    const lower = source.toLowerCase();

    let quincena = 'quincenal';
    if (/(1ERA|1RA|PRIMERA)/.test(normalized)) quincena = 'primera quincena';
    else if (/(2DA|2A|SEGUNDA)/.test(normalized)) quincena = 'segunda quincena';

    const monthMap = [
      ['enero', 'enero'],
      ['febrero', 'febrero'],
      ['marzo', 'marzo'],
      ['abril', 'abril'],
      ['mayo', 'mayo'],
      ['junio', 'junio'],
      ['julio', 'julio'],
      ['agosto', 'agosto'],
      ['septiembre', 'septiembre'],
      ['setiembre', 'septiembre'],
      ['octubre', 'octubre'],
      ['noviembre', 'noviembre'],
      ['diciembre', 'diciembre']
    ];

    let month = '';
    for (const [needle, label] of monthMap) {
      if (lower.includes(needle)) {
        month = label;
        break;
      }
    }

    const yearMatch = source.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : '';

    if (month && year && quincena !== 'quincenal') {
      return `Boleta de pago de la ${quincena} de ${month} de ${year}`;
    }

    if (month && year) {
      return `Boleta de pago quincenal de ${month} de ${year}`;
    }

    return 'Boleta de pago quincenal';
  }

  function formatEmissionDate(date = new Date()) {
    try {
      return new Intl.DateTimeFormat('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      const d = new Date(date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
  }

  function drawEmployeeOriginalsPage(doc, analysis, employees, groupStart, totalEmployees) {
    const issueDate = formatEmissionDate();
    const entries = employees.map((employee, groupIndex) => ({
      employee,
      currentIndex: groupStart + groupIndex + 1,
      copyLabel: 'ORIGINAL',
      requiresSignature: false
    }));

    drawPayslipPage(doc, {
      analysis,
      totalEmployees,
      issueDate,
      entries,
      layout: 'split'
    });
  }

  function drawEmployeeArchivePage(doc, analysis, employee, currentIndex, totalEmployees) {
    const archiveCopies = [
      { copyLabel: 'COPIA ARCHIVO', requiresSignature: true },
      { copyLabel: 'COPIA ARCHIVO 2', requiresSignature: true }
    ];

    drawPayslipPage(doc, {
      analysis,
      employee,
      currentIndex,
      totalEmployees,
      issueDate: formatEmissionDate(),
      copies: archiveCopies,
      layout: 'split'
    });
  }

  function drawPayslipPage(doc, config) {
    const {
      analysis,
      employee,
      currentIndex,
      totalEmployees,
      issueDate,
      copies = [],
      entries = null,
      layout = 'split'
    } = config;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = layout === 'full' ? 28 : 34;
    const marginY = layout === 'full' ? 28 : 34;
    const copyGap = layout === 'full' ? 0 : 24;
    const contentWidth = pageWidth - (marginX * 2);
    const maxCopiesPerPage = layout === 'full' ? 1 : 2;
    const pageEntries = Array.isArray(entries)
      ? entries
      : copies.map((copy) => ({
        ...copy,
        employee,
        currentIndex
      }));
    const visibleEntries = pageEntries.slice(0, maxCopiesPerPage);
    const sectionHeight = ((pageHeight - (marginY * 2)) - (copyGap * (maxCopiesPerPage - 1))) / maxCopiesPerPage;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    visibleEntries.forEach((entry, index) => {
      const copyY = marginY + (index * (sectionHeight + copyGap));

      if (layout !== 'full' && index > 0) {
        const separatorY = copyY - (copyGap / 2);
        doc.setDrawColor(90, 90, 90);
        doc.setLineWidth(0.75);
        doc.setLineDashPattern([4, 4], 0);
        doc.line(marginX, separatorY, pageWidth - marginX, separatorY);
        doc.setLineDashPattern([], 0);
      }

      drawPayslipCopy(doc, {
        x: marginX,
        y: copyY,
        w: contentWidth,
        h: sectionHeight,
        analysis,
        employee: entry.employee,
        currentIndex: entry.currentIndex,
        totalEmployees,
        issueDate,
        copyLabel: entry.copyLabel,
        requiresSignature: entry.requiresSignature,
        layout
      });
    });
  }

  function drawPayslipCopy(doc, config) {
    const {
      x,
      y,
      w,
      h,
      analysis,
      employee,
      currentIndex,
      totalEmployees,
      issueDate,
      copyLabel,
      requiresSignature,
      layout = 'split'
    } = config;

    const isFullPage = layout === 'full';
    const paddingX = isFullPage ? 18 : 14;
    const paddingTop = isFullPage ? 16 : 12;
    const left = x + paddingX;
    const innerW = w - (paddingX * 2);
    const top = y + paddingTop;
    const sectionGap = isFullPage ? 16 : 12;
    const employeePanelHeight = isFullPage ? 74 : 58;
    const summaryHeight = isFullPage ? 56 : 32;
    const receiptHeight = requiresSignature ? (isFullPage ? 54 : 42) : 0;
    const receiptGap = requiresSignature ? 12 : 0;
    const bottomInner = y + h - paddingTop;
    const receiptY = requiresSignature ? bottomInner - receiptHeight : null;
    const summaryY = bottomInner - receiptHeight - receiptGap - summaryHeight;
    const employeePanelY = y + paddingTop + 50 + sectionGap;
    const tablesY = employeePanelY + employeePanelHeight + sectionGap;
    const availableTablesHeight = Math.max(72, summaryY - tablesY - 10);
    const tablesHeight = isFullPage ? Math.max(220, availableTablesHeight) : availableTablesHeight;

    drawBox(doc, x, y, w, h);

    drawCopyHeader(doc, {
      x: left,
      y: top,
      w: innerW,
      company: analysis.company || COMPANY_NAME,
      payLabel: analysis.payLabel || 'Pago quincenal',
      copyLabel,
      indexLabel: `${currentIndex} de ${totalEmployees}`
    });

    drawEmployeePanel(doc, {
      x: left,
      y: employeePanelY,
      w: innerW,
      h: employeePanelHeight,
      employee,
      issueDate
    });

    const colGap = 12;
    const colW = (innerW - colGap) / 2;

    drawValueTable(doc, {
      x: left,
      y: tablesY,
      w: colW,
      h: tablesHeight,
      title: 'Ingresos',
      rows: getIncomeRows(employee)
    });

    drawValueTable(doc, {
      x: left + colW + colGap,
      y: tablesY,
      w: colW,
      h: tablesHeight,
      title: 'Descuentos',
      rows: getDiscountRows(employee)
    });

    drawSummaryBand(doc, {
      x: left,
      y: summaryY,
      w: innerW,
      h: summaryHeight,
      employee
    });

    if (requiresSignature) {
      drawReceiptBlock(doc, {
        x: left,
        y: receiptY,
        w: innerW,
        h: receiptHeight
      });
    }
  }

  function getIncomeRows(employee) {
    return [
      ['Salario devengado', employee.salarioDevengado],
      ['Otros ingresos', employee.otrosIngresos],
      ['Vacaciones', employee.vacaciones],
      ['Total ingresos', employee.totalIngresos]
    ];
  }

  function getDiscountRows(employee) {
    return [
      ['ISSS', employee.isss],
      ['AFP', employee.afp],
      ['Renta', employee.renta],
      ['Anticipo salarial', employee.anticipoSalarial],
      ['Préstamos internos', employee.prestamosInternos],
      ['CXC', employee.cxc],
      ['Total', employee.totalDescuentos]
    ];
  }

  function drawCopyHeader(doc, config) {
    const { x, y, w, company, payLabel, copyLabel, indexLabel } = config;
    const logoSize = 28;
    const textX = x + logoSize + 12;
    const rightX = x + w;

    if (state.logoDataUrl) {
      try {
        doc.addImage(state.logoDataUrl, 'PNG', x, y + 2, logoSize, logoSize);
      } catch (_) {
        // nada
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.4);
    doc.setTextColor(0, 0, 0);
    doc.text(company || COMPANY_NAME, textX, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text(payLabel || 'Pago quincenal', textX, y + 27);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(copyLabel, rightX, y + 10, { align: 'right' });
    doc.text(`Boleta ${indexLabel}`, rightX, y + 24, { align: 'right' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(x, y + 38, x + w, y + 38);
  }

  function drawEmployeePanel(doc, config) {
    const { x, y, w, h, employee, issueDate } = config;
    drawBox(doc, x, y, w, h);

    const halfW = w / 2;
    const rowMid = y + (h / 2);

    doc.line(x + halfW, y, x + halfW, y + h);
    doc.line(x, rowMid, x + w, rowMid);

    drawCellField(doc, x + 10, y + 6, halfW - 20, 'Nombre del empleado', employee.nombreEmpleado, 2);
    drawCellField(doc, x + halfW + 10, y + 6, halfW - 20, 'Fecha de emisión', issueDate, 1);
    drawCellField(doc, x + 10, rowMid + 6, halfW - 20, 'Días trabajados', employee.diasTrabajados, 1);
    drawCellField(doc, x + halfW + 10, rowMid + 6, halfW - 20, 'Área', employee.area, 1);
  }

  function drawCellField(doc, x, y, w, label, value, maxLines = 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.text(label, x, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    const lines = splitLines(doc, value || BLANK, w, maxLines, 8.8);
    doc.text(lines, x, y + 21, { lineHeightFactor: 1.08 });
  }

  function drawValueTable(doc, config) {
    const { x, y, w, h, title, rows } = config;
    drawBox(doc, x, y, w, h);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, x + 10, y + 12);

    const bodyTop = y + 18;
    const bodyHeight = h - 24;
    const rowHeight = bodyHeight / rows.length;

    rows.forEach((row, index) => {
      const rowTop = bodyTop + (index * rowHeight);
      if (index > 0) {
        doc.line(x + 8, rowTop, x + w - 8, rowTop);
      }

      const textBaseline = rowTop + Math.max(8, Math.min(11, rowHeight - 2));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(row[0], x + 10, textBaseline);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(String(row[1] || BLANK), x + w - 10, textBaseline, { align: 'right' });
    });
  }

  function drawSummaryBand(doc, config) {
    const { x, y, w, h, employee } = config;
    drawBox(doc, x, y, w, h);

    const items = [
      ['Total ingresos', employee.totalIngresos],
      ['Total descuentos', employee.totalDescuentos],
      ['Líquido a recibir', employee.liquidoRecibir]
    ];

    const colW = w / items.length;
    const compact = h <= 36;
    const labelY = y + (compact ? 10.5 : 13);
    const valueY = y + (compact ? 23 : 31);

    items.forEach((item, index) => {
      const colX = x + (index * colW);
      if (index > 0) doc.line(colX, y, colX, y + h);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(compact ? 6.8 : 7.2);
      doc.text(item[0], colX + 10, labelY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(compact ? (index === 2 ? 9.2 : 8) : (index === 2 ? 10 : 8.7));
      doc.text(String(item[1] || BLANK), colX + 10, valueY);
    });
  }

  function drawReceiptBlock(doc, config) {
    const { x, y, w, h } = config;
    drawBox(doc, x, y, w, h);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.1);
    doc.text('Recibí conforme el pago detallado en esta boleta.', x + 10, y + 12);

    const lineWidth = Math.min(190, Math.max(150, w * 0.34));
    const lineStartX = x + ((w - lineWidth) / 2);
    const baselineY = y + Math.min(h - 14, 28);

    doc.setLineWidth(0.7);
    doc.line(lineStartX, baselineY, lineStartX + lineWidth, baselineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Firma del empleado', x + (w / 2), y + h - 6, { align: 'center' });
  }

  function drawBox(doc, x, y, w, h) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.65);
    doc.rect(x, y, w, h);
  }

  function splitLines(doc, text, width, maxLines = 2, fontSize = null) {
    const value = String(text || BLANK);
    if (fontSize) doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(value, width);
    if (lines.length <= maxLines) return lines;

    const sliced = lines.slice(0, Math.max(1, maxLines));
    const lastIndex = sliced.length - 1;
    let last = String(sliced[lastIndex]);
    last = `${last.slice(0, Math.max(0, last.length - 1)).trim()}…`;
    sliced[lastIndex] = last;
    return sliced;
  }

  function sanitizeFilePart(value) {
    return String(value || 'archivo')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]+/g, '');
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function setAlert(message, variant = 'secondary') {
    appAlert.className = `alert alert-${variant} mb-0 flat-alert`;
    appAlert.textContent = message;
  }

  function resetUi() {
    clearAnalysis();
    setAlert('Procesando archivo...', 'secondary');
  }
})();
