"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

interface PackDetail {
  id: string;
  name: string;
  version: number;
  status: "DRAFT" | "GENERATING" | "READY" | "FAILED";
  createdAt: string;
  updatedAt: string;
  minecraftVersionId: string;
  errorMessage: string | null;
  planJson: string;
  fileSizeBytes: number | null;
  conversationId: string | null;
}

export function PackDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/packs/${id}`).then(async (res) => {
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) setPack(await res.json());
    });
  }, [id]);

  async function remove() {
    if (!window.confirm("Permanently delete this server pack? This cannot be undone.")) return;
    await fetch(`/api/packs/${id}`, { method: "DELETE" });
    router.push("/packs");
  }

  async function duplicate() {
    const res = await fetch(`/api/packs/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/packs/${data.id}`);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
        <p className="text-sm text-slate-500">This server pack doesn't exist, or you don't have access to it.</p>
        <Link href="/packs" className="text-sm text-emerald-400 hover:underline">
          Back to My Server Packs
        </Link>
      </div>
    );
  }

  if (!pack) return <p className="px-6 py-10 text-sm text-slate-500">Loading...</p>;

  const plan = JSON.parse(pack.planJson);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <Link href="/packs" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={14} />
        Back to My Server Packs
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{pack.name}</h1>
        <span
          className={`font-mono text-xs px-2 py-1 rounded-md border ${
            pack.status === "READY"
              ? "border-emerald-500 text-emerald-400"
              : pack.status === "FAILED"
                ? "border-red-500 text-red-400"
                : "border-base-600 text-slate-400"
          }`}
        >
          {pack.status}
        </span>
      </div>

      {pack.status === "FAILED" && pack.errorMessage && (
        <Panel className="border-red-500/40">
          <p className="text-sm text-red-400">{pack.errorMessage}</p>
        </Panel>
      )}

      <Panel>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Minecraft</dt>
            <dd className="mt-0.5">{plan.minecraft?.version ?? pack.minecraftVersionId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Software</dt>
            <dd className="mt-0.5 capitalize">{plan.software?.type}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Plugins</dt>
            <dd className="mt-0.5">{plan.requestedPluginSlugs?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Created</dt>
            <dd className="mt-0.5">{new Date(pack.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Last updated</dt>
            <dd className="mt-0.5">{new Date(pack.updatedAt).toLocaleDateString()}</dd>
          </div>
          {pack.fileSizeBytes && (
            <div>
              <dt className="text-xs text-slate-500">File size</dt>
              <dd className="mt-0.5">{(pack.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</dd>
            </div>
          )}
        </dl>
      </Panel>

      {plan.requestedPluginSlugs?.length > 0 && (
        <Panel>
          <h3 className="text-sm font-medium">Plugins</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {plan.requestedPluginSlugs.map((slug: string) => (
              <li key={slug} className="rounded-md border border-base-600 px-2 py-1 font-mono text-xs text-slate-300">
                {slug}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {plan.branding?.serverName && (
        <Panel>
          <h3 className="text-sm font-medium">Branding</h3>
          <dl className="mt-2 space-y-1 text-sm text-slate-400">
            <div>Server name: {plan.branding.serverName}</div>
            {plan.branding.motd && <div>MOTD: {plan.branding.motd}</div>}
            {plan.branding.discordUrl && <div>Discord: {plan.branding.discordUrl}</div>}
          </dl>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
        {pack.status === "READY" && (
          <a href={`/api/packs/${pack.id}/download`}>
            <Button>Download Pack</Button>
          </a>
        )}
        {pack.conversationId && (
          <Link href={`/builder?conversation=${pack.conversationId}`}>
            <Button variant="secondary">Continue in AI Builder</Button>
          </Link>
        )}
        <Button variant="secondary" onClick={duplicate}>
          Duplicate
        </Button>
        <Button variant="secondary" onClick={remove}>
          Delete
        </Button>
      </div>
    </div>
  );
}
