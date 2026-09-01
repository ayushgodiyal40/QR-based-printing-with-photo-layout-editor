"use client";

import React, { useState, useEffect } from 'react';
import {
  MeasurementUnit,
  Page,
  PageLayoutConfig,
  PlacedPhoto,
  SourcePhoto,
} from '@/lib/studio/types';
import {
  getA4Dimensions,
  mmToUnit,
  SIZE_PRESETS,
  unitToMm,
} from '@/lib/studio/units';
import {
  calculateOptimalCopyDimensions,
  generateMultiCopyPageLayout,
} from '@/lib/studio/layoutEngine';
import {
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpToLine,
  ArrowDownToLine,
  MoveVertical,
  MoveHorizontal,
  Lock,
  Unlock,
  Crop as CropIcon,
  Copy,
  Trash2,
  Sun,
  Contrast,
  Sparkles,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Grid,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PropertiesPanelProps {
  page: Page;
  allPages: Page[];
  sourcePhotos: SourcePhoto[];
  selectedPhotoIds: string[];
  onSelectPhotos?: (ids: string[]) => void;
  layoutConfig: PageLayoutConfig;
  displayUnit: MeasurementUnit;
  globalGrayscale: boolean;
  onUpdateLayoutConfig: (newConfig: PageLayoutConfig, reArrangeNow?: boolean) => void;
  onSetDisplayUnit: (unit: MeasurementUnit) => void;
  onUpdatePlacedPhotos: (photos: PlacedPhoto[]) => void;
  onOpenCropModal: (photo: SourcePhoto, placed: PlacedPhoto) => void;
  onDuplicatePhoto: (placed: PlacedPhoto) => void;
  onDeletePlacedPhoto: (id: string) => void;
  onMovePhotoToPage: (placedId: string, targetPageIndex: number) => void;
  onAutoArrange: () => void;
  onOpenMultiCopyModal?: (photoId?: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  page,
  allPages,
  sourcePhotos,
  selectedPhotoIds,
  onSelectPhotos,
  layoutConfig,
  displayUnit,
  globalGrayscale,
  onUpdateLayoutConfig,
  onSetDisplayUnit,
  onUpdatePlacedPhotos,
  onOpenCropModal,
  onDuplicatePhoto,
  onDeletePlacedPhoto,
  onMovePhotoToPage,
  onAutoArrange,
  onOpenMultiCopyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'photo' | 'adjust'>('layout');
  const [applyToAllPhotos] = useState<boolean>(false);
  const [inlineCopiesCount, setInlineCopiesCount] = useState<number>(4);

  const photoMap = new Map<string, SourcePhoto>();
  sourcePhotos.forEach((p) => photoMap.set(p.id, p));

  const selectedPhotos = page.photos.filter((p) => selectedPhotoIds.includes(p.id));
  const primarySelected = selectedPhotos[0] || (page.photos.length > 0 ? page.photos[0] : undefined);
  const primarySource = primarySelected ? photoMap.get(primarySelected.photoId) : undefined;

  const { width: a4W, height: a4H } = getA4Dimensions(layoutConfig.orientation);
  const a4WidthMm = a4W;
  const a4HeightMm = a4H;

  // Auto switch to photo tab whenever a photo is selected on canvas
  useEffect(() => {
    if (selectedPhotoIds.length > 0) {
      setActiveTab('photo');
    }
  }, [selectedPhotoIds]);

  const hasSelection = selectedPhotos.length > 0 || page.photos.length > 0;

  // Helper to determine target photo IDs for sizing changes
  const getTargetPhotoIds = () => {
    if (applyToAllPhotos || selectedPhotoIds.length === 0) {
      return page.photos.map((p) => p.id);
    }
    return selectedPhotoIds;
  };

  // Alignment Tools
  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedPhotos.length === 0) return;

    const updated = page.photos.map((p) => {
      if (!selectedPhotoIds.includes(p.id)) return p;

      let newX = p.x;
      let newY = p.y;

      switch (type) {
        case 'left':
          newX = layoutConfig.margins.left;
          break;
        case 'center':
          newX = (a4W - p.width) / 2;
          break;
        case 'right':
          newX = a4W - layoutConfig.margins.right - p.width;
          break;
        case 'top':
          newY = layoutConfig.margins.top;
          break;
        case 'middle':
          newY = (a4H - p.height) / 2;
          break;
        case 'bottom':
          newY = a4H - layoutConfig.margins.bottom - p.height;
          break;
      }

      return { ...p, x: Math.max(0, Math.round(newX * 10) / 10), y: Math.max(0, Math.round(newY * 10) / 10) };
    });

    onUpdatePlacedPhotos(updated);
  };

  // Distribute Tools
  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    if (selectedPhotos.length < 3) return;

    const sorted = [...selectedPhotos].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (axis === 'horizontal') {
      const totalSpan = last.x + last.width - first.x;
      const totalPhotosWidth = sorted.reduce((acc, p) => acc + p.width, 0);
      const gap = (totalSpan - totalPhotosWidth) / (sorted.length - 1);

      let currentX = first.x;
      const posMap = new Map<string, number>();

      sorted.forEach((p) => {
        posMap.set(p.id, Math.round(currentX * 10) / 10);
        currentX += p.width + gap;
      });

      const updated = page.photos.map((p) => (posMap.has(p.id) ? { ...p, x: posMap.get(p.id)! } : p));
      onUpdatePlacedPhotos(updated);
    } else {
      const totalSpan = last.y + last.height - first.y;
      const totalPhotosHeight = sorted.reduce((acc, p) => acc + p.height, 0);
      const gap = (totalSpan - totalPhotosHeight) / (sorted.length - 1);

      let currentY = first.y;
      const posMap = new Map<string, number>();

      sorted.forEach((p) => {
        posMap.set(p.id, Math.round(currentY * 10) / 10);
        currentY += p.height + gap;
      });

      const updated = page.photos.map((p) => (posMap.has(p.id) ? { ...p, y: posMap.get(p.id)! } : p));
      onUpdatePlacedPhotos(updated);
    }
  };

  // Apply Size Preset to target photo(s)
  const handleApplyPreset = (wMm: number, hMm: number) => {
    const targetIds = getTargetPhotoIds();
    if (targetIds.length === 0) return;
    const updated = page.photos.map((p) => {
      if (targetIds.includes(p.id)) {
        return {
          ...p,
          width: wMm,
          height: hMm,
        };
      }
      return p;
    });
    onUpdatePlacedPhotos(updated);
  };

  // Adjustments on selected photo
  const handleAdjustmentChange = (
    key: 'brightness' | 'contrast' | 'grayscale',
    val: number | boolean
  ) => {
    if (!primarySelected) return;
    const updated = page.photos.map((p) => {
      if (selectedPhotoIds.includes(p.id)) {
        return {
          ...p,
          adjustments: {
            brightness: p.adjustments?.brightness ?? 0,
            contrast: p.adjustments?.contrast ?? 0,
            grayscale: p.adjustments?.grayscale ?? false,
            [key]: val,
          },
        };
      }
      return p;
    });
    onUpdatePlacedPhotos(updated);
  };

  return (
    <aside
      id="properties-panel"
      className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full text-neutral-200 select-none shrink-0"
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-950/80 text-xs">
        <button
          id="tab-layout-settings"
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'layout'
              ? 'border-indigo-500 text-white bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>A4 Layout</span>
        </button>

        <button
          id="tab-photo-properties"
          onClick={() => setActiveTab('photo')}
          className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'photo'
              ? 'border-indigo-500 text-white bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <CropIcon className="w-3.5 h-3.5" />
          <span>Photo Size</span>
          {hasSelection && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </button>

        <button
          id="tab-image-adjustments"
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'adjust'
              ? 'border-indigo-500 text-white bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Color & B&W</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* ================= LAYOUT TAB ================= */}
        {activeTab === 'layout' && (
          <div className="space-y-5">
            {/* Photos Per Page Preset */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Photos Per Page
                </label>
                <span className="text-indigo-400 font-mono font-medium text-xs">
                  {layoutConfig.photosPerPage === 'custom'
                    ? `${layoutConfig.customCount || 4} custom`
                    : `${layoutConfig.photosPerPage} photos`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4, 6, 8, 9, 12].map((num) => (
                  <button
                    key={num}
                    id={`btn-photos-per-page-${num}`}
                    onClick={() => {
                      onUpdateLayoutConfig({ ...layoutConfig, photosPerPage: num }, true);
                    }}
                    className={`py-2 rounded-lg font-semibold border transition-all cursor-pointer ${
                      layoutConfig.photosPerPage === num
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Custom Number of Photos */}
              <div className="flex items-center gap-2 mt-2 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs">Custom count:</span>
                <input
                  id="input-custom-photos-count"
                  type="number"
                  min="1"
                  max="48"
                  value={layoutConfig.customCount || 4}
                  onChange={(e) => {
                    const count = Math.max(1, Number(e.target.value));
                    onUpdateLayoutConfig(
                      {
                        ...layoutConfig,
                        photosPerPage: 'custom',
                        customCount: count,
                      },
                      true
                    );
                  }}
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-center"
                />
                <button
                  onClick={() => {
                    onUpdateLayoutConfig(
                      {
                        ...layoutConfig,
                        photosPerPage: 'custom',
                        customCount: layoutConfig.customCount || 4,
                      },
                      true
                    );
                  }}
                  className="ml-auto px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-medium hover:bg-indigo-900 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Page Orientation */}
            <div>
              <label className="block font-semibold text-neutral-300 uppercase tracking-wider text-[11px] mb-2">
                A4 Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-orientation-portrait"
                  onClick={() =>
                    onUpdateLayoutConfig({ ...layoutConfig, orientation: 'portrait' }, true)
                  }
                  className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                    layoutConfig.orientation === 'portrait'
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold text-xs">Portrait</div>
                  <div className="text-[10px] text-neutral-400">210 × 297 mm (Vertical)</div>
                </button>
                <button
                  id="btn-orientation-landscape"
                  onClick={() =>
                    onUpdateLayoutConfig({ ...layoutConfig, orientation: 'landscape' }, true)
                  }
                  className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                    layoutConfig.orientation === 'landscape'
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold text-xs">Landscape</div>
                  <div className="text-[10px] text-neutral-400">297 × 210 mm (Horizontal)</div>
                </button>
              </div>
            </div>

            {/* Fit vs Fill Mode */}
            <div>
              <label className="block font-semibold text-neutral-300 uppercase tracking-wider text-[11px] mb-2">
                Image Aspect Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-fit-mode-fit"
                  onClick={() => onUpdateLayoutConfig({ ...layoutConfig, fitMode: 'fit' }, true)}
                  className={`py-2 px-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    layoutConfig.fitMode === 'fit'
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold text-xs">FIT Mode</div>
                  <div className="text-[10px] text-neutral-400">Preserve full photo without crop</div>
                </button>
                <button
                  id="btn-fit-mode-fill"
                  onClick={() => onUpdateLayoutConfig({ ...layoutConfig, fitMode: 'fill' }, true)}
                  className={`py-2 px-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    layoutConfig.fitMode === 'fill'
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold text-xs">FILL Mode</div>
                  <div className="text-[10px] text-neutral-400">Fill grid cell area completely</div>
                </button>
              </div>
            </div>

            {/* Spacing & Margins */}
            <div className="space-y-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-semibold text-neutral-300">Photo Spacing / Gap</label>
                  <span className="font-mono text-indigo-400">{layoutConfig.gap} mm</span>
                </div>
                <div className="flex gap-1.5 mb-2">
                  {[0, 2, 5, 10].map((gapVal) => (
                    <button
                      key={gapVal}
                      id={`btn-gap-${gapVal}`}
                      onClick={() => onUpdateLayoutConfig({ ...layoutConfig, gap: gapVal }, true)}
                      className={`flex-1 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                        layoutConfig.gap === gapVal
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {gapVal}mm
                    </button>
                  ))}
                </div>
                <input
                  id="slider-photo-gap"
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={layoutConfig.gap}
                  onChange={(e) =>
                    onUpdateLayoutConfig({ ...layoutConfig, gap: Number(e.target.value) }, true)
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Margins */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <label className="block font-semibold text-neutral-300">Page Margins (mm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-500">Top</span>
                    <input
                      id="input-margin-top"
                      type="number"
                      min="0"
                      max="50"
                      value={layoutConfig.margins.top}
                      onChange={(e) =>
                        onUpdateLayoutConfig(
                          {
                            ...layoutConfig,
                            margins: { ...layoutConfig.margins, top: Number(e.target.value) },
                          },
                          true
                        )
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Bottom</span>
                    <input
                      id="input-margin-bottom"
                      type="number"
                      min="0"
                      max="50"
                      value={layoutConfig.margins.bottom}
                      onChange={(e) =>
                        onUpdateLayoutConfig(
                          {
                            ...layoutConfig,
                            margins: { ...layoutConfig.margins, bottom: Number(e.target.value) },
                          },
                          true
                        )
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Left</span>
                    <input
                      id="input-margin-left"
                      type="number"
                      min="0"
                      max="50"
                      value={layoutConfig.margins.left}
                      onChange={(e) =>
                        onUpdateLayoutConfig(
                          {
                            ...layoutConfig,
                            margins: { ...layoutConfig.margins, left: Number(e.target.value) },
                          },
                          true
                        )
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Right</span>
                    <input
                      id="input-margin-right"
                      type="number"
                      min="0"
                      max="50"
                      value={layoutConfig.margins.right}
                      onChange={(e) =>
                        onUpdateLayoutConfig(
                          {
                            ...layoutConfig,
                            margins: { ...layoutConfig.margins, right: Number(e.target.value) },
                          },
                          true
                        )
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Auto-arrange button */}
            <button
              id="properties-auto-arrange-btn"
              onClick={onAutoArrange}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Re-Calculate & Auto Arrange
            </button>
          </div>
        )}

        {/* ================= PHOTO PROPERTIES TAB ================= */}
        {activeTab === 'photo' && (
          <div className="space-y-4">
            {page.photos.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 text-neutral-400 bg-neutral-950/60 rounded-xl border border-neutral-800">
                <CropIcon className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                <div className="font-semibold text-neutral-300">No Photos on This Page</div>
                <p className="text-[11px] text-neutral-500">
                  Add or place photos from the left sidebar to start adjusting sizes, positions, and filters.
                </p>
              </div>
            ) : !primarySelected ? (
              <div className="text-center py-12 px-4 space-y-2 text-neutral-400 bg-neutral-950/60 rounded-xl border border-neutral-800">
                <CropIcon className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                <div className="font-semibold text-neutral-300">No Photo Selected</div>
                <p className="text-[11px] text-neutral-500">
                  Click on any photo on the A4 canvas to view and adjust its exact position, size, presets, and alignment.
                </p>
                <div className="pt-2">
                  <button
                    id="btn-select-first-photo"
                    onClick={() => onSelectPhotos?.([page.photos[0].id])}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    Select Photo 1
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Photo Picker on this Page */}
                {page.photos.length > 1 && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        Photos on Page ({page.photos.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          id="btn-select-all-page-photos"
                          onClick={() => {
                            if (selectedPhotoIds.length === page.photos.length) {
                              onSelectPhotos?.([primarySelected.id]);
                            } else {
                              onSelectPhotos?.(page.photos.map((p) => p.id));
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-indigo-300 transition-colors cursor-pointer"
                        >
                          {selectedPhotoIds.length === page.photos.length ? 'Single' : 'Select All'}
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list of photos on current page */}
                    <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto p-1 bg-neutral-900/60 rounded-lg border border-neutral-800/80">
                      {page.photos.map((ph, idx) => {
                        const src = photoMap.get(ph.photoId);
                        const isCurSelected = selectedPhotoIds.includes(ph.id);
                        return (
                          <button
                            key={ph.id}
                            id={`select-photo-btn-${ph.id}`}
                            onClick={() => onSelectPhotos?.([ph.id])}
                            className={`relative group rounded border p-1 text-left transition-all cursor-pointer ${
                              isCurSelected
                                ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                                : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                            }`}
                            title={`Select Photo ${idx + 1} (${src?.name || 'Photo'})`}
                          >
                            <div className="w-full aspect-square rounded overflow-hidden bg-neutral-800 relative">
                              {src?.dataUrl && (
                                <img
                                  src={src.dataUrl}
                                  alt={src.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <span className="absolute top-0.5 left-0.5 bg-neutral-900/90 text-white font-mono text-[8px] font-bold px-1 rounded">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="text-[9px] text-neutral-400 truncate mt-1 font-mono text-center">
                              {Math.round(ph.width)}×{Math.round(ph.height)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Unit Switcher */}
                <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                  <span className="text-neutral-400 font-medium">Measurement Unit:</span>
                  <div className="flex gap-1">
                    {(['mm', 'cm', 'inch', 'px'] as const).map((unit) => (
                      <button
                        key={unit}
                        id={`btn-unit-${unit}`}
                        onClick={() => onSetDisplayUnit(unit)}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase transition-colors cursor-pointer ${
                          displayUnit === unit
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ⚡ Auto-Fit Multi-Copy on Paper */}
                {primarySource && (
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-indigo-500/40 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Auto-Fit Multi-Copy</span>
                      </div>
                      <button
                        onClick={() => onOpenMultiCopyModal?.(primarySource.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Advanced →
                      </button>
                    </div>

                    {(() => {
                      const pAspect =
                        primarySource.aspectRatio ||
                        (primarySelected.width / primarySelected.height) ||
                        1;
                      const previewLayout = calculateOptimalCopyDimensions(
                        inlineCopiesCount,
                        pAspect,
                        layoutConfig.orientation,
                        layoutConfig.margins,
                        layoutConfig.gap,
                        layoutConfig.fitMode
                      );

                      return (
                        <div className="space-y-2.5">
                          {/* Quick preset chips */}
                          <div className="grid grid-cols-4 gap-1">
                            {[1, 2, 4, 6, 8, 9, 12, 16].map((num) => (
                              <button
                                key={num}
                                id={`btn-prop-multicopy-${num}`}
                                onClick={() => setInlineCopiesCount(num)}
                                className={`py-1 rounded font-mono text-[11px] font-bold border transition-colors cursor-pointer ${
                                  inlineCopiesCount === num
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                                }`}
                              >
                                {num}×
                              </button>
                            ))}
                          </div>

                          {/* Live Dimension Calculation Preview */}
                          <div className="bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between text-[11px]">
                            <div>
                              <div className="text-[9px] text-neutral-400 uppercase font-semibold">Auto Dimensions:</div>
                              <div className="font-mono font-bold text-white text-xs">
                                {previewLayout.widthMm} × {previewLayout.heightMm} mm
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] text-neutral-400 font-mono">
                                {previewLayout.cols} × {previewLayout.rows} grid
                              </div>
                              <div className="font-mono font-semibold text-emerald-400 text-[10px]">
                                {previewLayout.utilizationPercent}% utilized
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            id="btn-apply-prop-multicopy"
                            onClick={() => {
                              const { photos } = generateMultiCopyPageLayout(
                                primarySource,
                                inlineCopiesCount,
                                layoutConfig.orientation,
                                layoutConfig.margins,
                                layoutConfig.gap,
                                layoutConfig.fitMode,
                                layoutConfig.cutGuides
                              );
                              onUpdatePlacedPhotos(photos);
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Fill Page with {inlineCopiesCount} {inlineCopiesCount === 1 ? 'Copy' : 'Copies'}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Exact Dimensions (Width, Height) */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-300">Manual Photo Size</span>
                    <button
                      id="btn-toggle-aspect-lock"
                      onClick={() => {
                        const updated = page.photos.map((p) =>
                          p.id === primarySelected.id
                            ? { ...p, lockAspectRatio: !p.lockAspectRatio }
                            : p
                        );
                        onUpdatePlacedPhotos(updated);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                        primarySelected.lockAspectRatio
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {primarySelected.lockAspectRatio ? (
                        <>
                          <Lock className="w-3 h-3 text-indigo-400" />
                          <span>Locked Aspect</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>Free Sizing</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Width with +/- steppers */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-neutral-300">
                        Width ({displayUnit})
                      </label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          id="btn-width-minus-10"
                          onClick={() => {
                            const newW = Math.max(1, primarySelected.width - 10);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newH = primarySelected.lockAspectRatio ? Math.max(1, newW / aspect) : primarySelected.height;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Decrease width by 10mm"
                        >
                          -10
                        </button>
                        <button
                          id="btn-width-minus-1"
                          onClick={() => {
                            const newW = Math.max(1, primarySelected.width - 1);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newH = primarySelected.lockAspectRatio ? Math.max(1, newW / aspect) : primarySelected.height;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Decrease width by 1mm"
                        >
                          -1
                        </button>
                        <button
                          id="btn-width-plus-1"
                          onClick={() => {
                            const newW = Math.min(a4WidthMm, primarySelected.width + 1);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newH = primarySelected.lockAspectRatio ? Math.min(a4HeightMm, newW / aspect) : primarySelected.height;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Increase width by 1mm"
                        >
                          +1
                        </button>
                        <button
                          id="btn-width-plus-10"
                          onClick={() => {
                            const newW = Math.min(a4WidthMm, primarySelected.width + 10);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newH = primarySelected.lockAspectRatio ? Math.min(a4HeightMm, newW / aspect) : primarySelected.height;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Increase width by 10mm"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                    <input
                      id="input-photo-width"
                      type="number"
                      min="1"
                      max="500"
                      step={displayUnit === 'inch' ? 0.05 : 0.5}
                      value={mmToUnit(primarySelected.width, displayUnit)}
                      onChange={(e) => {
                        const newWMm = unitToMm(Number(e.target.value), displayUnit);
                        if (newWMm <= 0) return;
                        const aspect = primarySelected.width / primarySelected.height;
                        const newHMm = primarySelected.lockAspectRatio
                          ? newWMm / aspect
                          : primarySelected.height;

                        const updated = page.photos.map((p) =>
                          p.id === primarySelected.id
                            ? { ...p, width: Math.round(newWMm * 10) / 10, height: Math.round(newHMm * 10) / 10 }
                            : p
                        );
                        onUpdatePlacedPhotos(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-mono text-sm"
                    />
                  </div>

                  {/* Height with +/- steppers */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-neutral-300">
                        Height ({displayUnit})
                      </label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          id="btn-height-minus-10"
                          onClick={() => {
                            const newH = Math.max(1, primarySelected.height - 10);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newW = primarySelected.lockAspectRatio ? Math.max(1, newH * aspect) : primarySelected.width;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Decrease height by 10mm"
                        >
                          -10
                        </button>
                        <button
                          id="btn-height-minus-1"
                          onClick={() => {
                            const newH = Math.max(1, primarySelected.height - 1);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newW = primarySelected.lockAspectRatio ? Math.max(1, newH * aspect) : primarySelected.width;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Decrease height by 1mm"
                        >
                          -1
                        </button>
                        <button
                          id="btn-height-plus-1"
                          onClick={() => {
                            const newH = Math.min(a4HeightMm, primarySelected.height + 1);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newW = primarySelected.lockAspectRatio ? Math.min(a4WidthMm, newH * aspect) : primarySelected.width;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Increase height by 1mm"
                        >
                          +1
                        </button>
                        <button
                          id="btn-height-plus-10"
                          onClick={() => {
                            const newH = Math.min(a4HeightMm, primarySelected.height + 10);
                            const aspect = primarySelected.width / primarySelected.height;
                            const newW = primarySelected.lockAspectRatio ? Math.min(a4WidthMm, newH * aspect) : primarySelected.width;
                            const updated = page.photos.map((p) =>
                              p.id === primarySelected.id ? { ...p, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 } : p
                            );
                            onUpdatePlacedPhotos(updated);
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                          title="Increase height by 10mm"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                    <input
                      id="input-photo-height"
                      type="number"
                      min="1"
                      max="500"
                      step={displayUnit === 'inch' ? 0.05 : 0.5}
                      value={mmToUnit(primarySelected.height, displayUnit)}
                      onChange={(e) => {
                        const newHMm = unitToMm(Number(e.target.value), displayUnit);
                        if (newHMm <= 0) return;
                        const aspect = primarySelected.width / primarySelected.height;
                        const newWMm = primarySelected.lockAspectRatio
                          ? newHMm * aspect
                          : primarySelected.width;

                        const updated = page.photos.map((p) =>
                          p.id === primarySelected.id
                            ? { ...p, width: Math.round(newWMm * 10) / 10, height: Math.round(newHMm * 10) / 10 }
                            : p
                        );
                        onUpdatePlacedPhotos(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-mono text-sm"
                    />
                  </div>

                  {/* Quick Scale Actions (Full Page / Printable / Mini / Micro) */}
                  <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        Quick Extremes
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        id="btn-scale-full-a4"
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === primarySelected.id
                              ? {
                                  ...p,
                                  x: 0,
                                  y: 0,
                                  width: a4WidthMm,
                                  height: a4HeightMm,
                                }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="py-1.5 px-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded text-indigo-200 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Full A4 Page</span>
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                      </button>

                      <button
                        id="btn-scale-fit-margins"
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === primarySelected.id
                              ? {
                                  ...p,
                                  x: layoutConfig.margins.left,
                                  y: layoutConfig.margins.top,
                                  width: a4WidthMm - layoutConfig.margins.left - layoutConfig.margins.right,
                                  height: a4HeightMm - layoutConfig.margins.top - layoutConfig.margins.bottom,
                                }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Fit Margins</span>
                        <Minimize2 className="w-3.5 h-3.5 text-neutral-400" />
                      </button>

                      <button
                        id="btn-scale-stamp"
                        onClick={() => handleApplyPreset(20, 25)}
                        className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 text-left text-[11px] transition-colors cursor-pointer"
                      >
                        Stamp (20×25mm)
                      </button>

                      <button
                        id="btn-scale-tiny"
                        onClick={() => handleApplyPreset(10, 10)}
                        className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 text-left text-[11px] transition-colors cursor-pointer"
                      >
                        Mini (10×10mm)
                      </button>
                    </div>
                  </div>

                  {/* Exact Coordinates (X, Y, Rotation) */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">
                        X ({displayUnit})
                      </label>
                      <input
                        id="input-photo-x"
                        type="number"
                        step={displayUnit === 'inch' ? 0.05 : 1}
                        value={mmToUnit(primarySelected.x, displayUnit)}
                        onChange={(e) => {
                          const newX = unitToMm(Number(e.target.value), displayUnit);
                          const updated = page.photos.map((p) =>
                            p.id === primarySelected.id
                              ? { ...p, x: Math.round(newX * 10) / 10 }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">
                        Y ({displayUnit})
                      </label>
                      <input
                        id="input-photo-y"
                        type="number"
                        step={displayUnit === 'inch' ? 0.05 : 1}
                        value={mmToUnit(primarySelected.y, displayUnit)}
                        onChange={(e) => {
                          const newY = unitToMm(Number(e.target.value), displayUnit);
                          const updated = page.photos.map((p) =>
                            p.id === primarySelected.id
                              ? { ...p, y: Math.round(newY * 10) / 10 }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">
                        Rotate (°)
                      </label>
                      <input
                        id="input-photo-rotation"
                        type="number"
                        min="0"
                        max="360"
                        value={primarySelected.rotation || 0}
                        onChange={(e) => {
                          const rot = (Number(e.target.value) + 360) % 360;
                          const updated = page.photos.map((p) =>
                            p.id === primarySelected.id ? { ...p, rotation: rot } : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Print Size Presets */}
                <div>
                  <label className="block font-semibold text-neutral-300 uppercase tracking-wider text-[11px] mb-2">
                    Quick Size Presets
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        id={`btn-apply-preset-${preset.widthMm}x${preset.heightMm}`}
                        onClick={() => handleApplyPreset(preset.widthMm, preset.heightMm)}
                        className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-left transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-neutral-200 text-[11px] truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                          {preset.widthMm} × {preset.heightMm} mm
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment & Distribution */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-semibold text-neutral-300 block mb-1">
                    Align to A4 Printable Area
                  </span>
                  <div className="grid grid-cols-6 gap-1">
                    <button
                      id="btn-align-left"
                      onClick={() => handleAlign('left')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-align-center"
                      onClick={() => handleAlign('center')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Center Horizontally"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-align-right"
                      onClick={() => handleAlign('right')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-align-top"
                      onClick={() => handleAlign('top')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Top"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-align-middle"
                      onClick={() => handleAlign('middle')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Middle Vertically"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-align-bottom"
                      onClick={() => handleAlign('bottom')}
                      className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Align Bottom"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {selectedPhotos.length >= 3 && (
                    <div className="pt-2 border-t border-neutral-800 flex gap-2">
                      <button
                        onClick={() => handleDistribute('horizontal')}
                        className="flex-1 py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MoveHorizontal className="w-3 h-3" />
                        Distribute Horiz
                      </button>
                      <button
                        onClick={() => handleDistribute('vertical')}
                        className="flex-1 py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MoveVertical className="w-3 h-3" />
                        Distribute Vert
                      </button>
                    </div>
                  )}
                </div>

                {/* Move to another page */}
                {allPages.length > 1 && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Move to Page:</span>
                    <select
                      id="select-move-photo-to-page"
                      onChange={(e) => {
                        onMovePhotoToPage(primarySelected.id, Number(e.target.value));
                      }}
                      value={allPages.findIndex((p) => p.photos.some((ph) => ph.id === primarySelected.id))}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-white text-xs cursor-pointer"
                    >
                      {allPages.map((p, idx) => (
                        <option key={p.id} value={idx}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action Buttons (Crop, Duplicate, Delete) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="btn-crop-selected"
                    onClick={() => primarySource && onOpenCropModal(primarySource, primarySelected)}
                    className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CropIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Crop</span>
                  </button>

                  <button
                    id="btn-duplicate-selected"
                    onClick={() => onDuplicatePhoto(primarySelected)}
                    className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copy</span>
                  </button>

                  <button
                    id="btn-delete-selected"
                    onClick={() => onDeletePlacedPhoto(primarySelected.id)}
                    className="py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ADJUSTMENTS TAB ================= */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4">
              <div className="font-semibold text-neutral-200 text-sm">
                Photo Enhancements & B&W
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Apply non-destructive brightness, contrast, and black & white print previews before generating PDF or sending to printer.
              </p>

              {/* Grayscale Toggle */}
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between">
                <span className="font-medium text-neutral-300">Convert to Black & White:</span>
                <button
                  id="btn-toggle-photo-bw"
                  disabled={!primarySelected}
                  onClick={() => {
                    if (primarySelected) {
                      handleAdjustmentChange(
                        'grayscale',
                        !(primarySelected.adjustments?.grayscale ?? false)
                      );
                    }
                  }}
                  className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    primarySelected?.adjustments?.grayscale || globalGrayscale
                      ? 'bg-neutral-200 text-neutral-900'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {primarySelected?.adjustments?.grayscale || globalGrayscale ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Brightness */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Brightness
                  </span>
                  <span className="font-mono text-neutral-200">
                    {primarySelected?.adjustments?.brightness ?? 0}
                  </span>
                </div>
                <input
                  id="slider-brightness"
                  type="range"
                  min="-100"
                  max="100"
                  disabled={!primarySelected}
                  value={primarySelected?.adjustments?.brightness ?? 0}
                  onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Contrast className="w-3.5 h-3.5 text-indigo-400" />
                    Contrast
                  </span>
                  <span className="font-mono text-neutral-200">
                    {primarySelected?.adjustments?.contrast ?? 0}
                  </span>
                </div>
                <input
                  id="slider-contrast"
                  type="range"
                  min="-100"
                  max="100"
                  disabled={!primarySelected}
                  value={primarySelected?.adjustments?.contrast ?? 0}
                  onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Reset Adjustments */}
              {primarySelected && (
                <button
                  id="btn-reset-adjustments"
                  onClick={() => {
                    const updated = page.photos.map((p) =>
                      p.id === primarySelected.id
                        ? {
                            ...p,
                            adjustments: { brightness: 0, contrast: 0, grayscale: false },
                          }
                        : p
                    );
                    onUpdatePlacedPhotos(updated);
                  }}
                  className="w-full py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                >
                  Reset Adjustments to Default
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
