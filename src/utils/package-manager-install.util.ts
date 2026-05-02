import process from "node:process";
import type { PackageManager } from "../data/package-managers";
import { runCommand } from "./command-runner.util";

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
  return runCommand({
    cwd,
    command,
    args,
    label: "Installing dependencies",
  });
}
