import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import archiver from "archiver";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { safeResolve, assertSafeFilename, assertNotSymlink } from "@/lib/pathSafety";
import { ServerPlan } from "@/schemas/serverPlan.schema";
import { SoftwareType } from "@/lib/enums";
import { compatibilityService } from "./CompatibilityService";
import { dependencyService } from "./DependencyService";
import { conflictService } from "./ConflictService";
import { configurationService } from "./ConfigurationService";
import { pluginRegistryService } from "./PluginRegistryService";
import { prisma } from "@/lib/prisma";
import { renderStartScriptSh, renderStartScriptBat } from "@/templates/fileTemplates";
import { pluginDownloadService } from "./PluginDownloadService";

export class PlanValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Server plan failed validation: ${issues.join(" | ")}`);
  }
}

export interface GeneratedPack {
  filePath: string;
  fileSizeBytes: number;
}

const SOFTWARE_TYPE_MAP: Record<ServerPlan["software"]["type"], SoftwareType> = {
  vanilla: "VANILLA",
  paper: "PAPER",
  purpur: "PURPUR",
  fabric: "FABRIC",
  forge: "FORGE",
  neoforge: "NEOFORGE",
};

export class PackGeneratorService {
  private storageRoot = path.resolve(env.STORAGE_LOCAL_PATH);

  /**
   * Full validation pipeline (spec §35/§81). Throws PlanValidationError
   * with a human-readable, non-leaky issue list if anything fails — the
   * pack is never generated on a plan that hasn't cleanly passed every
   * check.
   */
  async validatePlan(plan: ServerPlan) {
    const software = SOFTWARE_TYPE_MAP[plan.software.type];
    const issues: string[] = [];

    // 1. Minecraft version must exist and be supported.
    const mcVersion = await prisma.minecraftVersion.findUnique({ where: { version: plan.minecraft.version } });
    if (!mcVersion || !mcVersion.isSupported) {
      issues.push(`Minecraft version ${plan.minecraft.version} is not supported.`);
    }

    // 2. Dependency resolution (auto-adds required deps).
    const pluginDeps = await dependencyService.resolvePlugins(plan.requestedPluginSlugs);
    const modDeps = await dependencyService.resolveMods(plan.requestedModSlugs);

    // 3. Compatibility (version + software) on the fully-resolved sets.
    const pluginCompat = await compatibilityService.checkPlugins(pluginDeps.resolvedSlugs, plan.minecraft.version, software);
    const modCompat = await compatibilityService.checkMods(modDeps.resolvedSlugs, plan.minecraft.version, software);
    issues.push(...pluginCompat.issues.map((i) => `Plugin ${i.slug}: ${i.reason}`));
    issues.push(...modCompat.issues.map((i) => `Mod ${i.slug}: ${i.reason}`));

    // 4. Conflicts on the resolved sets.
    const pluginConflicts = await conflictService.checkPlugins(pluginDeps.resolvedSlugs);
    const modConflicts = await conflictService.checkMods(modDeps.resolvedSlugs);
    issues.push(...pluginConflicts.conflicts.map((c) => `Conflict: ${c.slugA} vs ${c.slugB} (${c.reason ?? "incompatible"})`));
    issues.push(...modConflicts.conflicts.map((c) => `Conflict: ${c.slugA} vs ${c.slugB} (${c.reason ?? "incompatible"})`));

    if (issues.length > 0) {
      throw new PlanValidationError(issues);
    }

    return {
      software,
      pluginSlugs: pluginDeps.resolvedSlugs,
      modSlugs: modDeps.resolvedSlugs,
      pluginVersions: pluginCompat.resolvedVersions,
      modVersions: modCompat.resolvedVersions,
      autoAddedPlugins: pluginDeps.autoAdded,
      autoAddedMods: modDeps.autoAdded,
    };
  }

  /**
   * Generates the pack ZIP for an already-validated plan. Every file that
   * goes into the archive is written to a per-job temp directory first
   * (spec §37), through safeResolve (no traversal/absolute paths), with a
   * symlink check before every write (spec §36). The temp directory is
   * always cleaned up, success or failure.
   */
  async generate(packId: string, plan: ServerPlan): Promise<GeneratedPack> {
    const setStep = (generationStep: string) => prisma.serverPack.update({ where: { id: packId }, data: { generationStep } });

    await setStep("checking_compatibility");
    const validated = await this.validatePlan(plan);

    const jobId = crypto.randomUUID(); // unpredictable temp dir name
    const tmpDir = path.join(this.storageRoot, "_tmp", jobId);
    await fsp.mkdir(tmpDir, { recursive: true });

    await setStep("generating_configs");

    try {
      await this.writeFile(tmpDir, "eula.txt", configurationService.renderEula().content);
      await this.writeFile(tmpDir, "server.properties", configurationService.renderServerProperties(plan).content);

      const ramMb = 4096;
      await this.writeFile(tmpDir, "start.sh", renderStartScriptSh("server.jar", ramMb));
      await this.writeFile(tmpDir, "start.bat", renderStartScriptBat("server.jar", ramMb));

      // Server icon, if the user uploaded one via BrandingService (spec §29).
      // Minecraft requires exactly "server-icon.png" — a JPEG upload gets
      // converted... actually we simply require PNG for the icon slot and
      // skip silently for JPEG uploads, noting it in the README instead of
      // pulling in an image-conversion dependency for one edge case.
      const branding = await prisma.branding.findUnique({ where: { packId } });
      if (branding?.logoPath && branding.logoPath.endsWith(".png")) {
        const iconBuffer = await fsp.readFile(branding.logoPath);
        await this.writeBinaryFile(tmpDir, "server-icon.png", iconBuffer);
      }

      const pluginRecords = await Promise.all(
        validated.pluginSlugs.map((slug) => pluginRegistryService.getBySlug(slug))
      );
      const pluginNames = pluginRecords.filter(Boolean).map((p) => p!.name);

      await this.writeFile(
        tmpDir,
        "README.txt",
        configurationService.renderReadme(plan, pluginNames, validated.pluginVersions[validated.pluginSlugs[0]] ?? "n/a").content
      );
      await this.writeFile(
        tmpDir,
        "LICENSES.txt",
        configurationService.renderLicenses(
          pluginRecords.filter(Boolean).map((p) => ({ name: p!.name, license: p!.license, officialUrl: p!.officialUrl }))
        ).content
      );

      const pluginsDir = path.join(tmpDir, "plugins");
      await fsp.mkdir(pluginsDir, { recursive: true });
      await setStep("downloading_plugins");

      const downloadTargets = pluginRecords
        .filter(Boolean)
        .map((p) => {
          const resolvedVersion = validated.pluginVersions[p!.slug];
          const versionRecord = p!.versions.find((v: any) => v.version === resolvedVersion);
          return {
            name: p!.name,
            downloadUrl: versionRecord?.downloadUrl ?? "",
            checksumSha256: versionRecord?.checksum ?? null,
          };
        });

      const downloadOutcomes = await pluginDownloadService.downloadAll(downloadTargets, pluginsDir);
      const failedDownloads = downloadOutcomes.filter((o) => !o.ok);
      if (failedDownloads.length > 0) {
        // Don't silently ship a broken pack — a plugin the plan promised
        // but that couldn't actually be bundled is a validation failure,
        // not a "best effort" pack.
        throw new PlanValidationError(
          failedDownloads.map((f) => `Could not bundle ${f.name}: ${f.reason}`)
        );
      }

      const zipPath = path.join(this.storageRoot, `${packId}.zip`);
      await setStep("validating");
      const fileSizeBytes = await this.zipDirectory(tmpDir, zipPath);

      return { filePath: zipPath, fileSizeBytes };
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async writeFile(baseDir: string, relativePath: string, content: string) {
    assertSafeFilename(path.basename(relativePath));
    const target = safeResolve(baseDir, relativePath);
    assertNotSymlink(target);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, content, { mode: 0o644 });
  }

  private async writeBinaryFile(baseDir: string, relativePath: string, content: Buffer) {
    assertSafeFilename(path.basename(relativePath), [".png"]);
    const target = safeResolve(baseDir, relativePath);
    assertNotSymlink(target);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, content, { mode: 0o644 });
  }

  private zipDirectory(sourceDir: string, destZipPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      let totalBytes = 0;
      const maxBytes = env.MAX_ZIP_SIZE_MB * 1024 * 1024;

      archive.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          archive.abort();
          reject(new Error(`Generated pack exceeds the ${env.MAX_ZIP_SIZE_MB}MB limit`));
        }
      });

      output.on("close", () => resolve(totalBytes));
      archive.on("error", (err) => reject(err));

      archive.pipe(output);
      // Only ever adds files that already live inside our own controlled
      // tmpDir — never a caller-supplied absolute path, and archiver
      // itself will not follow symlinks outside the tree by default here
      // since we never created any.
      archive.directory(sourceDir, false);
      archive.finalize();

      logger.info({ destZipPath }, "Generating pack ZIP");
    });
  }
}

export const packGeneratorService = new PackGeneratorService();
