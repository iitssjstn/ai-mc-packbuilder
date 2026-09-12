import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { PluginsClient } from "./PluginsClient";

export default function AdminPluginsPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/plugins");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <PluginsClient />
    </AdminShell>
  );
}
