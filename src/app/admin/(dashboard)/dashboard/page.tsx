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
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchData = async () => {
    const [statsRes, ordersRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/orders?status=received&limit=20"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (ordersRes.ok) {
      const data = await ordersRes.json();
      setOrders(data.orders);
    }
    setLoading(false);
  };

  const playNotification = () => {
    if (!notifSound) return;
    // Create a simple beep using Web Audio API
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

    // Connect SSE
    const es = new EventSource("/api/sse/admin");
    esRef.current = es;

    es.addEventListener("new_order", (e) => {
      const data = JSON.parse(e.data);
      setOrders((prev) => [data, ...prev.slice(0, 19)]);
      setNewOrderIds((prev) => new Set([...prev, data.orderId]));
      playNotification();

      // Desktop notification
      if (Notification.permission === "granted") {
        new Notification(`New Print Order — #${data.token}`, {
          body: `Customer: ${data.customerName || "Walk-in"}`,
          icon: "/favicon.ico",
        });
      }

      // Remove highlight after 5s
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(data.orderId);
          return next;
        });
      }, 5000);
    });

    es.addEventListener("order_updated", (e) => {
      const data = JSON.parse(e.data);
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, ...data } : o))
      );
    });

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => es.close();
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
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotifSound(!notifSound)}
            title={notifSound ? "Mute notifications" : "Unmute notifications"}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors shadow-sm"
          >
            {notifSound ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors shadow-sm"
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Order Queue
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            View all →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <Printer className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No pending orders</p>
            <p className="text-gray-300 text-sm">New orders will appear here instantly</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group ${
                  newOrderIds.has(order.id) ? "bg-indigo-50 animate-pulse" : ""
                }`}
              >
                {/* Token */}
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-indigo-700">{order.token}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {order.customerName || "Walk-in"}
                    </p>
                    {order.priority === "high" && (
                      <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                        PRIORITY
                      </span>
                    )}
                    {newOrderIds.has(order.id) && (
                      <span className="text-[10px] bg-green-100 text-green-600 font-bold px-1.5 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
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
                  <p className="text-xs text-gray-400">
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
    </div>
  );
}
