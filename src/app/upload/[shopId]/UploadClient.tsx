"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Plus,
  Send,
  ChevronDown,
  ChevronUp,
  Printer,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Eye,
} from "lucide-react";

interface Shop {
  id: string;
  name: string;
  slug: string;
}

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  fileId?: string;
  pageCount?: number;
  error?: string;
}

type ColorMode = "bw" | "color";
type PaperSize = "A4" | "A3" | "Letter" | "Legal";
type Sides = "single" | "double";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const MAX_FILE_SIZE_MB = 50;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: File) {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <ImageIcon className="w-5 h-5 text-blue-500" />;
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 2400;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      } else {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.88
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export default function UploadClient({ shop }: { shop: Shop }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "submitted">("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);

  // Print settings
  const [colorMode, setColorMode] = useState<ColorMode>("bw");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [copies, setCopies] = useState(1);
  const [sides, setSides] = useState<Sides>("single");
  const [orientation, setOrientation] = useState("auto");
  const [pageRange, setPageRange] = useState("");

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Calculate live client-side preview price
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 1), 0);
  const doneFiles = files.filter((f) => f.status === "done").length;

  const getClientCalculatedPrice = () => {
    let rate = colorMode === "bw" ? 1.0 : 5.0;
    if (paperSize === "A3") rate *= 2;
    if (paperSize === "Legal") rate *= 1.5;
    const sheets = sides === "double" ? Math.ceil(totalPages / 2) : totalPages;
    return (rate * sheets * copies).toFixed(2);
  };

  const currentDisplayPrice = estimatedPrice || getClientCalculatedPrice();

  // Auto-fetch price & order status when on submitted screen
  useEffect(() => {
    if (step === "submitted" && orderId) {
      const fetchStatus = async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.estimatedPrice) {
              setEstimatedPrice(data.estimatedPrice);
            }
          }
        } catch {}
      };

      fetchStatus();
      const interval = setInterval(fetchStatus, 1500);
      return () => clearInterval(interval);
    }
  }, [step, orderId]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
        continue;
      }
      validFiles.push({
        id: crypto.randomUUID(),
        file,
        status: "pending",
        progress: 0,
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (item: UploadedFile, targetOrderId: string): Promise<void> => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 5 } : f))
    );

    try {
      const fileToUpload = await compressImageIfNeeded(item.file);
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: "done", progress: 100, fileId: data.fileId, pageCount: data.pageCount }
                  : f
              )
            );
            if (data.estimatedPrice) {
              setEstimatedPrice(data.estimatedPrice);
            }
            resolve();
          } else {
            let errMsg = "Upload failed.";
            try {
              const err = JSON.parse(xhr.responseText);
              errMsg = err.error || errMsg;
            } catch {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => reject(new Error("Network error. Check connection."));

        xhr.open("POST", `/api/orders/${targetOrderId}/files`);
        xhr.send(formData);
      });
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "error", error: err.message } : f
        )
      );
    }
  };

  const handleAddMoreFilesAfterSubmit = (newFiles: FileList | File[]) => {
    if (!orderId) return;
    const fileArray = Array.from(newFiles);
    const addedItems: UploadedFile[] = [];

    for (const file of fileArray) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`"${file.name}" is not supported.`);
        continue;
      }
      const item: UploadedFile = {
        id: crypto.randomUUID(),
        file,
        status: "pending",
        progress: 0,
      };
      addedItems.push(item);
    }

    if (addedItems.length > 0) {
      setFiles((prev) => [...prev, ...addedItems]);
      addedItems.forEach((item) => {
        uploadSingleFile(item, orderId);
      });
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          idempotencyKey: idempotencyKey.current,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          colorMode,
          paperSize,
          copies,
          sides,
          orientation,
          pageRange: pageRange || undefined,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create order.");
      }

      const { orderId: newOrderId, token, orderNumber: num } = await orderRes.json();
      setOrderId(newOrderId);
      setOrderToken(token);
      setOrderNumber(num);

      // INSTANT UI TRANSITION to Token Screen
      setStep("submitted");

      // Upload files in background
      files.forEach((f) => {
        uploadSingleFile(f, newOrderId);
      });

    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── FIRST PAGE WHERE TOKEN NUMBER IS VISIBLE ──────────────────────────────
  if (step === "submitted" && orderToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-4 pb-12">
        <div className="w-full max-w-sm glass-card rounded-3xl p-6 text-center animate-fade-in shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Files Sent!</h1>
          <p className="text-gray-500 text-xs mb-5">Show your token number at the shop counter.</p>

          {/* Token Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 mb-4 text-white shadow-xl">
            <p className="text-xs font-medium opacity-80 mb-1">Your Token Number</p>
            <p className="text-6xl font-black tracking-wider mb-1">{orderToken}</p>
            <p className="text-xs opacity-75">Tell this number to the operator</p>
          </div>

          {/* ESTIMATED PRICE BOX (CALCULATED & VISIBLE ON FIRST TOKEN SCREEN) */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm">
            <div className="text-left">
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide">Estimated Price</p>
              <p className="text-xs text-emerald-600">Calculated for {totalPages} page{totalPages !== 1 ? "s" : ""}</p>
            </div>
            <p className="text-3xl font-black text-emerald-800">
              ₹{currentDisplayPrice}
            </p>
          </div>

          {/* Real-time file upload progress list with preview */}
          <div className="text-left bg-gray-50 rounded-2xl p-4 mb-4 space-y-3 border border-gray-100">
            <div className="flex justify-between items-center text-xs border-b border-gray-200 pb-2">
              <span className="font-bold text-gray-700">Files Sent ({files.length})</span>
              <span className="font-bold text-indigo-600">
                {doneFiles} of {files.length} uploaded
              </span>
            </div>

            {files.map((f) => {
              const isPdf = f.file.type === "application/pdf" || f.file.name.toLowerCase().endsWith(".pdf");
              return (
                <div key={f.id} className="text-xs space-y-1.5 p-2 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between text-gray-700 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {isPdf ? <FileText className="w-3.5 h-3.5 text-red-500" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <span className="truncate font-medium text-xs">{f.file.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const url = URL.createObjectURL(f.file);
                          setPreviewTarget({ name: f.file.name, url, isPdf });
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Preview your uploaded file"
                      >
                        <Eye className="w-3 h-3 text-indigo-600" />
                        Preview
                      </button>

                      {f.status === "done" && <span className="text-green-600 font-bold text-[10px] bg-green-50 px-1.5 py-0.5 rounded">✓ Ready</span>}
                      {f.status === "uploading" && <span className="text-indigo-600 font-bold text-[10px]">{f.progress}%</span>}
                      {f.status === "pending" && <span className="text-gray-400 text-[10px]">Waiting...</span>}
                      {f.status === "error" && <span className="text-red-500 font-bold text-[10px]">Error</span>}
                    </div>
                  </div>
                  {f.status === "uploading" && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ADD MORE FILES BUTTON AFTER SUBMIT */}
          <input
            ref={addMoreInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => e.target.files && handleAddMoreFilesAfterSubmit(e.target.files)}
          />

          <button
            onClick={() => addMoreInputRef.current?.click()}
            className="w-full py-3 mb-3 rounded-xl bg-white border-2 border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Add More Files to This Order
          </button>

          <button
            onClick={() => router.push(`/order/${orderId}`)}
            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            Track Order Status →
          </button>
        </div>

        {/* Client-Side File Preview Modal */}
        {previewTarget && (
          <div
            id="client-file-preview-modal"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in"
            onClick={() => setPreviewTarget(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  {previewTarget.isPdf ? (
                    <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                  <h3 className="font-bold text-sm text-gray-800 truncate">{previewTarget.name}</h3>
                </div>
                <button
                  onClick={() => setPreviewTarget(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950/90 min-h-[300px]">
                {previewTarget.isPdf ? (
                  <iframe
                    src={previewTarget.url}
                    className="w-full h-[70vh] rounded-lg border-0 bg-white"
                    title={previewTarget.name}
                  />
                ) : (
                  <img
                    src={previewTarget.url}
                    alt={previewTarget.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN UPLOAD SELECTION FORM ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">{shop.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              Instant Print Upload
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-32">
        {/* Upload Zone */}
        <div
          className={`upload-zone p-6 flex flex-col items-center justify-center gap-3 cursor-pointer ${isDragging ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Upload className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800 text-base">Tap to select files</p>
            <p className="text-xs text-gray-500 mt-0.5">PDFs, Documents, Photos</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["PDF", "JPG", "PNG", "WEBP"].map((t) => (
              <span key={t} className="px-2 py-0.5 bg-white rounded-md text-[11px] font-medium text-gray-600 border border-gray-200">
                {t}
              </span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-gray-800 text-sm">{files.length} file{files.length !== 1 ? "s" : ""} selected</h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-indigo-600 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add more
              </button>
            </div>

            {files.map((f) => (
              <div key={f.id} className="glass-card rounded-xl p-3.5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getFileIcon(f.file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-xs">{f.file.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatFileSize(f.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print Settings */}
        {files.length > 0 && (
          <div className="glass-card rounded-2xl p-4 animate-fade-in space-y-4">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-500" />
              Print Requirements
            </h2>

            {/* Estimated Price Live Preview Box on Form */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Cost</p>
                <p className="text-[11px] text-emerald-600">
                  {totalPages} page{totalPages !== 1 ? "s" : ""} · {colorMode === "bw" ? "B&W" : "Color"} · {copies} cop{copies > 1 ? "ies" : "y"}
                </p>
              </div>
              <p className="text-2xl font-black text-emerald-800">₹{currentDisplayPrice}</p>
            </div>

            {/* Color */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Print Type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColorMode("bw")}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    colorMode === "bw"
                      ? "bg-gray-900 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ⬛ Black & White
                </button>
                <button
                  onClick={() => setColorMode("color")}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    colorMode === "color"
                      ? "bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🎨 Color
                </button>
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Paper Size</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(["A4", "A3", "Letter", "Legal"] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperSize(size)}
                    className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      paperSize === size
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Copies</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-base font-bold text-gray-700 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xl font-black text-gray-800 w-8 text-center">{copies}</span>
                <button
                  onClick={() => setCopies(Math.min(999, copies + 1))}
                  className="w-9 h-9 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-base font-bold text-indigo-600 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sides */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Sides</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSides("single")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    sides === "single"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Single-sided
                </button>
                <button
                  onClick={() => setSides("double")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    sides === "double"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Double-sided
                </button>
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-indigo-600 font-bold pt-1 cursor-pointer"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? "Hide" : "More"} options (Orientation, Page range)
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 animate-fade-in">
                <div>
                  <p className="text-[11px] text-gray-500 mb-1 font-bold uppercase tracking-wide">Orientation</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["auto", "portrait", "landscape"].map((o) => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                          orientation === o
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-gray-500 mb-1 font-bold uppercase tracking-wide">
                    Page Range (optional)
                  </p>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="All pages (or e.g. 1-3, 5)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        {files.length > 0 && (
          <div className="glass-card rounded-2xl p-4 animate-fade-in">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Customer Details (Optional)</h2>
            <div className="space-y-2.5">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name (e.g. Rahul)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-xs"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Mobile number (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-xs"
              />
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{submitError}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom submit button */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white border-t border-gray-100 shadow-2xl">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                isSubmitting
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Token...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white" />
                  Send & Get Token Instant →
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
