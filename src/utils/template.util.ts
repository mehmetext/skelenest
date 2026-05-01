import ejs from "ejs";
import fs from "fs-extra";
import path from "path";

export interface CopyTemplateTreeOptions {
  templateRoot: string;
  outputRoot: string;
  data: Record<string, unknown>;
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

/**
 * Copies every file under `templateRoot` into `outputRoot`, rendering `*.ejs`
 * with `data` and writing the output without the `.ejs` suffix.
 */
export async function copyTemplateTree(
  options: CopyTemplateTreeOptions
): Promise<void> {
  const { templateRoot, outputRoot, data } = options;
  const exists = await fs.pathExists(templateRoot);
  if (!exists) {
    throw new Error(`Template directory not found: ${templateRoot}`);
  }

  await fs.ensureDir(outputRoot);
  const files = await listFilesRecursive(templateRoot);

  for (const filePath of files) {
    const relative = path.relative(templateRoot, filePath);
    const destRelative = relative.endsWith(".ejs")
      ? relative.slice(0, -".ejs".length)
      : relative;
    const destPath = path.join(outputRoot, destRelative);
    await fs.ensureDir(path.dirname(destPath));

    if (relative.endsWith(".ejs")) {
      const template = await fs.readFile(filePath, "utf8");
      const rendered = ejs.render(template, data);
      await fs.writeFile(destPath, rendered, "utf8");
    } else {
      await fs.copy(filePath, destPath);
    }
  }
}
