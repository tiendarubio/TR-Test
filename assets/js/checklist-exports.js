(function (global) {
  'use strict';

  function createService(deps = {}) {
    const {
      body,
      getCurrentStoreName,
      getLocalDateKey,
      sanitizeFileNamePart,
      downloadBlobFile,
      parseQuantityToInteger,
      formatSV,
      getLastUpdateISO,
      getCurrentViewDate
    } = deps;

    function getRows() {
      return Array.from(body?.getElementsByTagName('tr') || []);
    }

    function groupByBodega() {
      const groups = {};
      getRows().forEach((tr) => {
        const bod = tr.cells[4].innerText.trim() || 'SIN_BODEGA';
        if (!groups[bod]) groups[bod] = [];
        groups[bod].push(tr);
      });
      return groups;
    }

    function buildPdfBodyRows(rowsTr, bodega) {
      return rowsTr.map((tr, index) => {
        const codBar = tr.cells[1].innerText.trim();
        const nombre = tr.cells[2].innerText.trim();
        const codInv = tr.cells[3].innerText.trim();
        const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
        const revisado = tr.cells[6].querySelector('button').classList.contains('on') ? 'Sí' : 'No';
        return [index + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
      });
    }

    function buildExcelRows(rowsTr) {
      return rowsTr.map((tr) => {
        const codigo = tr.cells[3].innerText.trim();
        const descripcion = tr.cells[2].innerText.trim();
        const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
        const cantidad = parseQuantityToInteger(cantidadInput);
        const lote = '';
        const fechaVence = new Date(1900, 0, 1);
        return [codigo, descripcion, cantidad, lote, fechaVence];
      });
    }

    function createExcelWorkbook(rowsTr) {
      const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...buildExcelRows(rowsTr)];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = 0; C <= range.e.c; ++C) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellRef]) continue;
          if (C === 0 || C === 1 || C === 3) ws[cellRef].t = 's';
          else if (C === 2) ws[cellRef].t = 'n';
          else if (C === 4) {
            ws[cellRef].t = 'd';
            ws[cellRef].z = 'm/d/yyyy';
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pedido');
      return wb;
    }

    async function exportPDFPorBodega() {
      const fechaActual = getLocalDateKey();
      const tienda = getCurrentStoreName().trim() || 'Tienda';
      const zip = new JSZip();
      const { jsPDF } = global.jspdf;
      const currentViewDate = getCurrentViewDate();
      const upd = formatSV(getLastUpdateISO());

      for (const [bodega, rowsTr] of Object.entries(groupByBodega())) {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`Tienda: ${tienda}`, 10, 10);
        doc.text(`Fecha: ${fechaActual}`, 10, 18);
        doc.text(`Última actualización (guardado): ${upd}`, 10, 26);

        const hasViewLine = !!currentViewDate;
        const startY = hasViewLine ? 50 : 42;

        if (hasViewLine) {
          doc.text(`Vista: ${currentViewDate}`, 10, 34);
          doc.text(`Bodega: ${bodega}`, 10, 42);
        } else {
          doc.text(`Bodega: ${bodega}`, 10, 34);
        }

        doc.autoTable({
          startY,
          head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
          body: buildPdfBodyRows(rowsTr, bodega),
          pageBreak: 'auto'
        });

        const pdfBlob = doc.output('blob');
        const pdfFileName = `${sanitizeFileNamePart(tienda)}_${sanitizeFileNamePart(bodega)}_${fechaActual}_Checklist.pdf`;
        zip.file(pdfFileName, pdfBlob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${sanitizeFileNamePart(tienda)}_Checklist_${fechaActual}_PDF.zip`;
      downloadBlobFile(content, zipFileName);

      await Swal.fire('Éxito', 'Se generaron los PDF por bodega.', 'success');
    }

    function exportPDFGeneral() {
      const fechaActual = getLocalDateKey();
      const tienda = getCurrentStoreName().trim() || 'Tienda';
      const { jsPDF } = global.jspdf;
      const doc = new jsPDF();
      const currentViewDate = getCurrentViewDate();

      doc.setFontSize(12);
      doc.text(`Tienda: ${tienda}`, 10, 10);
      doc.text(`Fecha: ${fechaActual}`, 10, 18);
      doc.text(`Última actualización (guardado): ${formatSV(getLastUpdateISO())}`, 10, 26);

      if (currentViewDate) {
        doc.text(`Vista: ${currentViewDate}`, 10, 34);
      }

      const rows = getRows().map((tr, index) => {
        const codBar = tr.cells[1].innerText.trim();
        const nombre = tr.cells[2].innerText.trim();
        const codInv = tr.cells[3].innerText.trim();
        const bodega = tr.cells[4].innerText.trim();
        const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
        const revisado = tr.cells[6].querySelector('button').classList.contains('on') ? 'Sí' : 'No';
        return [index + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
      });

      doc.autoTable({
        startY: currentViewDate ? 42 : 34,
        head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
        body: rows,
        pageBreak: 'auto'
      });

      doc.save(`${sanitizeFileNamePart(tienda)}_${fechaActual}_Checklist_GENERAL.pdf`);
      Swal.fire('Éxito', 'Se generó el PDF general.', 'success');
    }

    async function exportExcelPorBodega() {
      const fechaActual = getLocalDateKey();
      const tienda = getCurrentStoreName().trim() || 'Tienda';
      const zip = new JSZip();

      for (const [bodega, rowsTr] of Object.entries(groupByBodega())) {
        const wb = createExcelWorkbook(rowsTr);
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const excelFileName = `${sanitizeFileNamePart(tienda)}_${sanitizeFileNamePart(bodega)}_${fechaActual}_Checklist.xlsx`;
        zip.file(excelFileName, wbout);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${sanitizeFileNamePart(tienda)}_Checklist_${fechaActual}.zip`;
      downloadBlobFile(content, zipFileName);

      await Swal.fire('Éxito', 'Se generaron los Excel por bodega.', 'success');
    }

    function exportExcelGeneral() {
      const fechaActual = getLocalDateKey();
      const tienda = getCurrentStoreName().trim() || 'Tienda';
      const wb = createExcelWorkbook(getRows());
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });

      downloadBlobFile(
        blob,
        `${sanitizeFileNamePart(tienda)}_${fechaActual}_Checklist_GENERAL.xlsx`
      );

      Swal.fire('Éxito', 'Se generó el Excel general.', 'success');
    }

    return Object.freeze({
      exportPDFPorBodega,
      exportPDFGeneral,
      exportExcelPorBodega,
      exportExcelGeneral
    });
  }

  global.TRListaChecklistExports = Object.freeze({
    createService
  });
})(window);
