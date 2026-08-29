"use client";

import React from 'react';
import { SourcePhoto } from '@/lib/studio/types';
import { X, ZoomIn, Info } from 'lucide-react';

interface PhotoPreviewModalProps {
  photo: SourcePhoto;
  onClose: () => void;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  onClose,
}) => {
  return (
    <div
      id="photo-preview-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="photo-preview-modal-dialog"
        className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm truncate max-w-md">{photo.name}</h3>
          </div>
          <button
            id="photo-preview-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Display */}
        <div className="flex-1 p-6 bg-neutral-950 flex items-center justify-center overflow-auto min-h-[300px]">
          <img
            src={photo.dataUrl}
            alt={photo.name}
            className="max-h-[68vh] max-w-full object-contain rounded shadow-lg border border-neutral-800"
          />
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-900 text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-neutral-500" />
              Dimensions: <strong className="text-neutral-200">{photo.originalWidth} × {photo.originalHeight} px</strong>
            </span>
            <span>
              Aspect Ratio: <strong className="text-neutral-200">{(photo.aspectRatio || 1).toFixed(2)}:1</strong>
            </span>
          </div>
          <button
            id="photo-preview-dismiss-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
