import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { PacksClient } from "./PacksClient";

export default function PacksPage() {
  if (!getSessionUser()) redirect("/login?redirect=/packs");
  return (
    <AppShell>
      <PacksClient />
    </AppShell>
  );
}
