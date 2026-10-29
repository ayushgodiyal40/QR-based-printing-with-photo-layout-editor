import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions - PrintShop",
  description: "Terms and conditions of service for PrintShop users and print shops.",
};

export default function TermsPage() {
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Terms and Conditions</h1>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Last updated: October 2026
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing PrintShop, scanning a counter QR code, or uploading documents for printing,
              you agree to comply with and be bound by these terms. If you do not agree with any
              part of these terms, do not upload files.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              2. User Content and Acceptable Use
            </h2>
            <p className="mb-3">
              You retain full ownership of any document or image you submit. By uploading content,
              you represent and warrant that:
            </p>
            <div className="space-y-2 text-xs text-slate-600 dark:text-neutral-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <span>You own the copyright or have explicit permission to duplicate the file.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <span>The material does not violate applicable local, national, or international laws.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <span>The content is not unlawful, defamatory, or infringing on intellectual property rights.</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              3. Pricing, Printing, and Payment
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-neutral-400">
              <li>Price calculations displayed upon file upload are estimates based on standard rate sheets.</li>
              <li>Final prices are confirmed and finalized by the operator at the counter.</li>
              <li>Payments are made directly between customer and shop (via cash, shop UPI QR, or configured gateway).</li>
              <li>Print jobs started or completed per customer specification may not be refunded.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              4. File Storage and Disposal
            </h2>
            <p>
              PrintShop is a print queuing service, not an archival storage platform. Uploaded
              files may be deleted automatically after a designated retention period or when marked
              completed by the operator. Users are responsible for maintaining their own backup copies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              5. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, PrintShop and its operators shall
              not be held liable for printer hardware malfunctions, delays in job processing, or
              loss of digital files after delivery.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-neutral-800">
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              For inquiries regarding service terms or counter disputes, please contact the shop
              administration where the order token was issued.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
