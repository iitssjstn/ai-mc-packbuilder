import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { LegalClient } from "./LegalClient";

export default function AdminLegalPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/legal");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <LegalClient />
    </AdminShell>
  );
}
