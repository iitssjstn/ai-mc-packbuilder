import type { Role } from "@/lib/enums";

/**
 * Centralized role-hierarchy rules — every admin action that targets
 * another user (block, unblock, delete, role change) must go through
 * this, not a scattered role check per route. Hiding a button on the
 * frontend is never enough; every one of these call sites also
 * enforces it server-side.
 *
 * OWNER   — can manage ADMIN and USER accounts freely.
 * ADMIN   — can only manage USER accounts. Cannot act on another ADMIN
 *           or on OWNER, even by calling the API directly.
 * USER    — cannot manage anyone.
 */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "OWNER") return targetRole !== "OWNER"; // no one manages the owner, including another owner-labeled row
  if (actorRole === "ADMIN") return targetRole === "USER";
  return false;
}

/** Only OWNER may change anyone's role — promotion/demotion is a
 * strictly owner-only action regardless of the target's current role. */
export function canChangeRole(actorRole: Role): boolean {
  return actorRole === "OWNER";
}
