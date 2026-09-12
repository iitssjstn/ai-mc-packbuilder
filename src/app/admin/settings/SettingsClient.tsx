"use client";

import { useEffect, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";

interface SiteSettings {
  siteName: string;
  registrationEnabled: "true" | "false";
  defaultMinecraftVersion: string;
  maintenanceMode: "true" | "false";
}

export function SettingsClient() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) setSettings(await res.json());
    });
  }, []);

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteName: form.get("siteName"),
        registrationEnabled: form.get("registrationEnabled") ? "true" : "false",
        defaultMinecraftVersion: form.get("defaultMinecraftVersion"),
        maintenanceMode: form.get("maintenanceMode") ? "true" : "false",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSettings(data);
      setSaved(true);
    } else {
      setError(data.error ?? "Could not save settings");
    }
  }

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">Settings are owner-only.</p>;
  if (!settings) return <p className="px-6 py-10 text-sm text-slate-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-lg space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Settings</h2>
      <Panel>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {saved && <p className="mb-3 text-sm text-emerald-400">Settings saved.</p>}
        <form onSubmit={saveSettings} className="space-y-3">
          <label className="block text-sm text-slate-400">
            Site name
            <Input name="siteName" defaultValue={settings.siteName} className="mt-1" />
          </label>
          <label className="block text-sm text-slate-400">
            Default Minecraft version
            <Input name="defaultMinecraftVersion" defaultValue={settings.defaultMinecraftVersion} className="mt-1" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" name="registrationEnabled" defaultChecked={settings.registrationEnabled === "true"} />
            Allow new user registration
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode === "true"} />
            Maintenance mode (non-admin visitors see a maintenance page)
          </label>
          <Button type="submit">Save Settings</Button>
        </form>
      </Panel>
    </div>
  );
}
