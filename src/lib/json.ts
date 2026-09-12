/**
 * Prisma's SQLite connector has no native `Json` column type at all (not
 * even stored-as-text support) — every field that used to be `Json` in
 * the schema is now a plain `String` column, JSON-encoded/decoded here
 * at the application boundary.
 */
export function toJsonString<T>(value: T): string {
  return JSON.stringify(value);
}

/** Throws if `value` isn't valid JSON — callers decide how to handle that
 * (e.g. treat a corrupt stored plan as a validation failure). */
export function fromJsonString<T = unknown>(value: string): T {
  return JSON.parse(value) as T;
}
