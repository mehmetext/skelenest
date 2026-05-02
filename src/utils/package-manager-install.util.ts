import { spawn } from "node:child_process";
import process from "node:process";
import { Readable } from "node:stream";
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
  const commandLabel = [command, ...args].join(" ");

  return new Promise((resolve, reject) => {
    process.stdout.write(
      [
        "",
        "+------------------------------------------+",
        `| Installing dependencies: ${commandLabel}`,
        "+------------------------------------------+",
        "",
      ].join("\n")
    );

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    const pipeWithPrefix = (
      stream: Readable | null,
      prefix: string
    ): void => {
      if (!stream) {
        return;
      }

      let buffer = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk: string) => {
        buffer += chunk;

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          process.stdout.write(`${prefix}${line}\n`);
        }
      });

      stream.on("end", () => {
        if (buffer.length > 0) {
          process.stdout.write(`${prefix}${buffer}\n`);
        }
      });
    };

    pipeWithPrefix(child.stdout, "| ");
    pipeWithPrefix(child.stderr, "! ");

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        process.stdout.write("+------------------------------------------+\n");
        resolve();
        return;
      }
      process.stdout.write("+------------------------------------------+\n");
      reject(
        new Error(
          `Package manager install failed (${command} exited with code ${code}).`
        )
      );
    });
  });
}
