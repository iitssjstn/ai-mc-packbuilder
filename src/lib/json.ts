import type { Prisma } from "@prisma/client";

/**
 * Prisma's `Json` column type expects `InputJsonValue` — a strictly
 * JSON-shaped recursive type that does NOT allow `undefined` anywhere,
 * even on optional object properties. Zod-inferred types (like our
 * `ServerPlan`) use `T | undefined` for optional fields, which TypeScript
 * correctly refuses to assign to a Prisma Json column.
 *
 * Round-tripping through JSON strips every `undefined` property (that's
 * standard `JSON.stringify` behavior) and yields a plain value Prisma
 * accepts. Safe here because everything going through this was already
 * validated by a Zod schema, so it's guaranteed to be JSON-serializable.
 */
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
