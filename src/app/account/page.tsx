"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Button, Input } from "@/components/ui";

export default function AccountPage() {
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
      setSetupComplete(true);
      router.refresh();
    } else {
      setError(data.error ?? "Setup mislukt");
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
      router.push("/builder");
      router.refresh();
    } else {
      setError(data.error ?? "Inloggen mislukt");
    }
  }

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
      router.push("/builder");
      router.refresh();
    } else {
      setError(data.error ?? "Registreren mislukt");
    }
  }

  if (setupComplete === null) return <p className="text-sm text-slate-500">Laden...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Account</h2>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!setupComplete && (
        <Panel className="border-emerald-500/40">
          <h3 className="font-medium text-emerald-400">Eerste installatie</h3>
          <p className="mt-1 text-sm text-slate-400">
            Er is nog geen owner-account. Maak deze eenmalig aan — daarna is dit formulier permanent uitgeschakeld.
          </p>
          <form onSubmit={handleSetup} className="mt-4 max-w-xs space-y-2">
            <Input type="email" name="email" placeholder="E-mail" required />
            <Input type="text" name="username" placeholder="Gebruikersnaam" required />
            <Input type="password" name="password" placeholder="Wachtwoord (min. 10 tekens)" required />
            <Button type="submit">Owner-account aanmaken</Button>
          </form>
        </Panel>
      )}

      {setupComplete && (
        <div className="flex flex-wrap gap-6">
          <Panel className="flex-1 min-w-[240px]">
            <h3 className="font-medium">Inloggen</h3>
            <form onSubmit={handleLogin} className="mt-3 space-y-2">
              <Input type="email" name="email" placeholder="E-mail" required />
              <Input type="password" name="password" placeholder="Wachtwoord" required />
              <Button type="submit">Inloggen</Button>
            </form>
          </Panel>

          <Panel className="flex-1 min-w-[240px]">
            <h3 className="font-medium">Registreren</h3>
            <form onSubmit={handleRegister} className="mt-3 space-y-2">
              <Input type="email" name="email" placeholder="E-mail" required />
              <Input type="text" name="username" placeholder="Gebruikersnaam" required />
              <Input type="password" name="password" placeholder="Wachtwoord (min. 10 tekens)" required />
              <Button type="submit">Registreren</Button>
            </form>
          </Panel>
        </div>
      )}
    </div>
  );
}
