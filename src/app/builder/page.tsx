import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { BuilderClient } from "./BuilderClient";

// Server component: gate the whole page behind login before any client
// code renders, rather than letting an anonymous visitor see the chat UI
// and only fail once they try to send a message.
export default function BuilderPage() {
  if (!getSessionUser()) redirect("/login?redirect=/builder");
  return <BuilderClient />;
}
