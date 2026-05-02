import { outro } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { buildGeneratedFiles } from "../generate/file-builders";
import { createResourceNames } from "../generate/names";
import {
  detectProjectPackageManager,
  loadGenerateProjectContext,
} from "../generate/project-context";
import {
  addModuleToAppModule,
  addPrismaModel,
  addSequelizeModel,
  addTypeOrmEntity,
} from "../generate/project-updater";
import { runPackageManagerFormat } from "../utils";
import { BaseScaffolder } from "./base.scaffolder";

type GenerateMode = "module" | "resource";

export class GenerateScaffolder extends BaseScaffolder {
  constructor(
    private readonly mode: GenerateMode,
    private readonly inputName: string
  ) {
    super();
  }

  async execute(): Promise<void> {
    const context = await loadGenerateProjectContext(process.cwd());
    const names = createResourceNames(this.inputName);
    const moduleRoot =
      context.architecture === "standard"
        ? path.join(context.cwd, "src", names.moduleSegment)
        : path.join(context.cwd, "src", "modules", names.moduleSegment);

    if (await fs.pathExists(moduleRoot)) {
      throw new Error(`Target module already exists: ${moduleRoot}`);
    }

    const files = buildGeneratedFiles({
      context,
      names,
      mode: this.mode,
    });

    for (const file of files) {
      await fs.ensureDir(path.dirname(file.path));
      await fs.writeFile(file.path, file.content, "utf8");
    }

    await addModuleToAppModule(context, names);

    if (this.mode === "resource") {
      if (context.orm === "prisma") {
        await addPrismaModel(context, names);
      }

      if (context.orm === "typeorm") {
        await addTypeOrmEntity(context, names);
      }

      if (context.orm === "sequelize") {
        await addSequelizeModel(context, names);
      }
    }

    const packageManager = await detectProjectPackageManager(context.cwd);

    if (packageManager) {
      try {
        await runPackageManagerFormat(context.cwd, packageManager);
      } catch (error) {
        console.log(
          chalk.yellow(
            "Generated files were created, but automatic formatting could not be completed."
          )
        );
      }
    }

    outro(
      chalk.cyanBright(
        `${names.moduleSegment} ${this.mode === "module" ? "module" : "resource"} generated successfully.`
      )
    );
  }
}
