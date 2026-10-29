"use client";

import { useEffect, useState, useRef } from "react";
import {
  ClipboardList,
  FileText,
  DollarSign,
  Printer,
  Clock,
  CheckCircle,
  TrendingUp,
  Bell,
  BellOff,
  RefreshCw,
  QrCode,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  today: {
    orders: number;
    pages: number;
    revenue: number;
    bwPages: number;
    colorPages: number;
    pendingOrders: number;
    completedOrders: number;
  };
}

interface Order {
  id: string;
  token: string;
  orderNumber: string;
  customerName?: string;
  status: string;
  priority: string;
  colorMode: string;
  paperSize: string;
  copies: number;
  totalFiles: number;
  totalPages: number;
  estimatedPrice?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  received: "badge-received",
  waiting: "badge-waiting",
  processing: "badge-processing",
  printing: "badge-printing",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
  failed: "badge-failed",
  expired: "badge-expired",
};

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.FC<any>;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-950 rounded-2xl p-5 border border-gray-100 dark:border-neutral-900 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

import { getCachedData, setCachedData } from "@/lib/client-cache";

const CACHE_KEY_STATS = "admin_dashboard_stats";
const CACHE_KEY_ORDERS = "admin_dashboard_orders";
const CACHE_KEY_QR = "admin_settings_qr";

export default function DashboardPage() {
  const cachedStats = getCachedData<DashboardStats>(CACHE_KEY_STATS);
  const cachedOrders = getCachedData<Order[]>(CACHE_KEY_ORDERS);

  const [stats, setStats] = useState<DashboardStats | null>(cachedStats);
  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedStats && (!cachedOrders || cachedOrders.length === 0));
  const [notifSound, setNotifSound] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  // Shop QR code modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState<{ uploadUrl: string; qrDataUrl: string; shop?: any } | null>(
    () => getCachedData<any>(CACHE_KEY_QR) || null
  );
  const [loadingQr, setLoadingQr] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  const fetchQr = async () => {
    if (qrData?.qrDataUrl) return;
    setLoadingQr(true);
    try {
      const res = await fetch("/api/admin/qr");
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
        setCachedData(CACHE_KEY_QR, data);
      }
    } catch (err) {
      console.error("Failed to fetch shop QR:", err);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleOpenQr = () => {
    setShowQrModal(true);
    if (!qrData) {
      fetchQr();
    }
  };

  const copyQrUrl = () => {
    if (!qrData?.uploadUrl) return;
    navigator.clipboard.writeText(qrData.uploadUrl);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  const downloadQr = () => {
    if (!qrData?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrData.qrDataUrl;
    const shopName = qrData.shop?.slug || "shop";
    a.download = `${shopName}-qr.png`;
    a.click();
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQrModal(false);
      }
    };
    if (showQrModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showQrModal]);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/orders?status=active&limit=25&sort=newest"),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setCachedData(CACHE_KEY_STATS, statsData);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
        setCachedData(CACHE_KEY_ORDERS, ordersData.orders || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const prefetchOrder = (orderId: string) => {
    const key = `admin_order_${orderId}`;
    if (getCachedData(key)) return;
    fetch(`/api/admin/orders/${orderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.order) {
          setCachedData(key, data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (orders && orders.length > 0) {
      // Pre-warm top 5 orders in the Live Queue so clicking opens instantaneously
      orders.slice(0, 5).forEach((o) => prefetchOrder(o.id));
    }
  }, [orders]);

  const playNotification = () => {
    if (!notifSound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  useEffect(() => {
    fetchData();

    // Connect SSE for live order updates
    const es = new EventSource("/api/sse/admin");
    esRef.current = es;

    es.addEventListener("new_order", (e) => {
      const order = JSON.parse(e.data);
      const targetId = order.id || order.orderId;
      const normalizedOrder = { ...order, id: targetId };
      prefetchOrder(targetId);
      setOrders((prev) => [normalizedOrder, ...prev.filter((o) => o.id !== targetId)]);
      setNewOrderIds((prev) => new Set([...prev, targetId]));
      playNotification();
    });

    es.addEventListener("order_updated", (e) => {
      const update = JSON.parse(e.data);
      setOrders((prev) =>
        prev.map((o) => (o.id === update.orderId ? { ...o, ...update } : o))
      );
    });

    es.addEventListener("order_status", (e) => {
      const { orderId, status } = JSON.parse(e.data);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    });

    es.addEventListener("order_deleted", (e) => {
      try {
        const { orderId } = JSON.parse(e.data);
        if (orderId) {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
        }
        fetchData();
      } catch {}
    });

    // Fallback refresh every 15 seconds (only when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchData();
    }, 15000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [notifSound]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenQr}
            title="Display Shop QR Code"
            aria-label="Display Shop QR Code"
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors shadow-sm cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setNotifSound(!notifSound)}
            title={notifSound ? "Mute notifications" : "Unmute notifications"}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm cursor-pointer"
          >
            {notifSound ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Orders Today"
            value={stats.today.orders}
            icon={ClipboardList}
            color="bg-indigo-500"
          />
          <StatsCard
            title="Pages Printed"
            value={stats.today.pages}
            subtitle={`${stats.today.bwPages} B&W · ${stats.today.colorPages} Color`}
            icon={FileText}
            color="bg-purple-500"
          />
          <StatsCard
            title="Revenue"
            value={`₹${stats.today.revenue.toFixed(0)}`}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <StatsCard
            title="Pending"
            value={stats.today.pendingOrders}
            subtitle={`${stats.today.completedOrders} completed`}
            icon={Clock}
            color="bg-orange-500"
          />
        </div>
      )}


      {/* Live Order Queue */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Live Order Queue
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h2>
        <Link
          href="/admin/orders"
          className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm overflow-hidden">

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <Printer className="w-12 h-12 text-gray-200 dark:text-neutral-800 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-neutral-500 font-medium">No pending orders</p>
            <p className="text-gray-300 dark:text-neutral-600 text-sm">New orders will appear here instantly</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-neutral-900">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                onMouseEnter={() => prefetchOrder(order.id)}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors group ${
                  newOrderIds.has(order.id) ? "bg-indigo-50 dark:bg-neutral-900/80 animate-pulse" : ""
                }`}
              >
                {/* Token */}
                <div className="w-12 h-12 bg-slate-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-neutral-800">
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{order.token}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {order.customerName || "Walk-in"}
                    </p>
                    {order.priority === "high" && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-300 font-bold px-1.5 py-0.5 rounded-full">
                        PRIORITY
                      </span>
                    )}
                    {newOrderIds.has(order.id) && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-950/70 text-green-600 dark:text-green-300 font-bold px-1.5 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
                    {order.totalFiles} file{order.totalFiles !== 1 ? "s" : ""} ·{" "}
                    {order.totalPages} pages ·{" "}
                    {order.colorMode === "bw" ? "B&W" : "Color"} · {order.paperSize}
                  </p>
                </div>

                {/* Right side */}
                <div className="text-right flex-shrink-0">
                  <span className={`badge ${STATUS_COLORS[order.status] || ""} mb-1`}>
                    {order.status}
                  </span>
                  <p className="text-xs text-gray-400 dark:text-neutral-500">
                    {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Maximized Shop QR Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-950 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-200 dark:border-neutral-800 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {qrData?.shop?.name ? qrData.shop.name : "Shop QR Code"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 mt-1 max-w-xs">
              Scan with mobile camera to send documents directly
            </p>

            {/* Maximized QR Code Container */}
            <div className="mt-5 p-4 sm:p-5 bg-white rounded-3xl border-4 border-indigo-100 dark:border-neutral-800 shadow-lg flex items-center justify-center min-h-[260px] sm:min-h-[290px]">
              {loadingQr ? (
                <div className="flex flex-col items-center justify-center gap-2 p-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium">Generating QR...</span>
                </div>
              ) : qrData?.qrDataUrl ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Shop QR Code"
                  className="w-60 h-60 sm:w-68 sm:h-68 object-contain rounded-xl select-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-10 text-gray-400">
                  <p className="text-sm">Unable to load QR code.</p>
                  <button
                    onClick={fetchQr}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Customer Upload Link & Actions */}
            {qrData?.uploadUrl && (
              <div className="w-full mt-5 space-y-3">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-900/80 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-neutral-800 text-left">
                  <code className="text-xs text-indigo-600 dark:text-indigo-400 flex-1 truncate font-mono">
                    {qrData.uploadUrl}
                  </code>
                  <button
                    onClick={copyQrUrl}
                    className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedQr ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={downloadQr}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <a
                    href={qrData.uploadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-200 text-xs sm:text-sm font-semibold hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Page
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
