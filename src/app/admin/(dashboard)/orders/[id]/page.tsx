"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  Printer,
  AlertTriangle,
  MessageSquare,
  Send,
  ArrowUp,
  Clock,
} from "lucide-react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "received", label: "Received" },
  { value: "waiting", label: "Waiting" },
  { value: "processing", label: "Processing" },
  { value: "printing", label: "Printing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  received: "badge-received",
  waiting: "badge-waiting",
  processing: "badge-processing",
  printing: "badge-printing",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [printingFileId, setPrintingFileId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Editable settings
  const [editStatus, setEditStatus] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPaper, setEditPaper] = useState("");
  const [editCopies, setEditCopies] = useState(1);
  const [editSides, setEditSides] = useState("");
  const [editPriority, setEditPriority] = useState("");

  const fetchOrder = async () => {
    const res = await fetch(`/api/admin/orders/${id}`);
    if (!res.ok) { setError("Order not found."); setLoading(false); return; }
    const data = await res.json();
    setOrder(data.order);
    setFiles(data.files || []);
    setNotes(data.notes || []);
    setEditStatus(data.order.status);
    setEditColor(data.order.colorMode);
    setEditPaper(data.order.paperSize);
    setEditCopies(data.order.copies);
    setEditSides(data.order.sides);
    setEditPriority(data.order.priority);
    setLoading(false);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const saveChanges = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        colorMode: editColor,
        paperSize: editPaper,
        copies: editCopies,
        sides: editSides,
        priority: editPriority,
        ...(note ? { note } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
      setNote("");
      fetchOrder();
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNote("");
    fetchOrder();
    setAddingNote(false);
  };

  const openPreview = async (file: any) => {
    const res = await fetch(`/api/admin/orders/${id}/files/${file.id}?action=url`);
    if (res.ok) {
      const { url } = await res.json();
      setPreviewUrl(url);
      setPreviewFile(file);
    }
  };

  const downloadFile = async (file: any) => {
    const res = await fetch(`/api/admin/orders/${id}/files/${file.id}?action=download`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName;
      a.click();
    }
  };

  const printFile = async (file: any) => {
    try {
      setPrintingFileId(file.id);
      const isPdf =
        file.mimeType === "application/pdf" ||
        file.originalName.toLowerCase().endsWith(".pdf");

      const res = await fetch(`/api/admin/orders/${id}/files/${file.id}?action=url`);
      if (!res.ok) throw new Error("Failed to get file URL");
      const { url } = await res.json();

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      if (isPdf) {
        iframe.src = url;
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (err) {
              console.error("Direct PDF print error:", err);
            } finally {
              setPrintingFileId(null);
              setTimeout(() => {
                try {
                  document.body.removeChild(iframe);
                } catch {}
              }, 60000);
            }
          }, 600);
        };
      } else {
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${file.originalName}</title>
                <style>
                  @page { margin: 0; size: auto; }
                  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                  img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${url}" onload="setTimeout(function(){ window.focus(); window.print(); }, 200);" />
              </body>
            </html>
          `);
          doc.close();
          setTimeout(() => {
            setPrintingFileId(null);
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch {}
            }, 60000);
          }, 1000);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initiate direct print. Try Preview instead.");
      setPrintingFileId(null);
    }
  };

  const deleteSingleFile = async (file: any) => {
    if (!confirm(`Delete unwanted file "${file.originalName}" from this order?`)) return;
    setDeletingFileId(file.id);
    const res = await fetch(`/api/admin/orders/${id}/files/${file.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchOrder();
    }
    setDeletingFileId(null);
  };

  const deleteEntireOrder = async () => {
    if (!confirm(`Are you sure you want to delete this client order (#${order.token}) permanently?`)) return;
    setDeletingOrder(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/admin/orders");
    } else {
      setDeletingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error || "Order not found"}</p>
        <Link href="/admin/orders" className="text-indigo-600 hover:underline mt-2 block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Back + Header + Delete Order Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link href="/admin/orders" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 shadow-sm mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900">{order.orderNumber}</h1>
              <span className={`badge ${STATUS_COLORS[order.status] || ""}`}>{order.status}</span>
              {order.priority === "high" && (
                <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  <ArrowUp className="w-3 h-3" /> Priority
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Token <strong className="text-indigo-700">{order.token}</strong> ·{" "}
              {new Date(order.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <button
          onClick={deleteEntireOrder}
          disabled={deletingOrder}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer shadow-sm"
        >
          {deletingOrder ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete Order
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Files */}
        <div className="lg:col-span-2 space-y-4">
          {/* Files */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">
              Files ({files.length})
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No files in this order.</p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
                      {file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf") ? (
                        <FileText className="w-5 h-5 text-red-500" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{file.originalName}</p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(file.sizeBytes)}
                        {file.pageCount && ` · ${file.pageCount} page${file.pageCount !== 1 ? "s" : ""}`}
                        {file.imageWidth && ` · ${file.imageWidth}×${file.imageHeight}px`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => printFile(file)}
                        disabled={printingFileId === file.id}
                        className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Print Directly (No download required)"
                      >
                        {printingFileId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openPreview(file)}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Preview File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadFile(file)}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSingleFile(file)}
                        disabled={deletingFileId === file.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Unwanted File"
                      >
                        {deletingFileId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Internal Notes
            </h2>
            {notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {notes.map((n) => (
                  <div key={n.id} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                    <p className="text-sm text-gray-700">{n.note}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <button
                onClick={addNote}
                disabled={addingNote || !note.trim()}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-3">Customer</h2>
            <p className="text-lg font-bold">{order.customerName || "Walk-in"}</p>
            {order.customerPhone && (
              <p className="text-sm text-gray-500">{order.customerPhone}</p>
            )}
          </div>

          {/* Order settings editor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Print Settings</h2>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {["normal", "high"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPriority(p)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                      editPriority === p
                        ? p === "high" ? "bg-red-600 text-white" : "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Color</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:"bw",l:"B&W"},{v:"color",l:"Color"}].map((c) => (
                  <button
                    key={c.v}
                    onClick={() => setEditColor(c.v)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      editColor === c.v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Paper</label>
              <div className="grid grid-cols-4 gap-1.5">
                {["A4","A3","Letter","Legal"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPaper(p)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      editPaper === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Copies</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditCopies(Math.max(1, editCopies - 1))}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{editCopies}</span>
                <button
                  onClick={() => setEditCopies(editCopies + 1)}
                  className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold"
                >+</button>
              </div>
            </div>

            {/* Sides */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">Sides</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:"single",l:"Single"},{v:"double",l:"Double"}].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setEditSides(s.v)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      editSides === s.v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Total pages</span>
                <span className="font-bold">{order.totalPages}</span>
              </div>
              {order.estimatedPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated price</span>
                  <span className="font-bold text-indigo-700">₹{order.estimatedPrice}</span>
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={saveChanges}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewUrl && previewFile && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}
        >
          <div
            className="bg-white rounded-3xl p-2 max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-semibold text-gray-800 truncate">{previewFile.originalName}</p>
              <button
                onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}
                className="text-gray-400 hover:text-gray-700"
              >✕</button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {previewFile.mimeType === "application/pdf" || previewFile.originalName.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-xl" />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewFile.originalName}
                  className="max-w-full max-h-[70vh] object-contain mx-auto rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
