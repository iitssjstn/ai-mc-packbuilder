"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Package, Puzzle, Activity, ScrollText, Settings, ArrowLeft, User, LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/packs", label: "Server Packs", icon: Package },
  { href: "/admin/plugins", label: "Plugin Registry", icon: Puzzle },
  { href: "/admin/ai-providers", label: "AI Providers", icon: Package },
  { href: "/admin/health", label: "System Health", icon: Activity },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Admin's own sidebar — visually distinct (amber-tinted accent instead
 * of emerald) from the regular app sidebar, same underlying design
 * system otherwise. Each section is its own route, not an anchor on one
 * giant page — /admin itself is the overview only. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    // Full-bleed breakout — admin routes have no NavBar/max-width
    // wrapper above them at all (see layout.tsx), but this stays
    // consistent with the same technique regardless.
    <div className="relative left-1/2 flex min-h-[calc(100vh-73px)] w-screen -translate-x-1/2">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-amber-500/20 bg-base-900 md:flex">
        <div className="border-b border-amber-500/20 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wider text-amber-400">Admin Panel</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-transparent text-slate-400 hover:border-amber-500/30 hover:bg-base-800 hover:text-amber-400"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-amber-500/20 p-3">
          <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-base-800 hover:text-slate-200">
            <ArrowLeft size={15} />
            Back to App
          </Link>
          <Link href="/account" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-base-800 hover:text-slate-200">
            <User size={15} />
            Account
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-base-800 hover:text-slate-200"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
