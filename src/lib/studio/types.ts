export type MeasurementUnit = 'mm' | 'cm' | 'inch' | 'px';

export type PageOrientation = 'portrait' | 'landscape';

export type FitMode = 'fit' | 'fill';

export interface CropData {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  grayscale: boolean;
}

export interface SourcePhoto {
  id: string;
  name: string;
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number; // width / height
  baseRotation: number; // 0, 90, 180, 270
  fileSize?: number;
  fileType?: string;
  orderFileId?: string; // Optional reference if imported from print order
}

export interface PlacedPhoto {
  id: string; // unique placement ID
  photoId: string; // reference to SourcePhoto.id
  x: number; // in mm from top-left of page
  y: number; // in mm from top-left of page
  width: number; // in mm
  height: number; // in mm
  rotation: number; // degrees 0-360
  fitMode: FitMode;
  lockAspectRatio: boolean;
  crop?: CropData;
  adjustments?: ImageAdjustments;
  zIndex: number;
  showCutBorder?: boolean;
}

export interface PageMargins {
  top: number; // mm
  bottom: number; // mm
  left: number; // mm
  right: number; // mm
}

export interface PageLayoutConfig {
  orientation: PageOrientation;
  photosPerPage: number | 'custom';
  customCount?: number;
  fitMode: FitMode;
  margins: PageMargins;
  gap: number; // mm spacing between photos
  cutGuides: boolean; // print cut lines / dashed markers
  autoAlign: boolean;
}

export interface Page {
  id: string;
  name: string;
  photos: PlacedPhoto[];
  customLayoutConfig?: Partial<PageLayoutConfig>;
}

export interface ProjectState {
  projectName: string;
  sourcePhotos: SourcePhoto[];
  pages: Page[];
  activePageIndex: number;
  selectedPhotoIds: string[]; // placed photo IDs on current page
  globalLayoutConfig: PageLayoutConfig;
  globalGrayscale: boolean;
  displayUnit: MeasurementUnit;
  zoom: number; // 0.2 to 3.0 (1.0 = 100%)
  snapToGrid: boolean;
  gridSizeMm: number; // e.g. 5mm
  showMargins: boolean;
  showRulers: boolean;
}

export interface HistoryEntry {
  pages: Page[];
  activePageIndex: number;
  globalLayoutConfig: PageLayoutConfig;
  selectedPhotoIds: string[];
  description: string;
}

export interface SizePreset {
  name: string;
  category: 'ID / Passport' | 'Standard Prints' | 'Document';
  widthMm: number;
  heightMm: number;
  description: string;
}
