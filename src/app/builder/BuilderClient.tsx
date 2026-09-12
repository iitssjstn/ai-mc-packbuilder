"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";
import { Plus, Trash2, Pencil, Search } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}
interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  hasPlan: boolean;
}

const QUICK_SUGGESTIONS = [
  { label: "Survival SMP", prompt: "I want a survival SMP with claims, economy, and homes for about 30 players." },
  { label: "Skyblock", prompt: "I want a skyblock server with an economy, shops, and island upgrades." },
  { label: "Economy Server", prompt: "I want an economy-focused server with jobs, shops, and player ranks." },
  { label: "PvP Network", prompt: "I want a PvP-focused server with kits, arenas, and a ranking system." },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function BuilderClient() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/ai/conversations");
    if (res.ok) setConversations(await res.json());
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function openConversation(id: string) {
    setBusy(true);
    const res = await fetch(`/api/ai/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConversationId(data.id);
      setMessages(data.messages);
      setPlan(data.plan);
    }
    setBusy(false);
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setPlan(null);
    setStatus(null);
  }

  async function renameConversation(id: string, currentTitle: string) {
    const title = window.prompt("Rename conversation:", currentTitle);
    if (!title || title === currentTitle) return;
    await fetch(`/api/ai/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    loadConversations();
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    if (id === conversationId) newChat();
    loadConversations();
  }

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();
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
        setMessages((m) => [...m, { role: "assistant", content: `Error: ${data.error ?? "unknown error"}` }]);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.plan) setPlan(data.plan);
      loadConversations();
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Could not connect to the server." }]);
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
        setStatus(`Could not create pack: ${createData.error}`);
        return;
      }

      const logoFile = logoInputRef.current?.files?.[0];
      if (logoFile) {
        const form = new FormData();
        form.append("logo", logoFile);
        const logoRes = await fetch(`/api/packs/${createData.id}/logo`, { method: "POST", body: form });
        if (!logoRes.ok) {
          const err = await logoRes.json().catch(() => ({}));
          setStatus(`Logo skipped: ${err.error ?? "could not be uploaded"}`);
        }
      }

      setStatus("Generating your server pack...");
      const genRes = await fetch(`/api/packs/${createData.id}/generate`, { method: "POST" });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setStatus(`Could not generate pack: ${genData.error}`);
        return;
      }
      setStatus("Done! Check your pack under 'My Server Packs'.");
    } catch {
      setStatus("Unexpected error during generation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!plan || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Could not save draft: ${data.error}`);
        return;
      }
      setStatus("Saved as a draft — find it under 'My Server Packs' whenever you're ready to generate it.");
    } catch {
      setStatus("Unexpected error while saving the draft.");
    } finally {
      setBusy(false);
    }
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const filteredConversations = conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Conversations sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-base-700 bg-base-900 md:flex">
        <div className="p-3">
          <button
            onClick={newChat}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-md border border-base-700 bg-base-950 py-1.5 pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Recent</p>
          {filteredConversations.length === 0 && (
            <p className="px-2 py-2 text-xs text-slate-500">No conversations yet.</p>
          )}
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between gap-1 rounded-md px-2 py-2 text-sm transition-colors ${
                c.id === conversationId ? "bg-emerald-500/10 text-emerald-400" : "text-slate-300 hover:bg-base-800"
              }`}
            >
              <button onClick={() => openConversation(c.id)} className="min-w-0 flex-1 truncate text-left">
                {c.title}
                <span className="ml-1.5 text-[10px] text-slate-500">{relativeTime(c.updatedAt)}</span>
              </button>
              <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                <button onClick={() => renameConversation(c.id, c.title)} aria-label="Rename" className="text-slate-500 hover:text-slate-200">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteConversation(c.id)} aria-label="Delete" className="text-slate-500 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 py-6">
        <Panel className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-slate-500">
                Describe the Minecraft server you want to build, or pick a starting point:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.prompt)}
                    className="rounded-md border border-base-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-emerald-500 text-base-950"
                  : "self-start border border-base-700 bg-base-800 text-slate-100"
              }`}
            >
              {m.content}
            </div>
          ))}
        </Panel>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Describe the Minecraft server you want to build... (Enter to send, Shift+Enter for a new line)"
            rows={2}
            maxLength={4000}
            disabled={busy}
            className="flex-1 rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 disabled:opacity-60"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "..." : "Send"}
          </Button>
        </form>

        {plan && (
          <Panel className="max-h-64 shrink-0 overflow-y-auto">
            <h2 className="font-mono text-sm text-emerald-400 mb-3">Server Plan</h2>
            <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(plan, null, 2)}
            </pre>

            <label className="mt-4 block text-sm text-slate-400">
              Server logo (optional, PNG, max 2MB)
              <input ref={logoInputRef} type="file" accept="image/png" className="mt-1 block text-sm text-slate-300" />
            </label>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={generatePack} disabled={busy}>
                Create Server Pack
              </Button>
              <Button variant="secondary" onClick={saveDraft} disabled={busy}>
                Save as Draft
              </Button>
              {status && <span className="text-sm text-slate-400">{status}</span>}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
