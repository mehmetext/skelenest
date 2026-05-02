import process from "node:process";
import { runCommand } from "./command-runner.util";

function getGitCommand(): string {
  return process.platform === "win32" ? "git.exe" : "git";
}

export async function initializeGitRepository(cwd: string): Promise<void> {
  const git = getGitCommand();

  await runCommand({
    cwd,
    command: git,
    args: ["init"],
    label: "Initializing git repository",
  });

  await runCommand({
    cwd,
    command: git,
    args: ["add", "."],
    label: "Staging project files",
  });

  await runCommand({
    cwd,
    command: git,
    args: [
      "-c",
      "user.name=skelenest",
      "-c",
      "user.email=skelenest@local",
      "commit",
      "-m",
      "chore: initial commit",
    ],
    label: "Creating initial commit",
  });
}
