import { Page, PageOrientation, SourcePhoto } from './types';
import { renderPageToCanvas } from './imageExport';

/**
 * Directly trigger native browser print for all pages at true 300 DPI 1:1 physical A4 size.
 * Uses an isolated invisible iframe to guarantee NO website headers/footers, NO browser URLs/dates,
 * and completely clean white paper output.
 */
export async function printProjectDirectly(
  pages: Page[],
  sourcePhotos: SourcePhoto[],
  orientation: PageOrientation = 'portrait',
  globalGrayscale = false
): Promise<void> {
  if (!pages || pages.length === 0) {
    window.print();
    return;
  }

  // Render all pages to high-res 300 DPI canvases
  const pageCanvases: HTMLCanvasElement[] = [];
  for (const page of pages) {
    const canvas = await renderPageToCanvas(page, sourcePhotos, orientation, globalGrayscale);
    pageCanvases.push(canvas);
  }

  // Create an invisible iframe for isolated clean printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const isLandscape = orientation === 'landscape';
  const pageWidthMm = isLandscape ? '297mm' : '210mm';
  const pageHeightMm = isLandscape ? '210mm' : '297mm';

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    window.print();
    return;
  }

  // Build clean print pages HTML without headers or footers
  let imagesHtml = '';
  pageCanvases.forEach((canvas, index) => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    imagesHtml += `
      <div class="print-page">
        <img src="${dataUrl}" alt="Page ${index + 1}" />
      </div>
    `;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <style>
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 0 !important;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100%;
            height: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page {
            width: ${pageWidthMm};
            height: ${pageHeightMm};
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0 !important;
            padding: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #ffffff !important;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          img {
            width: ${pageWidthMm};
            height: ${pageHeightMm};
            display: block;
            object-fit: fill;
            margin: 0 !important;
            padding: 0 !important;
          }
        </style>
      </head>
      <body>
        ${imagesHtml}
      </body>
    </html>
  `);
  doc.close();

  // Wait for all images in the iframe to fully load before triggering print
  const images = doc.querySelectorAll('img');
  let loadedCount = 0;
  const totalImages = images.length;

  const triggerPrint = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error invoking print dialog:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 5000);
      }
    }, 200);
  };

  if (totalImages === 0) {
    triggerPrint();
  } else {
    images.forEach((img) => {
      if (img.complete) {
        loadedCount++;
        if (loadedCount === totalImages) triggerPrint();
      } else {
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImages) triggerPrint();
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) triggerPrint();
        };
      }
    });
  }
}
