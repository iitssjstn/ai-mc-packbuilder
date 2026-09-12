"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Button } from "@/components/ui";

interface Pack {
  id: string;
  name: string;
  version: number;
  status: "DRAFT" | "GENERATING" | "READY" | "FAILED";
  createdAt: string;
  minecraftVersionId: string;
  errorMessage: string | null;
}

export function PacksClient() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/packs");
    if (res.ok) setPacks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function regenerate(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/packs/${id}/generate`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Generation failed");
    }
    setBusyId(null);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Permanently delete this server pack? This cannot be undone.")) return;
    await fetch(`/api/packs/${id}`, { method: "DELETE" });
    load();
  }

  async function rename(id: string, currentName: string) {
    const name = window.prompt("New name for this server pack:", currentName);
    if (!name || name === currentName) return;
    setBusyId(id);
    const res = await fetch(`/api/packs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Rename failed");
    }
    setBusyId(null);
    load();
  }

  async function duplicate(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/packs/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Duplicate failed");
    }
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-4 px-6 py-10">
      <h2 className="text-base font-semibold">My Server Packs</h2>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {!loading && packs.length === 0 && (
        <p className="text-sm text-slate-500">No server packs yet — create one using the AI Builder.</p>
      )}

      <div className="space-y-2">
        {packs.map((pack) => (
          <Panel key={pack.id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/packs/${pack.id}`} className="font-medium truncate hover:text-emerald-400 hover:underline">
                {pack.name}
              </Link>
              <p className="font-mono text-xs text-slate-500">
                v{pack.version} · {pack.minecraftVersionId} · {new Date(pack.createdAt).toLocaleDateString()}
              </p>
              {pack.status === "FAILED" && pack.errorMessage && (
                <p className="mt-1 text-xs text-red-400">{pack.errorMessage}</p>
              )}
              {pack.status === "DRAFT" && <p className="mt-1 text-xs text-slate-500">Draft — not generated yet</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`font-mono text-xs px-2 py-1 border ${
                  pack.status === "READY"
                    ? "border-emerald-500 text-emerald-400"
                    : pack.status === "FAILED"
                      ? "border-red-500 text-red-400"
                      : "border-base-600 text-slate-400"
                }`}
              >
                {pack.status}
              </span>
              {pack.status === "READY" && (
                <a href={`/api/packs/${pack.id}/download`}>
                  <Button variant="secondary">Download</Button>
                </a>
              )}
              {(pack.status === "DRAFT" || pack.status === "FAILED") && (
                <Button variant="secondary" onClick={() => regenerate(pack.id)} disabled={busyId === pack.id}>
                  {busyId === pack.id ? "Working..." : "Generate"}
                </Button>
              )}
              <Button variant="secondary" onClick={() => rename(pack.id, pack.name)} disabled={busyId === pack.id}>
                Rename
              </Button>
              <Button variant="secondary" onClick={() => duplicate(pack.id)} disabled={busyId === pack.id}>
                Duplicate
              </Button>
              <Button variant="secondary" onClick={() => remove(pack.id)}>
                Delete
              </Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
