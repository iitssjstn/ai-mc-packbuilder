import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { AccountClient } from "./AccountClient";

// Not linked from the header nav on purpose (per the user) — the
// AppShell sidebar links to it, but reachable directly too.
export default function AccountPage() {
  if (!getSessionUser()) redirect("/login?redirect=/account");
  return (
    <AppShell>
      <AccountClient />
    </AppShell>
  );
}
