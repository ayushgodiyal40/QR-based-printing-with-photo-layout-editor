"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, CheckCircle, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase/config";
import { signIn } from "next-auth/react";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [useGoogle, setUseGoogle] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ uploadUrl: string; slug: string } | null>(null);

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { user, idToken } = await signInWithGoogle();
      setGoogleIdToken(idToken);
      setAdminEmail(user.email || "");
      setAdminName(user.displayName || (user.email ? user.email.split("@")[0] : ""));
      setUseGoogle(true);
      setGoogleLoading(false);
    } catch (err: any) {
      console.error("Google connect error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Google sign-in popup was closed.");
      } else if (err?.code === "auth/unauthorized-domain") {
        const host = typeof window !== "undefined" ? window.location.hostname : "your domain";
        setError(`Unauthorized domain (${host}). Please add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      } else {
        setError(err.message || "Failed to connect with Google.");
      }
      setGoogleLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        shopName: shopName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      };

      if (useGoogle && googleIdToken) {
        payload.idToken = googleIdToken;
      } else {
        payload.adminPassword = adminPassword;
      }

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setError(data?.error || "Setup failed. Please try again.");
        setLoading(false);
        return;
      }

      // If registered with Google, automatically authenticate NextAuth session
      if (useGoogle && googleIdToken) {
        const authRes = await signIn("firebase", {
          idToken: googleIdToken,
          redirect: false,
        });

        if (authRes?.error) {
          console.error("Auto sign-in error:", authRes.error);
        }
      }

      setResult(data);
      setStep(3);
      setLoading(false);
    } catch (err: any) {
      console.error("Setup exception:", err);
      setError(err?.message || "An unexpected error occurred during setup.");
      setLoading(false);
    }
  };

  const isFormValid =
    shopName.trim().length > 0 &&
    adminName.trim().length > 0 &&
    (useGoogle ? Boolean(googleIdToken && adminEmail) : Boolean(adminEmail && adminPassword.length >= 8));

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PrintShop Setup</h1>
          <p className="text-neutral-400 text-sm mt-1">Create your print shop and owner account</p>
        </div>

        {step === 3 && result ? (
          // Success
          <div className="bg-neutral-950 rounded-3xl p-8 text-center border border-neutral-900 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Setup Complete!</h2>
            <p className="text-neutral-400 text-sm mb-6">Your shop is configured and ready for printing.</p>

            <div className="bg-neutral-900 rounded-2xl p-4 mb-6 text-left space-y-3 border border-neutral-800">
              <div>
                <p className="text-xs text-neutral-400">Admin Login URL</p>
                <p className="text-sm text-indigo-400 font-mono">/admin</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Customer Upload URL</p>
                <p className="text-sm text-indigo-400 font-mono">{result.uploadUrl}</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/admin/dashboard")}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Go to Admin Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-neutral-950 rounded-3xl p-8 border border-neutral-900 shadow-2xl space-y-5">
            {/* Google Quick Setup Option */}
            {!useGoogle ? (
              <div>
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={googleLoading || loading}
                  className="w-full py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-medium text-sm hover:bg-neutral-800 hover:border-neutral-700 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-xs cursor-pointer"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      Connecting with Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Quick Setup with Google
                    </>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-neutral-950 px-2 text-neutral-500 font-medium">Or enter details manually</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400">Signed in with Google</p>
                    <p className="text-sm font-medium text-white">{adminEmail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUseGoogle(false);
                    setGoogleIdToken(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-white underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Shop name */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Modern Xerox & Print Shop"
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

            {/* If NOT using Google, show Email and Password */}
            {!useGoogle && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>

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
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSetup}
              disabled={loading || !isFormValid}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up shop...
                </>
              ) : useGoogle ? (
                "Complete Setup with Google"
              ) : (
                "Create Shop & Admin Account"
              )}
            </button>
          </div>
        )}

        <p className="text-center text-neutral-500 text-xs mt-6">
          Already have an account?{" "}
          <a href="/admin" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline transition-colors">
            Sign in to Admin
          </a>
        </p>
      </div>
    </div>
  );
}
