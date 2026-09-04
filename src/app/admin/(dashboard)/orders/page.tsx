"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  Trash2,
  Loader2,
  Volume2,
  Check,
  AlertCircle,
} from "lucide-react";

const STATUSES = ["all", "received", "waiting", "processing", "printing", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  received: "badge-received",
  waiting: "badge-waiting",
  processing: "badge-processing",
  printing: "badge-printing",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
  failed: "badge-failed",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const confirmPayment = async (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    setConfirmingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, paymentStatus: "PAID", paymentConfirmationMethod: "SHOP_OWNER" }
              : o
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingId(null);
    }
  };

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const params = new URLSearchParams({ status, sort, limit: "100" });
    const res = await fetch(`/api/admin/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    if (!isBackground) setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [status, sort]);

  const deleteOrder = async (e: React.MouseEvent, order: any) => {
    e.stopPropagation(); // Prevents opening the order detail page
    if (!confirm(`Are you sure you want to delete client order #${order.token} (${order.customerName || "Walk-in"})?`)) {
      return;
    }

    setDeletingId(order.id);
    const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
    setDeletingId(null);
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.token.includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.customerPhone || "").includes(q)
    );
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Orders</h1>
        <button onClick={() => fetchOrders()} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white shadow-sm cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by token, name, phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
          />
        </div>
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none shadow-sm cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
              status === s
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 dark:text-slate-500 font-medium">No orders found</p>
          </div>
        ) : (
          <>
            {/* Desktop table - Clicking ANYWHERE on a row opens the order */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40">
                    <th className="px-5 py-3 font-semibold">Token</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Files</th>
                    <th className="px-5 py-3 font-semibold">Pages</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                      className="hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {order.priority === "high" && (
                            <ArrowUp className="w-3 h-3 text-red-500" />
                          )}
                          <span className="font-black text-indigo-700 dark:text-indigo-400 text-base">{order.token}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {order.customerName || "Walk-in"}
                        </p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400 dark:text-slate-500">{order.customerPhone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300">{order.totalFiles}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300">{order.totalPages}</td>
                      <td className="px-5 py-3 text-sm">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{order.colorMode === "bw" ? "B&W" : "Color"}</span>
                        <span className="text-gray-400 dark:text-slate-500"> · {order.paperSize}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400 dark:text-slate-500 font-medium">
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${STATUS_COLORS[order.status] || ""}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                          {order.estimatedPrice ? `₹${order.estimatedPrice}` : "—"}
                        </p>
                        {order.paymentStatus === "VERIFICATION_REQUIRED" ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 animate-pulse">
                              <Volume2 className="w-3 h-3 text-purple-600" />
                              Awaiting Soundbox
                            </span>
                            <button
                              onClick={(e) => confirmPayment(e, order)}
                              disabled={confirmingId === order.id}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition-colors cursor-pointer"
                              title="Confirm PhonePe Soundbox Announcement"
                            >
                              {confirmingId === order.id ? "..." : "✓ Confirm"}
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                              order.paymentStatus === "PAID" || order.paymentStatus === "paid"
                                ? order.paymentMethod === "upi"
                                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                            }`}
                          >
                            {order.paymentStatus === "PAID" || order.paymentStatus === "paid"
                              ? order.paymentMethod === "upi"
                                ? "Paid (UPI)"
                                : "Paid (Cash)"
                              : "Unpaid"}
                          </span>
                        )}
                        {order.utr && (
                          <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-[140px]">
                            UTR: {order.utr}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => deleteOrder(e, order)}
                            disabled={deletingId === order.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                            title="Delete Client Order"
                          >
                            {deletingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 active:bg-indigo-100/50 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-indigo-100/70 dark:bg-indigo-950/70 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm">{order.token}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {order.customerName || "Walk-in"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {order.totalFiles} files · {order.colorMode === "bw" ? "B&W" : "Color"} · {order.paperSize} · {order.estimatedPrice ? `₹${order.estimatedPrice}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {order.paymentStatus === "VERIFICATION_REQUIRED" ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 animate-pulse">
                            <Volume2 className="w-3 h-3 text-purple-600" />
                            Awaiting Soundbox
                          </span>
                          <button
                            onClick={(e) => confirmPayment(e, order)}
                            disabled={confirmingId === order.id}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm cursor-pointer"
                          >
                            {confirmingId === order.id ? "..." : "✓ Confirm"}
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            order.paymentStatus === "PAID" || order.paymentStatus === "paid"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {order.paymentStatus === "PAID" || order.paymentStatus === "paid"
                            ? `Paid (${order.paymentMethod === "upi" ? "UPI" : "Cash"})`
                            : "Unpaid"}
                        </span>
                      )}
                      {order.utr && (
                        <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                          UTR: {order.utr}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_COLORS[order.status] || ""}`}>
                      {order.status}
                    </span>
                    <button
                      onClick={(e) => deleteOrder(e, order)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="Delete Client Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
