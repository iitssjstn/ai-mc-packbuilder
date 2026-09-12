import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { PackDetailClient } from "./PackDetailClient";

export default function PackDetailPage({ params }: { params: { id: string } }) {
  if (!getSessionUser()) redirect(`/login?redirect=/packs/${params.id}`);
  return (
    <AppShell>
      <PackDetailClient id={params.id} />
    </AppShell>
  );
}
