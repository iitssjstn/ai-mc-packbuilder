"use client";

import { useEffect, useState } from "react";
import { Panel, Button } from "@/components/ui";

interface DocState {
  draftContent: string;
  publishedContent: string | null;
  publishedAt: string | null;
}

function DocumentEditor({ type, label }: { type: "terms" | "privacy"; label: string }) {
  const [doc, setDoc] = useState<DocState | null>(null);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/legal/${type}`);
    if (res.ok) {
      const data = await res.json();
      setDoc(data);
      setDraft(data.draftContent);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(publish: boolean) {
    setMessage(null);
    const res = await fetch(`/api/admin/legal/${type}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftContent: draft, publish }),
    });
    if (res.ok) {
      setMessage(publish ? "Published." : "Draft saved.");
      load();
    } else {
      setMessage("Could not save.");
    }
  }

  if (!doc) return null;

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{label}</h3>
        <button onClick={() => setPreview((p) => !p)} className="text-xs text-emerald-400 hover:underline">
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Published: {doc.publishedAt ? new Date(doc.publishedAt).toLocaleString() : "never"}
      </p>
      {message && <p className="mt-2 text-sm text-emerald-400">{message}</p>}

      {preview ? (
        <div className="mt-3 whitespace-pre-wrap rounded-md border border-base-700 bg-base-950 p-3 text-sm text-slate-300">
          {draft || <span className="text-slate-500">Nothing written yet.</span>}
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          placeholder="Plain text or Markdown — rendered as plain text, no HTML/script is ever executed."
          className="mt-3 w-full border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
        />
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => save(false)}>
          Save Draft
        </Button>
        <Button onClick={() => save(true)}>Publish</Button>
      </div>
    </Panel>
  );
}

export function LegalClient() {
  return (
    <div className="space-y-4 px-6 py-10">
      <h2 className="text-base font-semibold">Legal / Content</h2>
      <p className="text-sm text-slate-500">
        Changes take effect on the public site immediately after publishing — no redeploy needed.
      </p>
      <DocumentEditor type="terms" label="Terms of Service" />
      <DocumentEditor type="privacy" label="Privacy Policy" />
    </div>
  );
}
