"use client";

import { useEffect, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";
import { PLUGIN_CATEGORIES } from "@/lib/enums";

interface PluginVersion {
  id: string;
  version: string;
  minecraftRange: string;
  downloadUrl: string;
}
interface Plugin {
  id: string;
  name: string;
  slug: string;
  author: string | null;
  category: string | null;
  tags: string | null;
  lastVerifiedAt: string | null;
  isActive: boolean;
  versions: PluginVersion[];
}

const SOFTWARE_OPTIONS = ["PAPER", "PURPUR", "VANILLA"] as const;

export function PluginsClient() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [versionSoftware, setVersionSoftware] = useState<string[]>([]);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState<
    { projectId: string; slug: string; title: string; description: string; author: string }[]
  >([]);
  const [importBusy, setImportBusy] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [bulkNames, setBulkNames] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<
    { name: string; status: "imported" | "not_found" | "duplicate" | "error"; slug?: string; title?: string; versionAdded?: boolean; message?: string }[]
  >([]);

  async function load() {
    const res = await fetch("/api/admin/plugins");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) setPlugins(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePlugin(id: string, isActive: boolean) {
    await fetch(`/api/admin/plugins/${id}/active`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  }

  async function removePlugin(id: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}" from the registry? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/plugins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not delete plugin");
    }
    load();
  }

  async function markVerified(id: string) {
    await fetch(`/api/admin/plugins/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markVerified: true }),
    });
    load();
  }

  async function searchModrinth(e: React.FormEvent) {
    e.preventDefault();
    setImportMessage(null);
    const res = await fetch(`/api/admin/plugins/import/search?q=${encodeURIComponent(importQuery)}`);
    if (res.ok) {
      setImportResults(await res.json());
    } else {
      setImportMessage("Search failed");
      setImportResults([]);
    }
  }

  async function importFromModrinth(hit: { projectId: string; slug: string; title: string; description: string; author: string }) {
    setImportBusy(hit.projectId);
    setImportMessage(null);
    const res = await fetch("/api/admin/plugins/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(hit),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setImportMessage(
        data.versionAdded
          ? `Imported "${hit.title}" with a real, verified download URL + checksum.`
          : `Imported "${hit.title}" — no compatible Paper/Purpur file found, add a version manually.`
      );
      load();
    } else {
      setImportMessage(data.error ?? "Import failed");
    }
    setImportBusy(null);
  }

  async function bulkImport(e: React.FormEvent) {
    e.preventDefault();
    setBulkResults([]);
    // Dedupe here too (case-insensitive, trimmed) before it even
    // leaves the browser — the backend dedupes again defensively, but
    // no reason to send obvious duplicates from a pasted list at all.
    const seen = new Set<string>();
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => {
        if (!n) return false;
        const key = n.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (names.length === 0) return;

    setBulkBusy(true);
    const res = await fetch("/api/admin/plugins/import/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ names }),
    });
    const data = await res.json().catch(() => ({ results: [] }));
    setBulkResults(data.results ?? []);
    setBulkBusy(false);
    load();
  }

  async function addPlugin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/plugins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: form.get("slug"),
        name: form.get("name"),
        description: form.get("description"),
        author: form.get("author") || undefined,
        officialUrl: form.get("officialUrl") || undefined,
        documentationUrl: form.get("documentationUrl") || undefined,
        category: form.get("category") || undefined,
        tags: form.get("tags") || undefined,
      }),
    });
    if (res.ok) {
      e.currentTarget.reset();
      load();
    }
  }

  async function addVersion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVersionError(null);
    if (versionSoftware.length === 0) {
      setVersionError("Choose at least one server software.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/plugins/${form.get("pluginId")}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: form.get("version"),
        minecraftRange: form.get("minecraftRange"),
        compatibleSoftware: versionSoftware,
        downloadUrl: form.get("downloadUrl"),
        checksum: form.get("checksum"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      e.currentTarget.reset();
      setVersionSoftware([]);
      load();
    } else {
      setVersionError(data.error ?? "Could not add version");
    }
  }

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Plugin Registry</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plugins.map((p) => (
          <Panel key={p.id} className="flex flex-col p-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {p.name} <span className="font-mono text-[10px] text-slate-500">({p.slug})</span>
              </p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                {p.author ? `by ${p.author} · ` : ""}
                {p.category ?? "uncategorized"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                Verified: {p.lastVerifiedAt ? new Date(p.lastVerifiedAt).toLocaleDateString() : "never"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                {p.versions.length === 0
                  ? "no versions"
                  : `${p.versions.length} version(s) — latest ${p.versions[p.versions.length - 1].downloadUrl ? "✓" : "⚠"}`}
              </p>
            </div>
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => markVerified(p.id)}
                className="flex-1 rounded-md border border-base-600 px-1.5 py-1 text-[10px] text-slate-300 transition-colors hover:bg-base-800"
              >
                Verify
              </button>
              <button
                onClick={() => togglePlugin(p.id, !p.isActive)}
                className="flex-1 rounded-md border border-base-600 px-1.5 py-1 text-[10px] text-slate-300 transition-colors hover:bg-base-800"
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => removePlugin(p.id, p.name)}
                className="flex-1 rounded-md border border-base-600 px-1.5 py-1 text-[10px] text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <h4 className="text-sm font-medium">Import from Modrinth</h4>
        <p className="mt-1 text-xs text-slate-500">
          Pulls the real name, description, and — where a compatible Paper/Purpur file exists — the actual
          download URL with a freshly computed SHA-256 checksum. No API key needed, Modrinth's API is public.
        </p>
        <form onSubmit={searchModrinth} className="mt-3 flex gap-2">
          <Input
            value={importQuery}
            onChange={(e) => setImportQuery(e.target.value)}
            placeholder="Search Modrinth (e.g. Vault, GriefPrevention, Multiverse)"
            className="flex-1"
          />
          <Button type="submit">Search</Button>
        </form>
        {importMessage && <p className="mt-2 text-sm text-emerald-400">{importMessage}</p>}
        <div className="mt-3 space-y-2">
          {importResults.map((hit) => (
            <div key={hit.projectId} className="flex items-center justify-between gap-3 border border-base-700 px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">
                  {hit.title} <span className="font-mono text-xs text-slate-500">({hit.slug})</span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  by {hit.author} — {hit.description}
                </p>
              </div>
              <Button variant="secondary" onClick={() => importFromModrinth(hit)} disabled={importBusy === hit.projectId}>
                {importBusy === hit.projectId ? "Importing..." : "Import"}
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h4 className="text-sm font-medium">Bulk Import from Modrinth</h4>
        <p className="mt-1 text-xs text-slate-500">
          One plugin name per line. For each name, the top Modrinth match gets imported the same way as above.
          Duplicate names (and duplicate results — two names that resolve to the same plugin) are skipped.
        </p>
        <form onSubmit={bulkImport} className="mt-3 space-y-2">
          <textarea
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            rows={5}
            placeholder={"EssentialsX\nLuckPerms\nWorldGuard\n..."}
            className="w-full border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
          />
          <Button type="submit" disabled={bulkBusy}>
            {bulkBusy ? "Importing..." : "Bulk Import"}
          </Button>
        </form>
        {bulkResults.length > 0 && (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {bulkResults.map((r, i) => (
              <li
                key={i}
                className={
                  r.status === "imported"
                    ? "text-emerald-400"
                    : r.status === "duplicate"
                      ? "text-slate-500"
                      : "text-red-400"
                }
              >
                {r.name} —{" "}
                {r.status === "imported"
                  ? `imported as "${r.slug}"${r.versionAdded ? "" : " (no compatible version found)"}`
                  : r.status === "duplicate"
                    ? `skipped, same plugin as "${r.slug}"`
                    : r.status === "not_found"
                      ? "no match found on Modrinth"
                      : r.message ?? "failed"}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h4 className="text-sm font-medium">Add Plugin</h4>
        <form onSubmit={addPlugin} className="mt-3 flex flex-wrap gap-2">
          <Input name="slug" placeholder="slug (e.g. worldedit)" required className="flex-1 min-w-[140px]" />
          <Input name="name" placeholder="Name" required className="flex-1 min-w-[140px]" />
          <Input name="author" placeholder="Author (optional)" className="flex-1 min-w-[140px]" />
          <select name="category" className="flex-1 min-w-[140px] border border-base-600 bg-base-950 px-3 py-2 text-sm">
            <option value="">Category (optional)</option>
            {PLUGIN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input name="tags" placeholder="Tags, comma-separated (optional)" className="flex-1 min-w-[140px]" />
          <Input name="description" placeholder="Description" required className="flex-1 min-w-[140px]" />
          <Input name="officialUrl" type="url" placeholder="Website (optional)" className="flex-1 min-w-[140px]" />
          <Input name="documentationUrl" type="url" placeholder="Docs URL (optional)" className="flex-1 min-w-[140px]" />
          <Button type="submit">Add</Button>
        </form>
      </Panel>

      <Panel>
        <h4 className="text-sm font-medium">Add Plugin Version (download URL + checksum)</h4>
        <form onSubmit={addVersion} className="mt-3 space-y-2 max-w-md">
          <select name="pluginId" required className="w-full border border-base-600 bg-base-950 px-3 py-2 text-sm">
            {plugins.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
          <Input name="version" placeholder="Version (e.g. 2.20.1)" required />
          <Input name="minecraftRange" placeholder="Minecraft range (e.g. 1.21.x)" required />
          <div className="flex gap-4 text-sm text-slate-400">
            {SOFTWARE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={versionSoftware.includes(s)}
                  onChange={(e) =>
                    setVersionSoftware((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))
                  }
                />
                {s}
              </label>
            ))}
          </div>
          <Input name="downloadUrl" type="url" placeholder="Download URL (https://...)" required />
          <Input name="checksum" placeholder="SHA-256 checksum (64 hex characters)" required pattern="[a-fA-F0-9]{64}" />
          <Button type="submit">Add Version</Button>
          {versionError && <p className="text-sm text-red-400">{versionError}</p>}
          <p className="text-xs text-slate-500">
            Only hosts on the allowlist are accepted when generating a pack (github.com,
            hangar.papermc.io, cdn.modrinth.com, media.forgecdn.net, ...).
          </p>
        </form>
      </Panel>
    </div>
  );
}
