"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  ProjectState,
} from '@/lib/studio/types';
import { SIZE_PRESETS } from '@/lib/studio/units';
import {
  Upload,
  RotateCcw,
  Undo2,
  Redo2,
  FileDown,
  Printer,
  Sparkles,
  Layers,
  Eye,
  Grid,
  Save,
  FolderOpen,
  Image as ImageIcon,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scissors,
  Scaling,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface TopToolbarProps {
  shopName?: string;
  project: ProjectState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddPhotos: (files: FileList | null) => void;
  onAutoArrange: () => void;
  onResetPageLayout: () => void;
  onOpenPassportModal: () => void;
  onApplyPhotoSize?: (widthMm: number, heightMm: number, name: string) => void;
  onToggleOrientation: () => void;
  onToggleGrayscale: () => void;
  onToggleCutGuides: () => void;
  onToggleSnap: () => void;
  onToggleShowMargins: () => void;
  onSetZoom: (zoom: number) => void;
  onFitZoomToScreen: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onExportPDF: () => void;
  onExportImages: (format: 'png' | 'jpeg') => void;
  onPrint: () => void;
  isExportingPdf: boolean;
  pdfExportProgress: number;
  isPrinting?: boolean;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  shopName = "PrintShop",
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddPhotos,
  onAutoArrange,
  onResetPageLayout,
  onOpenPassportModal,
  onApplyPhotoSize,
  onToggleOrientation,
  onToggleGrayscale,
  onToggleCutGuides,
  onToggleSnap,
  onToggleShowMargins,
  onSetZoom,
  onFitZoomToScreen,
  onSaveProject,
  onLoadProject,
  onExportPDF,
  onExportImages,
  onPrint,
  isExportingPdf,
  pdfExportProgress,
  isPrinting = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [isPhotoSizeMenuOpen, setIsPhotoSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setIsPhotoSizeMenuOpen(false);
      }
    };
    if (isPhotoSizeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPhotoSizeMenuOpen]);

  const selectedCount = project.selectedPhotoIds.length;
  const targetLabel = selectedCount > 0 ? `${selectedCount} selected` : 'all on page';

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 text-neutral-200 select-none shadow-md z-30 flex flex-col shrink-0">
      {/* Upper Brand & Main Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/80 gap-3">
        {/* Brand & Shop Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner font-bold text-white text-base">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white tracking-tight leading-none">
                {shopName}
              </h1>
              <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Photo & Layout Studio
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Passport, ID & Multi-Photo A4 Print Studio
            </div>
          </div>
        </div>

        {/* Central Quick Actions */}
        <div className="flex items-center gap-1.5 bg-neutral-950/70 p-1 rounded-lg border border-neutral-800">
          {/* Add Photos Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => onAddPhotos(e.target.files)}
            multiple
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/*"
            className="hidden"
          />
          <button
            id="toolbar-add-photos-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            title="Import image files (JPG, PNG, WEBP, BMP, TIFF)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Photos</span>
          </button>

          {/* Photo Size Presets Dropdown Menu */}
          <div className="relative" ref={sizeMenuRef}>
            <button
              id="toolbar-photo-size-btn"
              onClick={() => setIsPhotoSizeMenuOpen(!isPhotoSizeMenuOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isPhotoSizeMenuOpen
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
              title="Change size of selected photos or all photos on page"
            >
              <Scaling className="w-3.5 h-3.5 text-indigo-400" />
              <span>Photo Size</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isPhotoSizeMenuOpen && (
              <div
                id="photo-size-dropdown-menu"
                className="absolute top-full left-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 mb-1 border-b border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wider text-neutral-300">Set Photo Size</span>
                  <span className="text-indigo-400">Target: {targetLabel}</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-0.5">
                  {SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      id={`menu-item-size-${preset.widthMm}x${preset.heightMm}`}
                      onClick={() => {
                        if (onApplyPhotoSize) {
                          onApplyPhotoSize(preset.widthMm, preset.heightMm, preset.name);
                        }
                        setIsPhotoSizeMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 text-neutral-200 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="truncate mr-2">
                        <div className="font-medium text-[11px] group-hover:text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {preset.widthMm} × {preset.heightMm} mm
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 group-hover:bg-indigo-950 text-neutral-400 group-hover:text-indigo-300 shrink-0">
                        {preset.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto Arrange */}
          <button
            id="toolbar-auto-arrange-btn"
            onClick={onAutoArrange}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            title="Automatically rearrange photos across A4 pages"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto Arrange</span>
          </button>

          {/* Passport Mode Button */}
          <button
            id="toolbar-passport-mode-btn"
            onClick={onOpenPassportModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            title="Quick Passport / Visa / ID sheet generator (35x45mm, 2x2, etc.)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Passport Sheet</span>
          </button>

          {/* Reset Page Layout */}
          <button
            id="toolbar-reset-layout-btn"
            onClick={onResetPageLayout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            title="Reset current page to auto-arranged layout"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Reset Layout</span>
          </button>
        </div>

        {/* Right Project & Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Project Save / Open */}
          <input
            type="file"
            ref={projectFileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) onLoadProject(e.target.files[0]);
            }}
            accept=".godiyal,.json"
            className="hidden"
          />
          <button
            id="toolbar-open-project-btn"
            onClick={() => projectFileInputRef.current?.click()}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title="Open Saved Project File"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            id="toolbar-save-project-btn"
            onClick={onSaveProject}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title="Save Project (.json file)"
          >
            <Save className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-neutral-800 mx-0.5" />

          {/* Export Images Dropdown */}
          <button
            id="toolbar-export-images-btn"
            onClick={() => onExportImages('png')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            title="Export pages as high-resolution PNG images (300 DPI)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export PNG</span>
          </button>

          {/* Export PDF Button */}
          <button
            id="toolbar-export-pdf-btn"
            disabled={isExportingPdf}
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            title="Export complete document to print-ready A4 PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? `PDF (${pdfExportProgress}%)` : 'Export PDF'}</span>
          </button>

          {/* Print Button */}
          <button
            id="toolbar-print-btn"
            disabled={isPrinting}
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            title="Print directly at 100% Actual Size without headers or footers"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing Print...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Controls Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-neutral-950 text-neutral-400 gap-3 overflow-x-auto">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id="toolbar-undo-btn"
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-300 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="toolbar-redo-btn"
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-300 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-neutral-500 ml-1">
            {project.pages[project.activePageIndex]?.photos.length || 0} photos on page
          </span>
        </div>

        {/* View & Canvas Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Orientation Switcher */}
          <button
            id="toolbar-toggle-orientation-btn"
            onClick={onToggleOrientation}
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            title="Toggle A4 Page Orientation (Portrait / Landscape)"
          >
            <Sliders className="w-3 h-3 text-indigo-400" />
            <span>
              A4 {project.globalLayoutConfig.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </span>
          </button>

          {/* Grayscale Toggle */}
          <button
            id="toolbar-toggle-grayscale-btn"
            onClick={onToggleGrayscale}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
              project.globalGrayscale
                ? 'bg-neutral-200 border-white text-neutral-950 font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Preview in Black & White / Grayscale"
          >
            <Eye className="w-3 h-3" />
            <span>B&W Preview</span>
          </button>

          {/* Cut Guides Toggle */}
          <button
            id="toolbar-toggle-cutguides-btn"
            onClick={onToggleCutGuides}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
              project.globalLayoutConfig.cutGuides
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
            title="Show / Hide Thin Cutting Guides for Paper Cutter"
          >
            <Scissors className="w-3 h-3" />
            <span>Cut Lines</span>
          </button>

          {/* Snap Grid Toggle */}
          <button
            id="toolbar-toggle-snap-btn"
            onClick={onToggleSnap}
            className={`p-1 rounded border transition-colors cursor-pointer ${
              project.snapToGrid
                ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
            title="Toggle 5mm Grid Snapping"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Show Margins Toggle */}
          <button
            id="toolbar-toggle-margins-btn"
            onClick={onToggleShowMargins}
            className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
              project.showMargins
                ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
            title="Show / Hide Page Margin Guidelines"
          >
            Margins
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id="toolbar-zoom-out-btn"
            onClick={() => onSetZoom(Math.max(0.2, project.zoom - 0.1))}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            id="toolbar-zoom-100-btn"
            onClick={() => onSetZoom(1.0)}
            className="px-1.5 py-0.5 rounded font-mono text-[11px] hover:bg-neutral-800 text-neutral-300 cursor-pointer"
            title="Reset to 100% (Actual physical scale)"
          >
            {Math.round(project.zoom * 100)}%
          </button>

          <button
            id="toolbar-zoom-in-btn"
            onClick={() => onSetZoom(Math.min(3.0, project.zoom + 0.1))}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            id="toolbar-zoom-fit-btn"
            onClick={onFitZoomToScreen}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            title="Fit A4 Page to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
