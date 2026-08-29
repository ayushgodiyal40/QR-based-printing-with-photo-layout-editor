/**
 * Utility functions for clean, reliable printing without browser headers/footers
 * and properly scaling images onto a single page without distortion or splitting.
 */

export interface PrintOptions {
  paperSize?: string; // "A4" | "A3" | "Letter" | "Legal"
  colorMode?: string; // "bw" | "color"
  copies?: number;
}

/**
 * Print an image cleanly:
 * 1. Suppresses browser headers (time, document name) and footers (website URL).
 * 2. Fits the image perfectly on a single page with preserved aspect ratio (no distortion).
 * 3. Prevents page-break slicing (so 1 image never gets split across 2 or 3 pages).
 * 4. Applies grayscale filter if B&W is selected.
 */
export function printImage(imageUrl: string, options?: PrintOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Remove any existing print iframe
      const existingIframe = document.getElementById("clean-image-print-frame");
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "clean-image-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error("Unable to access iframe document");
      }

      const isBw = options?.colorMode === "bw";
      const paperSize = options?.paperSize || "A4";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title></title>
          <style>
            @page {
              size: ${paperSize} portrait;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                overflow: hidden !important;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-page-container {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
                padding: 8mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
                overflow: hidden !important;
              }
              .print-target-image {
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
                margin: auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                ${isBw ? "filter: grayscale(100%) contrast(105%) !important; -webkit-filter: grayscale(100%) contrast(105%) !important;" : ""}
              }
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #ffffff;
            }
            .print-page-container {
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              padding: 8mm;
            }
            .print-target-image {
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
              display: block;
              margin: auto;
              ${isBw ? "filter: grayscale(100%) contrast(105%); -webkit-filter: grayscale(100%) contrast(105%);" : ""}
            }
          </style>
        </head>
        <body>
          <div class="print-page-container">
            <img id="print-image-node" class="print-target-image" src="${imageUrl}" alt="Print Image" />
          </div>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      const img = iframeDoc.getElementById("print-image-node") as HTMLImageElement | null;
      if (!img) {
        throw new Error("Image element not found in iframe");
      }

      const triggerPrint = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve();
          } catch (e) {
            reject(e);
          } finally {
            setTimeout(() => {
              iframe.remove();
            }, 60000);
          }
        }, 300);
      };

      if (img.complete && img.naturalWidth > 0) {
        triggerPrint();
      } else {
        img.onload = () => triggerPrint();
        img.onerror = () => {
          iframe.remove();
          reject(new Error("Failed to load image for printing"));
        };
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Print a PDF document directly through a clean iframe.
 */
export function printPdf(pdfBlob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const existingIframe = document.getElementById("clean-pdf-print-frame");
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "clean-pdf-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      iframe.src = pdfUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve();
          } catch {
            // Fallback if browser security blocks iframe.contentWindow.print() on PDF
            const win = window.open(pdfUrl, "_blank");
            win?.focus();
            resolve();
          } finally {
            setTimeout(() => {
              iframe.remove();
              URL.revokeObjectURL(pdfUrl);
            }, 60000);
          }
        }, 400);
      };
    } catch (err) {
      reject(err);
    }
  });
}
