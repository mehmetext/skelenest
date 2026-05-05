import { cancel, confirm, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { getGitWorkingTreeStatus } from "../utils";

export async function confirmCleanGitWorkingTree(cwd: string): Promise<boolean> {
  const gitStatus = await getGitWorkingTreeStatus(cwd);

  if (!gitStatus.isGitRepository || !gitStatus.hasUncommittedChanges) {
    return true;
  }

  console.log(
    chalk.yellow(
      "Uncommitted changes were detected. Skelenest will not generate files unless you confirm."
    )
  );
  console.log(chalk.dim("Current git status:"));
  for (const line of gitStatus.statusLines.slice(0, 20)) {
    console.log(chalk.dim(`  ${line}`));
  }

  if (gitStatus.statusLines.length > 20) {
    console.log(
      chalk.dim(`  ...and ${gitStatus.statusLines.length - 20} more change(s)`)
    );
  }

  const shouldContinue = await confirm({
    message: "Continue generating into this working tree?",
    initialValue: false,
  });

  if (isCancel(shouldContinue) || !shouldContinue) {
    cancel(chalk.red("Generation cancelled."));
    return false;
  }

  return true;
}
