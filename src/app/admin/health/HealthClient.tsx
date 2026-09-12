"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui";

interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "error";
  detail: string;
}

export function HealthClient() {
  const [health, setHealth] = useState<HealthCheck[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system-health").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) setHealth((await res.json()).checks);
    });
  }, []);

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;
  if (!health) return <p className="px-6 py-10 text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">System Health</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {health.map((check) => (
          <Panel key={check.name} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{check.name}</p>
              <p className="text-xs text-slate-500">{check.detail}</p>
            </div>
            <span
              className={`font-mono text-xs px-2 py-1 border rounded-md ${
                check.status === "healthy"
                  ? "border-emerald-500 text-emerald-400"
                  : check.status === "warning"
                    ? "border-amber-500 text-amber-400"
                    : "border-red-500 text-red-400"
              }`}
            >
              {check.status}
            </span>
          </Panel>
        ))}
      </div>
    </div>
  );
}
