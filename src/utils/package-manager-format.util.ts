import process from "node:process";
import type { PackageManager } from "../data/package-managers";
import { runCommand } from "./command-runner.util";

function getFormatSpawnConfig(
  id: PackageManager["id"]
): { command: string; args: string[] } {
  const isWindows = process.platform === "win32";

  switch (id) {
    case "npm":
      return { command: isWindows ? "npm.cmd" : "npm", args: ["run", "format"] };
    case "yarn":
      return { command: isWindows ? "yarn.cmd" : "yarn", args: ["format"] };
    case "pnpm":
      return { command: isWindows ? "pnpm.cmd" : "pnpm", args: ["run", "format"] };
  }
}

export function runPackageManagerFormat(
  cwd: string,
  packageManagerId: PackageManager["id"]
): Promise<void> {
  const { command, args } = getFormatSpawnConfig(packageManagerId);

  return runCommand({
    cwd,
    command,
    args,
    label: "Formatting generated project",
  });
}
