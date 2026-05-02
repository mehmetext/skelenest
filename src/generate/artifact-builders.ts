import path from "path";
import {
  ArtifactNames,
  GenerateProjectContext,
  GeneratedFile,
} from "./types";
import { ResolvedModuleTarget } from "./module-resolver";

function hasSwagger(context: GenerateProjectContext): boolean {
  return context.config.features.includes("swagger");
}

export function buildDtoArtifact(input: {
  context: GenerateProjectContext;
  target: ResolvedModuleTarget;
  artifact: ArtifactNames;
}): GeneratedFile {
  const { context, target, artifact } = input;
  const filePath =
    context.architecture === "standard"
      ? path.join(target.moduleRoot, "dto", `${artifact.kebab}.dto.ts`)
      : path.join(
          target.moduleRoot,
          "application",
          "dto",
          `${artifact.kebab}.dto.ts`
        );
  const className = artifact.pascal.endsWith("Dto")
    ? artifact.pascal
    : `${artifact.pascal}Dto`;
  const comment = hasSwagger(context)
    ? "  // Add Swagger and validation decorators for this DTO.\n"
    : "  // Add validation decorators and DTO fields here.\n";

  return {
    path: filePath,
    content: `export class ${className} {\n${comment}}\n`,
  };
}

export function buildUseCaseArtifact(input: {
  context: GenerateProjectContext;
  artifact: ArtifactNames;
  target: ResolvedModuleTarget;
}): {
  file: GeneratedFile;
  className: string;
  importPath: string;
} {
  const { context, artifact, target } = input;
  const className = artifact.pascal.endsWith("UseCase")
    ? artifact.pascal
    : `${artifact.pascal}UseCase`;
  const relativeDir =
    context.architecture === "standard"
      ? path.join(target.moduleRoot, "use-cases")
      : path.join(target.moduleRoot, "application", "use-cases");
  const filePath = path.join(relativeDir, `${artifact.kebab}.use-case.ts`);
  const importPath =
    context.architecture === "standard"
      ? `./use-cases/${artifact.kebab}.use-case`
      : `./application/use-cases/${artifact.kebab}.use-case`;

  return {
    className,
    importPath,
    file: {
      path: filePath,
      content: `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${className} {
  async execute(): Promise<{ ok: true }> {
    return { ok: true };
  }
}
`,
    },
  };
}
