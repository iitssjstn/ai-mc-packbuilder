import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { RegisterClient } from "./RegisterClient";

export default function RegisterPage({ searchParams }: { searchParams: { redirect?: string } }) {
  if (getSessionUser()) redirect(searchParams.redirect || "/builder");
  return <RegisterClient redirectTo={searchParams.redirect || "/builder"} />;
}
