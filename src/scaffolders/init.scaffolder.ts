import { outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { InitPromptData } from "../prompts";
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

    const templateRoot = path.join(__dirname, "..", "src", "templates", "init");

    const sDirectory = spinner();
    sDirectory.start(`Creating ${this.data.name}...`);
    try {
      await copyTemplateTree({
        templateRoot,
        outputRoot: targetDir,
        data: {
          name: this.data.name,
          packageManager: this.data.packageManager,
          port: this.data.port,
        },
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
        await runPackageManagerInstall(targetDir, this.data.packageManager);
      } catch (error) {
        sDependencies.stop("Dependency installation failed.");
        throw error;
      }
    }

    outro(chalk.cyanBright(`Everything is ready to go!`));
  }
}
