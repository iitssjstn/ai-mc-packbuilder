"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, Button, Input } from "@/components/ui";

export function LoginClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/setup/status")
      .then((res) => res.json())
      .then((data) => setSetupComplete(data.setupComplete));
  }, []);

  async function handleSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(data.error ?? "Setup failed");
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(data.error ?? "Login failed");
    }
  }

  if (setupComplete === null) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-10">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!setupComplete && (
        <Panel className="border-emerald-500/40">
          <h3 className="font-medium text-emerald-400">First-time setup</h3>
          <p className="mt-1 text-sm text-slate-400">
            No owner account exists yet. Create one now — this form is permanently disabled afterwards.
          </p>
          <form onSubmit={handleSetup} className="mt-4 space-y-2">
            <Input type="email" name="email" placeholder="Email" required />
            <Input type="text" name="username" placeholder="Username" required />
            <Input type="password" name="password" placeholder="Password (min. 10 characters)" required />
            <Button type="submit">Create Owner Account</Button>
          </form>
        </Panel>
      )}

      {setupComplete && (
        <Panel>
          <h3 className="font-medium">Log In</h3>
          <form onSubmit={handleLogin} className="mt-3 space-y-2">
            <Input type="email" name="email" placeholder="Email" required />
            <Input type="password" name="password" placeholder="Password" required />
            <Button type="submit">Log In</Button>
          </form>
          <p className="mt-4 text-sm text-slate-400">
            Don't have an account yet?{" "}
            <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="text-emerald-400 hover:underline">
              Sign up here
            </Link>
          </p>
        </Panel>
      )}
    </div>
  );
}
