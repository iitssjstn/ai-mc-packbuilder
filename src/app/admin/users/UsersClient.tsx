"use client";

import { useEffect, useState } from "react";
import { Panel, Button } from "@/components/ui";
import Link from "next/link";
import { canManageUser } from "@/lib/permissions";
import type { Role } from "@/lib/enums";

interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
}
interface Me {
  id: string;
  role: Role;
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    const [usersRes, meRes] = await Promise.all([fetch(`/api/admin/users?${params}`), fetch("/api/auth/me")]);
    if (usersRes.status === 403) {
      setForbidden(true);
      return;
    }
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.items);
      setTotal(data.total);
      setPageSize(data.pageSize);
    }
    if (meRes.ok) setMe(await meRes.json());
  }

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function toggleUser(id: string, block: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/${block ? "block" : "unblock"}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed");
    }
    load();
  }

  async function changeRole(id: string, role: string) {
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not change role");
    }
    load();
  }

  async function removeUser(id: string, username: string) {
    if (!window.confirm(`Permanently delete the account "${username}"? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete user");
    }
    load();
  }

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Users</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or username..."
        className="w-full max-w-sm rounded-md border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {users.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}
      {users.map((u) => {
        // Mirrors the same rule the backend enforces — this only avoids
        // showing a button that would 403; it is not itself the security
        // boundary (every route re-checks this server-side regardless).
        const canManage = me ? canManageUser(me.role, u.role) : false;
        const isSelf = me?.id === u.id;
        return (
          <Panel key={u.id} className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p>
                <Link href={`/admin/users/${u.id}`} className="hover:text-emerald-400 hover:underline">
                  {u.email}
                </Link>{" "}
                <span className="text-slate-500">({u.username})</span>
              </p>
              <p className="font-mono text-xs text-slate-500">
                {u.role} · {u.isBlocked ? "Blocked" : "Active"} · Joined {new Date(u.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {me?.role === "OWNER" && u.role !== "OWNER" && !isSelf && (
                <select
                  defaultValue={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="border border-base-600 bg-base-950 px-2 py-1.5 text-xs"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              )}
              <Button variant="secondary" onClick={() => toggleUser(u.id, !u.isBlocked)} disabled={!canManage || isSelf}>
                {u.isBlocked ? "Unblock" : "Block"}
              </Button>
              {me?.role === "OWNER" && !isSelf && (
                <Button variant="secondary" onClick={() => removeUser(u.id, u.username)} disabled={!canManage}>
                  Delete
                </Button>
              )}
            </div>
          </Panel>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
