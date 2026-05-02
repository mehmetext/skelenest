import fs from "fs-extra";

function insertBefore(source: string, needle: string, insertion: string): string {
  const index = source.indexOf(needle);

  if (index === -1) {
    throw new Error(`Could not find insertion point: ${needle}`);
  }

  return `${source.slice(0, index)}${insertion}${source.slice(index)}`;
}

export async function addProviderToModule(input: {
  moduleFilePath: string;
  importStatement: string;
  className: string;
}): Promise<void> {
  const { moduleFilePath, importStatement, className } = input;
  let content = await fs.readFile(moduleFilePath, "utf8");

  if (!content.includes(importStatement.trim())) {
    content = insertBefore(content, "@Module({", `${importStatement}\n`);
  }

  const providersMatch = content.match(/providers:\s*\[([\s\S]*?)\]\s*,\s*exports:/);

  if (!providersMatch) {
    throw new Error(
      `Could not find providers array in module file: ${moduleFilePath}`
    );
  }

  if (!providersMatch[1].includes(className)) {
    const existingEntries = providersMatch[1].replace(/\s+$/, "");
    const nextEntries = existingEntries.trim().length > 0
      ? `${existingEntries}\n    ${className},\n  `
      : `\n    ${className},\n  `;
    const updatedSection = `providers: [${nextEntries}],\n  exports:`;
    content = content.replace(providersMatch[0], updatedSection);
  }

  await fs.writeFile(moduleFilePath, content, "utf8");
}
