import { outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import { InitPromptData } from "../prompts";
import { wait } from "../utils/wait.util";
import { BaseScaffolder } from "./base.scaffolder";

export class InitScaffolder extends BaseScaffolder {
  constructor(private readonly data: InitPromptData) {
    super();
  }

  async execute(): Promise<void> {
    const sDirectory = spinner();
    sDirectory.start(`Creating ${this.data.name}...`);
    await wait(1000);
    sDirectory.stop(`${this.data.name} created successfully!`);

    const sDependencies = spinner();
    sDependencies.start(`Installing dependencies...`);
    await wait(1000);
    sDependencies.stop(`Dependencies installed successfully!`);

    outro(chalk.cyanBright(`Everything is ready to go!`));
  }
}
