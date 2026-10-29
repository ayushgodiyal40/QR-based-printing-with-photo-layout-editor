import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, Trash2, EyeOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - PrintShop",
  description: "Privacy policy and document handling practices for PrintShop.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Effective date: October 2026
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              1. Overview
            </h2>
            <p>
              PrintShop provides a direct document transfer and printing workflow between customers
              and print shops via QR code. We believe your files are strictly private. We do not
              monetize personal data or sell customer information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              2. Information We Collect
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950">
                <Lock className="w-4 h-4 text-slate-700 dark:text-neutral-300 mb-2" />
                <p className="font-semibold text-xs text-slate-900 dark:text-white mb-1">Uploaded Files</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  PDFs and images you upload exclusively to execute your requested print job.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950">
                <EyeOff className="w-4 h-4 text-slate-700 dark:text-neutral-300 mb-2" />
                <p className="font-semibold text-xs text-slate-900 dark:text-white mb-1">Order Identifiers</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  Customer name (optional), token number, page counts, and selected print settings.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950">
                <Trash2 className="w-4 h-4 text-slate-700 dark:text-neutral-300 mb-2" />
                <p className="font-semibold text-xs text-slate-900 dark:text-white mb-1">Retention Window</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  Files are temporary and automatically purged following print completion or expiration.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              3. How Uploaded Files Are Handled
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-neutral-400">
              <li>Files are transferred over secure HTTPS connections.</li>
              <li>Only the authorized print shop operator can access your file to execute printing.</li>
              <li>Files are never indexed by search engines or shared with third-party advertisers.</li>
              <li>Documents can be manually purged by operators immediately after printing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              4. Cookies and Local Storage
            </h2>
            <p>
              We use minimal local storage purely to remember theme preferences and maintain active
              order tracking sessions on your device. We do not use third-party tracking pixels or
              marketing cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              5. Operator Responsibilities
            </h2>
            <p>
              Print shop administrators are responsible for their local hardware, physical copies,
              and compliance with regional privacy regulations governing customer documents printed
              at their counters.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-neutral-800">
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Questions regarding file privacy or requests for immediate deletion should be directed
              to the counter operator handling your order token.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
