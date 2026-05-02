import { outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { createInitBlueprint, InitPromptData } from "../init";
import {
  assertTargetDirectoryEmpty,
  copyTemplateTree,
  runPackageManagerInstall,
} from "../utils";
import { BaseScaffolder } from "./base.scaffolder";

export class InitScaffolder extends BaseScaffolder {
  constructor(private readonly data: InitPromptData) {
    super();
  }

  async execute(): Promise<void> {
    const targetDir = path.resolve(process.cwd(), this.data.name);
    await assertTargetDirectoryEmpty(targetDir);
    await fs.ensureDir(targetDir);

    const blueprint = createInitBlueprint(this.data);

    const sDirectory = spinner();
    sDirectory.start(`Creating ${this.data.name}...`);
    try {
      await copyTemplateTree({
        templateRoots: blueprint.templateRoots,
        outputRoot: targetDir,
        data: blueprint.templateData,
        slots: blueprint.slots,
      });
    } catch (error) {
      sDirectory.stop("Failed to create project files.");
      throw error;
    }
    sDirectory.stop(`${this.data.name} created successfully!`);

    if (this.data.installDependencies) {
      const sDependencies = spinner();
      sDependencies.start(`Installing dependencies...`);
      try {
        sDependencies.stop("Dependency installation started.");
        await runPackageManagerInstall(targetDir, this.data.packageManager);
        console.log(chalk.green("Dependencies installed successfully."));
      } catch (error) {
        console.log(chalk.red("Dependency installation failed."));
        throw error;
      }
    }

    outro(chalk.cyanBright(`Everything is ready to go!`));
  }
}
