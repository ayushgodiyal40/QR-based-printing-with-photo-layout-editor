"use client";

import { useEffect, useState, useRef } from "react";
import {
  CheckCircle,
  Clock,
  Printer,
  Package,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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
  createdAt: string;
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

export default function OrderTrackingClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  useEffect(() => {
    fetchOrder();

    // Connect SSE for real-time updates
    const es = new EventSource(`/api/sse/orders/${orderId}`);
    eventSourceRef.current = es;

    es.addEventListener("status_update", (e) => {
      const data = JSON.parse(e.data);
      setOrder((prev) => prev ? { ...prev, status: data.status } : prev);
    });

    es.onerror = () => {
      // Fallback to polling
      es.close();
    };

    // Polling fallback every 15 seconds
    const poll = setInterval(fetchOrder, 15000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [orderId]);

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
        <div className="glass-card rounded-3xl p-6 mb-5 animate-fade-in text-center">
          <p className="text-sm text-gray-500 mb-1">Your Token</p>
          <p className="text-5xl font-black text-indigo-700 tracking-wider">{order.token}</p>
          <p className="text-xs text-gray-400 mt-1">{order.orderNumber}</p>
        </div>

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
                    {i < STATUS_STEPS.length - 1 && (
                      <div className="absolute" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_STEPS.map((s) => (
                <p key={s} className="text-[9px] text-gray-400 text-center flex-1 capitalize">
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="glass-card rounded-2xl p-5 mb-5 animate-fade-in">
          <h2 className="font-semibold text-gray-800 mb-3">Order Details</h2>
          <div className="space-y-2 text-sm">
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Files</span>
              <span className="font-medium">{order.totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pages</span>
              <span className="font-medium">{order.totalPages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Print type</span>
              <span className="font-medium">{order.colorMode === "bw" ? "B&W" : "Color"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paper</span>
              <span className="font-medium">{order.paperSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Copies</span>
              <span className="font-medium">{order.copies}</span>
            </div>
            {order.estimatedPrice && (
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-700 font-medium">Estimated Price</span>
                <span className="font-bold text-indigo-700">₹{order.estimatedPrice}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Page updates automatically every 15 seconds.
        </p>
      </div>
    </div>
  );
}
