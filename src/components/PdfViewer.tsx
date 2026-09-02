"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface PdfViewerProps {
  url?: string;
  file?: File | Blob;
  className?: string;
  fileName?: string;
}

// Singleton loader for pdfjsLib to prevent duplicate script tags
let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot run on server"));
  }

  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pdfjs="true"]') as HTMLScriptElement | null;
    if (existing) {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        resolve(window.pdfjsLib);
        return;
      }
      existing.addEventListener("load", () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("pdfjsLib not defined after script load"));
        }
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load PDF.js")));
      return;
    }

    const script = document.createElement("script");
    script.src = "/pdfjs/pdf.min.js";
    script.setAttribute("data-pdfjs", "true");
    script.async = true;

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("pdfjsLib not defined"));
      }
    };

    script.onerror = () => {
      // CDN Fallback
      console.warn("Local PDF.js failed, trying CDN fallback...");
      const cdnScript = document.createElement("script");
      cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      cdnScript.async = true;
      cdnScript.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("CDN PDF.js failed"));
        }
      };
      cdnScript.onerror = () => reject(new Error("Could not load PDF.js from local or CDN"));
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

export default function PdfViewer({ url, file, className = "", fileName = "document.pdf" }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  // Active rendering task cancellation
  const renderTaskRef = useRef<any>(null);

  // Direct download / open URL
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  // Touch gesture support for mobile swiping
  const touchStartX = useRef<number | null>(null);

  // Setup download/open URL
  useEffect(() => {
    let createdUrl: string | null = null;
    if (file) {
      createdUrl = URL.createObjectURL(file);
      setDownloadUrl(createdUrl);
    } else if (url) {
      setDownloadUrl(url);
    }
    return () => {
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [file, url]);

  // Load PDF document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageNum(1);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJs();
        if (!isMounted) return;

        let data: Uint8Array | undefined;

        if (file) {
          const buffer = await file.arrayBuffer();
          data = new Uint8Array(buffer);
        } else if (url) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);
          const buffer = await res.arrayBuffer();
          data = new Uint8Array(buffer);
        } else {
          throw new Error("No PDF source specified");
        }

        const loadingTask = pdfjs.getDocument({
          data,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error loading PDF:", err);
        setError(err.message || "Failed to load PDF document");
        setLoading(false);
      }
    }

    initPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [file, url]);

  // Render current page onto canvas
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }

      setRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        // Calculate base scale to fit mobile screen width cleanly
        const containerWidth = containerRef.current.clientWidth || 360;
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        // Available horizontal space (leave padding)
        const availableWidth = Math.max(containerWidth - 24, 260);
        const fitScale = availableWidth / unscaledViewport.width;
        const effectiveScale = fitScale * zoomFactor;

        // High-DPI display sharpness (phones have dpr 2x - 3x)
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale: effectiveScale, rotation });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Page render error:", err);
        }
      } finally {
        setRendering(false);
      }
    },
    [pdfDoc, zoomFactor, rotation]
  );

  // Trigger render when page, doc, zoom, or rotation changes
  useEffect(() => {
    if (pdfDoc && pageNum >= 1 && pageNum <= numPages) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum, numPages, zoomFactor, rotation, renderPage]);

  // Re-render on window resize for responsive fitting
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && pageNum >= 1) {
        renderPage(pageNum);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, pageNum, renderPage]);

  // Touch handlers for mobile swipe between pages
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && pageNum < numPages) {
        // Swipe left -> Next page
        setPageNum((prev) => prev + 1);
      } else if (diff < 0 && pageNum > 1) {
        // Swipe right -> Previous page
        setPageNum((prev) => prev - 1);
      }
    }
  };

  return (
    <div className={`flex flex-col w-full h-full bg-slate-900 rounded-xl overflow-hidden select-none ${className}`}>
      {/* Mobile-Friendly PDF Toolbar */}
      <div className="bg-slate-800/95 border-b border-slate-700/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-white text-xs z-10">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pageNum <= 1 || loading}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/60 rounded-lg text-slate-200 font-medium">
            <span className="font-bold text-white">{pageNum}</span>
            <span className="text-slate-400">/</span>
            <span>{numPages || 1}</span>
          </div>

          <button
            type="button"
            disabled={pageNum >= numPages || loading}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={loading || zoomFactor <= 0.6}
            onClick={() => setZoomFactor((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setZoomFactor(1.0)}
            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
            title="Fit to Width"
          >
            {Math.round(zoomFactor * 100)}%
          </button>

          <button
            type="button"
            disabled={loading || zoomFactor >= 2.5}
            onClick={() => setZoomFactor((z) => Math.min(3.0, +(z + 0.2).toFixed(1)))}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Direct Open / Native view fallback */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 text-[11px] transition-colors ml-auto shadow-xs"
            title="Open in phone's native viewer or download"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Native</span>
            <span className="sm:hidden">Open</span>
          </a>
        )}
      </div>

      {/* Canvas Viewport Area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full overflow-auto p-2 sm:p-4 flex items-center justify-center relative min-h-[300px] max-h-[72vh] bg-slate-950/80"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-300">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs font-medium">Loading PDF document...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Preview unavailable</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={fileName}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF to View
              </a>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-sm transition-opacity duration-150 ${
            loading || error ? "hidden" : "block"
          } ${rendering ? "opacity-75" : "opacity-100"}`}
        />

        {rendering && !loading && (
          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-xs text-slate-300 px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1.5 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Rendering...</span>
          </div>
        )}
      </div>

      {/* Footer hint for mobile users */}
      {!loading && !error && numPages > 1 && (
        <div className="bg-slate-900/90 py-1 px-3 text-center border-t border-slate-800 text-[10px] text-slate-400">
          Swipe left or right on mobile to change pages
        </div>
      )}
    </div>
  );
}
