"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CropData, SourcePhoto } from '@/lib/studio/types';
import { Check, X, RotateCcw, Crop as CropIcon } from 'lucide-react';

interface CropModalProps {
  photo: SourcePhoto;
  initialCrop?: CropData;
  onSave: (crop: CropData | undefined) => void;
  onClose: () => void;
}

type AspectRatioOption = 'free' | '1:1' | '3:4' | '35:45' | '4:6' | '5:7' | '16:9';

export const CropModal: React.FC<CropModalProps> = ({
  photo,
  initialCrop,
  onSave,
  onClose,
}) => {
  const [aspectOption, setAspectOption] = useState<AspectRatioOption>('free');
  
  // Crop rect in percentage [0..100]
  const [crop, setCrop] = useState<CropData>(
    initialCrop || { x: 10, y: 10, width: 80, height: 80 }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragHandleRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; crop: CropData }>({
    x: 0,
    y: 0,
    crop: { ...crop },
  });

  const getAspectNumeric = (opt: AspectRatioOption): number | null => {
    switch (opt) {
      case '1:1':
        return 1;
      case '3:4':
        return 3 / 4;
      case '35:45':
        return 35 / 45;
      case '4:6':
        return 4 / 6;
      case '5:7':
        return 5 / 7;
      case '16:9':
        return 16 / 9;
      default:
        return null;
    }
  };

  const handleSetAspect = (opt: AspectRatioOption) => {
    setAspectOption(opt);
    const targetAspect = getAspectNumeric(opt);
    if (!targetAspect) return;

    // Adjust current crop to target aspect based on photo's intrinsic aspect
    const imgAspect = photo.aspectRatio || photo.originalWidth / photo.originalHeight || 1;
    // target aspect in normalized percentages = (targetAspect / imgAspect)
    const normAspect = targetAspect / imgAspect;

    setCrop((prev) => {
      let newW = prev.width;
      let newH = newW / normAspect;

      if (newH > 90) {
        newH = 90;
        newW = newH * normAspect;
      }
      if (newW > 90) {
        newW = 90;
        newH = newW / normAspect;
      }

      return {
        x: Math.max(0, Math.min(100 - newW, prev.x)),
        y: Math.max(0, Math.min(100 - newH, prev.y)),
        width: Math.min(100, Math.max(10, newW)),
        height: Math.min(100, Math.max(10, newH)),
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragHandleRef.current = handle;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop },
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - dragStartPos.current.x) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStartPos.current.y) / rect.height) * 100;
      const start = dragStartPos.current.crop;
      const handle = dragHandleRef.current;

      const targetAspect = getAspectNumeric(aspectOption);
      const imgAspect = photo.aspectRatio || photo.originalWidth / photo.originalHeight || 1;
      const normAspect = targetAspect ? targetAspect / imgAspect : null;

      setCrop(() => {
        let newX = start.x;
        let newY = start.y;
        let newW = start.width;
        let newH = start.height;

        if (handle === 'move') {
          newX = Math.max(0, Math.min(100 - start.width, start.x + deltaXPct));
          newY = Math.max(0, Math.min(100 - start.height, start.y + deltaYPct));
        } else if (handle === 'se') {
          newW = Math.max(10, Math.min(100 - start.x, start.width + deltaXPct));
          newH = normAspect ? newW / normAspect : Math.max(10, Math.min(100 - start.y, start.height + deltaYPct));
          if (normAspect && newY + newH > 100) {
            newH = 100 - newY;
            newW = newH * normAspect;
          }
        } else if (handle === 'nw') {
          const proposedW = Math.max(10, start.width - deltaXPct);
          const proposedX = start.x + (start.width - proposedW);
          if (proposedX >= 0) {
            newX = proposedX;
            newW = proposedW;
          }
          const proposedH = normAspect ? newW / normAspect : Math.max(10, start.height - deltaYPct);
          const proposedY = start.y + (start.height - proposedH);
          if (proposedY >= 0) {
            newY = proposedY;
            newH = proposedH;
          }
        } else if (handle === 'ne') {
          newW = Math.max(10, Math.min(100 - start.x, start.width + deltaXPct));
          const proposedH = normAspect ? newW / normAspect : Math.max(10, start.height - deltaYPct);
          const proposedY = start.y + (start.height - proposedH);
          if (proposedY >= 0) {
            newY = proposedY;
            newH = proposedH;
          }
        } else if (handle === 'sw') {
          const proposedW = Math.max(10, start.width - deltaXPct);
          const proposedX = start.x + (start.width - proposedW);
          if (proposedX >= 0) {
            newX = proposedX;
            newW = proposedW;
          }
          newH = normAspect ? newW / normAspect : Math.max(10, Math.min(100 - start.y, start.height + deltaYPct));
          if (normAspect && newY + newH > 100) {
            newH = 100 - newY;
            newW = newH * normAspect;
          }
        }

        return {
          x: Math.max(0, Math.min(100 - newW, newX)),
          y: Math.max(0, Math.min(100 - newH, newY)),
          width: Math.min(100, Math.max(10, newW)),
          height: Math.min(100, Math.max(10, newH)),
        };
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragHandleRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [aspectOption, photo]);

  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setAspectOption('free');
  };

  return (
    <div
      id="crop-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="crop-modal-dialog"
        className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">
              Crop Photo: <span className="text-neutral-300 font-normal text-sm">{photo.name}</span>
            </h2>
          </div>
          <button
            id="crop-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-neutral-900 border-b border-neutral-800 text-xs">
          <span className="text-neutral-400 font-medium mr-1">Aspect Ratio:</span>
          {(
            [
              { id: 'free', label: 'Free' },
              { id: '35:45', label: 'Passport (35×45mm)' },
              { id: '1:1', label: '1:1 (2×2" / Pan Card)' },
              { id: '3:4', label: '3:4 Portrait' },
              { id: '4:6', label: '4:6 (Postcard)' },
              { id: '5:7', label: '5:7 Frame' },
              { id: '16:9', label: '16:9 Wide' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              id={`crop-aspect-${item.id}`}
              onClick={() => handleSetAspect(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                aspectOption === item.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            id="crop-reset-btn"
            onClick={handleResetCrop}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Crop
          </button>
        </div>

        {/* Visual Crop Workspace */}
        <div className="flex-1 p-6 bg-neutral-950 flex items-center justify-center overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative inline-block max-h-[56vh] max-w-full shadow-2xl border border-neutral-800 rounded overflow-hidden"
          >
            <img
              src={photo.dataUrl}
              alt="Crop target"
              className="max-h-[56vh] max-w-full object-contain pointer-events-none block"
            />

            {/* Dark Mask around crop box */}
            <div
              className="absolute inset-0 bg-black/60 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 0% 100%, 100% 100%, 100% 0%,
                  0% 0%,
                  ${crop.x}% ${crop.y}%,
                  ${crop.x + crop.width}% ${crop.y}%,
                  ${crop.x + crop.width}% ${crop.y + crop.height}%,
                  ${crop.x}% ${crop.y + crop.height}%,
                  ${crop.x}% ${crop.y}%
                )`,
              }}
            />

            {/* Interactive Crop Box */}
            <div
              id="crop-box"
              className="absolute border-2 border-indigo-400 cursor-move shadow-sm"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                id="crop-handle-nw"
                className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              <div
                id="crop-handle-ne"
                className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              <div
                id="crop-handle-se"
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />
              <div
                id="crop-handle-sw"
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900">
          <div className="text-xs text-neutral-400">
            Original: {photo.originalWidth} × {photo.originalHeight} px • Crop: {Math.round(crop.width)}% × {Math.round(crop.height)}%
          </div>
          <div className="flex items-center gap-3">
            <button
              id="crop-modal-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="crop-modal-apply-btn"
              onClick={() => {
                // If crop is full image, can set undefined or crop data
                if (crop.x === 0 && crop.y === 0 && crop.width === 100 && crop.height === 100) {
                  onSave(undefined);
                } else {
                  onSave(crop);
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
