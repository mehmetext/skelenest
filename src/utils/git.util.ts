import { spawn } from "node:child_process";
import process from "node:process";
import { runCommand } from "./command-runner.util";

export interface GitWorkingTreeStatus {
  isGitRepository: boolean;
  hasUncommittedChanges: boolean;
  statusLines: string[];
}

function getGitCommand(): string {
  return process.platform === "win32" ? "git.exe" : "git";
}

function runGitCapture(
  cwd: string,
  args: string[]
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const git = getGitCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(git, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

export async function getGitWorkingTreeStatus(
  cwd: string
): Promise<GitWorkingTreeStatus> {
  const repositoryCheck = await runGitCapture(cwd, [
    "rev-parse",
    "--is-inside-work-tree",
  ]);

  if (
    repositoryCheck.code !== 0 ||
    repositoryCheck.stdout.trim() !== "true"
  ) {
    return {
      isGitRepository: false,
      hasUncommittedChanges: false,
      statusLines: [],
    };
  }

  const status = await runGitCapture(cwd, ["status", "--porcelain"]);
  const statusLines = status.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    isGitRepository: true,
    hasUncommittedChanges: statusLines.length > 0,
    statusLines,
  };
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
