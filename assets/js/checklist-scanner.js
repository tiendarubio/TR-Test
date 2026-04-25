(function (global) {
  'use strict';

  function createService(deps = {}) {
    const {
      elements: {
        btnScan,
        scanWrap,
        scanVideo,
        btnFilePick,
        fileScan
      } = {},
      onCodeDetected
    } = deps;

    let mediaStream = null;
    let scanInterval = null;
    let detector = null;

    function isActive() {
      return !!mediaStream;
    }

    function setScanButtonState(isActiveState) {
      if (!btnScan) return;

      btnScan.classList.remove('btn-outline-primary', 'btn-outline-danger');

      if (isActiveState) {
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
      if (detector !== null) return detector;
      if ('BarcodeDetector' in global) {
        try {
          detector = new global.BarcodeDetector({
            formats: ['ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'upc_e']
          });
        } catch (_) {
          detector = false;
        }
      } else {
        detector = false;
      }
      return detector || null;
    }

    async function stopScanner() {
      if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
      }

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
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
      await stopScanner();
      if (typeof onCodeDetected === 'function') {
        await onCodeDetected(code);
      }
    }

    async function startScanner() {
      if (mediaStream) return;

      ensureBarcodeDetector();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await Swal.fire('No compatible', 'Tu navegador no permite usar la cámara.', 'info');
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });

        scanVideo.srcObject = mediaStream;
        await scanVideo.play();

        if (scanWrap) {
          scanWrap.classList.add('active');
        }
        setScanButtonState(true);

        if (detector) {
          if (scanInterval) clearInterval(scanInterval);
          scanInterval = setInterval(async () => {
            try {
              const barcodes = await detector.detect(scanVideo);
              if (barcodes && barcodes.length) {
                const raw = String(barcodes[0].rawValue || '').trim();
                if (raw) await onBarcodeFound(raw);
              }
            } catch (_) {}
          }, 250);
        }
      } catch (error) {
        console.error(error);
        await stopScanner();
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
          const raw = String(barcodes?.[0]?.rawValue || '').trim();
          return raw || '';
        } finally {
          if (bitmap && typeof bitmap.close === 'function') bitmap.close();
        }
      } catch (_) {
        return '';
      }
    }

    function mount() {
      if (btnFilePick) {
        btnFilePick.addEventListener('click', async () => {
          if (mediaStream) await stopScanner();
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
            if (typeof onCodeDetected === 'function') {
              await onCodeDetected(code);
            }
          } else {
            await Swal.fire('Atención', 'No se pudo leer el código desde el archivo seleccionado.', 'info');
          }
        });
      }

      if (btnScan) {
        btnScan.addEventListener('click', async () => {
          if (mediaStream) {
            await stopScanner();
          } else {
            await startScanner();
          }
        });
      }

      setScanButtonState(false);
    }

    return Object.freeze({
      mount,
      isActive,
      startScanner,
      stopScanner
    });
  }

  global.TRListaChecklistScanner = Object.freeze({
    createService
  });
})(window);
