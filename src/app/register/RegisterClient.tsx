"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, Button, Input } from "@/components/ui";
import { Box } from "lucide-react";
import { PasswordStrength } from "@/components/PasswordStrength";

export function RegisterClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const confirmPassword = form.get("confirmPassword") as string;
    const termsAccepted = form.get("termsAccepted") === "on";

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the Terms to sign up");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        username: form.get("username"),
        password,
        termsAccepted,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(data.error ?? "Registration failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <Box size={20} />
        </span>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="text-sm text-slate-500">Start building your Minecraft server pack with AI.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <Panel>
        <form onSubmit={handleRegister} className="space-y-3">
          <label className="block text-sm text-slate-400">
            Email
            <Input type="email" name="email" required className="mt-1" />
          </label>
          <label className="block text-sm text-slate-400">
            Username
            <Input type="text" name="username" required className="mt-1" />
          </label>
          <label className="block text-sm text-slate-400">
            Password
            <Input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
              className="mt-1"
            />
            <PasswordStrength password={password} />
          </label>
          <label className="block text-sm text-slate-400">
            Confirm password
            <Input type="password" name="confirmPassword" required className="mt-1" />
          </label>
          <label className="flex items-start gap-2 pt-1 text-sm text-slate-400">
            <input type="checkbox" name="termsAccepted" className="mt-0.5" required />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-emerald-400 hover:underline">
                Terms of Service
              </Link>
            </span>
          </label>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-emerald-400 hover:underline">
            Log in
          </Link>
        </p>
      </Panel>
    </div>
  );
}
