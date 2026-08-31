"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, Copy, ExternalLink, Save } from "lucide-react";

export default function SettingsPage() {
  const [shop, setShop] = useState<any>(null);
  const [qrData, setQrData] = useState<{ uploadUrl: string; qrDataUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then(async (r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/admin/qr").then(async (r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([settingsData, qrDataRes]) => {
      if (settingsData?.shop) {
        setShop(settingsData.shop);
        setName(settingsData.shop.name || "");
        setAddress(settingsData.shop.address || "");
        setPhone(settingsData.shop.phone || "");
        setGstNumber(settingsData.shop.gstNumber || "");
        setUpiId(settingsData.shop.upiId || "");
        setUpiName(settingsData.shop.upiName || "");
      }
      if (qrDataRes?.uploadUrl) setQrData(qrDataRes);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, phone, gstNumber, upiId, upiName }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const copyUrl = () => {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData.qrDataUrl;
    a.download = "printshop-qr.png";
    a.click();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">Settings</h1>

      {/* QR Code section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 dark:text-white mb-4">Your Shop QR Code</h2>
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          {qrData?.qrDataUrl && (
            <div className="flex-shrink-0">
              <img
                src={qrData.qrDataUrl}
                alt="Shop QR Code"
                className="w-48 h-48 rounded-2xl border-4 border-indigo-100 dark:border-indigo-900 bg-white"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Customer Upload URL</p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/80 rounded-xl px-4 py-3 border border-gray-100 dark:border-slate-700">
                <code className="text-sm text-indigo-700 dark:text-indigo-400 flex-1 break-all">
                  {qrData?.uploadUrl}
                </code>
                <button
                  onClick={copyUrl}
                  className="text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex-shrink-0 cursor-pointer"
                  title="Copy URL"
                >
                  {copied ? "✓" : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download QR (PNG)
              </button>
              {qrData?.uploadUrl && (
                <a
                  href={qrData.uploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-sm font-medium hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Upload Page
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Print this QR code and display it at your shop counter. Customers scan it to send files.
            </p>
          </div>
        </div>
      </div>

      {/* Shop details */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 dark:text-white mb-4">Shop Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Shop Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PhonePe / Direct UPI Soundbox Payment section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-100 dark:border-purple-900/40 shadow-sm p-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-lg">
            ₹
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              PhonePe / Direct UPI Payment (Soundbox Integration)
              <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                0% Gateway Fees
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Money goes directly to your bank account with zero mediator cuts. When customers pay online, your shop Soundbox announces the payment out loud!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                PhonePe / UPI ID (VPA) *
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. 9876543210@ybl or merchant@axl"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Enter the exact PhonePe UPI handle linked with your shop Soundbox.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Payee / Merchant Display Name
              </label>
              <input
                type="text"
                value={upiName}
                onChange={(e) => setUpiName(e.target.value)}
                placeholder="e.g. Ayush Xerox & Print Studio"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Name visible to customer on PhonePe/GPay when paying.
              </p>
            </div>
          </div>

          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30 flex items-start gap-3">
            <div className="text-purple-600 dark:text-purple-400 font-bold text-lg mt-0.5">🔊</div>
            <div className="text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-semibold">How this works for you and your customers:</p>
              <ul className="list-disc list-inside space-y-0.5 text-purple-800 dark:text-purple-300">
                <li>Files and orders are sent <strong>immediately</strong> without blocking.</li>
                <li>Cash payers can just show their token and pay cash at the counter.</li>
                <li>Customers who prefer online payment will see a prefilled dynamic QR on their token screen to pay in 1-tap.</li>
                <li>Your <strong>PhonePe Soundbox</strong> in the shop will loudly announce: <em>&quot;PhonePe par ₹X prapt hue!&quot;</em></li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-60 shadow-md cursor-pointer transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {success ? "Saved! ✓" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
