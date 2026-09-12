"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Sparkles, FolderOpen, User, Users, Box, ArrowRight, LogOut } from "lucide-react";

interface Me {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "OWNER";
}

const BASE_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/builder", label: "AI Builder", icon: Sparkles },
  { href: "/packs", label: "My Server Packs", icon: FolderOpen },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const isHomepage = pathname === "/";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, [pathname]);

  // "Account" only makes sense once logged in (there's no profile page —
  // it's really a logout action). Logged out, the equivalent is "Inloggen".
  const links = [
    ...BASE_LINKS,
    ...(me ? [] : [{ href: "/login", label: "Log In", icon: User }]),
    ...(me && (me.role === "ADMIN" || me.role === "OWNER") ? [{ href: "/admin", label: "Admin", icon: Users }] : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-base-700 bg-base-900">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Box size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight tracking-tight">
              AI Minecraft Server <span className="text-emerald-400">Pack</span> Builder
            </span>
            <span className="block text-xs leading-tight text-slate-500">
              Minecraft Java Edition — describe your server, the AI does the rest.
            </span>
          </span>
        </Link>

        {/* Marketing homepage keeps the header minimal (logo + CTA only) —
            the full app navigation (and the ability to log out) lives on
            every other page, where it's actually needed. */}
        {!isHomepage && (
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon size={15} />
                  {link.label}
                </Link>
              );
            })}
            {me && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 border border-transparent px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                <LogOut size={15} />
                Log Out
              </button>
            )}
          </nav>
        )}

        <Link
          href={me ? "/builder" : "/login"}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
        >
          Get Started
          <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}
