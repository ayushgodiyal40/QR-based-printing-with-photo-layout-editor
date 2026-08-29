"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RefreshCw } from "lucide-react";

const PAPER_SIZES = ["A4", "A3", "Letter", "Legal"] as const;
const COLOR_MODES = [
  { value: "bw", label: "Black & White" },
  { value: "color", label: "Color" },
];
const SIDES = [
  { value: "single", label: "Single-sided" },
  { value: "double", label: "Double-sided" },
];

interface Rule {
  paperSize: string;
  colorMode: string;
  sides: string;
  pricePerPage: string;
}

export default function PricingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetch_rules = async () => {
    const res = await fetch("/api/admin/pricing");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetch_rules(); }, []);

  const updateRule = (idx: number, price: string) => {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, pricePerPage: price } : r));
  };

  const saveRules = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: rules.map((r) => ({
          ...r,
          pricePerPage: parseFloat(r.pricePerPage) || 0,
        })),
      }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  // Group rules by paper size
  const grouped = PAPER_SIZES.map((paper) => ({
    paper,
    rules: rules.filter((r) => r.paperSize === paper),
  }));

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pricing</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Set your print prices per page</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch_rules} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300 shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 shadow-md cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {success ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(({ paper, rules: paperRules }) => (
          <div key={paper} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-gray-800 dark:text-white">{paper}</h2>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {paperRules.map((rule, idx) => {
                const globalIdx = rules.findIndex(
                  (r) => r.paperSize === rule.paperSize && r.colorMode === rule.colorMode && r.sides === rule.sides
                );
                return (
                  <div key={idx} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium text-sm text-gray-800 dark:text-slate-200">
                        {rule.colorMode === "bw" ? "Black & White" : "Color"} ·{" "}
                        {rule.sides === "single" ? "Single-sided" : "Double-sided"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={rule.pricePerPage}
                        onChange={(e) => updateRule(globalIdx, e.target.value)}
                        className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="text-gray-400 dark:text-slate-500 text-sm">/ page</span>
                    </div>
                  </div>
                );
              })}
              {paperRules.length === 0 && (
                <div className="px-5 py-4 text-sm text-gray-400 dark:text-slate-500">No rules configured</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 text-center">
        Changes apply to new orders. Existing orders are not affected.
      </p>
    </div>
  );
}
