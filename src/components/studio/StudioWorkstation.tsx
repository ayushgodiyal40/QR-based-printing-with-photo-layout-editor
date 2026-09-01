"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  CropData,
  HistoryEntry,
  MeasurementUnit,
  Page,
  PageLayoutConfig,
  PageOrientation,
  PlacedPhoto,
  ProjectState,
  SourcePhoto,
} from '@/lib/studio/types';
import { generateAutoLayoutPages } from '@/lib/studio/layoutEngine';
import { exportProjectToPDF } from '@/lib/studio/pdfExport';
import { downloadPageAsImage } from '@/lib/studio/imageExport';
import { printProjectDirectly } from '@/lib/studio/printEngine';
import { TopToolbar } from './TopToolbar';
import { PhotosSidebar } from './PhotosSidebar';
import { CanvasArea } from './CanvasArea';
import { PropertiesPanel } from './PropertiesPanel';
import { PageNavigation } from './PageNavigation';
import { CropModal } from './CropModal';
import { PassportModal } from './PassportModal';
import { MultiCopyModal } from './MultiCopyModal';
import { PhotoPreviewModal } from './PhotoPreviewModal';

const DEFAULT_LAYOUT_CONFIG: PageLayoutConfig = {
  orientation: 'portrait',
  photosPerPage: 4,
  fitMode: 'fit',
  margins: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
  gap: 5,
  cutGuides: false,
  autoAlign: true,
};

const INITIAL_EMPTY_PAGES: Page[] = [
  {
    id: 'page-1',
    name: 'Page 1',
    photos: [],
  },
];

interface StudioWorkstationProps {
  shopName?: string;
  initialOrderId?: string;
}

export default function StudioWorkstation({
  shopName = "PrintShop",
  initialOrderId,
}: StudioWorkstationProps) {
  // --- Core Project State ---
  const [projectName, setProjectName] = useState<string>('PrintShop_Photo_Layout');
  const [sourcePhotos, setSourcePhotos] = useState<SourcePhoto[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<PageLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  
  const [pages, setPages] = useState<Page[]>(INITIAL_EMPTY_PAGES);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  
  // View & UI Options
  const [globalGrayscale, setGlobalGrayscale] = useState<boolean>(false);
  const [displayUnit, setDisplayUnit] = useState<MeasurementUnit>('mm');
  const [zoom, setZoom] = useState<number>(0.58);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [gridSizeMm, setGridSizeMm] = useState<number>(5);
  const [showMargins, setShowMargins] = useState<boolean>(true);
  const [showRulers] = useState<boolean>(true);

  // Modals
  const [cropTarget, setCropTarget] = useState<{
    photo: SourcePhoto;
    placed: PlacedPhoto;
  } | null>(null);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);
  const [passportTargetPhotoId, setPassportTargetPhotoId] = useState<string | undefined>(undefined);
  const [isMultiCopyModalOpen, setIsMultiCopyModalOpen] = useState<boolean>(false);
  const [multiCopyTargetPhotoId, setMultiCopyTargetPhotoId] = useState<string | undefined>(undefined);
  const [previewPhoto, setPreviewPhoto] = useState<SourcePhoto | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // PDF Export Status
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

  // --- Undo / Redo History Management ---
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      pages: INITIAL_EMPTY_PAGES,
      activePageIndex: 0,
      globalLayoutConfig: DEFAULT_LAYOUT_CONFIG,
      selectedPhotoIds: [],
      description: 'Initial state',
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback(
    (newPages: Page[], newConfig: PageLayoutConfig, desc = 'Edit') => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push({
          pages: JSON.parse(JSON.stringify(newPages)),
          activePageIndex,
          globalLayoutConfig: { ...newConfig },
          selectedPhotoIds: [...selectedPhotoIds],
          description: desc,
        });
        if (next.length > 40) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 39));
    },
    [historyIndex, activePageIndex, selectedPhotoIds]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setPages(JSON.parse(JSON.stringify(prevEntry.pages)));
      setLayoutConfig({ ...prevEntry.globalLayoutConfig });
      setActivePageIndex(Math.min(prevEntry.activePageIndex, prevEntry.pages.length - 1));
      setSelectedPhotoIds([]);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      setPages(JSON.parse(JSON.stringify(nextEntry.pages)));
      setLayoutConfig({ ...nextEntry.globalLayoutConfig });
      setActivePageIndex(Math.min(nextEntry.activePageIndex, nextEntry.pages.length - 1));
      setSelectedPhotoIds([]);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Global Keyboard Shortcuts for Undo / Redo
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Load Order Files if initialOrderId is supplied via query param
  useEffect(() => {
    if (!initialOrderId) return;

    const loadOrderFiles = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${initialOrderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.order && data.files && data.files.length > 0) {
          setProjectName(`Order_${data.order.token || data.order.orderNumber}_Layout`);
          
          const imageFiles = data.files.filter((f: any) => 
            f.mimeType?.startsWith('image/') || 
            /\.(jpe?g|png|webp|bmp|tiff)$/i.test(f.originalName)
          );

          const loadedPhotos: SourcePhoto[] = [];

          for (const file of imageFiles) {
            try {
              const fileRes = await fetch(`/api/admin/orders/${initialOrderId}/files/${file.id}?action=download`);
              if (fileRes.ok) {
                const blob = await fileRes.blob();
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });

                const img = new Image();
                await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.src = dataUrl;
                });

                loadedPhotos.push({
                  id: `order-photo-${file.id}`,
                  name: file.originalName,
                  dataUrl,
                  originalWidth: img.naturalWidth || 1200,
                  originalHeight: img.naturalHeight || 800,
                  aspectRatio: (img.naturalWidth || 1200) / (img.naturalHeight || 800),
                  baseRotation: 0,
                  fileSize: file.sizeBytes,
                  fileType: file.mimeType,
                  orderFileId: file.id,
                });
              }
            } catch (err) {
              console.error(`Error loading image ${file.originalName}:`, err);
            }
          }

          if (loadedPhotos.length > 0) {
            setSourcePhotos(loadedPhotos);
            const freshPages = generateAutoLayoutPages(loadedPhotos, layoutConfig);
            setPages(freshPages);
            pushHistory(freshPages, layoutConfig, `Imported Order #${data.order.token}`);
          }
        }
      } catch (err) {
        console.error("Error loading order images into studio:", err);
      }
    };

    loadOrderFiles();
  }, [initialOrderId]);

  // --- Photo Import Handling ---
  const handleAddPhotos = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const newPhotos: SourcePhoto[] = [];
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          newPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            dataUrl,
            originalWidth: img.naturalWidth || 1200,
            originalHeight: img.naturalHeight || 800,
            aspectRatio: (img.naturalWidth || 1200) / (img.naturalHeight || 800),
            baseRotation: 0,
            fileSize: file.size,
            fileType: file.type,
          });

          loadedCount++;
          if (loadedCount === files.length) {
            setSourcePhotos((prev) => {
              const combined = [...prev, ...newPhotos];
              const freshPages = generateAutoLayoutPages(combined, layoutConfig);
              setPages(freshPages);
              pushHistory(freshPages, layoutConfig, 'Add Photos');
              return combined;
            });
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (id: string) => {
    const updatedSources = sourcePhotos.filter((p) => p.id !== id);
    setSourcePhotos(updatedSources);
    const updatedPages = pages.map((p) => ({
      ...p,
      photos: p.photos.filter((ph) => ph.photoId !== id),
    }));
    setPages(updatedPages);
    pushHistory(updatedPages, layoutConfig, 'Remove Photo');
  };

  const handleBatchRemovePhotos = (ids: string[]) => {
    const updatedSources = sourcePhotos.filter((p) => !ids.includes(p.id));
    setSourcePhotos(updatedSources);
    const updatedPages = pages.map((p) => ({
      ...p,
      photos: p.photos.filter((ph) => !ids.includes(ph.photoId)),
    }));
    setPages(updatedPages);
    pushHistory(updatedPages, layoutConfig, 'Batch Remove Photos');
  };

  const handleRotateBasePhoto = (id: string) => {
    setSourcePhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              baseRotation: ((p.baseRotation || 0) + 90) % 360,
              aspectRatio: 1 / (p.aspectRatio || 1),
            }
          : p
      )
    );
  };

  const handlePlacePhotoOnPage = (photo: SourcePhoto) => {
    const currentPage = pages[activePageIndex];
    if (!currentPage) return;

    const newPlaced: PlacedPhoto = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      photoId: photo.id,
      x: 20,
      y: 20,
      width: 50,
      height: 70,
      rotation: 0,
      fitMode: layoutConfig.fitMode,
      lockAspectRatio: false,
      zIndex: currentPage.photos.length + 1,
      showCutBorder: layoutConfig.cutGuides,
      adjustments: {
        brightness: 0,
        contrast: 0,
        grayscale: false,
      },
    };

    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, photos: [...p.photos, newPlaced] } : p
    );

    setPages(updatedPages);
    setSelectedPhotoIds([newPlaced.id]);
    pushHistory(updatedPages, layoutConfig, 'Place Photo on Page');
  };

  // --- Layout Actions ---
  const handleAutoArrange = () => {
    const freshPages = generateAutoLayoutPages(sourcePhotos, layoutConfig);
    setPages(freshPages);
    setActivePageIndex(0);
    setSelectedPhotoIds([]);
    pushHistory(freshPages, layoutConfig, 'Auto Arrange');
  };

  const handleResetPageLayout = () => {
    const currentPage = pages[activePageIndex];
    if (!currentPage || currentPage.photos.length === 0) return;

    const pageSources: SourcePhoto[] = [];
    currentPage.photos.forEach((p) => {
      const src = sourcePhotos.find((s) => s.id === p.photoId);
      if (src) pageSources.push(src);
    });

    const singlePageArrangement = generateAutoLayoutPages(pageSources, layoutConfig)[0];
    if (singlePageArrangement) {
      const updatedPages = pages.map((p, idx) =>
        idx === activePageIndex
          ? { ...p, photos: singlePageArrangement.photos }
          : p
      );
      setPages(updatedPages);
      pushHistory(updatedPages, layoutConfig, 'Reset Page Layout');
    }
  };

  const handleUpdateLayoutConfig = (newConfig: PageLayoutConfig, reArrangeNow = false) => {
    setLayoutConfig(newConfig);
    if (reArrangeNow) {
      const freshPages = generateAutoLayoutPages(sourcePhotos, newConfig);
      setPages(freshPages);
      pushHistory(freshPages, newConfig, 'Update Layout Settings');
    }
  };

  const handleToggleOrientation = () => {
    const newOrientation: PageOrientation =
      layoutConfig.orientation === 'portrait' ? 'landscape' : 'portrait';
    const newConfig = { ...layoutConfig, orientation: newOrientation };
    setLayoutConfig(newConfig);
    const freshPages = generateAutoLayoutPages(sourcePhotos, newConfig);
    setPages(freshPages);
    pushHistory(freshPages, newConfig, 'Toggle Orientation');
  };

  // --- Canvas Placed Photos Updates ---
  const handleUpdatePlacedPhotos = (updatedPhotos: PlacedPhoto[]) => {
    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, photos: updatedPhotos } : p
    );
    setPages(updatedPages);
  };

  const handleDuplicatePhoto = (placed: PlacedPhoto) => {
    const duplicate: PlacedPhoto = {
      ...placed,
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: Math.min(180, placed.x + 5),
      y: Math.min(260, placed.y + 5),
      zIndex: (pages[activePageIndex]?.photos.length || 0) + 1,
    };

    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, photos: [...p.photos, duplicate] } : p
    );
    setPages(updatedPages);
    setSelectedPhotoIds([duplicate.id]);
    pushHistory(updatedPages, layoutConfig, 'Duplicate Photo');
  };

  const handleDeletePlacedPhoto = (id: string) => {
    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex
        ? { ...p, photos: p.photos.filter((ph) => ph.id !== id) }
        : p
    );
    setPages(updatedPages);
    setSelectedPhotoIds((prev) => prev.filter((item) => item !== id));
    pushHistory(updatedPages, layoutConfig, 'Delete Placed Photo');
  };

  const handleMovePhotoToPage = (placedId: string, targetPageIndex: number) => {
    if (targetPageIndex === activePageIndex || !pages[targetPageIndex]) return;

    const photoToMove = pages[activePageIndex]?.photos.find((p) => p.id === placedId);
    if (!photoToMove) return;

    const updatedPages = pages.map((p, idx) => {
      if (idx === activePageIndex) {
        return { ...p, photos: p.photos.filter((ph) => ph.id !== placedId) };
      }
      if (idx === targetPageIndex) {
        return { ...p, photos: [...p.photos, photoToMove] };
      }
      return p;
    });

    setPages(updatedPages);
    setActivePageIndex(targetPageIndex);
    setSelectedPhotoIds([photoToMove.id]);
    pushHistory(updatedPages, layoutConfig, `Move Photo to Page ${targetPageIndex + 1}`);
  };

  // --- Crop Handling ---
  const handleOpenCropModal = (photo: SourcePhoto, placed: PlacedPhoto) => {
    setCropTarget({ photo, placed });
  };

  const handleSaveCrop = (crop: CropData | undefined) => {
    if (!cropTarget) return;
    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex
        ? {
            ...p,
            photos: p.photos.map((ph) => {
              if (ph.id !== cropTarget.placed.id) return ph;
              if (!crop) {
                return { ...ph, crop: undefined };
              }
              const origW = cropTarget.photo.originalWidth || 1000;
              const origH = cropTarget.photo.originalHeight || 1000;
              const cropW = origW * (crop.width / 100);
              const cropH = origH * (crop.height / 100);
              const cropAspect = cropW / cropH;
              const newH = Math.round((ph.width / cropAspect) * 10) / 10;
              return {
                ...ph,
                crop,
                height: newH > 0 ? newH : ph.height,
              };
            }),
          }
        : p
    );
    setPages(updatedPages);
    pushHistory(updatedPages, layoutConfig, 'Crop Photo');
    setCropTarget(null);
  };

  // --- Passport Generator ---
  const handleOpenPassportModal = (photoId?: string) => {
    setPassportTargetPhotoId(photoId || sourcePhotos[0]?.id);
    setIsPassportModalOpen(true);
  };

  const handleGeneratePassportSheet = (
    generatedPhotos: PlacedPhoto[],
    createNewPage: boolean
  ) => {
    let updatedPages = [...pages];

    if (createNewPage || updatedPages.length === 0) {
      const newPage: Page = {
        id: `page-${Date.now()}-${updatedPages.length + 1}`,
        name: `Page ${updatedPages.length + 1} (Passport Sheet)`,
        photos: generatedPhotos,
      };
      updatedPages.push(newPage);
      setActivePageIndex(updatedPages.length - 1);
    } else {
      updatedPages = updatedPages.map((p, idx) =>
        idx === activePageIndex ? { ...p, photos: generatedPhotos } : p
      );
    }

    setPages(updatedPages);
    setSelectedPhotoIds([]);
    setIsPassportModalOpen(false);
    pushHistory(updatedPages, layoutConfig, 'Generate Passport Sheet');
  };

  // --- Auto-Fit Multi-Copy Generator ---
  const handleOpenMultiCopyModal = (photoId?: string) => {
    const activePhotoId =
      photoId ||
      (selectedPhotoIds.length > 0
        ? pages[activePageIndex]?.photos.find((p) => selectedPhotoIds.includes(p.id))?.photoId
        : undefined);
    setMultiCopyTargetPhotoId(activePhotoId || sourcePhotos[0]?.id);
    setIsMultiCopyModalOpen(true);
  };

  const handleGenerateMultiCopySheet = (
    generatedPhotos: PlacedPhoto[],
    createNewPage: boolean
  ) => {
    let updatedPages = [...pages];

    if (createNewPage || updatedPages.length === 0) {
      const newPage: Page = {
        id: `page-${Date.now()}-${updatedPages.length + 1}`,
        name: `Page ${updatedPages.length + 1} (Auto-Fit Copies)`,
        photos: generatedPhotos,
      };
      updatedPages.push(newPage);
      setActivePageIndex(updatedPages.length - 1);
    } else {
      updatedPages = updatedPages.map((p, idx) =>
        idx === activePageIndex ? { ...p, photos: generatedPhotos } : p
      );
    }

    setPages(updatedPages);
    setSelectedPhotoIds([]);
    setIsMultiCopyModalOpen(false);
    pushHistory(updatedPages, layoutConfig, 'Auto-Fit Multi-Copy Layout');
  };

  // --- Page Management ---
  const handleAddBlankPage = () => {
    const newPage: Page = {
      id: `page-${Date.now()}-${pages.length + 1}`,
      name: `Page ${pages.length + 1}`,
      photos: [],
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setActivePageIndex(updated.length - 1);
    setSelectedPhotoIds([]);
    pushHistory(updated, layoutConfig, 'Add Blank Page');
  };

  const handleDuplicatePage = (index: number) => {
    const pageToDup = pages[index];
    if (!pageToDup) return;

    const dupPhotos = pageToDup.photos.map((p, idx) => ({
      ...p,
      id: `placed-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    }));

    const dupPage: Page = {
      id: `page-${Date.now()}-${pages.length + 1}`,
      name: `${pageToDup.name} (Copy)`,
      photos: dupPhotos,
    };

    const updated = [...pages.slice(0, index + 1), dupPage, ...pages.slice(index + 1)];
    setPages(updated);
    setActivePageIndex(index + 1);
    pushHistory(updated, layoutConfig, 'Duplicate Page');
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const updated = pages.filter((_, idx) => idx !== index);
    setPages(updated);
    setActivePageIndex(Math.max(0, index - 1));
    setSelectedPhotoIds([]);
    pushHistory(updated, layoutConfig, 'Delete Page');
  };

  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    const updated = [...pages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    setPages(updated);
    setActivePageIndex(targetIdx);
    pushHistory(updated, layoutConfig, 'Reorder Page');
  };

  // --- Project Save & Load ---
  const handleSaveProject = () => {
    const projectData: ProjectState = {
      projectName,
      sourcePhotos,
      pages,
      activePageIndex,
      selectedPhotoIds,
      globalLayoutConfig: layoutConfig,
      globalGrayscale,
      displayUnit,
      zoom,
      snapToGrid,
      gridSizeMm,
      showMargins,
      showRulers,
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loaded: ProjectState = JSON.parse(e.target?.result as string);
        if (loaded.sourcePhotos && loaded.pages) {
          setProjectName(loaded.projectName || 'PrintShop_Photo_Layout');
          setSourcePhotos(loaded.sourcePhotos);
          setPages(loaded.pages);
          setLayoutConfig(loaded.globalLayoutConfig || DEFAULT_LAYOUT_CONFIG);
          setActivePageIndex(Math.min(loaded.activePageIndex || 0, loaded.pages.length - 1));
          setGlobalGrayscale(loaded.globalGrayscale ?? false);
          setDisplayUnit(loaded.displayUnit || 'mm');
          setHistory([
            {
              pages: loaded.pages,
              activePageIndex: 0,
              globalLayoutConfig: loaded.globalLayoutConfig || DEFAULT_LAYOUT_CONFIG,
              selectedPhotoIds: [],
              description: 'Loaded Project',
            },
          ]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error('Failed to parse project file:', err);
      }
    };
    reader.readAsText(file);
  };

  // --- Export Handlers ---
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      setPdfExportProgress(10);

      await exportProjectToPDF(
        pages,
        sourcePhotos,
        layoutConfig.orientation,
        globalGrayscale,
        `${projectName}.pdf`,
        (prog) => setPdfExportProgress(prog)
      );

      setPdfExportProgress(100);
      setTimeout(() => {
        setIsExportingPdf(false);
        setPdfExportProgress(0);
      }, 800);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setIsExportingPdf(false);
    }
  };

  const handleExportImages = async (format: 'png' | 'jpeg') => {
    for (let i = 0; i < pages.length; i++) {
      await downloadPageAsImage(
        pages[i],
        sourcePhotos,
        layoutConfig.orientation,
        format,
        i + 1,
        globalGrayscale,
        projectName
      );
    }
  };

  const handleDirectPrint = async () => {
    try {
      setIsPrinting(true);
      await printProjectDirectly(
        pages,
        sourcePhotos,
        layoutConfig.orientation,
        globalGrayscale
      );
    } catch (err) {
      console.error('Direct Print Error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // All placed photos across all pages (for pool count badge)
  const allPlacedPhotos = pages.flatMap((p) => p.photos);
  const currentPage = pages[activePageIndex] || pages[0] || { id: 'p1', name: 'Page 1', photos: [] };

  const handleApplyToolbarPhotoSize = (widthMm: number, heightMm: number, name: string) => {
    const activePage = pages[activePageIndex];
    if (!activePage || activePage.photos.length === 0) return;

    const targetIds =
      selectedPhotoIds.length > 0
        ? selectedPhotoIds
        : activePage.photos.map((p) => p.id);

    const updatedPages = pages.map((p, idx) =>
      idx === activePageIndex
        ? {
            ...p,
            photos: p.photos.map((ph) => {
              if (!targetIds.includes(ph.id)) return ph;
              return {
                ...ph,
                width: widthMm,
                height: heightMm,
              };
            }),
          }
        : p
    );

    setPages(updatedPages);
    pushHistory(updatedPages, layoutConfig, `Set Photo Size to ${name}`);
  };

  return (
    <div id="studio-workstation-app" className="h-[calc(100vh-3.5rem)] lg:h-screen w-full flex flex-col bg-neutral-950 overflow-hidden text-neutral-100">
      {/* Top Toolbar */}
      <TopToolbar
        shopName={shopName}
        project={{
          projectName,
          sourcePhotos,
          pages,
          activePageIndex,
          selectedPhotoIds,
          globalLayoutConfig: layoutConfig,
          globalGrayscale,
          displayUnit,
          zoom,
          snapToGrid,
          gridSizeMm,
          showMargins,
          showRulers,
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddPhotos={handleAddPhotos}
        onAutoArrange={handleAutoArrange}
        onResetPageLayout={handleResetPageLayout}
        onOpenPassportModal={() => handleOpenPassportModal()}
        onOpenMultiCopyModal={() => handleOpenMultiCopyModal()}
        onApplyPhotoSize={handleApplyToolbarPhotoSize}
        onToggleOrientation={handleToggleOrientation}
        onToggleGrayscale={() => setGlobalGrayscale((prev) => !prev)}
        onToggleCutGuides={() =>
          handleUpdateLayoutConfig({
            ...layoutConfig,
            cutGuides: !layoutConfig.cutGuides,
          })
        }
        onToggleSnap={() => setSnapToGrid((prev) => !prev)}
        onToggleShowMargins={() => setShowMargins((prev) => !prev)}
        onSetZoom={(z) => setZoom(Math.max(0.2, Math.min(3.0, z)))}
        onFitZoomToScreen={() => setZoom(0.8)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExportPDF={handleExportPDF}
        onExportImages={handleExportImages}
        onPrint={handleDirectPrint}
        isPrinting={isPrinting}
        isExportingPdf={isExportingPdf}
        pdfExportProgress={pdfExportProgress}
      />

      {/* Center 3-Column Layout: Left Photos Pool | Center A4 Canvas | Right Properties */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Photos Sidebar */}
        <PhotosSidebar
          sourcePhotos={sourcePhotos}
          placedPhotosOnCurrentPage={currentPage.photos}
          allPlacedPhotos={allPlacedPhotos}
          onAddPhotos={handleAddPhotos}
          onRemovePhoto={handleRemovePhoto}
          onBatchRemovePhotos={handleBatchRemovePhotos}
          onRotateBasePhoto={handleRotateBasePhoto}
          onPlacePhotoOnPage={handlePlacePhotoOnPage}
          onPreviewPhoto={(p) => setPreviewPhoto(p)}
          onReorderPhoto={(idx, dir) => {
            const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= sourcePhotos.length) return;
            const updated = [...sourcePhotos];
            const [moved] = updated.splice(idx, 1);
            updated.splice(targetIdx, 0, moved);
            setSourcePhotos(updated);
          }}
          onOpenPassportForPhoto={(pId) => handleOpenPassportModal(pId)}
          onOpenMultiCopyForPhoto={(pId) => handleOpenMultiCopyModal(pId)}
          onClearAll={() => {
            setSourcePhotos([]);
            setPages([{ id: 'page-empty', name: 'Page 1', photos: [] }]);
            setSelectedPhotoIds([]);
            pushHistory(
              [{ id: 'page-empty', name: 'Page 1', photos: [] }],
              layoutConfig,
              'Clear All'
            );
          }}
        />

        {/* Center: Interactive A4 Canvas Area */}
        <CanvasArea
          page={currentPage}
          sourcePhotos={sourcePhotos}
          layoutConfig={layoutConfig}
          globalGrayscale={globalGrayscale}
          zoom={zoom}
          snapToGrid={snapToGrid}
          gridSizeMm={gridSizeMm}
          showMargins={showMargins}
          selectedPhotoIds={selectedPhotoIds}
          onSelectPhotos={(ids) => setSelectedPhotoIds(ids)}
          onUpdatePlacedPhotos={handleUpdatePlacedPhotos}
          onOpenCropModal={handleOpenCropModal}
          onDuplicatePhoto={handleDuplicatePhoto}
          onDeletePlacedPhoto={handleDeletePlacedPhoto}
          onPlacePhotoOnPage={handlePlacePhotoOnPage}
          onAddPhotos={handleAddPhotos}
        />

        {/* Right: Properties & Layout Controls */}
        <PropertiesPanel
          page={currentPage}
          allPages={pages}
          sourcePhotos={sourcePhotos}
          selectedPhotoIds={selectedPhotoIds}
          onSelectPhotos={(ids) => setSelectedPhotoIds(ids)}
          layoutConfig={layoutConfig}
          displayUnit={displayUnit}
          globalGrayscale={globalGrayscale}
          onUpdateLayoutConfig={handleUpdateLayoutConfig}
          onSetDisplayUnit={(u) => setDisplayUnit(u)}
          onUpdatePlacedPhotos={handleUpdatePlacedPhotos}
          onOpenCropModal={handleOpenCropModal}
          onDuplicatePhoto={handleDuplicatePhoto}
          onDeletePlacedPhoto={handleDeletePlacedPhoto}
          onMovePhotoToPage={handleMovePhotoToPage}
          onAutoArrange={handleAutoArrange}
          onOpenMultiCopyModal={(pId) => handleOpenMultiCopyModal(pId)}
        />
      </div>

      {/* Bottom Page Navigation */}
      <PageNavigation
        pages={pages}
        activePageIndex={activePageIndex}
        orientation={layoutConfig.orientation}
        sourcePhotos={sourcePhotos}
        onSelectPage={(idx) => {
          setActivePageIndex(idx);
          setSelectedPhotoIds([]);
        }}
        onAddBlankPage={handleAddBlankPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onMovePage={handleMovePage}
      />

      {/* --- MODALS --- */}

      {/* Photo Crop Modal */}
      {cropTarget && (
        <CropModal
          photo={cropTarget.photo}
          initialCrop={cropTarget.placed.crop}
          onSave={handleSaveCrop}
          onClose={() => setCropTarget(null)}
        />
      )}

      {/* Passport & ID Multi-Copy Modal */}
      {isPassportModalOpen && (
        <PassportModal
          sourcePhotos={sourcePhotos}
          selectedSourcePhotoId={passportTargetPhotoId}
          onGenerate={handleGeneratePassportSheet}
          onClose={() => setIsPassportModalOpen(false)}
        />
      )}

      {/* Auto-Fit Multi-Copy Generator Modal */}
      {isMultiCopyModalOpen && (
        <MultiCopyModal
          sourcePhotos={sourcePhotos}
          selectedSourcePhotoId={multiCopyTargetPhotoId}
          currentOrientation={layoutConfig.orientation}
          onGenerate={handleGenerateMultiCopySheet}
          onClose={() => setIsMultiCopyModalOpen(false)}
        />
      )}

      {/* Single Photo High-Res Preview */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </div>
  );
}
