"use client";

import { useEffect, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";

interface ProviderInfo {
  count: number;
  lastFour: string[];
  source: "database" | "env";
}
interface AiSettings {
  order: string[];
  providers: Record<string, ProviderInfo>;
}

export function AiProvidersClient() {
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [orderInput, setOrderInput] = useState("");
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/ai-settings");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setAiSettings(data);
      setOrderInput(data.order.join(","));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProviderKeys(provider: string, keys: string) {
    setAiError(null);
    const res = await fetch(`/api/admin/ai-settings/${provider}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAiError(data.error ?? "Could not save keys");
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
      setAiError(data.error ?? "Could not save order");
      return;
    }
    load();
  }

  if (forbidden) {
    return (
      <p className="px-6 py-10 text-sm text-slate-500">
        AI provider settings are owner-only.
      </p>
    );
  }
  if (!aiSettings) return <p className="px-6 py-10 text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">AI Providers</h2>
      <p className="text-xs text-slate-500">
        Keys are stored encrypted in the database. Once saved, the value is never shown
        again in the UI — only the key count and the last 4 characters.
      </p>

      {aiError && <p className="text-sm text-red-400">{aiError}</p>}

      <Panel>
        <h4 className="text-sm font-medium">Order</h4>
        <p className="text-xs text-slate-500 mt-1">
          Comma-separated, e.g. <code className="font-mono">anthropic,openai,google</code>
        </p>
        <div className="mt-2 flex gap-2">
          <Input value={orderInput} onChange={(e) => setOrderInput(e.target.value)} className="flex-1" />
          <Button variant="secondary" onClick={saveOrder}>
            Save
          </Button>
        </div>
      </Panel>

      {Object.entries(aiSettings.providers).map(([provider, info]) => (
        <ProviderKeyPanel key={provider} provider={provider} info={info} onSave={(keys) => saveProviderKeys(provider, keys)} />
      ))}
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
            ? "no keys"
            : `${info.count} key(s): ${info.lastFour.map((f) => `...${f}`).join(", ")}`}{" "}
          ({info.source === "database" ? "via UI" : "via env/secrets"})
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New key(s), comma-separated — leave blank to clear"
          className="flex-1"
        />
        <Button
          variant="secondary"
          onClick={() => {
            onSave(value);
            setValue("");
          }}
        >
          Save
        </Button>
      </div>
    </Panel>
  );
}
