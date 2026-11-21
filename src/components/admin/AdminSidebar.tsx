"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconClipboardList,
  IconSparkles,
  IconPrinter,
  IconCurrencyRupee,
  IconReportAnalytics,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { motion } from "motion/react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function AdminSidebar({
  shopName,
  unreadCount = 0,
}: {
  shopName: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.removeItem("admin_settings_shop");
          localStorage.removeItem("admin_settings_qr");
        } catch {}
      }
      await signOut({ callbackUrl: "/admin", redirect: true });
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/admin";
    }
  };

  const navLinks = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: (
        <IconLayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: (
        <div className="relative">
          <IconClipboardList className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
          {unreadCount > 0 && !open && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      ),
    },
    {
      label: "Photo Studio",
      href: "/admin/studio",
      icon: (
        <IconSparkles className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Printers",
      href: "/admin/printers",
      icon: (
        <IconPrinter className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Pricing",
      href: "/admin/pricing",
      icon: (
        <IconCurrencyRupee className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: (
        <IconReportAnalytics className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {open ? <Logo shopName={shopName} /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-1.5">
            {navLinks.map((link, idx) => {
              const active = pathname.startsWith(link.href);
              return (
                <div key={idx} className="relative flex items-center">
                  <SidebarLink
                    link={link}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-xl transition-all",
                      active
                        ? "bg-neutral-900 text-white dark:bg-neutral-800 font-semibold shadow-xs"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                    )}
                  />
                  {link.label === "Orders" && unreadCount > 0 && open && (
                    <span className="ml-auto mr-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom controls: Signout & Theme Toggle */}
        <div className="flex flex-col gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <SidebarLink
              link={{
                label: signingOut ? "Signing out..." : "Signout",
                href: "#",
                icon: (
                  <IconLogout
                    className={cn(
                      "h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200",
                      signingOut && "animate-spin text-red-500"
                    )}
                  />
                ),
              }}
              onClick={handleSignOut}
              className="flex-1 px-2.5 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            />
            {open && (
              <div className="mr-1">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

export const Logo = ({ shopName }: { shopName: string }) => {
  return (
    <Link
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-7 w-7 shrink-0 rounded-full bg-black flex items-center justify-center border border-neutral-700 shadow-xs">
        <svg viewBox="0 0 256 256" className="w-4 h-4 fill-white">
          <polygon points="128,64 64,174 192,174" />
        </svg>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col min-w-0"
      >
        <span className="font-bold text-sm truncate text-neutral-900 dark:text-white leading-tight">
          {shopName}
        </span>
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
          Admin Panel
        </span>
      </motion.div>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/admin/dashboard"
      className="relative z-20 flex items-center justify-center py-1 text-sm font-normal"
      title="PrintShop Admin"
    >
      <div className="h-7 w-7 shrink-0 rounded-full bg-black flex items-center justify-center border border-neutral-700 shadow-xs">
        <svg viewBox="0 0 256 256" className="w-4 h-4 fill-white">
          <polygon points="128,64 64,174 192,174" />
        </svg>
      </div>
    </Link>
  );
};
