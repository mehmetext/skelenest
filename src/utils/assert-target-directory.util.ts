import fs from "fs-extra";

/**
 * Ensures `targetDir` is absent or an empty directory so scaffolding can write safely.
 */
export async function assertTargetDirectoryEmpty(
  targetDir: string
): Promise<void> {
  const exists = await fs.pathExists(targetDir);
  if (!exists) {
    return;
  }
  const entries = await fs.readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(
      `Directory "${targetDir}" already exists and is not empty. Choose another project name or remove that folder.`
    );
  }
}
