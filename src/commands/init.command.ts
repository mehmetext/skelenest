import { InitPrompt } from "../prompts/init/init.prompt";
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
    console.log(data);
  }
}
