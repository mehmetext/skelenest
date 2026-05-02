import { spawn } from "node:child_process";
import process from "node:process";
import { Readable } from "node:stream";

export interface RunCommandOptions {
  cwd: string;
  command: string;
  args?: string[];
  label: string;
}

function pipeWithPrefix(stream: Readable | null, prefix: string): void {
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
}

export function runCommand(options: RunCommandOptions): Promise<void> {
  const { cwd, command, args = [], label } = options;
  const commandLabel = [command, ...args].join(" ");

  return new Promise((resolve, reject) => {
    process.stdout.write(
      [
        "",
        "+------------------------------------------+",
        `| ${label}: ${commandLabel}`,
        "+------------------------------------------+",
        "",
      ].join("\n")
    );

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    pipeWithPrefix(child.stdout, "| ");
    pipeWithPrefix(child.stderr, "! ");

    child.on("error", reject);
    child.on("close", (code) => {
      process.stdout.write("+------------------------------------------+\n");

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${label} failed (${command} exited with code ${code}).`)
      );
    });
  });
}
