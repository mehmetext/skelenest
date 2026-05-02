import fs from "fs";
import path from "path";

export function resolveTemplatesRoot(currentDir: string): string {
  const candidates = [
    path.join(currentDir, "..", "templates"),
    path.join(currentDir, "..", "src", "templates"),
    path.join(currentDir, "..", "..", "templates"),
    path.join(currentDir, "..", "..", "src", "templates"),
  ];

  const existingRoot = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existingRoot) {
    throw new Error(
      `Unable to resolve templates root from directory: ${currentDir}`
    );
  }

  return existingRoot;
}
