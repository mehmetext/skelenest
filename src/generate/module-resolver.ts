import fs from "fs-extra";
import path from "path";
import { createResourceNames } from "./names";
import { GenerateProjectContext } from "./types";

export interface ResolvedModuleTarget {
  moduleName: string;
  moduleRoot: string;
  moduleFilePath: string;
}

export async function resolveModuleTarget(
  context: GenerateProjectContext,
  moduleInputName: string
): Promise<ResolvedModuleTarget> {
  const names = createResourceNames(moduleInputName);
  const moduleRoot =
    context.architecture === "standard"
      ? path.join(context.cwd, "src", names.moduleSegment)
      : path.join(context.cwd, "src", "modules", names.moduleSegment);
  const moduleFilePath = path.join(
    moduleRoot,
    `${names.moduleSegment}.module.ts`
  );

  if (!(await fs.pathExists(moduleRoot))) {
    throw new Error(
      `Module root not found: ${moduleRoot}. Generate the module first.`
    );
  }

  if (!(await fs.pathExists(moduleFilePath))) {
    throw new Error(
      `Module file not found: ${moduleFilePath}. The target module looks incomplete.`
    );
  }

  return {
    moduleName: names.moduleSegment,
    moduleRoot,
    moduleFilePath,
  };
}
