"use client";

import React, { useState, useMemo } from 'react';
import { PageOrientation, PlacedPhoto, SourcePhoto } from '@/lib/studio/types';
import {
  calculateOptimalCopyDimensions,
  generateMultiCopyPageLayout,
} from '@/lib/studio/layoutEngine';
import { getA4Dimensions } from '@/lib/studio/units';
import {
  X,
  Grid,
  Check,
  Sparkles,
  Scissors,
  Layers,
  ArrowRight,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

interface MultiCopyModalProps {
  sourcePhotos: SourcePhoto[];
  selectedSourcePhotoId?: string;
  currentOrientation?: PageOrientation;
  onGenerate: (photos: PlacedPhoto[], createNewPage: boolean) => void;
  onClose: () => void;
}

const COMMON_COPY_PRESETS = [1, 2, 3, 4, 6, 8, 9, 10, 12, 15, 16, 20, 24, 30, 32];

export const MultiCopyModal: React.FC<MultiCopyModalProps> = ({
  sourcePhotos,
  selectedSourcePhotoId,
  currentOrientation = 'portrait',
  onGenerate,
  onClose,
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(
    selectedSourcePhotoId || sourcePhotos[0]?.id || ''
  );
  const [copiesCount, setCopiesCount] = useState<number>(4);
  const [orientation, setOrientation] = useState<PageOrientation>(currentOrientation);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [gapMm, setGapMm] = useState<number>(3);
  const [marginMm, setMarginMm] = useState<number>(10);
  const [addCutGuides, setAddCutGuides] = useState<boolean>(true);
  const [createNewPage, setCreateNewPage] = useState<boolean>(false);

  const selectedPhoto = sourcePhotos.find((p) => p.id === selectedPhotoId) || sourcePhotos[0];

  const photoAspect = useMemo(() => {
    if (!selectedPhoto) return 1;
    return (
      selectedPhoto.aspectRatio ||
      (selectedPhoto.originalWidth && selectedPhoto.originalHeight
        ? selectedPhoto.originalWidth / selectedPhoto.originalHeight
        : 1)
    );
  }, [selectedPhoto]);

  // Live calculation of dimensions and grid
  const calculatedLayout = useMemo(() => {
    return calculateOptimalCopyDimensions(
      copiesCount,
      photoAspect,
      orientation,
      { top: marginMm, bottom: marginMm, left: marginMm, right: marginMm },
      gapMm,
      fitMode
    );
  }, [copiesCount, photoAspect, orientation, marginMm, gapMm, fitMode]);

  const { width: a4W, height: a4H } = getA4Dimensions(orientation);

  const handleApply = () => {
    if (!selectedPhoto) return;
    const { photos } = generateMultiCopyPageLayout(
      selectedPhoto,
      copiesCount,
      orientation,
      { top: marginMm, bottom: marginMm, left: marginMm, right: marginMm },
      gapMm,
      fitMode,
      addCutGuides
    );
    onGenerate(photos, createNewPage);
  };

  return (
    <div
      id="multicopy-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="multicopy-modal-dialog"
        className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Auto-Fit Multi-Copy Generator
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Full Page Utilization
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Select copies count — length & breadth are auto-calculated to maximally utilize the sheet
              </p>
            </div>
          </div>
          <button
            id="multicopy-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid: Left Controls & Right Visual Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Settings & Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Photo Picker */}
            {sourcePhotos.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  1. Select Photo
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-28 overflow-y-auto p-1.5 bg-neutral-950 rounded-xl border border-neutral-800">
                  {sourcePhotos.map((photo) => (
                    <button
                      key={photo.id}
                      id={`multicopy-select-photo-${photo.id}`}
                      onClick={() => setSelectedPhotoId(photo.id)}
                      className={`relative rounded-lg overflow-hidden border-2 aspect-square group bg-neutral-800 transition-all cursor-pointer ${
                        selectedPhotoId === photo.id
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow'
                          : 'border-neutral-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotoId === photo.id && (
                        <div className="absolute top-0.5 right-0.5 bg-indigo-600 rounded-full p-0.5 shadow">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Number of Copies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-indigo-400" />
                  2. Number of Copies on Same Paper
                </label>
                <span className="text-indigo-300 font-mono font-bold text-sm bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800/60">
                  {copiesCount} {copiesCount === 1 ? 'copy' : 'copies'}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 mb-3">
                {COMMON_COPY_PRESETS.map((num) => (
                  <button
                    key={num}
                    id={`btn-multicopy-preset-${num}`}
                    onClick={() => setCopiesCount(num)}
                    className={`py-2 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${
                      copiesCount === num
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {num}×
                  </button>
                ))}
              </div>

              {/* Stepper + Manual Count Input */}
              <div className="flex items-center gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-xs text-neutral-400">Fine-tune copies:</span>
                <button
                  id="btn-multicopy-minus-5"
                  onClick={() => setCopiesCount((c) => Math.max(1, c - 5))}
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-300 hover:text-white cursor-pointer"
                >
                  -5
                </button>
                <button
                  id="btn-multicopy-minus-1"
                  onClick={() => setCopiesCount((c) => Math.max(1, c - 1))}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-300 hover:text-white cursor-pointer"
                >
                  -1
                </button>
                <input
                  id="input-multicopy-count"
                  type="number"
                  min="1"
                  max="100"
                  value={copiesCount}
                  onChange={(e) => setCopiesCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-16 bg-neutral-900 border border-indigo-500/50 rounded px-2 py-1 text-center font-mono font-bold text-white text-sm"
                />
                <button
                  id="btn-multicopy-plus-1"
                  onClick={() => setCopiesCount((c) => Math.min(100, c + 1))}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-300 hover:text-white cursor-pointer"
                >
                  +1
                </button>
                <button
                  id="btn-multicopy-plus-5"
                  onClick={() => setCopiesCount((c) => Math.min(100, c + 5))}
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-300 hover:text-white cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 3. Layout Configuration (Orientation, Fit Mode, Spacing) */}
            <div className="space-y-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  3. Auto-Fit Options
                </span>
              </div>

              {/* Orientation & Fit Mode */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-medium">
                    Paper Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                        orientation === 'portrait'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                        orientation === 'landscape'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-medium">
                    Image Aspect Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => setFitMode('fit')}
                      className={`py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                        fitMode === 'fit'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      title="Keep exact photo proportions without cropping"
                    >
                      Fit (No Crop)
                    </button>
                    <button
                      onClick={() => setFitMode('fill')}
                      className={`py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                        fitMode === 'fill'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      title="Fill entire cell space"
                    >
                      Fill (Cell)
                    </button>
                  </div>
                </div>
              </div>

              {/* Margins & Gap */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Spacing Gap</span>
                    <span className="font-mono text-indigo-300 font-semibold">{gapMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={gapMm}
                    onChange={(e) => setGapMm(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Page Margin</span>
                    <span className="font-mono text-indigo-300 font-semibold">{marginMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={marginMm}
                    onChange={(e) => setMarginMm(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={addCutGuides}
                    onChange={(e) => setAddCutGuides(e.target.checked)}
                    className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-neutral-400" />
                    Add Cut Borders / Guides
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={createNewPage}
                    onChange={(e) => setCreateNewPage(e.target.checked)}
                    className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    Place on New Page
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Visual Paper Preview & Calculated Dimensions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                Live Calculated Layout
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                {calculatedLayout.utilizationPercent}% utilized
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-900/90 p-3 rounded-xl border border-neutral-800 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 block">Auto-Calculated Size</span>
                <span className="font-mono font-bold text-white text-sm">
                  {calculatedLayout.widthMm} × {calculatedLayout.heightMm}{' '}
                  <span className="text-[10px] font-normal text-neutral-400">mm</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Grid Arrangement</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {calculatedLayout.cols} cols × {calculatedLayout.rows} rows
                </span>
              </div>
            </div>

            {/* Visual Mini A4 Sheet Preview */}
            <div className="flex-1 flex items-center justify-center p-3 bg-neutral-900/40 rounded-xl border border-neutral-800/80 min-h-[220px]">
              <div
                className="relative bg-white shadow-2xl rounded-sm transition-all overflow-hidden border border-neutral-300"
                style={{
                  aspectRatio: orientation === 'portrait' ? '210/297' : '297/210',
                  height: orientation === 'portrait' ? '240px' : '170px',
                }}
              >
                {/* Visual Placed Photos */}
                {Array.from({ length: copiesCount }).map((_, idx) => {
                  const r = Math.floor(idx / calculatedLayout.cols);
                  const c = idx % calculatedLayout.cols;

                  const leftPct = ((calculatedLayout.startX + c * (calculatedLayout.widthMm + gapMm)) / a4W) * 100;
                  const topPct = ((calculatedLayout.startY + r * (calculatedLayout.heightMm + gapMm)) / a4H) * 100;
                  const widthPct = (calculatedLayout.widthMm / a4W) * 100;
                  const heightPct = (calculatedLayout.heightMm / a4H) * 100;

                  return (
                    <div
                      key={idx}
                      className="absolute overflow-hidden bg-neutral-200"
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        border: addCutGuides ? '0.5px dashed #6366f1' : '0.5px solid #cbd5e1',
                      }}
                    >
                      {selectedPhoto?.dataUrl && (
                        <img
                          src={selectedPhoto.dataUrl}
                          alt={`copy-${idx}`}
                          className={`w-full h-full ${
                            fitMode === 'fill' ? 'object-cover' : 'object-contain'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Paper size: <span className="font-mono text-neutral-200">{a4W} × {a4H} mm</span> (A4). 
              All {copiesCount} copies are dynamically fitted to occupy maximum printable space.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <button
            id="multicopy-btn-cancel"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="multicopy-btn-apply"
            onClick={handleApply}
            disabled={!selectedPhoto}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              Auto-Fit {copiesCount} {copiesCount === 1 ? 'Copy' : 'Copies'} on Paper
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
