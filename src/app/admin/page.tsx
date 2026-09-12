"use client";

import { useEffect, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isBlocked: boolean;
}
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
  isActive: boolean;
  versions: PluginVersion[];
}
interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
}
interface ProviderInfo {
  count: number;
  lastFour: string[];
  source: "database" | "env";
}
interface AiSettings {
  order: string[];
  providers: Record<string, ProviderInfo>;
}

const SOFTWARE_OPTIONS = ["PAPER", "PURPUR", "VANILLA"] as const;

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [versionSoftware, setVersionSoftware] = useState<string[]>([]);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [orderInput, setOrderInput] = useState("");

  async function load() {
    const [usersRes, pluginsRes, auditRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/plugins"),
      fetch("/api/admin/audit-logs"),
    ]);
    if (usersRes.status === 403) {
      setForbidden(true);
      return;
    }
    if (usersRes.ok) setUsers(await usersRes.json());
    if (pluginsRes.ok) setPlugins(await pluginsRes.json());
    if (auditRes.ok) setLogs(await auditRes.json());

    // OWNER-only — a plain ADMIN will get 403 here, which is fine, the
    // section below just won't render for them.
    const aiRes = await fetch("/api/admin/ai-settings");
    if (aiRes.ok) {
      const data = await aiRes.json();
      setAiSettings(data);
      setOrderInput(data.order.join(","));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleUser(id: string, block: boolean) {
    await fetch(`/api/admin/users/${id}/${block ? "block" : "unblock"}`, { method: "POST" });
    load();
  }

  async function togglePlugin(id: string, isActive: boolean) {
    await fetch(`/api/admin/plugins/${id}/active`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
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
        officialUrl: form.get("officialUrl") || undefined,
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
      setVersionError("Kies minstens één server-software.");
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
      setVersionError(data.error ?? "Kon versie niet toevoegen");
    }
  }

  if (forbidden) {
    return <p className="text-sm text-slate-500">Je hebt geen toegang tot het adminpanel.</p>;
  }

  async function saveProviderKeys(provider: string, keys: string) {
    setAiError(null);
    const res = await fetch(`/api/admin/ai-settings/${provider}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAiError(data.error ?? "Kon keys niet opslaan");
      return;
    }
    load();
  }

  async function saveOrder() {
    setAiError(null);
    const order = orderInput.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/admin/ai-settings/order", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAiError(data.error ?? "Kon volgorde niet opslaan");
      return;
    }
    load();
  }

  return (
    <div className="space-y-8">
      <h2 className="text-base font-semibold">Admin panel</h2>

      <section className="space-y-2">
        <h3 className="font-medium">Gebruikers</h3>
        {users.map((u) => (
          <Panel key={u.id} className="flex items-center justify-between">
            <div className="text-sm">
              <p>
                {u.email} <span className="text-slate-500">({u.username})</span>
              </p>
              <p className="font-mono text-xs text-slate-500">
                {u.role} · {u.isBlocked ? "Geblokkeerd" : "Actief"}
              </p>
            </div>
            <Button variant="secondary" onClick={() => toggleUser(u.id, !u.isBlocked)}>
              {u.isBlocked ? "Deblokkeer" : "Blokkeer"}
            </Button>
          </Panel>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Plugin registry</h3>
        {plugins.map((p) => (
          <Panel key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {p.name} <span className="font-mono text-xs text-slate-500">({p.slug})</span>
                </p>
                <ul className="mt-1 font-mono text-xs text-slate-500">
                  {p.versions.length === 0 && <li>geen versies</li>}
                  {p.versions.map((v) => (
                    <li key={v.id}>
                      {v.version} ({v.minecraftRange}) {v.downloadUrl ? "✓" : "⚠ geen download-URL"}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="secondary" onClick={() => togglePlugin(p.id, !p.isActive)}>
                {p.isActive ? "Deactiveren" : "Activeren"}
              </Button>
            </div>
          </Panel>
        ))}

        <Panel>
          <h4 className="text-sm font-medium">Plugin toevoegen</h4>
          <form onSubmit={addPlugin} className="mt-3 flex flex-wrap gap-2">
            <Input name="slug" placeholder="slug (bv. worldedit)" required className="flex-1 min-w-[140px]" />
            <Input name="name" placeholder="Naam" required className="flex-1 min-w-[140px]" />
            <Input name="description" placeholder="Beschrijving" required className="flex-1 min-w-[140px]" />
            <Input name="officialUrl" type="url" placeholder="Website (optioneel)" className="flex-1 min-w-[140px]" />
            <Button type="submit">Toevoegen</Button>
          </form>
        </Panel>

        <Panel>
          <h4 className="text-sm font-medium">Plugin-versie toevoegen (download-URL + checksum)</h4>
          <form onSubmit={addVersion} className="mt-3 space-y-2 max-w-md">
            <select name="pluginId" required className="w-full border border-base-600 bg-base-950 px-3 py-2 text-sm">
              {plugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <Input name="version" placeholder="Versie (bv. 2.20.1)" required />
            <Input name="minecraftRange" placeholder="Minecraft-range (bv. 1.21.x)" required />
            <div className="flex gap-4 text-sm text-slate-400">
              {SOFTWARE_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={versionSoftware.includes(s)}
                    onChange={(e) =>
                      setVersionSoftware((prev) =>
                        e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
            <Input name="downloadUrl" type="url" placeholder="Download-URL (https://...)" required />
            <Input name="checksum" placeholder="SHA-256 checksum (64 hex tekens)" required pattern="[a-fA-F0-9]{64}" />
            <Button type="submit">Versie toevoegen</Button>
            {versionError && <p className="text-sm text-red-400">{versionError}</p>}
            <p className="text-xs text-slate-500">
              Alleen hosts uit de allowlist worden geaccepteerd bij het genereren van een pack (github.com,
              hangar.papermc.io, cdn.modrinth.com, media.forgecdn.net, ...).
            </p>
          </form>
        </Panel>
      </section>

      {aiSettings && (
        <section className="space-y-2">
          <h3 className="font-medium">AI-providers</h3>
          <p className="text-xs text-slate-500">
            Keys worden versleuteld opgeslagen in de database. Bij het opslaan zie je de waarde
            hierna nooit meer terug in de UI — alleen het aantal keys en de laatste 4 tekens.
          </p>

          {aiError && <p className="text-sm text-red-400">{aiError}</p>}

          <Panel>
            <h4 className="text-sm font-medium">Volgorde</h4>
            <p className="text-xs text-slate-500 mt-1">
              Kommagescheiden, bv. <code className="font-mono">anthropic,openai,google</code>
            </p>
            <div className="mt-2 flex gap-2">
              <Input value={orderInput} onChange={(e) => setOrderInput(e.target.value)} className="flex-1" />
              <Button variant="secondary" onClick={saveOrder}>
                Opslaan
              </Button>
            </div>
          </Panel>

          {Object.entries(aiSettings.providers).map(([provider, info]) => (
            <ProviderKeyPanel
              key={provider}
              provider={provider}
              info={info}
              onSave={(keys) => saveProviderKeys(provider, keys)}
            />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-medium">Audit log</h3>
        <Panel>
          <ul className="font-mono text-xs text-slate-500 space-y-1 max-h-60 overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id}>
                {new Date(l.createdAt).toLocaleString()} — {l.action}
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}

function ProviderKeyPanel({
  provider,
  info,
  onSave,
}: {
  provider: string;
  info: { count: number; lastFour: string[]; source: "database" | "env" };
  onSave: (keys: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium capitalize">{provider}</h4>
        <span className="font-mono text-xs text-slate-500">
          {info.count === 0
            ? "geen keys"
            : `${info.count} key(s): ${info.lastFour.map((f) => `...${f}`).join(", ")}`}{" "}
          ({info.source === "database" ? "via UI" : "via env/secrets"})
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nieuwe key(s), kommagescheiden — leeg laten om te wissen"
          className="flex-1"
        />
        <Button
          variant="secondary"
          onClick={() => {
            onSave(value);
            setValue("");
          }}
        >
          Opslaan
        </Button>
      </div>
    </Panel>
  );
}
