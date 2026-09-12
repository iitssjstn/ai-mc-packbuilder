"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui";

interface AdminPack {
  id: string;
  name: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  minecraftVersionId: string;
  owner: string;
}

export function PacksAdminClient() {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/packs").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) setPacks(await res.json());
    });
  }, []);

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Server Packs</h2>
      {packs.length === 0 && <p className="text-sm text-slate-500">No server packs yet.</p>}
      {packs.map((p) => (
        <Panel key={p.id} className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-sm">
            <p className="truncate">
              {p.name} <span className="text-slate-500">by {p.owner}</span>
            </p>
            <p className="font-mono text-xs text-slate-500">
              {p.minecraftVersionId} · {new Date(p.createdAt).toLocaleDateString()}
            </p>
            {p.status === "FAILED" && p.errorMessage && <p className="mt-1 text-xs text-red-400">{p.errorMessage}</p>}
          </div>
          <span
            className={`shrink-0 font-mono text-xs px-2 py-1 rounded-md border ${
              p.status === "READY"
                ? "border-emerald-500 text-emerald-400"
                : p.status === "FAILED"
                  ? "border-red-500 text-red-400"
                  : "border-base-600 text-slate-400"
            }`}
          >
            {p.status}
          </span>
        </Panel>
      ))}
    </div>
  );
}
