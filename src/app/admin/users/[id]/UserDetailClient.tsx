"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Button } from "@/components/ui";
import { canManageUser } from "@/lib/permissions";
import type { Role } from "@/lib/enums";
import { ArrowLeft } from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  username: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  packCount: number;
  conversationCount: number;
  creditBalance: number;
  recentPacks: { id: string; name: string; status: string; createdAt: string }[];
  recentAudit: { action: string; createdAt: string }[];
}
interface Me {
  id: string;
  role: Role;
}

export function UserDetailClient({ id }: { id: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [userRes, meRes] = await Promise.all([fetch(`/api/admin/users/${id}`), fetch("/api/auth/me")]);
    if (userRes.status === 404) {
      setNotFound(true);
      return;
    }
    if (userRes.ok) setUser(await userRes.json());
    if (meRes.ok) setMe(await meRes.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleBlock(block: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/${block ? "block" : "unblock"}`, { method: "POST" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Action failed");
    load();
  }

  async function changeRole(role: string) {
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not change role");
    load();
  }

  if (notFound) return <p className="px-6 py-10 text-sm text-slate-500">User not found.</p>;
  if (!user) return <p className="px-6 py-10 text-sm text-slate-500">Loading...</p>;

  const canManage = me ? canManageUser(me.role, user.role) : false;
  const isSelf = me?.id === user.id;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
      <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={14} />
        Back to Users
      </Link>

      <h2 className="text-base font-semibold">{user.username}</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Panel>
        <h3 className="text-sm font-medium">Profile</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Role</dt>
            <dd className="mt-0.5">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Status</dt>
            <dd className="mt-0.5">{user.isBlocked ? "Blocked" : "Active"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Joined</dt>
            <dd className="mt-0.5">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h3 className="text-sm font-medium">Usage</h3>
        <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Server packs</dt>
            <dd className="mt-0.5">{user.packCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Conversations</dt>
            <dd className="mt-0.5">{user.conversationCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Credits left</dt>
            <dd className="mt-0.5">{user.creditBalance}</dd>
          </div>
        </dl>
      </Panel>

      {user.recentPacks.length > 0 && (
        <Panel>
          <h3 className="text-sm font-medium">Recent Server Packs</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {user.recentPacks.map((p) => (
              <li key={p.id}>
                <Link href={`/packs/${p.id}`} className="hover:text-emerald-400 hover:underline">
                  {p.name}
                </Link>{" "}
                <span className="font-mono text-xs text-slate-500">({p.status})</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {user.recentAudit.length > 0 && (
        <Panel>
          <h3 className="text-sm font-medium">Recent Activity Involving This Account</h3>
          <ul className="mt-2 space-y-1 font-mono text-xs text-slate-500">
            {user.recentAudit.map((a, i) => (
              <li key={i}>
                {new Date(a.createdAt).toLocaleString()} — {a.action}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h3 className="text-sm font-medium">Administrative Actions</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {me?.role === "OWNER" && user.role !== "OWNER" && !isSelf && (
            <select
              defaultValue={user.role}
              onChange={(e) => changeRole(e.target.value)}
              className="border border-base-600 bg-base-950 px-2 py-2 text-sm"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          )}
          <Button variant="secondary" onClick={() => toggleBlock(!user.isBlocked)} disabled={!canManage || isSelf}>
            {user.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
        {!canManage && !isSelf && (
          <p className="mt-2 text-xs text-slate-500">You do not have permission to manage this account.</p>
        )}
      </Panel>
    </div>
  );
}
