import { spawn } from "node:child_process";
import type { PackageManager } from "../data/package-managers";

function getSpawnConfig(
  id: PackageManager["id"]
): { command: string; args: string[] } {
  const isWindows = process.platform === "win32";
  switch (id) {
    case "npm":
      return { command: isWindows ? "npm.cmd" : "npm", args: ["install"] };
    case "yarn":
      return { command: isWindows ? "yarn.cmd" : "yarn", args: [] };
    case "pnpm":
      return { command: isWindows ? "pnpm.cmd" : "pnpm", args: ["install"] };
  }
}

export function runPackageManagerInstall(
  cwd: string,
  packageManagerId: PackageManager["id"]
): Promise<void> {
  const { command, args } = getSpawnConfig(packageManagerId);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Package manager install failed (${command} exited with code ${code}).`
        )
      );
    });
  });
}
