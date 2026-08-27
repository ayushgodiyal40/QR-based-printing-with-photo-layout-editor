"use client";

import { useState, useCallback, useRef } from "react";
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

export default function UploadClient({ shop }: { shop: Shop }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "settings" | "info" | "summary" | "submitted">(
    "upload"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const uploadFile = async (uploadFile: UploadedFile, orderId: string): Promise<void> => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading", progress: 0 } : f
      )
    );

    const formData = new FormData();
    formData.append("file", uploadFile.file);

    try {
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: pct } : f))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, status: "done", progress: 100, fileId: data.fileId, pageCount: data.pageCount }
                  : f
              )
            );
            resolve();
          } else {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || "Upload failed."));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload."));

        xhr.open("POST", `/api/orders/${orderId}/files`);
        xhr.send(formData);
      });
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "error", error: err.message } : f
        )
      );
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the order
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

      // 2. Upload all files
      const uploadPromises = files.map((f) => uploadFile(f, newOrderId));
      await Promise.allSettled(uploadPromises);

      setStep("submitted");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 1), 0);
  const doneFiles = files.filter((f) => f.status === "done").length;
  const failedFiles = files.filter((f) => f.status === "error").length;

  // ─── SUBMITTED SCREEN ──────────────────────────────────────────────────────
  if (step === "submitted" && orderToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm glass-card rounded-3xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Files Sent!</h1>
          <p className="text-gray-500 mb-8">Your files have been sent to the print shop.</p>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-80 mb-1">Your Token Number</p>
            <p className="text-6xl font-black tracking-wider mb-2">{orderToken}</p>
            <p className="text-sm opacity-75">Tell this number to the shop operator</p>
          </div>

          <div className="text-left bg-gray-50 rounded-2xl p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order</span>
              <span className="font-semibold">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Files</span>
              <span className="font-semibold">{doneFiles} of {files.length} uploaded</span>
            </div>
            {failedFiles > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Failed uploads</span>
                <span className="font-semibold">{failedFiles}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Print type</span>
              <span className="font-semibold">{colorMode === "bw" ? "B&W" : "Color"} · {paperSize}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Copies</span>
              <span className="font-semibold">{copies}</span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/order/${orderId}`)}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Track Order Status →
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN UPLOAD UI ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">{shop.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Send files for printing</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-32">
        {/* Upload Zone */}
        <div
          className={`upload-zone p-8 flex flex-col items-center justify-center gap-4 cursor-pointer ${isDragging ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Upload className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800 text-lg">Tap to select files</p>
            <p className="text-sm text-gray-500 mt-1">or drag & drop here</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {["PDF", "JPG", "PNG", "WEBP"].map((t) => (
              <span key={t} className="px-2 py-0.5 bg-white rounded-lg text-xs font-medium text-gray-600 border border-gray-200">
                {t}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">Max {MAX_FILE_SIZE_MB} MB per file</p>
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
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{files.length} file{files.length !== 1 ? "s" : ""} selected</h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-sm text-indigo-600 font-medium"
              >
                <Plus className="w-4 h-4" /> Add more
              </button>
            </div>

            {files.map((f) => (
              <div key={f.id} className="glass-card rounded-2xl p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getFileIcon(f.file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-sm">{f.file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatFileSize(f.file.size)}
                      {f.pageCount && ` · ${f.pageCount} page${f.pageCount !== 1 ? "s" : ""}`}
                    </p>
                    {f.status === "uploading" && (
                      <div className="mt-2">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${f.progress}%` }} />
                        </div>
                        <p className="text-xs text-indigo-600 mt-1">Uploading... {f.progress}%</p>
                      </div>
                    )}
                    {f.status === "done" && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded
                      </p>
                    )}
                    {f.status === "error" && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {f.error || "Upload failed"}
                      </p>
                    )}
                  </div>
                  {f.status !== "uploading" && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print Settings */}
        {files.length > 0 && (
          <div className="glass-card rounded-2xl p-5 animate-fade-in">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-500" />
              Print Settings
            </h2>

            {/* Color */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Color</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColorMode("bw")}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                    colorMode === "bw"
                      ? "bg-gray-800 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ⬛ Black & White
                </button>
                <button
                  onClick={() => setColorMode("color")}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                    colorMode === "color"
                      ? "bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🎨 Color
                </button>
              </div>
            </div>

            {/* Paper Size */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Paper Size</p>
              <div className="grid grid-cols-4 gap-2">
                {(["A4", "A3", "Letter", "Legal"] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperSize(size)}
                    className={`py-2 rounded-xl font-semibold text-xs transition-all ${
                      paperSize === size
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Copies</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-all"
                >
                  −
                </button>
                <span className="text-2xl font-bold text-gray-800 w-10 text-center">{copies}</span>
                <button
                  onClick={() => setCopies(Math.min(999, copies + 1))}
                  className="w-10 h-10 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-lg font-bold text-indigo-600 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sides */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Sides</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSides("single")}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    sides === "single"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Single-sided
                </button>
                <button
                  onClick={() => setSides("double")}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    sides === "double"
                      ? "bg-indigo-600 text-white shadow-md"
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
              className="flex items-center gap-1 text-sm text-indigo-600 font-medium mt-2"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showAdvanced ? "Hide" : "More"} print options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 animate-fade-in">
                {/* Orientation */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Orientation</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["auto", "portrait", "landscape"].map((o) => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
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

                {/* Page range */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                    Page Range (e.g. 1-3, 5, 8-10)
                  </p>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="All pages"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        {files.length > 0 && (
          <div className="glass-card rounded-2xl p-5 animate-fade-in">
            <h2 className="font-semibold text-gray-800 mb-4">Your Details (Optional)</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name (e.g. Rahul)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Mobile number (optional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <p className="text-xs text-gray-400">
                Or leave blank — you'll be listed as Walk-in customer.
              </p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        {files.length > 0 && (
          <div className="glass-card rounded-2xl p-5 animate-fade-in border-2 border-indigo-100">
            <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Files</span>
                <span className="font-semibold">{files.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated pages</span>
                <span className="font-semibold">{totalPages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Color</span>
                <span className="font-semibold">{colorMode === "bw" ? "Black & White" : "Color"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paper</span>
                <span className="font-semibold">{paperSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Copies</span>
                <span className="font-semibold">{copies}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sides</span>
                <span className="font-semibold capitalize">{sides}-sided</span>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom submit button */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-2xl">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                isSubmitting
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-98"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending files...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send for Printing
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
