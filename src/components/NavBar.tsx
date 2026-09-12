"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Me {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "OWNER";
}

const LINKS = [
  { href: "/builder", label: "AI Builder" },
  { href: "/packs", label: "Mijn Serverpacks" },
  { href: "/account", label: "Account" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, [pathname]);

  return (
    <header className="border-b border-base-700 bg-base-900">
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <h1 className="text-lg font-semibold tracking-tight">
          AI Minecraft Server Pack Builder
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Minecraft Java Edition — beschrijf je server, de AI doet de rest.
        </p>

        <nav className="mt-5 flex gap-1 -mb-px">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                pathname === link.href
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {me && (me.role === "ADMIN" || me.role === "OWNER") && (
            <Link
              href="/admin"
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                pathname === "/admin"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
