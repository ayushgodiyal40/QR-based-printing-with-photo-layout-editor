"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Printer, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign-in error:", result.error);
        setError("Invalid email or password.");
        setLoading(false);
      } else {
        setSuccess(true);
        // Clean full navigation forces the browser to send fresh auth cookies to the server
        // and completely eliminates Next.js App Router client-side prefetch/cache lockups
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 pr-12 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success}
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all disabled:opacity-80 flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
      >
        {success ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-pulse" />
            Redirecting to dashboard...
          </>
        ) : loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PrintShop Admin</h1>
          <p className="text-neutral-400 text-sm mt-1">Sign in to your dashboard</p>
        </div>

        {/* Form wrapped in Suspense */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-8 shadow-2xl">
          <Suspense fallback={<div className="text-neutral-400 text-center py-4">Loading form...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          Don&apos;t have an account?{" "}
          <a href="/setup" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline transition-colors">
            Create new account
          </a>
        </p>
      </div>
    </div>
  );
}
