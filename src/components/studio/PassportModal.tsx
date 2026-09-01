"use client";

import React, { useState } from 'react';
import { PlacedPhoto, SourcePhoto } from '@/lib/studio/types';
import {
  generatePassportPageLayout,
  calculateOptimalCopyDimensions,
} from '@/lib/studio/layoutEngine';
import { SIZE_PRESETS } from '@/lib/studio/units';
import { Check, X, Scissors, Layers, Sparkles } from 'lucide-react';

interface PassportModalProps {
  sourcePhotos: SourcePhoto[];
  selectedSourcePhotoId?: string;
  onGenerate: (photos: PlacedPhoto[], createNewPage: boolean) => void;
  onClose: () => void;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  sourcePhotos,
  selectedSourcePhotoId,
  onGenerate,
  onClose,
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(
    selectedSourcePhotoId || sourcePhotos[0]?.id || ''
  );
  const [selectedPresetName, setSelectedPresetName] = useState<string>(
    'Indian Passport (35 × 45 mm)'
  );
  const [widthMm, setWidthMm] = useState<number>(35);
  const [heightMm, setHeightMm] = useState<number>(45);
  const [copiesCount, setCopiesCount] = useState<number>(8);
  const [gapMm, setGapMm] = useState<number>(3);
  const [marginMm, setMarginMm] = useState<number>(10);
  const [addCutGuides, setAddCutGuides] = useState<boolean>(true);
  const [createNewPage, setCreateNewPage] = useState<boolean>(false);

  const selectedPhoto = sourcePhotos.find((p) => p.id === selectedPhotoId);

  const handleSelectPreset = (name: string) => {
    setSelectedPresetName(name);
    if (name === 'Auto-Fit Full Page') {
      const pAspect =
        selectedPhoto?.aspectRatio ||
        (selectedPhoto?.originalWidth && selectedPhoto?.originalHeight
          ? selectedPhoto.originalWidth / selectedPhoto.originalHeight
          : 35 / 45);
      const opt = calculateOptimalCopyDimensions(
        copiesCount,
        pAspect,
        'portrait',
        { top: marginMm, bottom: marginMm, left: marginMm, right: marginMm },
        gapMm,
        'fit'
      );
      setWidthMm(opt.widthMm);
      setHeightMm(opt.heightMm);
      return;
    }

    const preset = SIZE_PRESETS.find((p) => p.name === name);
    if (preset) {
      setWidthMm(preset.widthMm);
      setHeightMm(preset.heightMm);
    }
  };

  const handleApply = () => {
    if (!selectedPhoto) return;
    const generated = generatePassportPageLayout(
      selectedPhoto,
      widthMm,
      heightMm,
      copiesCount,
      gapMm,
      marginMm,
      'portrait',
      addCutGuides
    );
    onGenerate(generated, createNewPage);
  };

  return (
    <div
      id="passport-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="passport-modal-dialog"
        className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">Passport & ID Multi-Copy Tool</h2>
          </div>
          <button
            id="passport-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Photo Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              1. Choose Headshot / Photo
            </label>
            {sourcePhotos.length === 0 ? (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-center text-xs text-neutral-400">
                No photos in project. Please add photos to your project first before generating passport copies.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {sourcePhotos.map((photo) => (
                  <button
                    key={photo.id}
                    id={`passport-select-photo-${photo.id}`}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className={`relative rounded-lg overflow-hidden border-2 aspect-[3/4] group bg-neutral-800 transition-all cursor-pointer ${
                      selectedPhotoId === photo.id
                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg'
                        : 'border-neutral-700 hover:border-neutral-500 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedPhotoId === photo.id && (
                      <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preset Size Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              2. Standard ID / Print Size Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                id="passport-preset-autofit"
                onClick={() => handleSelectPreset('Auto-Fit Full Page')}
                className={`px-3 py-2 text-left rounded-lg border text-xs transition-colors cursor-pointer ${
                  selectedPresetName === 'Auto-Fit Full Page'
                    ? 'bg-indigo-900/80 border-indigo-400 text-white ring-1 ring-indigo-400'
                    : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200 hover:bg-indigo-950'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Auto-Fit Full Page
                </div>
                <div className="text-[11px] text-indigo-300/80 mt-0.5">
                  Max size for {copiesCount} copies
                </div>
              </button>
              {SIZE_PRESETS.filter((p) => p.category === 'ID / Passport').map((preset) => (
                <button
                  key={preset.name}
                  id={`passport-preset-${preset.widthMm}x${preset.heightMm}`}
                  onClick={() => handleSelectPreset(preset.name)}
                  className={`px-3 py-2 text-left rounded-lg border text-xs transition-colors cursor-pointer ${
                    selectedPresetName === preset.name
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {preset.widthMm} × {preset.heightMm} mm
                  </div>
                </button>
              ))}
              <button
                id="passport-preset-custom"
                onClick={() => setSelectedPresetName('Custom')}
                className={`px-3 py-2 text-left rounded-lg border text-xs transition-colors cursor-pointer ${
                  selectedPresetName === 'Custom'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                    : 'bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <div className="font-semibold">Custom Dimensions</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Enter custom mm</div>
              </button>
            </div>
          </div>

          {/* Dimensions & Number of copies */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Width (mm)</label>
              <input
                id="passport-input-width"
                type="number"
                min="10"
                max="200"
                value={widthMm}
                onChange={(e) => {
                  setWidthMm(Number(e.target.value));
                  setSelectedPresetName('Custom');
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Height (mm)</label>
              <input
                id="passport-input-height"
                type="number"
                min="10"
                max="280"
                value={heightMm}
                onChange={(e) => {
                  setHeightMm(Number(e.target.value));
                  setSelectedPresetName('Custom');
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Number of Copies</label>
              <select
                id="passport-select-copies"
                value={copiesCount}
                onChange={(e) => setCopiesCount(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-1.5 text-white"
              >
                {[4, 6, 8, 12, 16, 20, 24, 30, 32].map((num) => (
                  <option key={num} value={num}>
                    {num} copies
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Gap / Spacing (mm)</label>
              <input
                id="passport-input-gap"
                type="number"
                min="0"
                max="20"
                value={gapMm}
                onChange={(e) => setGapMm(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          {/* Print options */}
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                id="passport-toggle-cutguides"
                type="checkbox"
                checked={addCutGuides}
                onChange={(e) => setAddCutGuides(e.target.checked)}
                className="rounded border-neutral-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-neutral-800"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                Include thin cutting lines around each photo for paper trimmer
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                id="passport-toggle-newpage"
                type="checkbox"
                checked={createNewPage}
                onChange={(e) => setCreateNewPage(e.target.checked)}
                className="rounded border-neutral-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-neutral-800"
              />
              <span>Create as a new A4 page (keep existing pages unchanged)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <div className="text-xs text-neutral-400">
            Will generate {copiesCount} copies of {widthMm}×{heightMm}mm on A4
          </div>
          <div className="flex items-center gap-3">
            <button
              id="passport-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="passport-generate-btn"
              disabled={!selectedPhoto}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Generate Passport Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
