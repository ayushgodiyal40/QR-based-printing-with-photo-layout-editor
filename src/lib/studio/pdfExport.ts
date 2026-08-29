import { jsPDF } from 'jspdf';
import { Page, PageOrientation, PlacedPhoto, SourcePhoto } from './types';
import { getA4Dimensions, PRINT_MM_TO_PX } from './units';

/**
 * Render a single placed photo onto an offscreen canvas with cropping,
 * rotation, and brightness/contrast/grayscale image adjustments applied.
 */
export async function renderPhotoToCanvas(
  placed: PlacedPhoto,
  source: SourcePhoto,
  globalGrayscale = false,
  dpiMultiplier = 1.0 // 1.0 = standard 300 DPI, 0.5 for fast preview
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Calculate output canvas pixel size based on physical mm
      const canvasW = Math.max(1, Math.round(placed.width * PRINT_MM_TO_PX * dpiMultiplier));
      const canvasH = Math.max(1, Math.round(placed.height * PRINT_MM_TO_PX * dpiMultiplier));

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get 2d context'));
        return;
      }

      // Apply CSS-like adjustments filter
      const brightness = placed.adjustments?.brightness ?? 0;
      const contrast = placed.adjustments?.contrast ?? 0;
      const isGrayscale = globalGrayscale || (placed.adjustments?.grayscale ?? false);

      const bVal = (100 + brightness) / 100;
      const cVal = (100 + contrast) / 100;

      ctx.filter = `brightness(${bVal}) contrast(${cVal}) ${isGrayscale ? 'grayscale(100%)' : 'grayscale(0%)'}`;

      // Calculate source crop rectangle
      const origW = img.naturalWidth || source.originalWidth || img.width;
      const origH = img.naturalHeight || source.originalHeight || img.height;

      let sx = 0;
      let sy = 0;
      let sWidth = origW;
      let sHeight = origH;

      if (placed.crop) {
        sx = (placed.crop.x / 100) * origW;
        sy = (placed.crop.y / 100) * origH;
        sWidth = (placed.crop.width / 100) * origW;
        sHeight = (placed.crop.height / 100) * origH;
      } else if (placed.fitMode === 'fill') {
        // Center crop to fill target aspect ratio
        const targetAspect = placed.width / placed.height;
        const srcAspect = origW / origH;

        if (srcAspect > targetAspect) {
          // Source is wider -> crop horizontal sides
          sWidth = origH * targetAspect;
          sHeight = origH;
          sx = (origW - sWidth) / 2;
          sy = 0;
        } else {
          // Source is taller -> crop vertical top/bottom
          sHeight = origW / targetAspect;
          sWidth = origW;
          sx = 0;
          sy = (origH - sHeight) / 2;
        }
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasW, canvasH);
      resolve(canvas);
    };

    img.onerror = (err) => reject(err);
    img.src = source.dataUrl;
  });
}

/**
 * Export all project pages into a high-quality A4 PDF with exact millimeter placement
 */
export async function exportProjectToPDF(
  pages: Page[],
  sourcePhotos: SourcePhoto[],
  orientation: PageOrientation = 'portrait',
  globalGrayscale = false,
  fileName = 'A4_Photo_Print_Layout.pdf',
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<void> {
  const { width: a4W, height: a4H } = getA4Dimensions(orientation);

  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const photoMap = new Map<string, SourcePhoto>();
  sourcePhotos.forEach((p) => photoMap.set(p.id, p));

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    const page = pages[pageIdx];

    // Sort photos by z-index
    const sortedPhotos = [...page.photos].sort((a, b) => a.zIndex - b.zIndex);

    for (let pIdx = 0; pIdx < sortedPhotos.length; pIdx++) {
      const placed = sortedPhotos[pIdx];
      const source = photoMap.get(placed.photoId);
      if (!source) continue;

      try {
        const photoCanvas = await renderPhotoToCanvas(placed, source, globalGrayscale, 1.0);
        const imgDataUrl = photoCanvas.toDataURL('image/jpeg', 0.95);

        // If photo has rotation, jsPDF addImage natively supports rotation angle
        if (placed.rotation && placed.rotation !== 0) {
          doc.addImage(
            imgDataUrl,
            'JPEG',
            placed.x,
            placed.y,
            placed.width,
            placed.height,
            undefined,
            'FAST',
            placed.rotation
          );
        } else {
          doc.addImage(
            imgDataUrl,
            'JPEG',
            placed.x,
            placed.y,
            placed.width,
            placed.height
          );
        }

        // Draw cut border / crop marks if enabled
        if (placed.showCutBorder) {
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([1, 1], 0);
          doc.rect(placed.x, placed.y, placed.width, placed.height, 'S');
          doc.setLineDashPattern([], 0); // reset
        }
      } catch (err) {
        console.error('Error rendering photo to PDF:', err);
      }

      if (onProgress) {
        const progress = Math.round(((pageIdx + (pIdx + 1) / sortedPhotos.length) / totalPages) * 100);
        onProgress(progress, pageIdx + 1, totalPages);
      }
    }
  }

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
