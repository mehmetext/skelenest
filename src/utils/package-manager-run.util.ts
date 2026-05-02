import process from "node:process";
import type { PackageManager } from "../data/package-managers";
import { runCommand } from "./command-runner.util";

function getSpawnConfig(
  id: PackageManager["id"],
  script: string
): { command: string; args: string[] } {
  const isWindows = process.platform === "win32";
  switch (id) {
    case "npm":
      return { command: isWindows ? "npm.cmd" : "npm", args: ["run", script] };
    case "yarn":
      return { command: isWindows ? "yarn.cmd" : "yarn", args: [script] };
    case "pnpm":
      return { command: isWindows ? "pnpm.cmd" : "pnpm", args: [script] };
  }
}

export function runPackageManagerScript(
  cwd: string,
  packageManagerId: PackageManager["id"],
  script: string
): Promise<void> {
  const { command, args } = getSpawnConfig(packageManagerId, script);
  return runCommand({
    cwd,
    command,
    args,
    label: `Running ${script}`,
  });
}
