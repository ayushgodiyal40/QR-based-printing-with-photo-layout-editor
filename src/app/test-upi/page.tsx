"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  QrCode,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { UPI_TEST_VARIANTS } from "@/lib/upi";

interface TestResult {
  browserNavigated: boolean;
  appOpened: string;
  receiverShown: boolean;
  receiverName: string;
  amountShown: string;
  reachedConfirmScreen: boolean;
  paymentSucceeded: boolean;
  errorMessage: string;
  callbackReturned: string;
}

const DEFAULT_RESULTS: Record<string, TestResult> = {
  minimal: {
    browserNavigated: true,
    appOpened: "Google Pay",
    receiverShown: false,
    receiverName: "",
    amountShown: "",
    reachedConfirmScreen: false,
    paymentSucceeded: false,
    errorMessage: "",
    callbackReturned: "None (Standard UPI Intent does not send web callbacks)",
  },
  withName: {
    browserNavigated: true,
    appOpened: "Google Pay",
    receiverShown: false,
    receiverName: "",
    amountShown: "",
    reachedConfirmScreen: false,
    paymentSucceeded: false,
    errorMessage: "",
    callbackReturned: "None (Standard UPI Intent does not send web callbacks)",
  },
  full: {
    browserNavigated: true,
    appOpened: "Google Pay",
    receiverShown: false,
    receiverName: "",
    amountShown: "",
    reachedConfirmScreen: false,
    paymentSucceeded: false,
    errorMessage: "",
    callbackReturned: "None (Standard UPI Intent does not send web callbacks)",
  },
};

export default function UpiDiagnosticPage() {
  const [activeTab, setActiveTab] = useState<"full" | "withName" | "minimal">("full");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [showQr, setShowQr] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>(DEFAULT_RESULTS);
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  // Telemetry: track when user switches away to UPI app and returns
  useEffect(() => {
    const handleBlur = () => {
      const time = new Date().toLocaleTimeString();
      setEventLogs((prev) => [`[${time}] Browser lost focus (UPI app opened)`, ...prev]);
    };

    const handleFocus = () => {
      const time = new Date().toLocaleTimeString();
      const currentUrl = window.location.href;
      const params = window.location.search;
      const hash = window.location.hash;
      const callbackInfo = params || hash ? `Callback params: ${params || hash}` : "No web callback parameters returned";
      setEventLogs((prev) => [
        `[${time}] Browser regained focus (Returned from UPI app). ${callbackInfo}`,
        ...prev,
      ]);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Generate QR codes for the 3 test variants
  useEffect(() => {
    Object.entries(UPI_TEST_VARIANTS).forEach(([key, uri]) => {
      if (typeof uri === "string" && uri.startsWith("upi://")) {
        QRCode.toDataURL(uri, { margin: 1, width: 260 }, (err, url) => {
          if (!err && url) {
            setQrCodes((prev) => ({ ...prev, [key]: url }));
          }
        });
      }
    });
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const launchUpi = (uri: string, name: string) => {
    const time = new Date().toLocaleTimeString();
    setEventLogs((prev) => [`[${time}] Triggering launch for: ${name}`, ...prev]);
    // TEST C: Strictly standard upi://pay scheme
    window.location.href = uri;
  };

  const updateResult = (key: string, field: keyof TestResult, value: any) => {
    setResults((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const tests = [
    {
      id: "full",
      title: "Test 3 — Full Intent URI (TEST A)",
      description: "Standard UPI Intent with VPA, Payee Name, Amount, Currency, and Order Note.",
      uri: UPI_TEST_VARIANTS.full,
      decoded: decodeURIComponent(UPI_TEST_VARIANTS.full),
    },
    {
      id: "withName",
      title: "Test 2 — VPA + Payee Name + Amount",
      description: "Standard UPI Intent without transaction note parameter.",
      uri: UPI_TEST_VARIANTS.withName,
      decoded: decodeURIComponent(UPI_TEST_VARIANTS.withName),
    },
    {
      id: "minimal",
      title: "Test 1 — Minimal URI (VPA + Amount + Currency)",
      description: "Absolute bare minimum standard UPI URI with no optional parameters.",
      uri: UPI_TEST_VARIANTS.minimal,
      decoded: decodeURIComponent(UPI_TEST_VARIANTS.minimal),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                UPI & Google Pay A/B Diagnostic Bench
              </h1>
              <p className="text-xs text-slate-400">
                Merchant VPA: <span className="font-mono text-emerald-400 font-bold">{UPI_TEST_VARIANTS.vpa}</span> • Shop: Godiyal General Store
              </p>
            </div>
          </div>
          <button
            onClick={() => setEventLogs([])}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear Logs
          </button>
        </div>

        {/* Notice */}
        <div className="p-4 bg-indigo-950/40 border border-indigo-800/80 rounded-2xl text-xs space-y-1.5 text-indigo-200">
          <p className="font-bold flex items-center gap-1.5 text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400" /> Diagnostic Objective
          </p>
          <p className="text-[11px] leading-relaxed text-indigo-300/90">
            This tool isolates whether the failure in Google Pay (<em>&ldquo;Your money has not been debited. You are unable to make this payment at the moment&rdquo;</em>) is caused by: (1) URI parameter encoding, (2) Browser-to-app intent handoff, (3) Bank risk engine blocking web intent to offline merchant VPA, or (4) Google Pay response handling.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {tests.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* Active Test Card */}
        {tests
          .filter((t) => t.id === activeTab)
          .map((test) => (
            <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">{test.title}</h2>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                    TEST AMOUNT: ₹1.00
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{test.description}</p>
              </div>

              {/* Exact URI Display (TEST A) */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Exact Final Raw URI (Passed to Browser):
                    </span>
                    <button
                      onClick={() => copyToClipboard(test.uri, `${test.id}-raw`)}
                      className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {copiedKey === `${test.id}-raw` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedKey === `${test.id}-raw` ? "Copied!" : "Copy Raw URI"}
                    </button>
                  </div>
                  <div className="p-3 bg-black rounded-xl text-emerald-400 select-all break-all border border-slate-800/80">
                    {test.uri}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Decoded URI Form:
                    </span>
                    <button
                      onClick={() => copyToClipboard(test.decoded, `${test.id}-decoded`)}
                      className="text-xs text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {copiedKey === `${test.id}-decoded` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedKey === `${test.id}-decoded` ? "Copied!" : "Copy Decoded URI"}
                    </button>
                  </div>
                  <div className="p-3 bg-black rounded-xl text-amber-300 select-all break-all border border-slate-800/80">
                    {test.decoded}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Launch (TEST C) & Copy (TEST B) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => launchUpi(test.uri, test.title)}
                  className="sm:col-span-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-indigo-950 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Smartphone className="w-4 h-4" />
                  Launch via Standard upi://pay
                </button>

                <button
                  onClick={() => copyToClipboard(test.uri, `${test.id}-btn`)}
                  className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedKey === `${test.id}-btn` ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedKey === `${test.id}-btn` ? "Unaltered URI Copied" : "Copy UPI URI"}
                </button>
              </div>

              {/* Dynamic QR Toggle */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowQr((prev) => ({ ...prev, [test.id]: !prev[test.id] }))}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  {showQr[test.id] ? "Hide Dynamic QR" : "Show Dynamic QR for this URI"}
                </button>

                {showQr[test.id] && qrCodes[test.id] && (
                  <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 inline-block text-center animate-scale-in">
                    <div className="bg-white p-3 rounded-xl inline-block">
                      <img src={qrCodes[test.id]} alt="Dynamic QR" className="w-48 h-48 mx-auto" />
                    </div>
                    <p className="text-xs text-slate-300 font-bold mt-2">
                      Scan directly with Google Pay or PhonePe Camera
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Bypasses web browser intent restrictions completely
                    </p>
                  </div>
                )}
              </div>

              {/* Observation Capture Questionnaire (TEST D) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Record Observations for this Test (TEST D)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* 1. App Opened */}
                  <div>
                    <label className="text-slate-400 block mb-1">2. Which UPI app opened?</label>
                    <input
                      type="text"
                      value={results[test.id].appOpened}
                      onChange={(e) => updateResult(test.id, "appOpened", e.target.value)}
                      placeholder="e.g. Google Pay / PhonePe / Chooser Dialog"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* 3 & 4. Receiver Shown */}
                  <div>
                    <label className="text-slate-400 block mb-1">3 & 4. Receiver name shown in app?</label>
                    <input
                      type="text"
                      value={results[test.id].receiverName}
                      onChange={(e) => updateResult(test.id, "receiverName", e.target.value)}
                      placeholder="e.g. Godiyal General Store / Blank / Not shown"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* 5. Amount Shown */}
                  <div>
                    <label className="text-slate-400 block mb-1">5. Amount shown in app?</label>
                    <input
                      type="text"
                      value={results[test.id].amountShown}
                      onChange={(e) => updateResult(test.id, "amountShown", e.target.value)}
                      placeholder="e.g. ₹1.00 / Empty / Editable"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* 6. Reached Confirmation Screen */}
                  <div>
                    <label className="text-slate-400 block mb-1">6. Reached MPIN / Payment Screen?</label>
                    <select
                      value={results[test.id].reachedConfirmScreen ? "yes" : "no"}
                      onChange={(e) => updateResult(test.id, "reachedConfirmScreen", e.target.value === "yes")}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="no">No (Declined before MPIN)</option>
                      <option value="yes">Yes (Prompted for UPI PIN)</option>
                    </select>
                  </div>

                  {/* 7. Exact Error Message */}
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1">7. Exact Error Message displayed by app:</label>
                    <input
                      type="text"
                      value={results[test.id].errorMessage}
                      onChange={(e) => updateResult(test.id, "errorMessage", e.target.value)}
                      placeholder="e.g. Your money has not been debited. You are unable to make this payment at the moment."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-red-400 font-mono text-[11px] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* 8. Payment Succeeded */}
                  <div>
                    <label className="text-slate-400 block mb-1">Did ₹1.00 payment succeed?</label>
                    <select
                      value={results[test.id].paymentSucceeded ? "yes" : "no"}
                      onChange={(e) => updateResult(test.id, "paymentSucceeded", e.target.value === "yes")}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="no">No (Payment Failed / Declined)</option>
                      <option value="yes">Yes (Payment Successful)</option>
                    </select>
                  </div>

                  {/* 9. Web Callback */}
                  <div>
                    <label className="text-slate-400 block mb-1">8 & 9. Returned to website with data?</label>
                    <input
                      type="text"
                      value={results[test.id].callbackReturned}
                      onChange={(e) => updateResult(test.id, "callbackReturned", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* Live Browser Telemetry Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Live Browser & Intent Events Log
          </h3>
          <div className="bg-black p-3 rounded-2xl border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto space-y-1">
            {eventLogs.length === 0 ? (
              <p className="text-slate-600 italic">No intent events logged yet. Tap &ldquo;Launch&rdquo; above to test.</p>
            ) : (
              eventLogs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>

        {/* Generated A/B Results Table (Matches User Requested Format) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              A/B Test Results Summary Table
            </h3>
            <button
              onClick={() => {
                const markdown = `| Test | URI | Google Pay opens? | Receiver shown? | Amount shown? | Payment succeeds? | Error |\n| --- | --- | --- | --- | --- | --- | --- |\n| Test 1 (Minimal) | \`${UPI_TEST_VARIANTS.minimal}\` | ${results.minimal.appOpened ? "Yes" : "No"} | ${results.minimal.receiverName || "No"} | ${results.minimal.amountShown || "—"} | ${results.minimal.paymentSucceeded ? "Yes" : "No"} | ${results.minimal.errorMessage || "—"} |\n| Test 2 (With Name) | \`${UPI_TEST_VARIANTS.withName}\` | ${results.withName.appOpened ? "Yes" : "No"} | ${results.withName.receiverName || "No"} | ${results.withName.amountShown || "—"} | ${results.withName.paymentSucceeded ? "Yes" : "No"} | ${results.withName.errorMessage || "—"} |\n| Test 3 (Full Intent) | \`${UPI_TEST_VARIANTS.full}\` | ${results.full.appOpened ? "Yes" : "No"} | ${results.full.receiverName || "No"} | ${results.full.amountShown || "—"} | ${results.full.paymentSucceeded ? "Yes" : "No"} | ${results.full.errorMessage || "—"} |`;
                copyToClipboard(markdown, "table-md");
              }}
              className="text-xs text-indigo-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
            >
              {copiedKey === "table-md" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === "table-md" ? "Table Copied!" : "Copy Table Markdown"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border-b border-slate-800">Test</th>
                  <th className="p-2.5 border-b border-slate-800">Google Pay opens?</th>
                  <th className="p-2.5 border-b border-slate-800">Receiver shown?</th>
                  <th className="p-2.5 border-b border-slate-800">Amount shown?</th>
                  <th className="p-2.5 border-b border-slate-800">Payment succeeds?</th>
                  <th className="p-2.5 border-b border-slate-800">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                <tr>
                  <td className="p-2.5 font-bold text-white font-sans">1. Minimal</td>
                  <td className="p-2.5 text-emerald-400">{results.minimal.appOpened ? "Yes" : "No"}</td>
                  <td className="p-2.5">{results.minimal.receiverName || "—"}</td>
                  <td className="p-2.5">{results.minimal.amountShown || "—"}</td>
                  <td className="p-2.5 text-red-400">{results.minimal.paymentSucceeded ? "Yes" : "No"}</td>
                  <td className="p-2.5 text-red-400">{results.minimal.errorMessage || "—"}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white font-sans">2. With Name</td>
                  <td className="p-2.5 text-emerald-400">{results.withName.appOpened ? "Yes" : "No"}</td>
                  <td className="p-2.5">{results.withName.receiverName || "—"}</td>
                  <td className="p-2.5">{results.withName.amountShown || "—"}</td>
                  <td className="p-2.5 text-red-400">{results.withName.paymentSucceeded ? "Yes" : "No"}</td>
                  <td className="p-2.5 text-red-400">{results.withName.errorMessage || "—"}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white font-sans">3. Full Intent</td>
                  <td className="p-2.5 text-emerald-400">{results.full.appOpened ? "Yes" : "No"}</td>
                  <td className="p-2.5">{results.full.receiverName || "—"}</td>
                  <td className="p-2.5">{results.full.amountShown || "—"}</td>
                  <td className="p-2.5 text-red-400">{results.full.paymentSucceeded ? "Yes" : "No"}</td>
                  <td className="p-2.5 text-red-400">{results.full.errorMessage || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
