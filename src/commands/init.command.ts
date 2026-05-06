import { SelectionValue } from "../core";
import { InitPrompt } from "../prompts";
import { InitScaffolder } from "../scaffolders";
import { BaseCommand } from "./base.command";

function parseListOption(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface InitCommandOptions {
  name?: string;
  port?: string;
  packageManager?: "npm" | "pnpm" | "yarn";
  transports?: string[];
  orm?: string;
  architecture?: string;
  features?: string[];
  modules?: string[];
  install?: boolean;
  git?: boolean;
}

export class InitCommand extends BaseCommand {
  constructor() {
    super({
      name: "init",
      description: "Creates a new NestJS project scaffold",
    });

    this.option("--name <name>", "Project name");
    this.option("--port <port>", "HTTP port");
    this.option(
      "--package-manager <packageManager>",
      "Package manager: npm, pnpm, or yarn"
    );
    this.option(
      "--transports <transports>",
      "Comma-separated API transports: rest, graphql",
      parseListOption
    );
    this.option(
      "--orm <orm>",
      "ORM: prisma, typeorm, sequelize, or none"
    );
    this.option(
      "--architecture <architecture>",
      "Architecture: standard, clean, or ddd"
    );
    this.option(
      "--features <features>",
      "Comma-separated features, or none",
      parseListOption
    );
    this.option(
      "--modules <modules>",
      "Comma-separated starter modules, or none",
      parseListOption
    );
    this.option("--install", "Install dependencies after generation");
    this.option("--no-install", "Skip dependency installation");
    this.option("--git", "Initialize git and create the first commit");
    this.option("--no-git", "Skip git initialization");
  }

  async execute(): Promise<void> {
    const prompt = new InitPrompt();
    const options = this.opts<InitCommandOptions>();
    const selections: Partial<Record<string, SelectionValue>> = {};

    if (options.transports) {
      selections.apiTransports = options.transports;
    }

    if (options.orm) {
      selections.orm = options.orm;
    }

    if (options.architecture) {
      selections.architecture = options.architecture;
    }

    if (options.features) {
      selections.features = options.features;
    }

    if (options.modules) {
      selections.modules = options.modules;
    }

    const data = await prompt.execute({
      name: options.name,
      port: options.port,
      packageManager: options.packageManager,
      apiTransports: options.transports as ("rest" | "graphql")[] | undefined,
      installDependencies: options.install,
      initializeGit: options.git,
      selections,
    });

    const initScaffolder = new InitScaffolder(data);
    await initScaffolder.execute();
  }
}
