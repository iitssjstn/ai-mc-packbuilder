"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sparkles, FolderOpen, User, Menu, X } from "lucide-react";

const NAV = [
  { href: "/builder", label: "AI Builder", icon: Sparkles },
  { href: "/packs", label: "My Server Packs", icon: FolderOpen },
  { href: "/account", label: "Account", icon: User },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border border-transparent text-slate-400 hover:bg-base-800 hover:text-slate-200"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Persistent sidebar + main content shell for the authenticated app
 * (Packs, Account). The Builder page has its own specialized sidebar
 * (conversation list) instead of this generic one. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      <aside className="hidden w-56 shrink-0 border-r border-base-700 bg-base-900 md:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile off-canvas drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-56 border-r border-base-700 bg-base-900">
            <div className="flex items-center justify-between border-b border-base-700 p-3">
              <span className="text-sm font-medium text-slate-300">Menu</span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <SidebarContent pathname={pathname} />
          </div>
        </div>
      )}

      <div className="flex-1">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 border-b border-base-700 px-4 py-3 text-sm text-slate-400 md:hidden"
        >
          <Menu size={16} />
          Menu
        </button>
        {children}
      </div>
    </div>
  );
}
