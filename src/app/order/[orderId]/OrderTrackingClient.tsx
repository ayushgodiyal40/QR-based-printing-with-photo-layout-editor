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
  Check,
  Info,
  Copy,
} from "lucide-react";
import PdfViewer from "@/components/PdfViewer";
import {
  buildStandardUpiUri,
  getStaticStandeeUri,
  getUpiDiagnostics,
  extractUpiVpa,
  formatUpiAmount,
  DEFAULT_PAYEE_NAME,
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
  utr?: string;
  paymentConfirmationMethod?: string;
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
  const [utrInput, setUtrInput] = useState<string>("");
  const [showUtrBox, setShowUtrBox] = useState<boolean>(false);
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [showQrFallback, setShowQrFallback] = useState<boolean>(false);
  const [showStandeeQr, setShowStandeeQr] = useState<boolean>(false);
  const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string | null>(null);
  const [standeeQrDataUrl, setStandeeQrDataUrl] = useState<string | null>(null);
  const [copiedDebug, setCopiedDebug] = useState<boolean>(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (!res.ok) throw new Error("Order not found.");
      const data = await res.json();
      setOrder(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR codes when order upiId and price are available
  useEffect(() => {
    if (order && order.upiId && order.estimatedPrice && order.token) {
      const upiUri = buildStandardUpiUri({
        upiId: order.upiId,
        payeeName: order.upiName || order.shopName,
        amount: order.estimatedPrice,
        orderToken: order.token,
      });

      if (upiUri) {
        QRCode.toDataURL(upiUri, {
          width: 360,
          margin: 1,
          color: { dark: "#1e1b4b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        })
          .then(setDynamicQrDataUrl)
          .catch(() => {});
      }

      const staticUri = getStaticStandeeUri(order.upiId);
      if (staticUri) {
        QRCode.toDataURL(staticUri, {
          width: 360,
          margin: 1,
          color: { dark: "#1e1b4b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        })
          .then(setStandeeQrDataUrl)
          .catch(() => {});
      }
    }
  }, [order?.upiId, order?.upiName, order?.shopName, order?.estimatedPrice, order?.token]);

  const handleLaunchUpi = async () => {
    if (!order || !order.upiId || !order.estimatedPrice || !order.token) return;
    const uri = buildStandardUpiUri({
      upiId: order.upiId,
      payeeName: order.upiName || order.shopName,
      amount: order.estimatedPrice,
      orderToken: order.token,
    });

    try {
      await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "upi" }),
      });
      fetchOrder();
    } catch {}

    window.location.href = uri;
  };

  const handleSubmitUtr = async () => {
    if (!orderId || !utrInput.trim()) return;
    setIsSubmittingUtr(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "upi", utr: utrInput.trim() }),
      });
      if (res.ok) {
        setShowUtrBox(false);
        fetchOrder();
      }
    } catch {}
    setIsSubmittingUtr(false);
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

        {/* Price Card (Calculating Animation or Finalized Price) */}
        {!order.estimatedPrice || uploadingMore ? (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/80 rounded-3xl p-5 mb-5 text-center shadow-sm animate-pulse">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <p className="text-xs text-indigo-950 font-bold uppercase tracking-wide">
                Calculating Total Bill...
              </p>
            </div>
            <p className="text-[11px] text-indigo-600 font-medium">
              Counting pages & applying pricing rules...
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-5 mb-5 shadow-sm text-center animate-fade-in">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Estimated Total Price</p>
            <p className="text-4xl font-black text-emerald-800 mb-1">
              ₹{order.estimatedPrice}
            </p>
            <p className="text-xs text-emerald-600">Calculated per print settings & pages</p>
          </div>
        )}

        {/* UPI PAYMENT & SOUNDBOX VERIFICATION SECTION */}
        {order.estimatedPrice && !uploadingMore && order.upiId && (
          <div className="bg-white/95 rounded-3xl p-5 mb-5 border-2 border-indigo-100/90 shadow-lg text-left space-y-4 animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  ₹
                </div>
                <div>
                  <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    UPI Payment & Soundbox
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Direct to merchant • Soundbox alert
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-purple-600" />
                Soundbox Active
              </span>
            </div>

            {/* State 1: Paid / Confirmed */}
            {order.paymentStatus === "PAID" || order.paymentStatus === "paid" ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center space-y-1.5 animate-scale-in">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-emerald-900">Payment Received & Verified!</h3>
                <p className="text-xs text-emerald-700">
                  Confirmed via PhonePe Soundbox. Show token <strong className="font-black text-emerald-950">#{order.token}</strong> at the counter to collect your prints.
                </p>
              </div>
            ) : order.paymentStatus === "VERIFICATION_REQUIRED" ? (
              /* State 2: Verification Required */
              <div className="bg-purple-50/80 border-2 border-purple-200 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto animate-pulse">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wide">
                    Verification Pending at Counter
                  </h3>
                  <p className="text-xs text-purple-800 mt-1">
                    Our shop PhonePe Soundbox will announce your payment. The operator will verify and confirm your order.
                  </p>
                </div>
                {order.utr ? (
                  <div className="bg-white/80 rounded-xl p-2 border border-purple-100 text-[11px] text-purple-900 font-mono">
                    Ref / UTR: <span className="font-bold">{order.utr}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUtrBox(!showUtrBox)}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    {showUtrBox ? "Hide UTR Input" : "+ Add 12-digit UTR / Ref Number"}
                  </button>
                )}
              </div>
            ) : (
              /* State 3: Pending Payment */
              <div className="space-y-3">
                {/* Primary Action: Standard UPI Intent Button */}
                <button
                  type="button"
                  onClick={handleLaunchUpi}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98"
                >
                  <Smartphone className="w-4 h-4 text-white" />
                  Pay ₹{order.estimatedPrice} via UPI App
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* Fallback 1: Scan Dynamic QR */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrFallback(!showQrFallback);
                      setShowStandeeQr(false);
                    }}
                    className="py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    {showQrFallback ? "Hide QR Code" : "Scan QR to Pay"}
                  </button>

                  {/* Fallback 2: Enter UTR */}
                  <button
                    type="button"
                    onClick={() => setShowUtrBox(!showUtrBox)}
                    className="py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                    {showUtrBox ? "Cancel UTR" : "Enter UTR"}
                  </button>
                </div>

                {/* Fallback Display: Dynamic Standard QR Code */}
                {showQrFallback && dynamicQrDataUrl && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-indigo-100 text-center space-y-2 animate-scale-in">
                    <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-gray-200">
                      <img
                        src={dynamicQrDataUrl}
                        alt="Standard UPI QR"
                        className="w-44 h-44 mx-auto rounded-lg"
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-800">
                      Scan with PhonePe, GPay, Paytm, or BHIM
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      VPA: {extractUpiVpa(order.upiId)} • ₹{order.estimatedPrice}
                    </p>
                  </div>
                )}

                {/* Standee QR Display */}
                {standeeQrDataUrl && (
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStandeeQr(!showStandeeQr);
                        setShowQrFallback(false);
                      }}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold underline cursor-pointer"
                    >
                      {showStandeeQr ? "Hide Shop Standee QR" : "📷 Or scan Shop Counter Standee QR"}
                    </button>

                    {showStandeeQr && (
                      <div className="mt-2 p-4 bg-purple-50/60 rounded-2xl border border-purple-100 text-center space-y-2 animate-scale-in">
                        <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-purple-200">
                          <img
                            src={standeeQrDataUrl}
                            alt="PhonePe Standee QR"
                            className="w-44 h-44 mx-auto rounded-lg"
                          />
                        </div>
                        <p className="text-xs font-bold text-purple-950">
                          Authentic Counter Soundbox Standee
                        </p>
                        <p className="text-[10px] text-purple-700">
                          Scan with PhonePe/GPay camera at the counter. Soundbox will announce payment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* UTR Input Box */}
            {showUtrBox && (
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 animate-fade-in">
                <p className="text-xs font-bold text-gray-800">Submit UTR / UPI Reference Number</p>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="12-digit UPI Ref / UTR (e.g. 423456789012)"
                  maxLength={30}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSubmitUtr}
                  disabled={isSubmittingUtr || !utrInput.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmittingUtr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Submit for Counter Verification
                </button>
              </div>
            )}

            {/* Counter Cash Alternative & Debug Toggle */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>🏪 Cash accepted at counter</span>
              <button
                type="button"
                onClick={() => setShowDebugModal(!showDebugModal)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer flex items-center gap-0.5"
              >
                <Info className="w-3 h-3" />
                {showDebugModal ? "Hide Debug" : "Inspect URI (Debug)"}
              </button>
            </div>

            {/* Safe Debug & Test Panel */}
            {showDebugModal && (
              <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-2xl text-[10px] space-y-2 font-mono break-all animate-scale-in">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-400">
                    UPI Diagnostics Mode
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const diag = getUpiDiagnostics({
                        upiId: order.upiId || "",
                        payeeName: order.upiName || order.shopName,
                        amount: order.estimatedPrice,
                        orderToken: order.token,
                      });
                      navigator.clipboard.writeText(diag.encodedUri);
                      setCopiedDebug(true);
                      setTimeout(() => setCopiedDebug(false), 2000);
                    }}
                    className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDebug ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedDebug ? "Copied" : "Copy URI"}
                  </button>
                </div>
                <div>
                  <span className="text-slate-500">Payee VPA: </span>
                  <span className="text-emerald-400 font-bold">{extractUpiVpa(order.upiId)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Payee Name: </span>
                  <span className="text-amber-300">{order.upiName || order.shopName || DEFAULT_PAYEE_NAME}</span>
                </div>
                <div>
                  <span className="text-slate-500">Exact Order Amount: </span>
                  <span className="text-cyan-300">₹{formatUpiAmount(order.estimatedPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Generated URI:</span>
                  <div className="bg-slate-950 p-2 rounded-lg text-emerald-300 text-[9px] mt-0.5 select-all">
                    {buildStandardUpiUri({
                      upiId: order.upiId,
                      payeeName: order.upiName || order.shopName,
                      amount: order.estimatedPrice,
                      orderToken: order.token,
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">₹1 Test URI:</span>
                  <div className="bg-slate-950 p-2 rounded-lg text-indigo-300 text-[9px] mt-0.5 select-all">
                    {buildStandardUpiUri({
                      upiId: order.upiId,
                      payeeName: order.upiName || order.shopName,
                      amount: 1.0,
                      orderToken: order.token,
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback Counter notice when no UPI */}
        {(!order.upiId || !order.estimatedPrice || uploadingMore) && (
          <div className="bg-white/90 border border-indigo-100 rounded-3xl p-5 mb-5 shadow-sm text-center space-y-2 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-lg">
              🏪
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Pay at Shop Counter</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Show your token <strong className="text-indigo-700 font-black">#{order.token}</strong> to the operator at the counter to collect your prints.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-3 text-xs text-gray-600 font-medium">
              <span>💵 Cash</span>
              <span>•</span>
              <span>📱 Counter QR / UPI</span>
            </div>
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

              <div className="flex-1 overflow-hidden flex flex-col bg-gray-950 min-h-[320px] h-[72vh]">
                {previewTarget.isPdf ? (
                  <PdfViewer
                    url={previewTarget.url}
                    fileName={previewTarget.name}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={previewTarget.url}
                      alt={previewTarget.name}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
