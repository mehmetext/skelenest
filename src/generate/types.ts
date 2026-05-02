export type GenerateArchitecture = "standard" | "clean" | "ddd";
export type GenerateOrm = "prisma" | "typeorm" | "sequelize" | "none";

export interface SkelenestProjectConfig {
  version: number;
  architecture: GenerateArchitecture;
  orm: Exclude<GenerateOrm, "none"> | null;
  features: string[];
  modules: string[];
}

export interface GenerateProjectContext {
  cwd: string;
  config: SkelenestProjectConfig;
  architecture: GenerateArchitecture;
  orm: GenerateOrm;
  selectedOptionIds: string[];
}

export interface ResourceNames {
  raw: string;
  moduleSegment: string;
  routeSegment: string;
  singularKebab: string;
  singularPascal: string;
  pluralPascal: string;
  controllerClassName: string;
  serviceClassName: string;
  moduleClassName: string;
  entityClassName: string;
  modelClassName: string;
  repositorySymbolName: string;
  repositoryInterfaceName: string;
  createDtoClassName: string;
  updateDtoClassName: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
