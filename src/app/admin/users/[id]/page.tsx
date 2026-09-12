import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { UserDetailClient } from "./UserDetailClient";

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) redirect(`/login?redirect=/admin/users/${params.id}`);
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <UserDetailClient id={params.id} />
    </AdminShell>
  );
}
