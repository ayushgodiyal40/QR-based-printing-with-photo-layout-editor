"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  Printer,
  AlertTriangle,
  MessageSquare,
  Send,
  ArrowUp,
  Clock,
  Sparkles,
  CreditCard,
  Check,
} from "lucide-react";
import Link from "next/link";
import { printImage, printPdf } from "@/lib/printUtils";
import PdfViewer from "@/components/PdfViewer";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/client-cache";

// Global in-memory cache for downloaded/prefetched file blobs so Print/Download/Preview execute in 0ms
const fileBlobCache = new Map<string, { blob: Blob; url: string }>();

const STATUS_OPTIONS = [
  { value: "received", label: "Received" },
  { value: "waiting", label: "Waiting" },
  { value: "processing", label: "Processing" },
  { value: "printing", label: "Printing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  received: "badge-received",
  waiting: "badge-waiting",
  processing: "badge-processing",
  printing: "badge-printing",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const orderId = Array.isArray(id) ? id[0] : (id as string);
  const cacheKey = `admin_order_${orderId}`;

  // Instant Stale-While-Revalidate loading: check if full order is cached
  const initialCache = typeof window !== "undefined" ? getCachedData<any>(cacheKey) : null;

  // Fallback to order summaries from dashboard or orders queue if full detail is not yet in cache
  const fallbackSummary =
    !initialCache && typeof window !== "undefined"
      ? (() => {
          const dashOrders = getCachedData<any[]>("admin_dashboard_orders");
          const foundDash = dashOrders?.find((o) => o.id === orderId);
          if (foundDash) return foundDash;
          const allOrders = getCachedData<any[]>("admin_orders_all_oldest");
          return allOrders?.find((o) => o.id === orderId) || null;
        })()
      : null;

  const [order, setOrder] = useState<any>(initialCache?.order || fallbackSummary || null);
  const [files, setFiles] = useState<any[]>(initialCache?.files || []);
  const [notes, setNotes] = useState<any[]>(initialCache?.notes || []);
  const [loading, setLoading] = useState(!initialCache && !fallbackSummary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewingFileId, setPreviewingFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [printingFileId, setPrintingFileId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  // Editable settings
  const [editStatus, setEditStatus] = useState(initialCache?.order?.status || fallbackSummary?.status || "");
  const [editColor, setEditColor] = useState(initialCache?.order?.colorMode || fallbackSummary?.colorMode || "");
  const [editPaper, setEditPaper] = useState(initialCache?.order?.paperSize || fallbackSummary?.paperSize || "");
  const [editCopies, setEditCopies] = useState(initialCache?.order?.copies || fallbackSummary?.copies || 1);
  const [editSides, setEditSides] = useState(initialCache?.order?.sides || fallbackSummary?.sides || "");
  const [editPriority, setEditPriority] = useState(initialCache?.order?.priority || fallbackSummary?.priority || "");

  const fetchOrder = async (isBackground = false, retries = 3): Promise<void> => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) {
        if (retries > 0 && res.status === 404) {
          // Retry after 300ms for newly created orders still committing
          await new Promise((r) => setTimeout(r, 300));
          return fetchOrder(isBackground, retries - 1);
        }
        if (!isBackground && !order) {
          setError("Order not found.");
          setLoading(false);
        }
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      setFiles(data.files || []);
      setNotes(data.notes || []);
      setCachedData(cacheKey, data);

      if (!isBackground) {
        setEditStatus(data.order.status);
        setEditColor(data.order.colorMode);
        setEditPaper(data.order.paperSize);
        setEditCopies(data.order.copies);
        setEditSides(data.order.sides);
        setEditPriority(data.order.priority);
        setLoading(false);
      }
    } catch {
      if (!isBackground && !order) {
        setError("Failed to load order.");
        setLoading(false);
      }
    }
  };

  // Pre-warm file blobs in the background so Print, Preview, and Download trigger instantaneously
  useEffect(() => {
    if (!files || files.length === 0) return;
    files.forEach((file) => {
      if (file.id && file.url && !fileBlobCache.has(file.id)) {
        fetch(file.url)
          .then((r) => (r.ok ? r.blob() : null))
          .then((blob) => {
            if (blob) {
              fileBlobCache.set(file.id, {
                blob,
                url: URL.createObjectURL(blob),
              });
            }
          })
          .catch(() => {});
      }
    });
  }, [files]);

  useEffect(() => {
    fetchOrder();

    // Low-frequency fallback poll (only when tab is active)
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchOrder(true);
    }, 20000);

    // Real-time live SSE listener
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/sse/admin");
      es.addEventListener("order_updated", (e) => {
        try {
          const update = JSON.parse(e.data);
          if (update.orderId === id) {
            fetchOrder(true);
          }
        } catch {}
      });
    } catch {}

    return () => {
      clearInterval(pollInterval);
      if (es) es.close();
    };
  }, [id]);

  const saveChanges = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        colorMode: editColor,
        paperSize: editPaper,
        copies: editCopies,
        sides: editSides,
        priority: editPriority,
        ...(note ? { note } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
      setNote("");
      fetchOrder();
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNote("");
    fetchOrder();
    setAddingNote(false);
  };

  const openPreview = async (file: any) => {
    // 1. Instant 0ms preview if URL is already attached
    if (file.url) {
      setPreviewUrl(file.url);
      setPreviewFile(file);
      return;
    }
    // 2. Instant preview if blob is pre-warmed in memory
    const cached = fileBlobCache.get(file.id);
    if (cached) {
      setPreviewUrl(cached.url);
      setPreviewFile(file);
      return;
    }

    setPreviewingFileId(file.id);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/files/${file.id}?action=url`);
      if (res.ok) {
        const { url } = await res.json();
        setPreviewUrl(url);
        setPreviewFile(file);
      }
    } finally {
      setPreviewingFileId(null);
    }
  };

  const downloadFile = (file: any) => {
    setDownloadingFileId(file.id);

    // If already pre-warmed in memory, trigger immediate 0ms download
    const cached = fileBlobCache.get(file.id);
    if (cached) {
      const a = document.createElement("a");
      a.href = cached.url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => setDownloadingFileId(null), 300);
      return;
    }

    // Direct browser native streaming download without buffering entire file in JS memory
    const a = document.createElement("a");
    a.href = `/api/admin/orders/${orderId}/files/${file.id}?action=download`;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setDownloadingFileId(null), 600);
  };

  const printFile = async (file: any) => {
    try {
      setPrintingFileId(file.id);
      const isPdf =
        file.mimeType === "application/pdf" ||
        file.originalName.toLowerCase().endsWith(".pdf");

      // 1. If in-memory pre-warmed blob exists, print immediately (0ms network delay)
      const cached = fileBlobCache.get(file.id);
      if (cached) {
        if (isPdf) {
          await printPdf(cached.blob);
        } else {
          await printImage(cached.url, {
            paperSize: editPaper || order?.paperSize || "A4",
            colorMode: editColor || order?.colorMode || "bw",
            copies: editCopies || order?.copies || 1,
          });
        }
        setPrintingFileId(null);
        return;
      }

      // 2. If direct URL exists, print directly without waiting for duplicate download
      if (file.url) {
        if (isPdf) {
          await printPdf(file.url);
        } else {
          await printImage(file.url, {
            paperSize: editPaper || order?.paperSize || "A4",
            colorMode: editColor || order?.colorMode || "bw",
            copies: editCopies || order?.copies || 1,
          });
        }
        setPrintingFileId(null);
        return;
      }

      // 3. Fallback: fetch blob
      const res = await fetch(`/api/admin/orders/${orderId}/files/${file.id}?action=download`);
      if (!res.ok) throw new Error("Failed to load file for printing");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      fileBlobCache.set(file.id, { blob, url: blobUrl });

      if (isPdf) {
        await printPdf(blob);
      } else {
        await printImage(blobUrl, {
          paperSize: editPaper || order?.paperSize || "A4",
          colorMode: editColor || order?.colorMode || "bw",
          copies: editCopies || order?.copies || 1,
        });
      }
      setPrintingFileId(null);
    } catch (err) {
      console.error("Print execution error:", err);
      alert("Failed to initiate direct print. Try Preview instead.");
      setPrintingFileId(null);
    }
  };

  const deleteSingleFile = async (file: any) => {
    if (!confirm(`Delete unwanted file "${file.originalName}" from this order?`)) return;
    setDeletingFileId(file.id);

    // OPTIMISTIC REMOVAL: Remove file immediately so UI does not wait (0ms)
    const prevFiles = files;
    const remaining = files.filter((f) => f.id !== file.id);
    setFiles(remaining);

    // Optimistically update order counts
    const prevOrder = order;
    const updatedOrder = prevOrder
      ? {
          ...prevOrder,
          totalFiles: Math.max(0, (prevOrder.totalFiles || 1) - 1),
          totalPages: Math.max(0, (prevOrder.totalPages || 1) - (file.pageCount || 1)),
        }
      : prevOrder;
    setOrder(updatedOrder);

    // Update client cache immediately
    setCachedData(cacheKey, { order: updatedOrder, files: remaining, notes });

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/files/${file.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Rollback on failure
        setFiles(prevFiles);
        setOrder(prevOrder);
        alert("Failed to delete file. Please try again.");
      }
    } catch {
      setFiles(prevFiles);
      setOrder(prevOrder);
      alert("Failed to delete file.");
    } finally {
      setDeletingFileId(null);
    }
  };

  const completeOrder = async () => {
    if (completingOrder || deletingOrder) return;
    setCompletingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}?completed=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        invalidateCache();
        setCompletedSuccess(true);
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 850);
      } else {
        alert("Failed to complete order. Please try again.");
        setCompletingOrder(false);
      }
    } catch (err) {
      console.error("Complete order error:", err);
      alert("An error occurred while completing the order.");
      setCompletingOrder(false);
    }
  };

  const deleteEntireOrder = async () => {
    if (!confirm(`Are you sure you want to delete this client order (#${order.token}) permanently?`)) return;
    setDeletingOrder(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      invalidateCache();
      router.push("/admin/orders");
    } else {
      setDeletingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error || "Order not found"}</p>
        <Link href="/admin/orders" className="text-indigo-600 hover:underline mt-2 block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Back + Header + Delete Order Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link href="/admin/orders" className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white shadow-sm mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">{order.orderNumber}</h1>
              <span className={`badge ${STATUS_COLORS[order.status] || ""}`}>{order.status}</span>
              {order.priority === "high" && (
                <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  <ArrowUp className="w-3 h-3" /> Priority
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Token <strong className="text-indigo-700 dark:text-indigo-400">{order.token}</strong> ·{" "}
              {new Date(order.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={completeOrder}
            disabled={completingOrder || deletingOrder}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 shadow-md cursor-pointer ${
              completedSuccess
                ? "bg-emerald-500 text-white scale-105 shadow-emerald-500/40 ring-4 ring-emerald-400/40"
                : completingOrder
                ? "bg-emerald-700 text-white opacity-90 cursor-wait"
                : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white hover:shadow-lg"
            }`}
            title="Mark order completed and remove from live queue"
          >
            {completedSuccess ? (
              <>
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white text-emerald-600 shadow-sm animate-pulse">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span className="font-black tracking-wide">Order Completed!</span>
              </>
            ) : completingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Completing…</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Mark Completed</span>
              </>
            )}
          </button>

          <button
            onClick={deleteEntireOrder}
            disabled={deletingOrder || completingOrder}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {deletingOrder ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete Order
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Files */}
        <div className="lg:col-span-2 space-y-4">
          {/* Files */}
          <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 dark:text-white">
                Files ({files.length})
              </h2>
              {files.some((f) => f.mimeType?.startsWith("image/") || /\.(jpe?g|png|webp|bmp|tiff)$/i.test(f.originalName)) && (
                <Link
                  href={`/admin/studio?orderId=${id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors"
                  title="Open order images in Photo Layout Studio"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Open in Photo Studio
                </Link>
              )}
            </div>
            {files.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">Receiving files from customer phone...</p>
                <p className="text-xs text-gray-400 dark:text-neutral-500">Live syncing automatically, no need to refresh</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => {
                  const isImage = file.mimeType?.startsWith("image/") || /\.(jpe?g|png|webp|bmp|tiff)$/i.test(file.originalName);
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-900/60 rounded-xl border border-gray-100 dark:border-neutral-900">
                      <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 flex items-center justify-center flex-shrink-0">
                        {file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf") ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-neutral-200 truncate">{file.originalName}</p>
                        <p className="text-xs text-gray-400 dark:text-neutral-400">
                          {formatBytes(file.sizeBytes)}
                          {file.pageCount && ` · ${file.pageCount} page${file.pageCount !== 1 ? "s" : ""}`}
                          {file.imageWidth && ` · ${file.imageWidth}×${file.imageHeight}px`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isImage && (
                          <Link
                            href={`/admin/studio?orderId=${id}`}
                            className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                            title="Edit & Arrange in Photo Studio"
                          >
                            <Sparkles className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => printFile(file)}
                          disabled={printingFileId === file.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          title="Print Directly (No download required)"
                        >
                          {printingFileId === file.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() => openPreview(file)}
                          disabled={previewingFileId === file.id}
                          className="p-2 rounded-lg text-gray-400 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
                          title="Preview File"
                        >
                          {previewingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          disabled={downloadingFileId === file.id}
                          className="p-2 rounded-lg text-gray-400 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
                          title="Download File"
                        >
                          {downloadingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteSingleFile(file)}
                          disabled={deletingFileId === file.id}
                          className="p-2 rounded-lg text-gray-400 dark:text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Delete Unwanted File"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Internal Notes
            </h2>
            {notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {notes.map((n) => (
                  <div key={n.id} className="bg-yellow-50 dark:bg-neutral-900 border border-yellow-100 dark:border-neutral-800 rounded-xl p-3">
                    <p className="text-sm text-gray-700 dark:text-amber-200">{n.note}</p>
                    <p className="text-xs text-gray-400 dark:text-neutral-400 mt-1">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <button
                onClick={addNote}
                disabled={addingNote || !note.trim()}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 dark:text-white mb-3">Customer</h2>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{order.customerName || "Walk-in"}</p>
            {order.customerPhone && (
              <p className="text-sm text-gray-500 dark:text-neutral-400">{order.customerPhone}</p>
            )}
          </div>

          {/* Payment Status Card - Displays Only Total Amount to be Paid (Highlighted in Green) */}
          <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Payment Status
            </h2>

            <div className="bg-emerald-500/10 dark:bg-emerald-950/40 rounded-xl p-4 border border-emerald-500/30 dark:border-emerald-600/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">
                  Total Amount to be Paid
                </span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block tracking-tight">
                  ₹{order.estimatedPrice || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Order settings editor */}
          <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-white">Print Settings</h2>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {["normal", "high"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPriority(p)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                      editPriority === p
                        ? p === "high" ? "bg-red-600 text-white" : "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Color</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:"bw",l:"B&W"},{v:"color",l:"Color"}].map((c) => (
                  <button
                    key={c.v}
                    onClick={() => setEditColor(c.v)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      editColor === c.v ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300"
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Paper</label>
              <div className="grid grid-cols-4 gap-1.5">
                {["A4","A3","Letter","Legal"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPaper(p)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      editPaper === p ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Copies</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditCopies(Math.max(1, editCopies - 1))}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
                >−</button>
                <span className="text-xl font-bold w-8 text-center text-gray-900 dark:text-white">{editCopies}</span>
                <button
                  onClick={() => setEditCopies(editCopies + 1)}
                  className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold cursor-pointer"
                >+</button>
              </div>
            </div>

            {/* Sides */}
            <div>
              <label className="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wide block mb-1.5">Sides</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:"single",l:"Single"},{v:"double",l:"Double"}].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setEditSides(s.v)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      editSides === s.v ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300"
                    }`}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-50 dark:bg-neutral-900/60 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-neutral-400">Total pages</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.totalPages}</span>
              </div>
              {order.estimatedPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-neutral-400">Estimated price</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">₹{order.estimatedPrice}</span>
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={saveChanges}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>

            {/* Complete Order Primary Action */}
            <button
              onClick={completeOrder}
              disabled={completingOrder || deletingOrder}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all duration-300 cursor-pointer ${
                completedSuccess
                  ? "bg-emerald-500 text-white scale-[1.02] shadow-emerald-500/40 ring-4 ring-emerald-400/40"
                  : completingOrder
                  ? "bg-emerald-700 text-white opacity-90 cursor-wait"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white hover:shadow-lg"
              }`}
            >
              {completedSuccess ? (
                <>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-emerald-600 shadow-sm animate-pulse">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="font-black text-base">Order Completed!</span>
                </>
              ) : completingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Completing Order…</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Mark Completed</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewUrl && previewFile && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}
        >
          <div
            className="bg-white dark:bg-neutral-950 rounded-3xl p-2 max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-900">
              <p className="font-semibold text-gray-800 dark:text-white truncate pr-2">{previewFile.originalName}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => printFile(previewFile)}
                  disabled={printingFileId === previewFile.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  title="Print file"
                >
                  {printingFileId === previewFile.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  Print
                </button>
                <button
                  onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close preview"
                >✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-gray-950 min-h-[320px] h-[72vh] rounded-b-2xl">
              {previewFile.mimeType === "application/pdf" || previewFile.originalName.toLowerCase().endsWith(".pdf") ? (
                <PdfViewer
                  url={previewUrl}
                  fileName={previewFile.originalName}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt={previewFile.originalName}
                    className="max-w-full max-h-[70vh] object-contain mx-auto rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
