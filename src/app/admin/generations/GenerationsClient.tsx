"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Button } from "@/components/ui";

interface Generation {
  id: string;
  name: string;
  status: string;
  generationStep: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  owner: string;
}

const STATUS_FILTERS = ["", "DRAFT", "GENERATING", "READY", "FAILED"];

function formatDuration(startIso: string, endIso: string): string {
  const seconds = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m ${seconds % 60}s`;
}

export function GenerationsClient() {
  const [items, setItems] = useState<Generation[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    fetch(`/api/admin/packs?${params}`).then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setPageSize(data.pageSize);
      }
    });
  }, [page, status]);

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Generations</h2>
      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              status === s ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-base-600 text-slate-400"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {items.length === 0 && <p className="text-sm text-slate-500">No generations found.</p>}
      {items.map((g) => (
        <Panel key={g.id} className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-sm">
            <Link href={`/packs/${g.id}`} className="truncate hover:text-emerald-400 hover:underline">
              {g.name}
            </Link>{" "}
            <span className="text-slate-500">by {g.owner}</span>
            <p className="font-mono text-xs text-slate-500">
              Started {new Date(g.createdAt).toLocaleString()}
              {g.status !== "GENERATING" && g.status !== "DRAFT" && ` · took ${formatDuration(g.createdAt, g.updatedAt)}`}
              {g.status === "GENERATING" && g.generationStep && ` · ${g.generationStep}`}
            </p>
            {g.status === "FAILED" && g.errorMessage && <p className="mt-1 text-xs text-red-400">{g.errorMessage}</p>}
          </div>
          <span
            className={`shrink-0 font-mono text-xs px-2 py-1 rounded-md border ${
              g.status === "READY"
                ? "border-emerald-500 text-emerald-400"
                : g.status === "FAILED"
                  ? "border-red-500 text-red-400"
                  : "border-base-600 text-slate-400"
            }`}
          >
            {g.status}
          </span>
        </Panel>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
