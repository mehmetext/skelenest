import { cancel, group, intro, select, text } from "@clack/prompts";
import chalk from "chalk";
import { BasePrompt } from "../base.prompt";
import { packageManagers, type PackageManager } from "./package-manager";

export interface InitPromptData {
  name: string;
  packageManager: PackageManager["id"];
}

export class InitPrompt extends BasePrompt<InitPromptData> {
  constructor() {
    super();
  }

  async execute(): Promise<InitPromptData> {
    intro(chalk.bgCyanBright.white(" skelenest "));

    const data = await group(
      {
        name: () =>
          text({
            message: "What is the project name?",
            placeholder: "my-skelenest-app",
            validate(value) {
              if (value?.length === 0) return "Project name cannot be empty.";
            },
            defaultValue: "my-skelenest-app",
          }),
        packageManager: () =>
          select({
            message: "Which package manager do you want to use?",
            options: packageManagers.map((pm) => ({
              value: pm.id,
              label: pm.name,
            })),
          }),
      },
      {
        onCancel: () => {
          cancel(chalk.red("Operation cancelled."));
          process.exit(0);
        },
      }
    );

    return data;
  }
}
