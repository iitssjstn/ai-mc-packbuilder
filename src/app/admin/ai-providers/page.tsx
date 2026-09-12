import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";
import { AiProvidersClient } from "./AiProvidersClient";

export default function AdminAiProvidersPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin/ai-providers");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return (
    <AdminShell>
      <AiProvidersClient />
    </AdminShell>
  );
}
