"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, Button, Input } from "@/components/ui";

export function RegisterClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
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
      setError(data.error ?? "Registreren mislukt");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Panel>
        <h3 className="font-medium">Registreren</h3>
        <form onSubmit={handleRegister} className="mt-3 space-y-2">
          <Input type="email" name="email" placeholder="E-mail" required />
          <Input type="text" name="username" placeholder="Gebruikersnaam" required />
          <Input type="password" name="password" placeholder="Wachtwoord (min. 10 tekens)" required />
          <Button type="submit">Registreren</Button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Al een account?{" "}
          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-emerald-400 hover:underline">
            Inloggen
          </Link>
        </p>
      </Panel>
    </div>
  );
}
