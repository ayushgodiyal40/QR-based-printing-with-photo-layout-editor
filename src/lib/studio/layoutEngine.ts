import {
  Page,
  PageLayoutConfig,
  PageOrientation,
  PlacedPhoto,
  SourcePhoto,
} from './types';
import { getA4Dimensions } from './units';

/**
 * Determine optimal (rows, cols) for N photos given page orientation
 */
export function getOptimalGrid(
  count: number,
  orientation: PageOrientation
): { rows: number; cols: number } {
  if (count <= 0) return { rows: 1, cols: 1 };
  if (count === 1) return { rows: 1, cols: 1 };

  const isPortrait = orientation === 'portrait';

  switch (count) {
    case 2:
      return isPortrait ? { rows: 2, cols: 1 } : { rows: 1, cols: 2 };
    case 3:
      return isPortrait ? { rows: 3, cols: 1 } : { rows: 1, cols: 3 };
    case 4:
      return { rows: 2, cols: 2 };
    case 5:
      return isPortrait ? { rows: 3, cols: 2 } : { rows: 2, cols: 3 };
    case 6:
      return isPortrait ? { rows: 3, cols: 2 } : { rows: 2, cols: 3 };
    case 7:
    case 8:
      return isPortrait ? { rows: 4, cols: 2 } : { rows: 2, cols: 4 };
    case 9:
      return { rows: 3, cols: 3 };
    case 10:
    case 12:
      return isPortrait ? { rows: 4, cols: 3 } : { rows: 3, cols: 4 };
    case 15:
    case 16:
      return { rows: 4, cols: 4 };
    case 20:
      return isPortrait ? { rows: 5, cols: 4 } : { rows: 4, cols: 5 };
    case 24:
      return isPortrait ? { rows: 6, cols: 4 } : { rows: 4, cols: 6 };
    case 30:
    case 32:
      return isPortrait ? { rows: 8, cols: 4 } : { rows: 4, cols: 8 };
    default: {
      // General dynamic factorization
      const targetAspect = isPortrait ? 210 / 297 : 297 / 210;
      let bestCols = 1;
      let bestRows = count;
      let minDiff = Infinity;

      for (let c = 1; c <= count; c++) {
        const r = Math.ceil(count / c);
        const gridAspect = c / r;
        const diff = Math.abs(gridAspect - targetAspect);
        if (diff < minDiff && c * r >= count) {
          minDiff = diff;
          bestCols = c;
          bestRows = r;
        }
      }
      return { rows: bestRows, cols: bestCols };
    }
  }
}

/**
 * Generate automatically arranged pages from a list of source photos
 */
export function generateAutoLayoutPages(
  sourcePhotos: SourcePhoto[],
  config: PageLayoutConfig
): Page[] {
  if (sourcePhotos.length === 0) {
    return [
      {
        id: `page-${Date.now()}-1`,
        name: 'Page 1',
        photos: [],
      },
    ];
  }

  const perPage =
    config.photosPerPage === 'custom'
      ? Math.max(1, config.customCount || 4)
      : Number(config.photosPerPage);

  const { width: pageWidth, height: pageHeight } = getA4Dimensions(config.orientation);
  const { top, bottom, left, right } = config.margins;
  const gap = config.gap;

  const printableWidth = Math.max(10, pageWidth - left - right);
  const printableHeight = Math.max(10, pageHeight - top - bottom);

  const pages: Page[] = [];
  const totalPages = Math.ceil(sourcePhotos.length / perPage);

  for (let p = 0; p < totalPages; p++) {
    const pagePhotos = sourcePhotos.slice(p * perPage, (p + 1) * perPage);
    const { rows, cols } = getOptimalGrid(perPage, config.orientation);

    const cellWidth = (printableWidth - (cols - 1) * gap) / cols;
    const cellHeight = (printableHeight - (rows - 1) * gap) / rows;

    const placedPhotos: PlacedPhoto[] = [];

    pagePhotos.forEach((src, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;

      const cellX = left + col * (cellWidth + gap);
      const cellY = top + row * (cellHeight + gap);

      let pWidth = cellWidth;
      let pHeight = cellHeight;
      let pX = cellX;
      let pY = cellY;

      const photoAspect = src.aspectRatio || src.originalWidth / src.originalHeight || 1;
      const cellAspect = cellWidth / cellHeight;

      if (config.fitMode === 'fit') {
        // Maintain aspect ratio inside cell without clipping
        if (photoAspect > cellAspect) {
          // Photo is wider than cell -> width bound
          pWidth = cellWidth;
          pHeight = cellWidth / photoAspect;
          pX = cellX;
          pY = cellY + (cellHeight - pHeight) / 2;
        } else {
          // Photo is taller than cell -> height bound
          pHeight = cellHeight;
          pWidth = cellHeight * photoAspect;
          pX = cellX + (cellWidth - pWidth) / 2;
          pY = cellY;
        }
      } else {
        // Fill mode -> exact cell size
        pWidth = cellWidth;
        pHeight = cellHeight;
      }

      placedPhotos.push({
        id: `placed-${Date.now()}-${p}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        photoId: src.id,
        x: Math.round(pX * 10) / 10,
        y: Math.round(pY * 10) / 10,
        width: Math.round(pWidth * 10) / 10,
        height: Math.round(pHeight * 10) / 10,
        rotation: 0,
        fitMode: config.fitMode,
        lockAspectRatio: false,
        zIndex: idx + 1,
        showCutBorder: config.cutGuides,
        adjustments: {
          brightness: 0,
          contrast: 0,
          grayscale: false,
        },
      });
    });

    pages.push({
      id: `page-${Date.now()}-${p + 1}`,
      name: `Page ${p + 1}`,
      photos: placedPhotos,
    });
  }

  return pages;
}

/**
 * Generate passport/custom ID copies layout on a single A4 page
 */
export function generatePassportPageLayout(
  photo: SourcePhoto,
  widthMm: number,
  heightMm: number,
  copiesCount: number,
  gapMm = 3,
  marginMm = 10,
  orientation: PageOrientation = 'portrait',
  addCutGuides = true
): PlacedPhoto[] {
  const { width: pageWidth, height: pageHeight } = getA4Dimensions(orientation);

  const availableW = pageWidth - marginMm * 2;
  const availableH = pageHeight - marginMm * 2;

  // Max possible columns and rows
  const maxCols = Math.floor((availableW + gapMm) / (widthMm + gapMm));
  const maxRows = Math.floor((availableH + gapMm) / (heightMm + gapMm));

  const totalGridCapacity = maxCols * maxRows;
  const countToPlace = Math.min(copiesCount, totalGridCapacity);

  const cols = Math.min(countToPlace, maxCols);
  const rows = Math.ceil(countToPlace / cols);

  // Center the block on the page
  const totalBlockWidth = cols * widthMm + (cols - 1) * gapMm;
  const totalBlockHeight = rows * heightMm + (rows - 1) * gapMm;

  const startX = (pageWidth - totalBlockWidth) / 2;
  const startY = (pageHeight - totalBlockHeight) / 2;

  const placed: PlacedPhoto[] = [];

  for (let i = 0; i < countToPlace; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;

    placed.push({
      id: `passport-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      photoId: photo.id,
      x: Math.round((startX + c * (widthMm + gapMm)) * 10) / 10,
      y: Math.round((startY + r * (heightMm + gapMm)) * 10) / 10,
      width: widthMm,
      height: heightMm,
      rotation: 0,
      fitMode: 'fill',
      lockAspectRatio: false,
      zIndex: i + 1,
      showCutBorder: addCutGuides,
      adjustments: {
        brightness: 0,
        contrast: 0,
        grayscale: false,
      },
    });
  }

  return placed;
}
