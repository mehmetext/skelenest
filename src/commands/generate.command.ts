import chalk from "chalk";
import { Command } from "commander";
import { GenerateArtifactScaffolder } from "../scaffolders/generate-artifact.scaffolder";
import { GenerateScaffolder } from "../scaffolders/generate.scaffolder";
import { BaseCommand } from "./base.command";

async function runSubcommand(mode: "module" | "resource", name: string): Promise<void> {
  const scaffolder = new GenerateScaffolder(mode, name);
  await scaffolder.execute();
}

async function runArtifactSubcommand(
  mode: "dto" | "use-case",
  moduleName: string,
  artifactName: string
): Promise<void> {
  const scaffolder = new GenerateArtifactScaffolder(
    mode,
    moduleName,
    artifactName
  );
  await scaffolder.execute();
}

export class GenerateCommand extends BaseCommand {
  constructor() {
    super({
      name: "generate",
      description: "Generate modules and resources inside an existing Skelenest project",
    });

    this.alias("g");

    this.addCommand(
      new Command("module")
        .description("Generate an architecture-aware module skeleton")
        .argument("<name>", "Module name, for example products")
        .action(async (name: string) => {
          try {
            await runSubcommand("module", name);
          } catch (error) {
            console.error(error);
            console.error(chalk.red("An error occurred while generating the module"));
            process.exit(1);
          }
        })
    );

    this.addCommand(
      new Command("resource")
        .description("Generate an architecture-aware CRUD resource")
        .argument("<name>", "Resource name, for example products")
        .action(async (name: string) => {
          try {
            await runSubcommand("resource", name);
          } catch (error) {
            console.error(error);
            console.error(chalk.red("An error occurred while generating the resource"));
            process.exit(1);
          }
        })
    );

    this.addCommand(
      new Command("dto")
        .description("Generate a DTO inside an existing module")
        .argument("<module>", "Target module name, for example products")
        .argument("<name>", "DTO name, for example filter-products")
        .action(async (moduleName: string, name: string) => {
          try {
            await runArtifactSubcommand("dto", moduleName, name);
          } catch (error) {
            console.error(error);
            console.error(chalk.red("An error occurred while generating the DTO"));
            process.exit(1);
          }
        })
    );

    this.addCommand(
      new Command("use-case")
        .description("Generate a use case inside an existing module")
        .argument("<module>", "Target module name, for example users")
        .argument("<name>", "Use case name, for example change-password")
        .action(async (moduleName: string, name: string) => {
          try {
            await runArtifactSubcommand("use-case", moduleName, name);
          } catch (error) {
            console.error(error);
            console.error(
              chalk.red("An error occurred while generating the use case")
            );
            process.exit(1);
          }
        })
    );
  }

  async execute(): Promise<void> {
    this.help();
  }
}
