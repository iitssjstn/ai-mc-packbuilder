import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginClient } from "./LoginClient";

// Already logged in? A login form makes no sense — send them straight
// to where they were headed (or the builder by default).
export default function LoginPage({ searchParams }: { searchParams: { redirect?: string } }) {
  if (getSessionUser()) redirect(searchParams.redirect || "/builder");
  return <LoginClient redirectTo={searchParams.redirect || "/builder"} />;
}
