import {
  cancel,
  confirm,
  group,
  intro,
  select,
  text,
} from "@clack/prompts";
import chalk from "chalk";
import { createSelectionGroupPrompts } from "../core";
import { PackageManager, packageManagers } from "../data";
import { initSelectionGroups, InitPromptData } from "../init";
import { BasePrompt } from "./base.prompt";

export class InitPrompt extends BasePrompt<InitPromptData> {
  constructor() {
    super();
  }

  async execute(): Promise<InitPromptData> {
    intro(chalk.bgCyanBright.white(" skelenest "));

    const selectionPrompts = createSelectionGroupPrompts(initSelectionGroups);

    const answers = (await group(
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
        ...selectionPrompts,
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
    )) as Record<string, string | string[] | boolean>;

    return {
      name: answers.name as string,
      port: answers.port as string,
      packageManager: answers.packageManager as PackageManager["id"],
      installDependencies: answers.installDependencies as boolean,
      selections: Object.fromEntries(
        initSelectionGroups.map((selectionGroup) => [
          selectionGroup.id,
          answers[selectionGroup.id] as string | string[],
        ])
      ),
    };
  }
}
