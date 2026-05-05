import { outro } from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import {
  buildDtoArtifact,
  buildUseCaseArtifact,
} from "../generate/artifact-builders";
import { addProviderToModule } from "../generate/module-updater";
import { resolveModuleTarget } from "../generate/module-resolver";
import { createArtifactNames } from "../generate/names";
import {
  detectProjectPackageManager,
  loadGenerateProjectContext,
} from "../generate/project-context";
import { runPackageManagerFormat } from "../utils";
import { BaseScaffolder } from "./base.scaffolder";
import { confirmCleanGitWorkingTree } from "./git-working-tree.guard";

type ArtifactMode = "dto" | "use-case";

export class GenerateArtifactScaffolder extends BaseScaffolder {
  constructor(
    private readonly mode: ArtifactMode,
    private readonly moduleName: string,
    private readonly artifactName: string
  ) {
    super();
  }

  async execute(): Promise<void> {
    const context = await loadGenerateProjectContext(process.cwd());

    if (!(await confirmCleanGitWorkingTree(context.cwd))) {
      return;
    }

    const target = await resolveModuleTarget(context, this.moduleName);
    const artifact = createArtifactNames(this.artifactName);

    if (this.mode === "dto") {
      const dto = buildDtoArtifact({ context, target, artifact });

      if (await fs.pathExists(dto.path)) {
        throw new Error(`Target DTO already exists: ${dto.path}`);
      }

      await fs.ensureDir(path.dirname(dto.path));
      await fs.writeFile(dto.path, dto.content, "utf8");
    }

    if (this.mode === "use-case") {
      const useCase = buildUseCaseArtifact({ context, target, artifact });

      if (await fs.pathExists(useCase.file.path)) {
        throw new Error(`Target use case already exists: ${useCase.file.path}`);
      }

      await fs.ensureDir(path.dirname(useCase.file.path));
      await fs.writeFile(useCase.file.path, useCase.file.content, "utf8");
      await addProviderToModule({
        moduleFilePath: target.moduleFilePath,
        importStatement: `import { ${useCase.className} } from '${useCase.importPath}';`,
        className: useCase.className,
      });
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
        `${artifact.kebab} ${this.mode} generated successfully in ${target.moduleName}.`
      )
    );
  }
}
