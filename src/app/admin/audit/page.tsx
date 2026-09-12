import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { AuditClient } from "./AuditClient";

export default function AdminAuditPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/audit");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <AuditClient />
    </AdminShell>
  );
}
