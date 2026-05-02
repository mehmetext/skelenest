import ejs from "ejs";
import fs from "fs-extra";
import path from "path";

export interface CopyTemplateTreeOptions {
  templateRoots: string[];
  outputRoot: string;
  data: Record<string, unknown>;
  slots?: Record<string, string[]>;
}

interface ConditionalTemplateResolution {
  include: boolean;
  relativePath: string;
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

function resolveConditionalTemplatePath(
  relativePath: string,
  selectedOptionIds: string[]
): ConditionalTemplateResolution {
  const segments = relativePath.split(path.sep);
  const rewrittenSegments = segments.map((segment) => {
    const whenMatch = segment.match(/^(.*)\.when-([a-z0-9-]+)(\.[^.]+(?:\.[^.]+)?)$/i);
    if (whenMatch) {
      return {
        include: selectedOptionIds.includes(whenMatch[2]),
        segment: `${whenMatch[1]}${whenMatch[3]}`,
      };
    }

    const unlessMatch = segment.match(
      /^(.*)\.unless-([a-z0-9-]+)(\.[^.]+(?:\.[^.]+)?)$/i
    );
    if (unlessMatch) {
      return {
        include: !selectedOptionIds.includes(unlessMatch[2]),
        segment: `${unlessMatch[1]}${unlessMatch[3]}`,
      };
    }

    return {
      include: true,
      segment,
    };
  });

  if (rewrittenSegments.some((entry) => !entry.include)) {
    return {
      include: false,
      relativePath,
    };
  }

  return {
    include: true,
    relativePath: rewrittenSegments.map((entry) => entry.segment).join(path.sep),
  };
}

/**
 * Copies every file under `templateRoot` into `outputRoot`, rendering `*.ejs`
 * with `data` and writing the output without the `.ejs` suffix.
 */
export async function copyTemplateTree(
  options: CopyTemplateTreeOptions
): Promise<void> {
  const { templateRoots, outputRoot, data, slots = {} } = options;
  const selectedOptionIds = Array.isArray(data.selectedOptionIds)
    ? data.selectedOptionIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

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
      const conditionalResolution = resolveConditionalTemplatePath(
        relative,
        selectedOptionIds
      );
      if (!conditionalResolution.include) {
        continue;
      }

      const destRelative = conditionalResolution.relativePath.endsWith(".ejs")
        ? conditionalResolution.relativePath.slice(0, -".ejs".length)
        : conditionalResolution.relativePath;
      const destPath = path.join(outputRoot, destRelative);
      await fs.ensureDir(path.dirname(destPath));

      if (conditionalResolution.relativePath.endsWith(".ejs")) {
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
