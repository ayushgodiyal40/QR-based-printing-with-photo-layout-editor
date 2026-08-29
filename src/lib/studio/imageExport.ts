import { Page, PageOrientation, SourcePhoto } from './types';
import { renderPhotoToCanvas } from './pdfExport';
import { getA4Dimensions, PRINT_MM_TO_PX } from './units';

/**
 * Render a complete A4 page to an HTML5 Canvas at full 300 DPI print quality
 */
export async function renderPageToCanvas(
  page: Page,
  sourcePhotos: SourcePhoto[],
  orientation: PageOrientation = 'portrait',
  globalGrayscale = false
): Promise<HTMLCanvasElement> {
  const { width: a4W, height: a4H } = getA4Dimensions(orientation);
  const canvasW = Math.round(a4W * PRINT_MM_TO_PX);
  const canvasH = Math.round(a4H * PRINT_MM_TO_PX);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  // Pure white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const photoMap = new Map<string, SourcePhoto>();
  sourcePhotos.forEach((p) => photoMap.set(p.id, p));

  const sorted = [...page.photos].sort((a, b) => a.zIndex - b.zIndex);

  for (const placed of sorted) {
    const source = photoMap.get(placed.photoId);
    if (!source) continue;

    try {
      const pCanvas = await renderPhotoToCanvas(placed, source, globalGrayscale, 1.0);
      const pxX = placed.x * PRINT_MM_TO_PX;
      const pxY = placed.y * PRINT_MM_TO_PX;
      const pxW = placed.width * PRINT_MM_TO_PX;
      const pxH = placed.height * PRINT_MM_TO_PX;

      ctx.save();

      if (placed.rotation && placed.rotation !== 0) {
        ctx.translate(pxX + pxW / 2, pxY + pxH / 2);
        ctx.rotate((placed.rotation * Math.PI) / 180);
        ctx.drawImage(pCanvas, -pxW / 2, -pxH / 2, pxW, pxH);
      } else {
        ctx.drawImage(pCanvas, pxX, pxY, pxW, pxH);
      }

      ctx.restore();

      // Draw subtle dashed cut border if enabled
      if (placed.showCutBorder) {
        ctx.save();
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(pxX, pxY, pxW, pxH);
        ctx.restore();
      }
    } catch (e) {
      console.error('Error drawing photo on canvas:', e);
    }
  }

  return canvas;
}

/**
 * Export page as image file (PNG / JPG)
 */
export async function downloadPageAsImage(
  page: Page,
  sourcePhotos: SourcePhoto[],
  orientation: PageOrientation = 'portrait',
  format: 'png' | 'jpeg' = 'png',
  pageNumber = 1,
  globalGrayscale = false,
  projectName = 'A4_Photo_Layout'
): Promise<void> {
  const canvas = await renderPageToCanvas(page, sourcePhotos, orientation, globalGrayscale);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  const link = document.createElement('a');
  const safeName = projectName.trim() ? `${projectName.trim()}_` : '';
  link.download = `${safeName}Page_${pageNumber.toString().padStart(2, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
