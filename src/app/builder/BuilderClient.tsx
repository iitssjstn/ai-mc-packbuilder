"use client";

import { useRef, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function BuilderClient() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `Fout: ${data.error ?? "onbekende fout"}` }]);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.plan) setPlan(data.plan);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Kan geen verbinding maken met de server." }]);
    } finally {
      setBusy(false);
    }
  }

  async function generatePack() {
    if (!plan || busy) return;
    setBusy(true);
    setStatus(null);

    try {
      const createRes = await fetch("/api/packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(plan),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setStatus(`Kan pakket niet aanmaken: ${createData.error}`);
        return;
      }

      const logoFile = logoInputRef.current?.files?.[0];
      if (logoFile) {
        const form = new FormData();
        form.append("logo", logoFile);
        const logoRes = await fetch(`/api/packs/${createData.id}/logo`, { method: "POST", body: form });
        if (!logoRes.ok) {
          const err = await logoRes.json().catch(() => ({}));
          setStatus(`Logo overgeslagen: ${err.error ?? "kon niet worden geüpload"}`);
        }
      }

      setStatus("Serverpakket wordt gegenereerd...");
      const genRes = await fetch(`/api/packs/${createData.id}/generate`, { method: "POST" });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setStatus(`Kan pakket niet genereren: ${genData.error}`);
        return;
      }
      setStatus("Klaar! Bekijk je pack bij 'Mijn Serverpacks'.");
    } catch {
      setStatus("Onverwachte fout tijdens het genereren.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-6 py-10">
      <Panel className="min-h-[240px] flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Bijv: &quot;Ik wil een survival server voor 30 spelers, met claims, economy en homes...&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "self-end bg-emerald-500 text-base-950"
                : "self-start border border-base-700 bg-base-800 text-slate-100"
            }`}
          >
            {m.content}
          </div>
        ))}
      </Panel>

      <form onSubmit={sendMessage} className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Beschrijf je server..."
          rows={3}
          className="flex-1 border border-base-600 bg-base-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
        />
        <Button type="submit" disabled={busy}>
          Verstuur
        </Button>
      </form>

      {plan && (
        <Panel>
          <h2 className="font-mono text-sm text-emerald-400 mb-3">serverplan.json</h2>
          <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(plan, null, 2)}
          </pre>

          <label className="mt-4 block text-sm text-slate-400">
            Server-logo (optioneel, PNG, max 2MB)
            <input ref={logoInputRef} type="file" accept="image/png" className="mt-1 block text-sm text-slate-300" />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={generatePack} disabled={busy}>
              Serverpakket maken
            </Button>
            {status && <span className="text-sm text-slate-400">{status}</span>}
          </div>
        </Panel>
      )}
    </div>
  );
}
