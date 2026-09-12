"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui";

interface AuditEntry {
  id: string;
  action: string;
  actor: string | null;
  createdAt: string;
}

export function AuditClient() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit-logs").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) setLogs(await res.json());
    });
  }, []);

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  const filtered = logs.filter(
    (l) => l.action.toLowerCase().includes(search.toLowerCase()) || (l.actor ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Audit Log</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by actor or action..."
        className="w-full max-w-sm rounded-md border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
      />
      <Panel>
        <ul className="font-mono text-xs text-slate-500 space-y-1 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && <li>No matching entries.</li>}
          {filtered.map((l) => (
            <li key={l.id}>
              {new Date(l.createdAt).toLocaleString()} — {l.actor ?? "system"} — {l.action}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
