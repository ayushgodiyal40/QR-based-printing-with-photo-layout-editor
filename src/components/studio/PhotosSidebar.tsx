"use client";

import React, { useRef, useState } from 'react';
import { PlacedPhoto, SourcePhoto } from '@/lib/studio/types';
import {
  Upload,
  Trash2,
  RotateCw,
  Eye,
  Plus,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Layers,
  Image as ImageIcon,
  Grid,
  Sparkles,
} from 'lucide-react';

interface PhotosSidebarProps {
  sourcePhotos: SourcePhoto[];
  placedPhotosOnCurrentPage: PlacedPhoto[];
  allPlacedPhotos: PlacedPhoto[];
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  onBatchRemovePhotos: (ids: string[]) => void;
  onRotateBasePhoto: (id: string) => void;
  onPlacePhotoOnPage: (photo: SourcePhoto) => void;
  onPreviewPhoto: (photo: SourcePhoto) => void;
  onReorderPhoto: (index: number, direction: 'up' | 'down') => void;
  onOpenPassportForPhoto: (photoId: string) => void;
  onOpenMultiCopyForPhoto?: (photoId: string) => void;
  onLoadSamples?: () => void;
  onClearAll: () => void;
}

export const PhotosSidebar: React.FC<PhotosSidebarProps> = ({
  sourcePhotos,
  placedPhotosOnCurrentPage,
  allPlacedPhotos,
  onAddPhotos,
  onRemovePhoto,
  onBatchRemovePhotos,
  onRotateBasePhoto,
  onPlacePhotoOnPage,
  onPreviewPhoto,
  onReorderPhoto,
  onOpenPassportForPhoto,
  onOpenMultiCopyForPhoto,
  onLoadSamples,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const toggleSelectPhoto = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sourcePhotos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sourcePhotos.map((p) => p.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    onBatchRemovePhotos(selectedIds);
    setSelectedIds([]);
  };

  // Count placements across entire document
  const getPlacementCount = (photoId: string): number => {
    return allPlacedPhotos.filter((p) => p.photoId === photoId).length;
  };

  return (
    <aside
      id="photos-sidebar"
      className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full text-neutral-200 select-none shrink-0"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-xs text-white uppercase tracking-wider">
            Photos ({sourcePhotos.length})
          </h2>
        </div>
        {sourcePhotos.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              id="photos-select-all-btn"
              onClick={toggleSelectAll}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={selectedIds.length === sourcePhotos.length ? 'Deselect All' : 'Select All'}
            >
              {selectedIds.length === sourcePhotos.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            {selectedIds.length > 0 && (
              <button
                id="photos-batch-delete-btn"
                onClick={handleBatchDelete}
                className="p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title={`Delete ${selectedIds.length} selected photos`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Trigger Zone */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-900/50">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => onAddPhotos(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/*"
          className="hidden"
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            onAddPhotos(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
              : 'border-neutral-700/80 hover:border-neutral-500 bg-neutral-950/40 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto mb-1.5 text-indigo-400 opacity-80" />
          <div className="text-xs font-semibold text-neutral-200">
            Click or Drop Photos Here
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            JPG, PNG, WEBP, BMP, TIFF
          </div>
        </div>
      </div>

      {/* Photos List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {sourcePhotos.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-800/80 mx-auto flex items-center justify-center text-neutral-500">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="text-xs text-neutral-400">
              No photos in your project. Add photos to start creating print layouts.
            </div>
            <div className="pt-2">
              <button
                id="sidebar-add-btn-empty"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Select Photos from Computer
              </button>
            </div>
          </div>
        ) : (
          sourcePhotos.map((photo, idx) => {
            const count = getPlacementCount(photo.id);
            const isSelected = selectedIds.includes(photo.id);

            return (
              <div
                key={photo.id}
                id={`sidebar-photo-${photo.id}`}
                className={`group relative bg-neutral-950 border rounded-lg p-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-md'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleSelectPhoto(photo.id)}
                    className="mt-1 text-neutral-500 hover:text-indigo-400 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div
                    onClick={() => onPreviewPhoto(photo)}
                    className="relative w-14 h-16 rounded bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 cursor-pointer shadow-inner"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      style={{
                        transform: `rotate(${photo.baseRotation || 0}deg)`,
                      }}
                    />
                    {count > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 bg-neutral-900/90 border border-neutral-700 text-indigo-300 font-mono text-[9px] font-bold px-1 rounded">
                        {count}×
                      </span>
                    )}
                  </div>

                  {/* Info & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold text-neutral-200 truncate cursor-pointer hover:text-indigo-300"
                      title={photo.name}
                      onClick={() => onPreviewPhoto(photo)}
                    >
                      {photo.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {photo.originalWidth} × {photo.originalHeight} px
                    </div>

                    {/* Quick Inline Actions */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <button
                        id={`sidebar-place-${photo.id}`}
                        onClick={() => onPlacePhotoOnPage(photo)}
                        className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800/60 text-[10px] font-semibold transition-colors cursor-pointer"
                        title="Add 1 copy to current A4 page"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Place</span>
                      </button>

                      <button
                        id={`sidebar-multicopy-${photo.id}`}
                        onClick={() => onOpenMultiCopyForPhoto?.(photo.id)}
                        className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors cursor-pointer shadow-sm"
                        title="Auto-Fit multiple copies (2x, 4x, 8x, 12x...) to fill page"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Multi-Copy</span>
                      </button>

                      <button
                        id={`sidebar-passport-${photo.id}`}
                        onClick={() => onOpenPassportForPhoto(photo.id)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] transition-colors cursor-pointer"
                        title="Create Standard Passport ID sheet"
                      >
                        <Layers className="w-3 h-3 text-indigo-400" />
                        <span>ID</span>
                      </button>

                      <button
                        id={`sidebar-rotate-${photo.id}`}
                        onClick={() => onRotateBasePhoto(photo.id)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Rotate Base Photo 90° Clockwise"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>

                      <button
                        id={`sidebar-preview-${photo.id}`}
                        onClick={() => onPreviewPhoto(photo)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Preview Large"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      <button
                        id={`sidebar-delete-${photo.id}`}
                        onClick={() => onRemovePhoto(photo.id)}
                        className="p-1 rounded hover:bg-red-950/60 text-neutral-500 hover:text-red-400 ml-auto transition-colors cursor-pointer"
                        title="Remove photo from pool"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col justify-between self-stretch py-0.5 text-neutral-500 opacity-40 group-hover:opacity-100">
                    <button
                      disabled={idx === 0}
                      onClick={() => onReorderPhoto(idx, 'up')}
                      className="hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === sourcePhotos.length - 1}
                      onClick={() => onReorderPhoto(idx, 'down')}
                      className="hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Utility Actions */}
      {sourcePhotos.length > 0 && (
        <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <button
            id="sidebar-clear-all-btn"
            onClick={onClearAll}
            className="text-[11px] text-neutral-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Clear All Photos
          </button>
          {onLoadSamples && (
            <button
              id="sidebar-load-more-samples"
              onClick={onLoadSamples}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              + Sample Photos
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
