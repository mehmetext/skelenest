import { ArtifactNames, ResourceNames } from "./types";

function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function singularize(value: string): string {
  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }

  if (/(sses|shes|ches|xes|zes)$/.test(value) && value.length > 4) {
    return value.slice(0, -2);
  }

  if (value.endsWith("s") && !value.endsWith("ss") && value.length > 1) {
    return value.slice(0, -1);
  }

  return value;
}

export function createResourceNames(input: string): ResourceNames {
  const moduleSegment = toKebabCase(input);

  if (moduleSegment.length === 0) {
    throw new Error("A module name is required.");
  }

  const singularKebab = singularize(moduleSegment);
  const singularPascal = toPascalCase(singularKebab);
  const pluralPascal = toPascalCase(moduleSegment);

  return {
    raw: input,
    moduleSegment,
    routeSegment: moduleSegment,
    singularKebab,
    singularPascal,
    pluralPascal,
    controllerClassName: `${pluralPascal}Controller`,
    serviceClassName: `${pluralPascal}Service`,
    moduleClassName: `${pluralPascal}Module`,
    entityClassName: `${singularPascal}Entity`,
    modelClassName: `${singularPascal}Model`,
    repositorySymbolName: `${singularKebab
      .toUpperCase()
      .replace(/-/g, "_")}_REPOSITORY`,
    repositoryInterfaceName: `${pluralPascal}Repository`,
    createDtoClassName: `Create${singularPascal}Dto`,
    updateDtoClassName: `Update${singularPascal}Dto`,
  };
}

export function createArtifactNames(input: string): ArtifactNames {
  const normalized = input
    .trim()
    .replace(/\.dto$/i, "")
    .replace(/\.use-case$/i, "");
  const kebab = toKebabCase(normalized);

  if (kebab.length === 0) {
    throw new Error("A name is required.");
  }

  return {
    raw: input,
    kebab,
    pascal: toPascalCase(kebab),
  };
}
