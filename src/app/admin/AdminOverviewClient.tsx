"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui";

interface Stats {
  totalUsers: number;
  totalPacks: number;
  packsReady: number;
  pluginCount: number;
  failedGenerations: number;
}
interface RecentUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}
interface RecentPack {
  id: string;
  name: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  owner: string;
}
interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "error";
}

export function AdminOverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [packs, setPacks] = useState<RecentPack[]>([]);
  const [health, setHealth] = useState<HealthCheck[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/users"),
      fetch("/api/admin/packs"),
      fetch("/api/admin/system-health"),
    ]).then(async ([statsRes, usersRes, packsRes, healthRes]) => {
      if (statsRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers((await usersRes.json()).items.slice(0, 5));
      if (packsRes.ok) setPacks((await packsRes.json()).slice(0, 5));
      if (healthRes.ok) setHealth((await healthRes.json()).checks);
    });
  }, []);

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  const failedPacks = packs.filter((p) => p.status === "FAILED");

  return (
    <div className="space-y-6 px-6 py-10">
      <h2 className="text-base font-semibold">Overview</h2>

      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {[
            { label: "Total Users", value: stats.totalUsers },
            { label: "Total Server Packs", value: stats.totalPacks },
            { label: "Packs Generated", value: stats.packsReady },
            { label: "Plugin Count", value: stats.pluginCount },
            { label: "Failed Generations", value: stats.failedGenerations },
          ].map((s) => (
            <Panel key={s.label} className="text-center">
              <p className="text-2xl font-semibold text-emerald-400">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </Panel>
          ))}
        </div>
      )}

      {health.length > 0 && (
        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">System Health</h3>
            <Link href="/admin/health" className="text-xs text-emerald-400 hover:underline">
              View details
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {health.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    c.status === "healthy" ? "bg-emerald-500" : c.status === "warning" ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
                {c.name}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Users</h3>
            <Link href="/admin/users" className="text-xs text-emerald-400 hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            {users.length === 0 && <li className="text-xs text-slate-500">No users yet.</li>}
            {users.map((u) => (
              <li key={u.id} className="truncate">
                {u.username} <span className="text-slate-500">({u.email})</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Server Packs</h3>
            <Link href="/admin/packs" className="text-xs text-emerald-400 hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            {packs.length === 0 && <li className="text-xs text-slate-500">No server packs yet.</li>}
            {packs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 truncate">
                <span className="truncate">
                  {p.name} <span className="text-slate-500">by {p.owner}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-500">{p.status}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {failedPacks.length > 0 && (
        <Panel className="border-red-500/40">
          <h3 className="text-sm font-medium text-red-400">Recent Generation Errors</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            {failedPacks.map((p) => (
              <li key={p.id}>
                {p.name} <span className="text-slate-500">by {p.owner}</span> — {p.errorMessage}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
