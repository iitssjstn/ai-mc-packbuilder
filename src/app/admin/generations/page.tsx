import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { GenerationsClient } from "./GenerationsClient";

export default function AdminGenerationsPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/generations");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <GenerationsClient />
    </AdminShell>
  );
}
