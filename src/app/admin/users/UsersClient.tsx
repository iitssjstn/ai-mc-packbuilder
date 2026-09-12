"use client";

import { useEffect, useState } from "react";
import { Panel, Button } from "@/components/ui";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleUser(id: string, block: boolean) {
    await fetch(`/api/admin/users/${id}/${block ? "block" : "unblock"}`, { method: "POST" });
    load();
  }

  if (forbidden) return <p className="px-6 py-10 text-sm text-slate-500">You do not have access to the admin panel.</p>;

  return (
    <div className="space-y-2 px-6 py-10">
      <h2 className="text-base font-semibold">Users</h2>
      {users.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}
      {users.map((u) => (
        <Panel key={u.id} className="flex items-center justify-between">
          <div className="text-sm">
            <p>
              {u.email} <span className="text-slate-500">({u.username})</span>
            </p>
            <p className="font-mono text-xs text-slate-500">
              {u.role} · {u.isBlocked ? "Blocked" : "Active"} · Joined {new Date(u.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="secondary" onClick={() => toggleUser(u.id, !u.isBlocked)}>
            {u.isBlocked ? "Unblock" : "Block"}
          </Button>
        </Panel>
      ))}
    </div>
  );
}
