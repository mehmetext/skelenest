import ejs from "ejs";
import fs from "fs-extra";
import path from "path";

export interface CopyTemplateTreeOptions {
  templateRoots: string[];
  outputRoot: string;
  data: Record<string, unknown>;
  slots?: Record<string, string[]>;
}

function normalizeRenderedTemplate(rendered: string): string {
  const normalizedNewlines = rendered.replace(/\r\n/g, "\n");
  const trimmedLineEnds = normalizedNewlines.replace(/[ \t]+$/gm, "");
  const normalizedBlankLines = trimmedLineEnds.replace(
    /\n(?:[ \t]*\n){2,}/g,
    "\n\n"
  );

  return normalizedBlankLines.endsWith("\n")
    ? normalizedBlankLines
    : `${normalizedBlankLines}\n`;
}

function normalizeRenderedTemplateByTarget(
  destPath: string,
  rendered: string
): string {
  const normalized = normalizeRenderedTemplate(rendered);
  const extension = path.extname(destPath);

  if (extension === ".yml" || extension === ".yaml") {
    const withoutYamlBlankLines = normalized.replace(/\n(?:[ \t]*\n)+/g, "\n");
    return withoutYamlBlankLines.endsWith("\n")
      ? withoutYamlBlankLines
      : `${withoutYamlBlankLines}\n`;
  }

  return normalized;
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
  const { templateRoots, outputRoot, data, slots = {} } = options;

  for (const templateRoot of templateRoots) {
    const exists = await fs.pathExists(templateRoot);
    if (!exists) {
      throw new Error(`Template directory not found: ${templateRoot}`);
    }
  }

  await fs.ensureDir(outputRoot);

  for (const templateRoot of templateRoots) {
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
        const rendered = ejs.render(template, {
          ...data,
          getSlot(slotName: string): string[] {
            return slots[slotName] ?? [];
          },
        });
        await fs.writeFile(
          destPath,
          normalizeRenderedTemplateByTarget(destPath, rendered),
          "utf8"
        );
      } else {
        await fs.copy(filePath, destPath);
      }
    }
  }
}
