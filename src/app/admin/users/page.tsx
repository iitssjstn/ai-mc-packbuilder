import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { UsersClient } from "./UsersClient";

export default function AdminUsersPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/users");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <UsersClient />
    </AdminShell>
  );
}
