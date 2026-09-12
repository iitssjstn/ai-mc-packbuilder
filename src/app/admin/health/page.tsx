import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { HealthClient } from "./HealthClient";

export default function AdminHealthPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/health");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <HealthClient />
    </AdminShell>
  );
}
