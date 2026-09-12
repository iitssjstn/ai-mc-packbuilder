"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, Button, Input } from "@/components/ui";
import { Box, Loader2 } from "lucide-react";

export function LoginClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup/status")
      .then((res) => res.json())
      .then((data) => setSetupComplete(data.setupComplete));
  }, []);

  async function handleSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        rememberMe: form.get("rememberMe") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(data.error ?? "Login failed");
      setSubmitting(false);
    }
  }

  if (setupComplete === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <Box size={20} />
        </span>
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="text-sm text-slate-500">Log in to continue building your server pack.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Owner Account"}
            </Button>
          </form>
        </Panel>
      )}

      {setupComplete && (
        <Panel>
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-sm text-slate-400">
              Email
              <Input type="email" name="email" required className="mt-1" />
            </label>
            <label className="block text-sm text-slate-400">
              Password
              <Input type="password" name="password" required className="mt-1" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" name="rememberMe" />
              Remember me
            </label>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Logging in..." : "Log In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
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
