import chalk from "chalk";
import { Command } from "commander";

export interface BaseCommandOptions {
  name: string;
  description?: string;
  version?: string;
}

export abstract class BaseCommand extends Command {
  constructor(options: BaseCommandOptions) {
    super(options.name);
    if (options.description) {
      this.description(options.description);
    }
    if (options.version) {
      this.version(options.version);
    }
    this.action(async () => {
      try {
        await this.execute();
      } catch (error) {
        console.error(error);
        console.error(
          chalk.red("An error occurred while executing the command")
        );
        process.exit(1);
      }
    });
  }

  abstract execute(): Promise<void>;
}
