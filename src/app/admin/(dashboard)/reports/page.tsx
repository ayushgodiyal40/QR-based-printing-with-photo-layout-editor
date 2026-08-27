"use client";

import { useEffect, useState } from "react";
import { BarChart2, Download, Loader2 } from "lucide-react";

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    fetch("/api/admin/orders?limit=500&status=all")
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, []);

  const filterByPeriod = (orders: any[]) => {
    const now = new Date();
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "week") return (now.getTime() - d.getTime()) < 7 * 86400000;
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filtered = filterByPeriod(orders);
  const totalRevenue = filtered.reduce((s, o) => s + parseFloat(o.estimatedPrice || "0"), 0);
  const totalPages = filtered.reduce((s, o) => s + (o.totalPages || 0), 0);
  const bwOrders = filtered.filter((o) => o.colorMode === "bw").length;
  const colorOrders = filtered.filter((o) => o.colorMode === "color").length;
  const completed = filtered.filter((o) => o.status === "completed").length;

  const exportCSV = () => {
    const header = ["Order","Token","Customer","Files","Pages","Color","Paper","Copies","Price","Status","Date"];
    const rows = filtered.map((o) => [
      o.orderNumber, o.token, o.customerName || "Walk-in",
      o.totalFiles, o.totalPages, o.colorMode, o.paperSize,
      o.copies, o.estimatedPrice || "0", o.status,
      new Date(o.createdAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${period}.csv`; a.click();
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Reports</h1>
        <div className="flex items-center gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none shadow-sm">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-md">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Orders", value: filtered.length },
          { label: "Completed", value: completed },
          { label: "Total Pages", value: totalPages },
          { label: "Revenue", value: `₹${totalRevenue.toFixed(0)}` },
          { label: "B&W / Color", value: `${bwOrders} / ${colorOrders}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Pages</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 100).map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-indigo-700">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{o.customerName || "Walk-in"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.totalPages}</td>
                    <td className="px-4 py-3 text-gray-600">{o.colorMode === "bw" ? "B&W" : "Color"} · {o.paperSize}</td>
                    <td className="px-4 py-3 font-medium">{o.estimatedPrice ? `₹${o.estimatedPrice}` : "—"}</td>
                    <td className="px-4 py-3 capitalize text-xs">{o.status}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400">No orders in this period</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
