import { ScaffoldingBlueprint, ScaffoldingContribution } from "./types";

export interface PackageJsonShape {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  [key: string]: unknown;
}

export interface ComposeScaffoldingBlueprintOptions {
  baseContributions?: ScaffoldingContribution[];
  selectedContributions?: ScaffoldingContribution[];
  basePackageJson?: PackageJsonShape;
  finalizeTemplateData?: (input: {
    templateData: Record<string, unknown>;
    slots: Record<string, string[]>;
    packageJson?: PackageJsonShape;
  }) => Record<string, unknown>;
}

function sortRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  );
}

function appendSlotValues(
  target: Record<string, string[]>,
  incoming: Record<string, string[]> = {}
): void {
  for (const [slotName, values] of Object.entries(incoming)) {
    target[slotName] = [...(target[slotName] ?? []), ...values];
  }
}

export function composeScaffoldingBlueprint(
  options: ComposeScaffoldingBlueprintOptions
): ScaffoldingBlueprint {
  const {
    baseContributions = [],
    selectedContributions = [],
    basePackageJson,
    finalizeTemplateData,
  } = options;

  const templateRoots: string[] = [];
  const templateData: Record<string, unknown> = {};
  const slots: Record<string, string[]> = {};
  const packageJson = basePackageJson
    ? ({
        ...basePackageJson,
        scripts: { ...basePackageJson.scripts },
        dependencies: { ...basePackageJson.dependencies },
        devDependencies: { ...basePackageJson.devDependencies },
      } as PackageJsonShape)
    : undefined;

  for (const contribution of [...baseContributions, ...selectedContributions]) {
    if (contribution.templateRoots) {
      templateRoots.push(...contribution.templateRoots);
    }

    Object.assign(templateData, contribution.templateData);
    appendSlotValues(slots, contribution.slots);

    if (packageJson && contribution.packageJson?.scripts) {
      Object.assign(packageJson.scripts, contribution.packageJson.scripts);
    }

    if (packageJson && contribution.packageJson?.dependencies) {
      Object.assign(packageJson.dependencies, contribution.packageJson.dependencies);
    }

    if (packageJson && contribution.packageJson?.devDependencies) {
      Object.assign(
        packageJson.devDependencies,
        contribution.packageJson.devDependencies
      );
    }
  }

  if (packageJson) {
    packageJson.scripts = sortRecord(packageJson.scripts);
    packageJson.dependencies = sortRecord(packageJson.dependencies);
    packageJson.devDependencies = sortRecord(packageJson.devDependencies);
  }

  return {
    templateRoots,
    slots,
    templateData: finalizeTemplateData
      ? finalizeTemplateData({ templateData, slots, packageJson })
      : templateData,
  };
}
