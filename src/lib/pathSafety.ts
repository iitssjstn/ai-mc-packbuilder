import path from "node:path";
import fs from "node:fs";

/**
 * Resolves `relativePath` against `baseDir` and guarantees the result stays
 * inside `baseDir`. Throws on any attempt at traversal, absolute paths,
 * null bytes, or unexpected characters.
 *
 * Every filesystem write in this codebase (pack generation, config engine,
 * logo upload) must go through this — never concatenate user input into a
 * path directly. See spec §56 (Filesystem Security).
 */
export function safeResolve(baseDir: string, relativePath: string): string {
  if (relativePath.includes("\0")) {
    throw new Error("Path contains a null byte");
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute paths are not allowed");
  }
  // Normalize backslashes too, in case a Windows-style path sneaks in.
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("Path traversal ('..') is not allowed");
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, normalized);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error("Resolved path escapes the base directory");
  }

  return resolvedTarget;
}

/** Rejects filenames with disallowed characters or extensions. */
const ALLOWED_FILENAME_RE = /^[a-zA-Z0-9._\- ]+$/;

export function assertSafeFilename(name: string, allowedExtensions?: string[]): void {
  if (!ALLOWED_FILENAME_RE.test(name)) {
    throw new Error(`Filename contains disallowed characters: ${name}`);
  }
  if (allowedExtensions) {
    const ext = path.extname(name).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Filename extension not allowed: ${ext}`);
    }
  }
}

/** Refuses to follow/create symlinks when writing generated pack files. */
export function assertNotSymlink(targetPath: string): void {
  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through a symlink: ${targetPath}`);
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
    // Path doesn't exist yet — fine, nothing to check.
  }
}
