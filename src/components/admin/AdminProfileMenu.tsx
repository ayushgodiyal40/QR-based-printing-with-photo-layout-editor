"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User,
  Settings,
  DollarSign,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Store,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { getFirebaseAuth } from "@/lib/firebase";
import { deleteUser, signOut as firebaseSignOut } from "firebase/auth";

interface AdminUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  shopName?: string;
}

export default function AdminProfileMenu({
  initialUser,
  initialShopName,
}: {
  initialUser?: AdminUser;
  initialShopName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(initialUser || null);
  const [loadingUser, setLoadingUser] = useState(!initialUser);
  const [signingOut, setSigningOut] = useState(false);

  // Deletion Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch admin user details if not provided
  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const cached = sessionStorage.getItem("admin_profile_me");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isMounted) {
            setUser(parsed);
            setLoadingUser(false);
          }
        }

        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.user) {
            setUser(data.user);
            sessionStorage.setItem("admin_profile_me", JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.removeItem("admin_settings_shop");
          localStorage.removeItem("admin_settings_qr");
          localStorage.removeItem("admin_profile_me");
        } catch {}
      }

      // Also sign out from client Firebase Auth if active
      const fbAuth = getFirebaseAuth();
      if (fbAuth?.currentUser) {
        try {
          await firebaseSignOut(fbAuth);
        } catch {}
      }

      await signOut({ callbackUrl: "/admin", redirect: true });
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/admin";
    }
  };

  const openDeleteModal = () => {
    setIsOpen(false);
    setDeleteStep(1);
    setConfirmInput("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const handleExecuteDeletion = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Please type DELETE to confirm account deletion.");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      let idToken: string | undefined;
      const fbAuth = getFirebaseAuth();

      if (fbAuth?.currentUser) {
        try {
          idToken = await fbAuth.currentUser.getIdToken(true);
        } catch (tokErr) {
          console.warn("Failed to get fresh Firebase token:", tokErr);
        }
      }

      // 1. Call backend account deletion endpoint
      const res = await fetch("/api/admin/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account. Please try again.");
      }

      // 2. Delete user from Firebase Auth client SDK if authenticated
      if (fbAuth?.currentUser) {
        try {
          await deleteUser(fbAuth.currentUser);
        } catch (fbDelErr) {
          console.warn("Client Firebase deleteUser note:", fbDelErr);
        }
      }

      // 3. Clear local caches
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.clear();
        } catch {}
      }

      // 4. Terminate NextAuth session and redirect to admin login
      await signOut({ callbackUrl: "/admin", redirect: true });
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      setDeleteError(err.message || "An error occurred while deleting your account.");
      setDeleting(false);
    }
  };

  const displayName = user?.name || "Print Shop Owner";
  const displayEmail = user?.email || "";
  const displayShop = user?.shopName || initialShopName || "Print Shop";

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Account Profile & Settings"
        aria-label="Account Profile & Settings"
        aria-expanded={isOpen}
        className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-neutral-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center"
      >
        <User className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User Header */}
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                {displayEmail && (
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                    {displayEmail}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-neutral-800 text-xs font-medium text-gray-700 dark:text-neutral-300 truncate">
              <Store className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{displayShop}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="py-1">
            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
              Shop Settings
            </Link>
            <Link
              href="/admin/pricing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <DollarSign className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
              Pricing Rules
            </Link>
          </div>

          {/* Sign Out Option */}
          <div className="py-1 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>

          {/* Delete Account Option */}
          <div className="pt-1 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={openDeleteModal}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* 2-Step Confirmation Modal for Account Deletion */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => !deleting && setDeleteModalOpen(false)}
              disabled={deleting}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step 1: Warning and Details */}
            {deleteStep === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      Delete Account & Shop?
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                      Step 1 of 2: Irreversible Action
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600 dark:text-neutral-300 bg-red-50/50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/40 mb-5">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Deleting your account will permanently remove:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-600 dark:text-neutral-400">
                    <li>Your print shop profile ({displayShop})</li>
                    <li>All customer orders, file uploads, and print queue history</li>
                    <li>Configured printers, pricing rates, and UPI payment settings</li>
                    <li>Your account login credentials from the database and Firebase</li>
                  </ul>
                  <p className="text-xs text-gray-700 dark:text-neutral-300 font-medium pt-1">
                    If you register again using this same email address in the future, you will have to set up your shop name and owner details from scratch as a brand new account.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-800 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(2);
                      setConfirmInput("");
                      setDeleteError("");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Final Confirmation Input */}
            {deleteStep === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      Final Confirmation
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                      Step 2 of 2: Verification Required
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
                  To permanently delete your account and all shop data, please type{" "}
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> in the box below:
                </p>

                <div className="mb-4">
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type DELETE"
                    disabled={deleting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1.5">
                      {deleteError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    disabled={deleting}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-800 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeletion}
                    disabled={confirmInput.trim().toUpperCase() !== "DELETE" || deleting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:text-gray-500 dark:disabled:text-neutral-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {deleting ? "Permanently Deleting..." : "Permanently Delete Everything"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
