import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { SettingsClient } from "./SettingsClient";

export default function AdminSettingsPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/settings");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <SettingsClient />
    </AdminShell>
  );
}
