"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Sparkles, FolderOpen, User, Users, Box, ArrowRight } from "lucide-react";

interface Me {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "OWNER";
}

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/builder", label: "AI Builder", icon: Sparkles },
  { href: "/packs", label: "Mijn Serverpacks", icon: FolderOpen },
  { href: "/account", label: "Account", icon: User },
];

export function NavBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, [pathname]);

  const links = [...LINKS, ...(me && (me.role === "ADMIN" || me.role === "OWNER") ? [{ href: "/admin", label: "Admin", icon: Users }] : [])];

  return (
    <header className="border-b border-base-700 bg-base-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Box size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight tracking-tight">
              AI Minecraft Server <span className="text-emerald-400">Pack</span> Builder
            </span>
            <span className="block text-xs leading-tight text-slate-500">
              Minecraft Java Edition — beschrijf je server, de AI doet de rest.
            </span>
          </span>
        </Link>

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
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon size={15} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={me ? "/builder" : "/account"}
          className="flex shrink-0 items-center gap-1.5 bg-emerald-500 px-4 py-2 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
        >
          Aan de slag
          <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}
