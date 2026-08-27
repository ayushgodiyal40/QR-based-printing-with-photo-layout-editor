"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  Clock,
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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams({ status, sort, limit: "100" });
    const res = await fetch(`/api/admin/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [status, sort]);

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
        <h1 className="text-2xl font-black text-gray-900">Orders</h1>
        <button onClick={fetchOrders} className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 shadow-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by token, name, phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
          />
        </div>
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none shadow-sm"
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
            className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
              status === s
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">No orders found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="px-5 py-3 font-semibold">Token</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Files</th>
                    <th className="px-5 py-3 font-semibold">Pages</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {order.priority === "high" && (
                            <ArrowUp className="w-3 h-3 text-red-500" />
                          )}
                          <span className="font-black text-indigo-700">{order.token}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-sm text-gray-800">
                          {order.customerName || "Walk-in"}
                        </p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400">{order.customerPhone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{order.totalFiles}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{order.totalPages}</td>
                      <td className="px-5 py-3 text-sm">
                        <span className="font-medium">{order.colorMode === "bw" ? "B&W" : "Color"}</span>
                        <span className="text-gray-400"> · {order.paperSize}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">
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
                      <td className="px-5 py-3 text-sm font-medium text-gray-700">
                        {order.estimatedPrice ? `₹${order.estimatedPrice}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 hover:text-indigo-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <span className="font-black text-indigo-700 text-sm">{order.token}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{order.customerName || "Walk-in"}</p>
                    <p className="text-xs text-gray-400">
                      {order.totalFiles} files · {order.colorMode === "bw" ? "B&W" : "Color"} · {order.paperSize}
                    </p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[order.status] || ""}`}>
                    {order.status}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
