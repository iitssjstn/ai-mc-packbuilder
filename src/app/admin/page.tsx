import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminClient } from "./AdminClient";

// Not just "logged in" — must actually be ADMIN/OWNER. Anyone else
// (including a logged-in USER) gets sent home before any admin UI or
// data ever renders, rather than seeing a page that then tells them
// "no access" after the fact.
export default function AdminPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?redirect=/admin");
  if (user.role !== "ADMIN" && user.role !== "OWNER") redirect("/");
  return <AdminClient />;
}
