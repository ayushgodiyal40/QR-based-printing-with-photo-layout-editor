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

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/qr").then((r) => r.json()),
    ]).then(([settingsData, qrDataRes]) => {
      if (settingsData.shop) {
        setShop(settingsData.shop);
        setName(settingsData.shop.name || "");
        setAddress(settingsData.shop.address || "");
        setPhone(settingsData.shop.phone || "");
        setGstNumber(settingsData.shop.gstNumber || "");
      }
      if (qrDataRes.uploadUrl) setQrData(qrDataRes);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, phone, gstNumber }),
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
      <h1 className="text-2xl font-black text-gray-900">Settings</h1>

      {/* QR Code section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4">Your Shop QR Code</h2>
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          {qrData?.qrDataUrl && (
            <div className="flex-shrink-0">
              <img
                src={qrData.qrDataUrl}
                alt="Shop QR Code"
                className="w-48 h-48 rounded-2xl border-4 border-indigo-100"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Customer Upload URL</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <code className="text-sm text-indigo-700 flex-1 break-all">
                  {qrData?.uploadUrl}
                </code>
                <button
                  onClick={copyUrl}
                  className="text-gray-400 hover:text-indigo-600 flex-shrink-0"
                  title="Copy URL"
                >
                  {copied ? "✓" : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download QR (PNG)
              </button>
              {qrData?.uploadUrl && (
                <a
                  href={qrData.uploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:border-indigo-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Upload Page
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Print this QR code and display it at your shop counter. Customers scan it to send files.
            </p>
          </div>
        </div>
      </div>

      {/* Shop details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4">Shop Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {success ? "Saved! ✓" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
