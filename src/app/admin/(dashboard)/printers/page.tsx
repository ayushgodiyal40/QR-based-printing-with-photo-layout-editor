"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, Plus, Trash2, Circle } from "lucide-react";

export default function PrintersPage() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModel, setNewModel] = useState("");
  const [supportsColor, setSupportsColor] = useState(false);
  const [supportsDuplex, setSupportsDuplex] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPrinters = async () => {
    const res = await fetch("/api/admin/printers");
    if (res.ok) { const d = await res.json(); setPrinters(d.printers || []); }
    setLoading(false);
  };

  useEffect(() => { fetchPrinters(); }, []);

  const addPrinter = async () => {
    if (!newName) return;
    setSaving(true);
    await fetch("/api/admin/printers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, model: newModel, supportsColor, supportsDuplex }),
    });
    setNewName(""); setNewModel(""); setSupportsColor(false); setSupportsDuplex(false);
    setShowAdd(false);
    fetchPrinters();
    setSaving(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Printers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your print shop's printers</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Printer
        </button>
      </div>

      {/* Add printer form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 animate-fade-in">
          <h2 className="font-bold text-gray-800 mb-4">Add New Printer</h2>
          <div className="space-y-3">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Printer name (e.g. Canon G2020)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="text" value={newModel} onChange={(e) => setNewModel(e.target.value)}
              placeholder="Model (optional)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={supportsColor} onChange={(e) => setSupportsColor(e.target.checked)} className="rounded" />
                Supports Color
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={supportsDuplex} onChange={(e) => setSupportsDuplex(e.target.checked)} className="rounded" />
                Supports Duplex
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={addPrinter} disabled={saving || !newName}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Add Printer
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Printer list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Printer className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No printers added yet</p>
          <p className="text-gray-300 text-sm">Add your printers to track them on the dashboard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {printers.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Printer className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{p.name}</p>
                {p.model && <p className="text-sm text-gray-400">{p.model}</p>}
                <div className="flex gap-2 mt-1">
                  {p.supportsColor && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Color</span>}
                  {p.supportsDuplex && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">Duplex</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${p.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-gray-400">{p.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
