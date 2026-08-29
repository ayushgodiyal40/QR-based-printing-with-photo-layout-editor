"use client";

import React from 'react';
import { Page, PageOrientation, SourcePhoto } from '@/lib/studio/types';
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface PageNavigationProps {
  pages: Page[];
  activePageIndex: number;
  orientation: PageOrientation;
  sourcePhotos: SourcePhoto[];
  onSelectPage: (index: number) => void;
  onAddBlankPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (index: number, direction: 'left' | 'right') => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  pages,
  activePageIndex,
  orientation,
  sourcePhotos,
  onSelectPage,
  onAddBlankPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
}) => {
  const isPortrait = orientation === 'portrait';

  return (
    <footer
      id="page-navigation-bar"
      className="bg-neutral-900 border-t border-neutral-800 text-neutral-300 px-4 py-2 flex items-center justify-between gap-4 select-none z-20 shrink-0"
    >
      {/* Left: Summary & Info */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>
            Page {activePageIndex + 1} of {pages.length}
          </span>
        </div>
        <span className="text-[11px] text-neutral-500 hidden sm:inline">
          ({pages[activePageIndex]?.photos.length || 0} photos on active sheet)
        </span>
      </div>

      {/* Center: Scrollable Page Tabs with Mini Thumbnails */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-2xl px-2">
        {pages.map((page, idx) => {
          const isActive = idx === activePageIndex;

          return (
            <div
              key={page.id}
              id={`page-tab-container-${idx}`}
              className={`group relative flex items-center rounded-lg border transition-all ${
                isActive
                  ? 'bg-neutral-950 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Main Tab Clicker */}
              <button
                id={`page-tab-${idx + 1}`}
                onClick={() => onSelectPage(idx)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {/* Mini A4 Page Icon Representation */}
                <div
                  className={`border bg-white rounded-[2px] shadow-sm flex items-center justify-center overflow-hidden shrink-0 ${
                    isPortrait ? 'w-4 h-5' : 'w-5 h-4'
                  } ${isActive ? 'border-indigo-400' : 'border-neutral-400'}`}
                >
                  {page.photos.length > 0 ? (
                    <div className="w-full h-full bg-neutral-200 grid grid-cols-2 gap-px p-0.5">
                      {page.photos.slice(0, 4).map((p, pidx) => (
                        <div key={pidx} className="bg-indigo-400 rounded-[0.5px]" />
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-neutral-50" />
                  )}
                </div>

                <span className={isActive ? 'text-indigo-300 font-bold' : 'text-neutral-300'}>
                  {page.name || `Page ${idx + 1}`}
                </span>

                <span className="text-[10px] text-neutral-500 font-mono">
                  ({page.photos.length})
                </span>
              </button>

              {/* Page Controls Toolbar */}
              <div className="flex items-center pr-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                {/* Move Left */}
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePage(idx, 'left');
                    }}
                    className="p-1 text-neutral-500 hover:text-white cursor-pointer"
                    title="Move Page Left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}

                {/* Move Right */}
                {idx < pages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePage(idx, 'right');
                    }}
                    className="p-1 text-neutral-500 hover:text-white cursor-pointer"
                    title="Move Page Right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                {/* Duplicate Page */}
                <button
                  id={`page-duplicate-btn-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicatePage(idx);
                  }}
                  className="p-1 text-neutral-500 hover:text-indigo-400 cursor-pointer"
                  title="Duplicate This Page"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* Delete Page */}
                {pages.length > 1 && (
                  <button
                    id={`page-delete-btn-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(idx);
                    }}
                    className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                    title="Delete This Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Blank Page Button */}
        <button
          id="btn-add-blank-page"
          onClick={onAddBlankPage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors shrink-0 cursor-pointer"
          title="Add a new blank A4 page"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Add Page</span>
        </button>
      </div>

      {/* Right: Quick Page Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="page-nav-duplicate-active"
          onClick={() => onDuplicatePage(activePageIndex)}
          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs hidden md:flex items-center gap-1 transition-colors cursor-pointer"
          title="Duplicate current page"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate Page</span>
        </button>
      </div>
    </footer>
  );
};
