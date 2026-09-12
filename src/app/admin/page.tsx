import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminClient } from "./AdminClient";

export default function AdminPage() {
  if (!getSessionUser()) redirect("/account");
  return <AdminClient />;
}
