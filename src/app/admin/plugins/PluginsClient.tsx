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

  async function markVerified(id: string) {
    await fetch(`/api/admin/plugins/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markVerified: true }),
    });
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
      {plugins.map((p) => (
        <Panel key={p.id}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {p.name} <span className="font-mono text-xs text-slate-500">({p.slug})</span>
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                {p.author ? `by ${p.author} · ` : ""}
                {p.category ?? "uncategorized"}
                {p.tags ? ` · ${p.tags}` : ""}
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                Last verified: {p.lastVerifiedAt ? new Date(p.lastVerifiedAt).toLocaleDateString() : "never"}
              </p>
              <ul className="mt-1 font-mono text-xs text-slate-500">
                {p.versions.length === 0 && <li>no versions</li>}
                {p.versions.map((v) => (
                  <li key={v.id}>
                    {v.version} ({v.minecraftRange}) {v.downloadUrl ? "✓" : "⚠ no download URL"}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button variant="secondary" onClick={() => markVerified(p.id)}>
                Mark Verified
              </Button>
              <Button variant="secondary" onClick={() => togglePlugin(p.id, !p.isActive)}>
                {p.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </Panel>
      ))}

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
