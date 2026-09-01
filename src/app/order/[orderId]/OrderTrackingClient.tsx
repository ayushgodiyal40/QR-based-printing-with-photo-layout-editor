"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  CheckCircle,
  Clock,
  Printer,
  Package,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  FileText,
  Image as ImageIcon,
  Loader2,
  Eye,
  X,
  Smartphone,
  QrCode,
  Volume2,
  ShieldCheck,
} from "lucide-react";
import {
  buildUpiUri,
  extractUpiVpa,
  buildPhonePeUri,
  buildGPayUri,
  buildPaytmUri,
} from "@/lib/upi";

type OrderStatus =
  | "uploading"
  | "received"
  | "waiting"
  | "processing"
  | "printing"
  | "completed"
  | "cancelled"
  | "failed"
  | "expired";

interface OrderFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  imageWidth?: number;
  imageHeight?: number;
  url: string;
}

interface Order {
  id: string;
  token: string;
  orderNumber: string;
  status: OrderStatus;
  customerName?: string;
  colorMode: string;
  paperSize: string;
  copies: number;
  sides: string;
  totalFiles: number;
  totalPages: number;
  estimatedPrice?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentReference?: string;
  shopName?: string;
  upiId?: string;
  upiName?: string;
  createdAt: string;
  files?: OrderFile[];
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string; description: string }
> = {
  uploading: {
    label: "Uploading",
    icon: <RefreshCw className="w-6 h-6 animate-spin" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Your files are being uploaded…",
  },
  received: {
    label: "Received ✓",
    icon: <CheckCircle className="w-6 h-6" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Your order has been received by the shop.",
  },
  waiting: {
    label: "Waiting",
    icon: <Clock className="w-6 h-6" />,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    description: "Your order is in the queue. The shop will process it soon.",
  },
  processing: {
    label: "Processing",
    icon: <Package className="w-6 h-6" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    description: "The shop operator is reviewing your order.",
  },
  printing: {
    label: "Printing",
    icon: <Printer className="w-6 h-6" />,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    description: "Your documents are being printed right now!",
  },
  completed: {
    label: "Ready! ✓",
    icon: <CheckCircle className="w-6 h-6" />,
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Your order is ready. Please collect it from the counter.",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="w-6 h-6" />,
    color: "text-red-600",
    bg: "bg-red-50",
    description: "This order has been cancelled. Please contact the shop.",
  },
  failed: {
    label: "Failed",
    icon: <AlertCircle className="w-6 h-6" />,
    color: "text-red-600",
    bg: "bg-red-50",
    description: "Something went wrong. Please contact the shop operator.",
  },
  expired: {
    label: "Expired",
    icon: <Clock className="w-6 h-6" />,
    color: "text-gray-500",
    bg: "bg-gray-50",
    description: "This order has expired. Files have been deleted.",
  },
};

const STATUS_STEPS: OrderStatus[] = ["received", "waiting", "processing", "printing", "completed"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export default function OrderTrackingClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMore, setUploadingMore] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Payment states
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [hasReportedPaid, setHasReportedPaid] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [showUtrInput, setShowUtrInput] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (!res.ok) throw new Error("Order not found.");
      const data = await res.json();
      setOrder(data);
      if (data.paymentStatus === "paid") {
        setHasReportedPaid(true);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order && order.upiId && order.estimatedPrice && order.token) {
      const upiUri = buildUpiUri({
        upiId: order.upiId,
        payeeName: order.upiName || order.shopName || "Print Shop",
        amount: order.estimatedPrice,
        orderToken: order.token,
      });
      QRCode.toDataURL(upiUri, {
        width: 360,
        margin: 1,
        color: { dark: "#1e1b4b", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then((url) => setUpiQrDataUrl(url))
        .catch(() => {});
    }
  }, [order?.upiId, order?.upiName, order?.shopName, order?.estimatedPrice, order?.token]);

  const handleConfirmPaid = async () => {
    if (!orderId) return;
    setIsSubmittingPayment(true);
    try {
      await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "upi",
          paymentReference: utrNumber.trim() || undefined,
        }),
      });
      setHasReportedPaid(true);
      fetchOrder();
    } catch {}
    setIsSubmittingPayment(false);
  };

  useEffect(() => {
    fetchOrder();

    // Connect SSE for real-time status updates
    const es = new EventSource(`/api/sse/orders/${orderId}`);
    eventSourceRef.current = es;

    es.addEventListener("status_update", (e) => {
      const data = JSON.parse(e.data);
      setOrder((prev) => prev ? { ...prev, status: data.status, ...data } : prev);
    });

    es.onerror = () => {
      es.close();
    };

    const poll = setInterval(fetchOrder, 15000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [orderId]);

  const handleAddMoreFiles = async (filesList: FileList) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;

    setUploadingMore(true);
    setUploadMsg("Uploading additional files…");

    try {
      for (const file of filesArray) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/orders/${orderId}/files`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json();
          alert(`Failed to upload ${file.name}: ${errData.error}`);
        }
      }
      setUploadMsg("Files added successfully! ✓");
      await fetchOrder();
    } catch {
      alert("Error adding files. Check network connection.");
    } finally {
      setUploadingMore(false);
      setTimeout(() => setUploadMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500">Loading order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="glass-card rounded-3xl p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Order not found</h2>
          <p className="text-gray-500 text-sm">{error || "This order does not exist."}</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const currentStepIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isTerminal = ["completed", "cancelled", "failed", "expired"].includes(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="max-w-sm mx-auto px-4 py-8">
        {/* Token display */}
        <div className="glass-card rounded-3xl p-6 mb-5 animate-fade-in text-center shadow-xl">
          <p className="text-sm text-gray-500 mb-1">Your Token</p>
          <p className="text-6xl font-black text-indigo-700 tracking-wider">{order.token}</p>
          <p className="text-xs text-gray-400 mt-1">{order.orderNumber}</p>
        </div>

        {/* Price Card */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-5 mb-5 shadow-sm text-center">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Estimated Total Price</p>
          <p className="text-4xl font-black text-emerald-800 mb-1">
            {order.estimatedPrice ? `₹${order.estimatedPrice}` : "—"}
          </p>
          <p className="text-xs text-emerald-600">Calculated per print settings & pages</p>
        </div>

        {/* Online Payment Card */}
        {order.upiId && (
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-white border-2 border-purple-200/80 rounded-3xl p-5 mb-5 text-left shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  ₹
                </div>
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Pay Online
                </span>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-purple-600" />
                Soundbox Active
              </span>
            </div>

            {hasReportedPaid || order.paymentStatus === "paid" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Payment Confirmed!
                </div>
                <p className="text-xs text-emerald-600">
                  Your payment has been received. Show your token at the counter to collect your prints.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Dedicated 1-Tap Universal UPI Payment Button */}
                <a
                  href={buildUpiUri({
                    upiId: order.upiId,
                    payeeName: order.upiName || order.shopName || "Print Shop",
                    amount: order.estimatedPrice || "0",
                    orderToken: order.token,
                  })}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer text-center active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-white" />
                  Pay ₹{order.estimatedPrice} via Any UPI App
                </a>

                {/* Dynamic QR Display */}
                {upiQrDataUrl && (
                  <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-purple-100 shadow-inner">
                    <img
                      src={upiQrDataUrl}
                      alt="UPI QR Code"
                      className="w-40 h-40 rounded-lg bg-white"
                    />
                    <p className="text-[11px] font-semibold text-gray-700 mt-1.5 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-purple-600" />
                      Scan with PhonePe, GPay, Paytm
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      UPI ID: {extractUpiVpa(order.upiId)}
                    </p>
                  </div>
                )}

                {/* I Have Paid Confirmation */}
                {!showUtrInput ? (
                  <button
                    type="button"
                    onClick={() => setShowUtrInput(true)}
                    className="w-full py-1.5 text-center text-[11px] text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
                  >
                    Already paid? Tap here to confirm
                  </button>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-purple-100">
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="12-digit UPI Ref / UTR (optional)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmPaid}
                      disabled={isSubmittingPayment}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Confirm Payment Done
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-gray-500 text-center italic">
                  💡 You can also pay cash directly at the counter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status card */}
        <div className={`rounded-3xl p-6 mb-5 animate-fade-in ${statusConfig.bg}`}>
          <div className={`flex items-center gap-3 mb-3 ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="text-xl font-bold">{statusConfig.label}</span>
          </div>
          <p className="text-gray-700 text-sm">{statusConfig.description}</p>
          {order.status === "completed" && (
            <div className="mt-4 bg-white rounded-2xl p-4 border-2 border-green-200">
              <p className="text-green-700 font-bold text-lg">🎉 Your order is ready!</p>
              <p className="text-green-600 text-sm mt-1">Please collect from the counter.</p>
            </div>
          )}
        </div>

        {/* Progress steps */}
        {!isTerminal && (
          <div className="glass-card rounded-2xl p-5 mb-5 animate-fade-in">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((s, i) => {
                const done = i <= currentStepIdx;
                const active = i === currentStepIdx;
                return (
                  <div key={s} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-3 h-3 rounded-full mb-1 transition-all ${
                        done
                          ? active
                            ? "bg-indigo-600 scale-150 shadow-md animate-pulse-ring"
                            : "bg-indigo-400"
                          : "bg-gray-200"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_STEPS.map((s) => (
                <p key={s} className="text-[9px] text-gray-400 text-center flex-1 capitalize font-medium">
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Add More Files Button (allowed while order is not completed/cancelled) */}
        {!isTerminal && (
          <div className="glass-card rounded-2xl p-4 mb-5 border-2 border-indigo-100 animate-fade-in">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => e.target.files && handleAddMoreFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMore}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
            >
              {uploadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  + Add More Files to This Order
                </>
              )}
            </button>
            {uploadMsg && (
              <p className="text-xs text-center text-indigo-600 font-bold mt-2 animate-fade-in">
                {uploadMsg}
              </p>
            )}
          </div>
        )}

        {/* Sent Files with Preview */}
        {order.files && order.files.length > 0 && (
          <div className="glass-card rounded-2xl p-5 mb-5 animate-fade-in">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center justify-between text-sm">
              <span>Your Sent Files</span>
              <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                {order.files.length} file{order.files.length !== 1 ? "s" : ""}
              </span>
            </h2>

            <div className="space-y-2">
              {order.files.map((file) => {
                const isPdf = file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");
                return (
                  <div
                    key={file.id}
                    className="p-3 bg-gray-50 rounded-xl flex items-center justify-between gap-2 border border-gray-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        {isPdf ? (
                          <FileText className="w-4 h-4 text-red-500" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs text-gray-800 truncate">{file.originalName}</p>
                        <p className="text-[10px] text-gray-400">
                          {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                          {file.pageCount && ` · ${file.pageCount} page${file.pageCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPreviewTarget({ name: file.originalName, url: file.url, isPdf })}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                      title="Preview file"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      Preview
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="glass-card rounded-2xl p-5 mb-5 animate-fade-in">
          <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Files</span>
              <span className="font-semibold">{order.totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pages</span>
              <span className="font-semibold">{order.totalPages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Print type</span>
              <span className="font-semibold">{order.colorMode === "bw" ? "B&W" : "Color"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paper</span>
              <span className="font-semibold">{order.paperSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Copies</span>
              <span className="font-semibold">{order.copies}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Status updates automatically in real time.
        </p>

        {/* Client-Side File Preview Modal */}
        {previewTarget && (
          <div
            id="tracking-file-preview-modal"
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
    </div>
  );
}
