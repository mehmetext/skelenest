import { cancel, confirm, group, intro, select, text } from "@clack/prompts";
import chalk from "chalk";
import { PackageManager, packageManagers } from "../data";
import { BasePrompt } from "./base.prompt";

export interface InitPromptData {
  name: string;
  port: string;
  packageManager: PackageManager["id"];
  installDependencies: boolean;
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
        port: () =>
          text({
            message: "What is the port number?",
            defaultValue: "3000",
            placeholder: "3000",
          }),
        packageManager: () =>
          select({
            message: "Which package manager do you want to use?",
            options: packageManagers.map((pm) => ({
              value: pm.id,
              label: pm.name,
            })),
          }),
        installDependencies: () =>
          confirm({
            message: "Do you want to install dependencies?",
            initialValue: true,
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
