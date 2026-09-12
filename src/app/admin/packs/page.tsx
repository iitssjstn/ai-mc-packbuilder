import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { PacksAdminClient } from "./PacksAdminClient";

export default function AdminPacksPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/packs");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <PacksAdminClient />
    </AdminShell>
  );
}
