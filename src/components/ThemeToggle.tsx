"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || (isCurrentlyDark ? "dark" : "light");
    
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.style.colorScheme = "light";
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-800/50 border border-slate-700 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
        theme === "dark"
          ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 shadow-sm ring-1 ring-amber-400/20"
          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 shadow-sm"
      } ${className}`}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-300" />
      )}
    </button>
  );
}
