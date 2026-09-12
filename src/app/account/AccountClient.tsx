"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Button, Input } from "@/components/ui";

interface Me {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function AccountClient() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packCount, setPackCount] = useState<number | null>(null);
  const [credits, setCredits] = useState<{ balance: number; unlimited: boolean } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe);
    fetch("/api/packs")
      .then((res) => (res.ok ? res.json() : []))
      .then((packs) => setPackCount(packs.length));
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then(setCredits);
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

  async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleteError(null);
    if (!window.confirm("Permanently delete your account and all your server packs? This cannot be undone.")) return;

    const res = await fetch("/api/auth/me", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: deletePassword }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Could not delete account");
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
        <h3 className="font-medium">Usage</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Server packs created</dt>
            <dd className="mt-0.5">{packCount ?? "..."}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Generation credits</dt>
            <dd className="mt-0.5">{credits ? (credits.unlimited ? "Unlimited (staff)" : credits.balance) : "..."}</dd>
          </div>
        </dl>
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

      {me.role !== "OWNER" && (
        <Panel className="border-red-500/40">
          <h3 className="font-medium text-red-400">Danger Zone</h3>
          <p className="mt-1 text-xs text-slate-500">
            Deleting your account permanently removes your server packs, conversations, and account data.
          </p>
          {deleteError && <p className="mt-2 text-sm text-red-400">{deleteError}</p>}
          <form onSubmit={handleDeleteAccount} className="mt-3 flex gap-2">
            <Input
              type="password"
              placeholder="Current password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              className="flex-1"
            />
            <button
              type="submit"
              className="rounded-md border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete Account
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
