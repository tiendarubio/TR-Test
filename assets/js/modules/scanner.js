(function (global) {
  const modules = global.TRListaModules = global.TRListaModules || {};

  modules.createScannerModule = function createScannerModule(options) {
    const {
      elements = {},
      state,
      onCodeDetected
    } = options || {};

    const btnScan = elements.btnScan || null;
    const scanWrap = elements.scanWrap || null;
    const scanVideo = elements.scanVideo || null;
    const btnFilePick = elements.btnFilePick || null;
    const fileScan = elements.fileScan || null;

    const scannerState = state || {
      mediaStream: null,
      scanInterval: null,
      detector: null
    };

    function setScanButtonState(isActive) {
      if (!btnScan) return;

      btnScan.classList.remove('btn-outline-primary', 'btn-outline-danger');

      if (isActive) {
        btnScan.classList.add('btn-outline-danger');
        btnScan.title = 'Detener cámara';
        btnScan.setAttribute('aria-label', 'Detener cámara');
        btnScan.innerHTML = '<i class="fa-solid fa-stop me-1"></i><span>Detener</span>';
      } else {
        btnScan.classList.add('btn-outline-primary');
        btnScan.title = 'Escanear código de barras';
        btnScan.setAttribute('aria-label', 'Escanear código de barras');
        btnScan.innerHTML = '<i class="fa-solid fa-barcode"></i>';
      }
    }

    function ensureBarcodeDetector() {
      if (scannerState.detector !== null) return scannerState.detector;

      if ('BarcodeDetector' in window) {
        try {
          scannerState.detector = new window.BarcodeDetector({
            formats: ['ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'upc_e']
          });
        } catch (_) {
          scannerState.detector = false;
        }
      } else {
        scannerState.detector = false;
      }

      return scannerState.detector || null;
    }

    async function stop() {
      if (scannerState.scanInterval) {
        clearInterval(scannerState.scanInterval);
        scannerState.scanInterval = null;
      }

      if (scannerState.mediaStream) {
        scannerState.mediaStream.getTracks().forEach(track => track.stop());
        scannerState.mediaStream = null;
      }

      if (scanVideo) {
        try { scanVideo.pause(); } catch (_) {}
        scanVideo.srcObject = null;
      }

      if (scanWrap) {
        scanWrap.classList.remove('active');
      }

      setScanButtonState(false);
    }

    async function onBarcodeFound(code) {
      await stop();
      if (typeof onCodeDetected === 'function') {
        await onCodeDetected(code);
      }
    }

    async function start() {
      if (scannerState.mediaStream) return;

      ensureBarcodeDetector();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
        return;
      }

      try {
        scannerState.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });

        if (scanVideo) {
          scanVideo.srcObject = scannerState.mediaStream;
          await scanVideo.play();
        }

        if (scanWrap) {
          scanWrap.classList.add('active');
        }

        setScanButtonState(true);

        if (scannerState.detector) {
          if (scannerState.scanInterval) clearInterval(scannerState.scanInterval);

          scannerState.scanInterval = setInterval(async () => {
            try {
              const barcodes = await scannerState.detector.detect(scanVideo);
              const raw = String(barcodes?.[0]?.rawValue || '').trim();
              if (raw) await onBarcodeFound(raw);
            } catch (_) {}
          }, 250);
        }
      } catch (err) {
        console.error(err);
        await stop();
        await Swal.fire('Cámara no disponible', 'No se pudo acceder a la cámara.', 'error');
      }
    }

    async function tryDetectBarcodeFromImage(file) {
      if (!file || !(file.type || '').startsWith('image/')) return '';

      const activeDetector = ensureBarcodeDetector();
      if (!activeDetector) return '';

      try {
        const bitmap = await createImageBitmap(file);

        try {
          const barcodes = await activeDetector.detect(bitmap);
          return String(barcodes?.[0]?.rawValue || '').trim() || '';
        } finally {
          if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
          }
        }
      } catch (_) {
        return '';
      }
    }

    function init() {
      if (btnFilePick) {
        btnFilePick.addEventListener('click', async () => {
          if (scannerState.mediaStream) {
            await stop();
          }
          if (fileScan) fileScan.click();
        });
      }

      if (fileScan) {
        fileScan.addEventListener('change', async () => {
          const file = fileScan.files?.[0];
          if (!file) return;

          let code = await tryDetectBarcodeFromImage(file);

          if (!code) {
            const match = String(file.name || '').match(/\d{8,}/);
            code = match ? match[0] : '';
          }

          fileScan.value = '';

          if (code) {
            await onBarcodeFound(code);
          } else {
            await Swal.fire('Atención', 'No se pudo leer el código desde el archivo seleccionado.', 'info');
          }
        });
      }

      if (btnScan) {
        btnScan.addEventListener('click', async () => {
          if (scannerState.mediaStream) {
            await stop();
          } else {
            await start();
          }
        });
      }

      setScanButtonState(false);
    }

    return {
      init,
      start,
      stop,
      setScanButtonState
    };
  };
})(window);
