"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uploadUrl: string; slug: string } | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    let res: Response;
    try {
      res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, adminName, adminEmail, adminPassword }),
      });
    } catch {
      setError("Network error — could not reach the server. Is the dev server running?");
      setLoading(false);
      return;
    }

    // Safely parse JSON — server might return HTML on crash
    let data: any;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      setError(
        res.ok
          ? "Unexpected server response. Check the terminal for errors."
          : `Server error (${res.status}). Check the terminal for details.`
      );
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(
        data?.error ||
          (res.status === 503
            ? "Database not connected. Set DATABASE_URL in .env.local and run: npm run db:push"
            : "Setup failed. Please check the server terminal for errors.")
      );
      setLoading(false);
      return;
    }

    setResult(data);
    setStep(3);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PrintShop Setup</h1>
          <p className="text-neutral-400 text-sm mt-1">First-time configuration wizard</p>
        </div>

        {step === 3 && result ? (
          // Success
          <div className="bg-neutral-950 rounded-3xl p-8 text-center border border-neutral-900 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Setup Complete!</h2>
            <p className="text-neutral-400 text-sm mb-6">Your print shop is ready to use.</p>

            <div className="bg-neutral-900 rounded-2xl p-4 mb-6 text-left space-y-3 border border-neutral-800">
              <div>
                <p className="text-xs text-neutral-400">Admin login URL</p>
                <p className="text-sm text-indigo-400 font-mono">/admin</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Customer upload URL</p>
                <p className="text-sm text-indigo-400 font-mono">{result.uploadUrl}</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/admin")}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Go to Admin Dashboard →
            </button>
          </div>
        ) : (
          <div className="bg-neutral-950 rounded-3xl p-8 border border-neutral-900 shadow-2xl space-y-5">
            {/* Shop name */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Rajesh Print Center"
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Admin name */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Owner Name *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Admin email */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Admin Email *
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yourshop.com"
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Admin password */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Admin Password * (min 8 characters)
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSetup}
              disabled={loading || !shopName || !adminEmail || !adminPassword || adminPassword.length < 8}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                "Create Shop & Admin Account →"
              )}
            </button>
          </div>
        )}

        <p className="text-center text-neutral-500 text-xs mt-6">
          Already configured?{" "}
          <a href="/admin" className="text-indigo-400 hover:underline">
            Sign in to Admin
          </a>
        </p>
      </div>
    </div>
  );
}
