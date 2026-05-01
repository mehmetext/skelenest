import { InitPrompt } from "../prompts";
import { InitScaffolder } from "../scaffolders";
import { BaseCommand } from "./base.command";

export class InitCommand extends BaseCommand {
  constructor() {
    super({
      name: "init",
      description: "Creates a new NestJS project scaffold",
    });
  }

  async execute(): Promise<void> {
    const prompt = new InitPrompt();
    const data = await prompt.execute();

    const initScaffolder = new InitScaffolder(data);
    await initScaffolder.execute();
  }
}
