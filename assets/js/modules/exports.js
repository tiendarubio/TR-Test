(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createChecklistExportModule = function createChecklistExportModule(options) {
    const {
      body,
      storeSelect,
      getLastUpdateISO,
      getCurrentViewDate,
      formatSV
    } = options || {};

    function getRows() {
      return Array.from(body?.querySelectorAll?.('tr') || []);
    }

    function getStoreName() {
      return storeSelect?.options?.[storeSelect.selectedIndex]?.text?.trim() || 'Tienda';
    }

    function getTodayIso() {
      return new Date().toISOString().split('T')[0];
    }

    function getViewDate() {
      return typeof getCurrentViewDate === 'function' ? (getCurrentViewDate() || '') : '';
    }

    function getLastSavedIso() {
      return typeof getLastUpdateISO === 'function' ? (getLastUpdateISO() || null) : null;
    }

    function groupByBodega() {
      const groups = {};
      getRows().forEach(tr => {
        const bodega = tr.cells[4]?.innerText?.trim() || 'SIN_BODEGA';
        if (!groups[bodega]) groups[bodega] = [];
        groups[bodega].push(tr);
      });
      return groups;
    }

    function serializePdfRow(tr, index, forcedBodega) {
      const codBar = tr.cells[1].innerText.trim();
      const nombre = tr.cells[2].innerText.trim();
      const codInv = tr.cells[3].innerText.trim();
      const bodega = forcedBodega || tr.cells[4].innerText.trim();
      const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
      const revisado = tr.cells[6].querySelector('button').classList.contains('on') ? 'Sí' : 'No';
      return [index + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado];
    }

    function serializeExcelRow(tr) {
      const codigo = tr.cells[3].innerText.trim();
      const descripcion = tr.cells[2].innerText.trim();
      const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
      const cantidad = (cantidadInput.match(/\d+/g)) ? parseInt(cantidadInput.match(/\d+/g).join(''), 10) : 0;
      const lote = '';
      const fechaVence = new Date(1900, 0, 1);
      return [codigo, descripcion, cantidad, lote, fechaVence];
    }

    function saveBlob(blobLike, filename) {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blobLike);
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }

    async function exportPDFPorBodega() {
      const fechaActual = getTodayIso();
      const tienda = getStoreName();
      const zip = new JSZip();
      const { jsPDF } = window.jspdf;
      const groups = groupByBodega();
      const vista = getViewDate();
      const upd = formatSV(getLastSavedIso());

      for (const [bodega, rowsTr] of Object.entries(groups)) {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`Tienda: ${tienda}`, 10, 10);
        doc.text(`Fecha: ${fechaActual}`, 10, 18);
        doc.text(`Última actualización (guardado): ${upd}`, 10, 26);

        const hasViewLine = !!vista;
        const startY = hasViewLine ? 50 : 42;

        if (hasViewLine) {
          doc.text(`Vista: ${vista}`, 10, 34);
          doc.text(`Bodega: ${bodega}`, 10, 42);
        } else {
          doc.text(`Bodega: ${bodega}`, 10, 34);
        }

        const rows = rowsTr.map((tr, i) => serializePdfRow(tr, i, bodega));

        doc.autoTable({
          startY,
          head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
          body: rows,
          pageBreak: 'auto'
        });

        zip.file(
          `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${bodega.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist.pdf`,
          doc.output('blob')
        );
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveBlob(content, `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_Checklist_${fechaActual}_PDF.zip`);
      await Swal.fire('Éxito', 'Se generaron los PDF por bodega.', 'success');
    }

    function exportPDFGeneral() {
      const fechaActual = getTodayIso();
      const tienda = getStoreName();
      const vista = getViewDate();
      const upd = formatSV(getLastSavedIso());
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(12);
      doc.text(`Tienda: ${tienda}`, 10, 10);
      doc.text(`Fecha: ${fechaActual}`, 10, 18);
      doc.text(`Última actualización (guardado): ${upd}`, 10, 26);
      if (vista) {
        doc.text(`Vista: ${vista}`, 10, 34);
      }

      doc.autoTable({
        startY: vista ? 42 : 34,
        head: [['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado']],
        body: getRows().map((tr, i) => serializePdfRow(tr, i)),
        pageBreak: 'auto'
      });

      doc.save(`${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist_GENERAL.pdf`);
      Swal.fire('Éxito', 'Se generó el PDF general.', 'success');
    }

    function buildExcelWorksheet(rowsTr) {
      const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...rowsTr.map(serializeExcelRow)];
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
      return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    }

    async function exportExcelPorBodega() {
      const fechaActual = getTodayIso();
      const tienda = getStoreName();
      const zip = new JSZip();
      const groups = groupByBodega();

      for (const [bodega, rowsTr] of Object.entries(groups)) {
        zip.file(
          `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${bodega.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist.xlsx`,
          buildExcelWorksheet(rowsTr)
        );
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveBlob(content, `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_Checklist_${fechaActual}.zip`);
      await Swal.fire('Éxito', 'Se generaron los Excel por bodega.', 'success');
    }

    function exportExcelGeneral() {
      const fechaActual = getTodayIso();
      const tienda = getStoreName();
      const blob = new Blob([buildExcelWorksheet(getRows())], { type: 'application/octet-stream' });
      saveBlob(blob, `${tienda.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaActual}_Checklist_GENERAL.xlsx`);
      Swal.fire('Éxito', 'Se generó el Excel general.', 'success');
    }

    async function handlePdfExport() {
      if (getRows().length === 0) {
        await Swal.fire('Error', 'No hay productos en la lista para generar PDF.', 'error');
        return;
      }

      const result = await Swal.fire({
        title: 'Tipo de PDF',
        text: '¿Cómo deseas generar el PDF?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Por bodega',
        denyButtonText: 'General',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await exportPDFPorBodega();
      } else if (result.isDenied) {
        exportPDFGeneral();
      }
    }

    async function handleExcelExport() {
      if (getRows().length === 0) {
        await Swal.fire('Error', 'No hay productos en la lista para generar Excel.', 'error');
        return;
      }

      const result = await Swal.fire({
        title: 'Tipo de Excel',
        text: '¿Cómo deseas generar el Excel?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Por bodega',
        denyButtonText: 'General',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await exportExcelPorBodega();
      } else if (result.isDenied) {
        exportExcelGeneral();
      }
    }

    return {
      groupByBodega,
      handlePdfExport,
      handleExcelExport
    };
  };
})(window);
