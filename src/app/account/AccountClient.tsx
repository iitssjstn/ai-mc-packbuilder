"use client";

import { useEffect, useState } from "react";
import { Panel, Button, Input } from "@/components/ui";

interface Me {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function AccountClient() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("currentPassword") as string;
    const email = (form.get("email") as string) || undefined;
    const username = (form.get("username") as string) || undefined;
    const newPassword = (form.get("newPassword") as string) || undefined;

    const res = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, email, username, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMe(data);
      setSuccess("Your details have been updated.");
      e.currentTarget.reset();
    } else {
      setError(data.error ?? "Update failed");
    }
  }

  if (!me) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-10">
      <h2 className="text-base font-semibold">Account</h2>

      <Panel>
        <p className="text-sm text-slate-400">
          Logged in as <span className="text-slate-200">{me.username}</span> ({me.email})
        </p>
      </Panel>

      <Panel>
        <h3 className="font-medium">Update Your Details</h3>
        <p className="mt-1 text-xs text-slate-500">
          Leave a field blank to keep it unchanged. Your current password is always required to confirm changes.
        </p>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <Input type="email" name="email" placeholder={`New email (current: ${me.email})`} />
          <Input type="text" name="username" placeholder={`New username (current: ${me.username})`} />
          <Input type="password" name="newPassword" placeholder="New password (min. 10 characters, optional)" />
          <hr className="border-base-700" />
          <Input type="password" name="currentPassword" placeholder="Current password (required)" required />
          <Button type="submit">Save</Button>
        </form>
      </Panel>
    </div>
  );
}
