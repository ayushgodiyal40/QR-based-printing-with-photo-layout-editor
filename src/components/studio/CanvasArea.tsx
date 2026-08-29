"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  Page,
  PageLayoutConfig,
  PlacedPhoto,
  SourcePhoto,
} from '@/lib/studio/types';
import {
  getA4Dimensions,
  MM_TO_PX_RATIO,
} from '@/lib/studio/units';
import {
  RotateCw,
  Crop as CropIcon,
  Copy,
  Trash2,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Scissors,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface CanvasAreaProps {
  page: Page;
  sourcePhotos: SourcePhoto[];
  layoutConfig: PageLayoutConfig;
  globalGrayscale: boolean;
  zoom: number;
  snapToGrid: boolean;
  gridSizeMm: number;
  showMargins: boolean;
  selectedPhotoIds: string[];
  onSelectPhotos: (ids: string[], isMulti?: boolean) => void;
  onUpdatePlacedPhotos: (photos: PlacedPhoto[]) => void;
  onOpenCropModal: (photo: SourcePhoto, placed: PlacedPhoto) => void;
  onDuplicatePhoto: (placed: PlacedPhoto) => void;
  onDeletePlacedPhoto: (id: string) => void;
  onPlacePhotoOnPage: (photo: SourcePhoto) => void;
  onAddPhotos?: (files: FileList | null) => void;
}

type DragMode = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' | null;

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  page,
  sourcePhotos,
  layoutConfig,
  globalGrayscale,
  zoom,
  snapToGrid,
  gridSizeMm,
  showMargins,
  selectedPhotoIds,
  onSelectPhotos,
  onUpdatePlacedPhotos,
  onOpenCropModal,
  onDuplicatePhoto,
  onDeletePlacedPhoto,
  onPlacePhotoOnPage,
  onAddPhotos,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasFileInputRef = useRef<HTMLInputElement>(null);

  const { width: a4WidthMm, height: a4HeightMm } = getA4Dimensions(layoutConfig.orientation);

  // Screen pixel dimensions of the A4 paper
  const pxPerMm = MM_TO_PX_RATIO * zoom;
  const sheetWidthPx = a4WidthMm * pxPerMm;
  const sheetHeightPx = a4HeightMm * pxPerMm;

  const photoMap = new Map<string, SourcePhoto>();
  sourcePhotos.forEach((p) => photoMap.set(p.id, p));

  // Drag & Transform Tracking
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [liveTooltip, setLiveTooltip] = useState<string | null>(null);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialPhotos: PlacedPhoto[];
    primaryPhoto?: PlacedPhoto;
    centerMm?: { x: number; y: number };
    selectedIds?: string[];
  } | null>(null);

  const snapVal = (valMm: number): number => {
    if (!snapToGrid) return Math.round(valMm * 10) / 10;
    return Math.round(valMm / gridSizeMm) * gridSizeMm;
  };

  const handlePointerDownOnPhoto = (
    e: React.PointerEvent,
    photoId: string,
    handle: DragMode = 'move'
  ) => {
    e.stopPropagation();

    let newSelected: string[];
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedPhotoIds.includes(photoId)) {
        newSelected = selectedPhotoIds.filter((id) => id !== photoId);
      } else {
        newSelected = [...selectedPhotoIds, photoId];
      }
      onSelectPhotos(newSelected, true);
    } else {
      if (!selectedPhotoIds.includes(photoId)) {
        newSelected = [photoId];
        onSelectPhotos([photoId], false);
      } else {
        newSelected = selectedPhotoIds;
      }
    }

    const primary = page.photos.find((p) => p.id === photoId);
    if (!primary) return;

    setDragMode(handle);

    const centerMm = {
      x: primary.x + primary.width / 2,
      y: primary.y + primary.height / 2,
    };

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialPhotos: JSON.parse(JSON.stringify(page.photos)),
      primaryPhoto: { ...primary },
      centerMm,
      selectedIds: newSelected,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragMode || !dragStartRef.current || !sheetRef.current) return;

      const { clientX, clientY, initialPhotos, primaryPhoto, centerMm } = dragStartRef.current;
      if (!primaryPhoto) return;

      const deltaXPx = e.clientX - clientX;
      const deltaYPx = e.clientY - clientY;
      const deltaXMm = deltaXPx / pxPerMm;
      const deltaYMm = deltaYPx / pxPerMm;

      const activeSelectedIds = dragStartRef.current.selectedIds || selectedPhotoIds;
      const updated = initialPhotos.map((p) => {
        if (!activeSelectedIds.includes(p.id)) return p;

        if (dragMode === 'move') {
          const newX = snapVal(Math.max(0, Math.min(a4WidthMm - p.width, p.x + deltaXMm)));
          const newY = snapVal(Math.max(0, Math.min(a4HeightMm - p.height, p.y + deltaYMm)));
          setLiveTooltip(`X: ${newX.toFixed(1)} mm, Y: ${newY.toFixed(1)} mm`);
          return { ...p, x: newX, y: newY };
        }

        if (p.id === primaryPhoto.id) {
          if (dragMode === 'rotate' && centerMm) {
            const sheetRect = sheetRef.current!.getBoundingClientRect();
            const centerScreenX = sheetRect.left + centerMm.x * pxPerMm;
            const centerScreenY = sheetRect.top + centerMm.y * pxPerMm;

            const angleRad = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);
            let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
            if (angleDeg < 0) angleDeg += 360;

            // Snap to 15 degrees if shift held
            if (e.shiftKey) {
              angleDeg = Math.round(angleDeg / 15) * 15;
            }

            setLiveTooltip(`Rotation: ${angleDeg}°`);
            return { ...p, rotation: angleDeg };
          }

          // Resizing handles
          let newW = primaryPhoto.width;
          let newH = primaryPhoto.height;
          let newX = primaryPhoto.x;
          let newY = primaryPhoto.y;

          const aspect = primaryPhoto.width / primaryPhoto.height;
          const lockAspect = primaryPhoto.lockAspectRatio || e.shiftKey;

          if (dragMode === 'se') {
            newW = Math.max(1, primaryPhoto.width + deltaXMm);
            newH = lockAspect ? newW / aspect : Math.max(1, primaryPhoto.height + deltaYMm);
          } else if (dragMode === 'e') {
            newW = Math.max(1, primaryPhoto.width + deltaXMm);
            if (e.shiftKey) newH = newW / aspect;
          } else if (dragMode === 's') {
            newH = Math.max(1, primaryPhoto.height + deltaYMm);
            if (e.shiftKey) newW = newH * aspect;
          } else if (dragMode === 'nw') {
            const potentialW = Math.max(1, primaryPhoto.width - deltaXMm);
            newW = potentialW;
            newH = lockAspect ? newW / aspect : Math.max(1, primaryPhoto.height - deltaYMm);
            newX = primaryPhoto.x + (primaryPhoto.width - newW);
            newY = primaryPhoto.y + (primaryPhoto.height - newH);
          } else if (dragMode === 'ne') {
            newW = Math.max(1, primaryPhoto.width + deltaXMm);
            newH = lockAspect ? newW / aspect : Math.max(1, primaryPhoto.height - deltaYMm);
            newY = primaryPhoto.y + (primaryPhoto.height - newH);
          } else if (dragMode === 'sw') {
            newW = Math.max(1, primaryPhoto.width - deltaXMm);
            newH = lockAspect ? newW / aspect : Math.max(1, primaryPhoto.height + deltaYMm);
            newX = primaryPhoto.x + (primaryPhoto.width - newW);
          } else if (dragMode === 'n') {
            newH = Math.max(1, primaryPhoto.height - deltaYMm);
            if (e.shiftKey) newW = newH * aspect;
            newY = primaryPhoto.y + (primaryPhoto.height - newH);
          } else if (dragMode === 'w') {
            newW = Math.max(1, primaryPhoto.width - deltaXMm);
            if (e.shiftKey) newH = newW / aspect;
            newX = primaryPhoto.x + (primaryPhoto.width - newW);
          }

          newW = snapVal(newW);
          newH = snapVal(newH);
          newX = snapVal(newX);
          newY = snapVal(newY);

          setLiveTooltip(`W: ${newW.toFixed(1)} mm, H: ${newH.toFixed(1)} mm`);
          return {
            ...p,
            width: newW,
            height: newH,
            x: newX,
            y: newY,
          };
        }

        return p;
      });

      onUpdatePlacedPhotos(updated);
    };

    const handlePointerUp = () => {
      if (dragMode) {
        setDragMode(null);
        setLiveTooltip(null);
        dragStartRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    dragMode,
    selectedPhotoIds,
    pxPerMm,
    snapToGrid,
    gridSizeMm,
    a4WidthMm,
    a4HeightMm,
    onUpdatePlacedPhotos,
  ]);

  // Keyboard navigation & Shortcuts on Canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        onSelectPhotos([]);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectPhotos(page.photos.map((p) => p.id));
        return;
      }

      if (selectedPhotoIds.length > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const remaining = page.photos.filter((p) => !selectedPhotoIds.includes(p.id));
          onUpdatePlacedPhotos(remaining);
          onSelectPhotos([]);
          return;
        }

        // Nudge with arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.altKey ? 0.2 : e.shiftKey ? 5 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          const updated = page.photos.map((p) => {
            if (selectedPhotoIds.includes(p.id)) {
              return {
                ...p,
                x: Math.max(0, Math.min(a4WidthMm - p.width, p.x + dx)),
                y: Math.max(0, Math.min(a4HeightMm - p.height, p.y + dy)),
              };
            }
            return p;
          });
          onUpdatePlacedPhotos(updated);
        }

        // Ctrl+D Duplicate
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault();
          const primary = page.photos.find((p) => p.id === selectedPhotoIds[0]);
          if (primary) {
            onDuplicatePhoto(primary);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    page.photos,
    selectedPhotoIds,
    a4WidthMm,
    a4HeightMm,
    onSelectPhotos,
    onUpdatePlacedPhotos,
    onDuplicatePhoto,
  ]);

  return (
    <div
      ref={containerRef}
      id="canvas-area-container"
      onPointerDown={(e) => {
        if (e.target === containerRef.current || e.target === sheetRef.current) {
          onSelectPhotos([]);
        }
      }}
      className="flex-1 bg-neutral-950/95 overflow-auto relative flex items-center justify-center p-8 select-none"
    >
      {/* Live Coordinate Tooltip */}
      {liveTooltip && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 border border-neutral-700 text-neutral-100 font-mono text-xs px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-sm pointer-events-none animate-in fade-in">
          {liveTooltip}
        </div>
      )}

      {/* A4 Sheet Container */}
      <div
        ref={sheetRef}
        id="a4-sheet"
        style={{
          width: `${sheetWidthPx}px`,
          height: `${sheetHeightPx}px`,
        }}
        className="relative bg-white shadow-[0_15px_50px_rgba(0,0,0,0.6)] border border-neutral-300 transition-all origin-center"
      >
        {/* Printable Margins Guide Overlay */}
        {showMargins && (
          <div
            id="a4-margins-guide"
            style={{
              left: `${layoutConfig.margins.left * pxPerMm}px`,
              top: `${layoutConfig.margins.top * pxPerMm}px`,
              right: `${layoutConfig.margins.right * pxPerMm}px`,
              bottom: `${layoutConfig.margins.bottom * pxPerMm}px`,
            }}
            className="absolute border border-dashed border-sky-400/70 pointer-events-none z-10"
          >
            <span className="absolute top-1 left-1 bg-sky-50 text-sky-700 font-mono text-[9px] px-1 rounded shadow-sm opacity-80">
              Printable Area ({Math.round(a4WidthMm - layoutConfig.margins.left - layoutConfig.margins.right)} ×{' '}
              {Math.round(a4HeightMm - layoutConfig.margins.top - layoutConfig.margins.bottom)} mm)
            </span>
          </div>
        )}

        {/* 5mm Grid Snapping Overlay */}
        {snapToGrid && (
          <div
            id="a4-grid-overlay"
            style={{
              backgroundSize: `${gridSizeMm * pxPerMm}px ${gridSizeMm * pxPerMm}px`,
              backgroundImage: `linear-gradient(to right, rgba(200, 200, 200, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(200, 200, 200, 0.3) 1px, transparent 1px)`,
            }}
            className="absolute inset-0 pointer-events-none z-0"
          />
        )}

        {/* Placed Photos */}
        {page.photos.map((placed) => {
          const source = photoMap.get(placed.photoId);
          if (!source) return null;

          const isSelected = selectedPhotoIds.includes(placed.id);
          const isPrimary = isSelected && selectedPhotoIds[0] === placed.id;

          const pxX = placed.x * pxPerMm;
          const pxY = placed.y * pxPerMm;
          const pxW = placed.width * pxPerMm;
          const pxH = placed.height * pxPerMm;

          const isGrayscale = globalGrayscale || (placed.adjustments?.grayscale ?? false);
          const brightness = placed.adjustments?.brightness ?? 0;
          const contrast = placed.adjustments?.contrast ?? 0;

          return (
            <div
              key={placed.id}
              id={`placed-photo-${placed.id}`}
              style={{
                position: 'absolute',
                left: `${pxX}px`,
                top: `${pxY}px`,
                width: `${pxW}px`,
                height: `${pxH}px`,
                transform: placed.rotation ? `rotate(${placed.rotation}deg)` : undefined,
                transformOrigin: 'center center',
                zIndex: isSelected ? 30 + (placed.zIndex || 1) : placed.zIndex || 1,
              }}
              onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'move')}
              onClick={(e) => {
                e.stopPropagation();
                if (!selectedPhotoIds.includes(placed.id)) {
                  onSelectPhotos([placed.id], false);
                }
              }}
              className={`group cursor-move transition-shadow ${
                isSelected
                  ? 'ring-2 ring-indigo-500 shadow-xl'
                  : 'hover:ring-1 hover:ring-indigo-400/80 shadow-sm'
              }`}
            >
              {/* Image Container with Fit/Fill and Crop */}
              <div className="w-full h-full relative overflow-hidden bg-neutral-100 pointer-events-none">
                {placed.crop ? (
                  <img
                    src={source.dataUrl}
                    alt={source.name}
                    style={{
                      position: 'absolute',
                      width: `${(100 / placed.crop.width) * 100}%`,
                      height: `${(100 / placed.crop.height) * 100}%`,
                      left: `-${(placed.crop.x / placed.crop.width) * 100}%`,
                      top: `-${(placed.crop.y / placed.crop.height) * 100}%`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: 'fill',
                      filter: `brightness(${(100 + brightness) / 100}) contrast(${(100 + contrast) / 100}) ${
                        isGrayscale ? 'grayscale(100%)' : 'grayscale(0%)'
                      }`,
                    }}
                    className="block select-none pointer-events-none"
                  />
                ) : (
                  <img
                    src={source.dataUrl}
                    alt={source.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: placed.fitMode === 'fill' ? 'cover' : 'contain',
                      filter: `brightness(${(100 + brightness) / 100}) contrast(${(100 + contrast) / 100}) ${
                        isGrayscale ? 'grayscale(100%)' : 'grayscale(0%)'
                      }`,
                    }}
                    className="block select-none pointer-events-none"
                  />
                )}

                {/* Thin Cut Border (if enabled for ID/passports) */}
                {placed.showCutBorder && (
                  <div className="absolute inset-0 border border-dashed border-neutral-400 pointer-events-none" />
                )}
              </div>

              {/* Selection Bounds, Handles & Quick Toolbar */}
              {isSelected && (
                <>
                  {/* Dimensions Badge */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-40">
                    {placed.width.toFixed(1)} × {placed.height.toFixed(1)} mm
                    {placed.rotation ? ` • ${placed.rotation}°` : ''}
                  </div>

                  {/* Primary Photo Controls Toolbar */}
                  {isPrimary && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -top-11 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-neutral-700 text-neutral-200 rounded-lg p-1 shadow-2xl flex items-center gap-1 z-50 whitespace-nowrap scale-90 sm:scale-100"
                    >
                      {/* Crop Button */}
                      <button
                        id={`toolbar-crop-${placed.id}`}
                        onClick={() => onOpenCropModal(source, placed)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Crop Photo"
                      >
                        <CropIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Fit / Fill */}
                      <button
                        id={`toolbar-fitmode-${placed.id}`}
                        onClick={() => {
                          const updated: PlacedPhoto[] = page.photos.map((p) =>
                            p.id === placed.id
                              ? { ...p, fitMode: p.fitMode === 'fit' ? ('fill' as const) : ('fit' as const) }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="px-1.5 py-0.5 rounded hover:bg-neutral-800 text-[10px] font-semibold text-indigo-300 uppercase cursor-pointer"
                        title="Toggle Fit / Fill mode"
                      >
                        {placed.fitMode}
                      </button>

                      {/* Toggle Aspect Lock */}
                      <button
                        id={`toolbar-lock-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === placed.id ? { ...p, lockAspectRatio: !p.lockAspectRatio } : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className={`p-1 rounded hover:bg-neutral-800 cursor-pointer ${
                          placed.lockAspectRatio ? 'text-indigo-400' : 'text-neutral-400'
                        }`}
                        title={placed.lockAspectRatio ? 'Aspect Ratio Locked' : 'Free Sizing (Unlocked)'}
                      >
                        {placed.lockAspectRatio ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Scale -10% */}
                      <button
                        id={`toolbar-scale-down-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) => {
                            if (p.id !== placed.id) return p;
                            const newW = Math.max(1, Math.round(p.width * 0.9 * 10) / 10);
                            const newH = Math.max(1, Math.round(p.height * 0.9 * 10) / 10);
                            return { ...p, width: newW, height: newH };
                          });
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Scale Down (-10%)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      {/* Scale +10% */}
                      <button
                        id={`toolbar-scale-up-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) => {
                            if (p.id !== placed.id) return p;
                            const newW = Math.min(a4WidthMm, Math.round(p.width * 1.1 * 10) / 10);
                            const newH = Math.min(a4HeightMm, Math.round(p.height * 1.1 * 10) / 10);
                            return { ...p, width: newW, height: newH };
                          });
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Scale Up (+10%)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {/* Maximize to full A4 */}
                      <button
                        id={`toolbar-maximize-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) => {
                            if (p.id !== placed.id) return p;
                            return {
                              ...p,
                              x: layoutConfig.margins.left,
                              y: layoutConfig.margins.top,
                              width: a4WidthMm - layoutConfig.margins.left - layoutConfig.margins.right,
                              height: a4HeightMm - layoutConfig.margins.top - layoutConfig.margins.bottom,
                            };
                          });
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Maximize to Printable Area"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Rotate 90 CW */}
                      <button
                        id={`toolbar-rot90-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === placed.id
                              ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 }
                              : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        id={`toolbar-dup-${placed.id}`}
                        onClick={() => onDuplicatePhoto(placed)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                        title="Duplicate Photo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Cut Line */}
                      <button
                        id={`toolbar-cutline-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === placed.id ? { ...p, showCutBorder: !p.showCutBorder } : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className={`p-1 rounded hover:bg-neutral-800 cursor-pointer ${
                          placed.showCutBorder ? 'text-amber-400' : 'text-neutral-400'
                        }`}
                        title="Toggle Cutting Border Line"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>

                      {/* Layer Order */}
                      <button
                        id={`toolbar-layer-up-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === placed.id ? { ...p, zIndex: p.zIndex + 1 } : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                        title="Bring Forward"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`toolbar-layer-down-${placed.id}`}
                        onClick={() => {
                          const updated = page.photos.map((p) =>
                            p.id === placed.id ? { ...p, zIndex: Math.max(1, p.zIndex - 1) } : p
                          );
                          onUpdatePlacedPhotos(updated);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                        title="Send Backward"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        id={`toolbar-delete-${placed.id}`}
                        onClick={() => onDeletePlacedPhoto(placed.id)}
                        className="p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 cursor-pointer"
                        title="Delete from Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Rotation Handle (top circle with stem) */}
                  <div
                    id={`handle-rot-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'rotate')}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow cursor-grab active:cursor-grabbing flex items-center justify-center z-40"
                    title="Drag to rotate (Hold Shift for 15° snap)"
                  >
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-indigo-500 pointer-events-none" />
                  </div>

                  {/* 8 Resize Handles */}
                  <div
                    id={`handle-nw-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow z-40"
                  />
                  <div
                    id={`handle-n-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-ns-resize shadow z-40"
                  />
                  <div
                    id={`handle-ne-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow z-40"
                  />
                  <div
                    id={`handle-e-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'e')}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-ew-resize shadow z-40"
                  />
                  <div
                    id={`handle-se-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow z-40"
                  />
                  <div
                    id={`handle-s-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-ns-resize shadow z-40"
                  />
                  <div
                    id={`handle-sw-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow z-40"
                  />
                  <div
                    id={`handle-w-${placed.id}`}
                    onPointerDown={(e) => handlePointerDownOnPhoto(e, placed.id, 'w')}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-ew-resize shadow z-40"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Hidden File Input for Canvas Drop/Click */}
        {onAddPhotos && (
          <input
            type="file"
            ref={canvasFileInputRef}
            onChange={(e) => onAddPhotos(e.target.files)}
            multiple
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/*"
            className="hidden"
          />
        )}

        {/* Empty Page Callout */}
        {page.photos.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
            {sourcePhotos.length === 0 ? (
              <div className="flex flex-col items-center max-w-sm pointer-events-auto">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Upload className="w-8 h-8 opacity-90" />
                </div>
                <h3 className="font-bold text-neutral-800 text-base">Select Your Photos to Start</h3>
                <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">
                  Upload customer photos from your device. They will be automatically arranged onto this A4 print sheet with customizable sizes and borders.
                </p>
                {onAddPhotos && (
                  <button
                    id="canvas-upload-photos-btn"
                    onClick={() => canvasFileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Select Photos from Computer
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-xs pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
                  <ImageIcon className="w-7 h-7 opacity-40" />
                </div>
                <h3 className="font-semibold text-neutral-700 text-sm">This A4 Page is Empty</h3>
                <p className="text-neutral-500 text-xs mt-1">
                  Click &quot;Auto Arrange&quot; at the top, or click &quot;Place&quot; on any photo in the left panel to add it to this page.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
