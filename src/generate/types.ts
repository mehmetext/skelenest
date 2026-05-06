export type GenerateArchitecture = "standard" | "clean" | "ddd";
export type GenerateOrm = "prisma" | "typeorm" | "sequelize" | "none";
export type ApiTransport = "rest" | "graphql";

export interface SkelenestProjectConfig {
  version: number;
  architecture: GenerateArchitecture;
  orm: Exclude<GenerateOrm, "none"> | null;
  api: {
    transports: ApiTransport[];
  };
  features: string[];
  modules: string[];
}

export interface GenerateProjectContext {
  cwd: string;
  config: SkelenestProjectConfig;
  architecture: GenerateArchitecture;
  orm: GenerateOrm;
  apiTransports: ApiTransport[];
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
  resolverClassName: string;
  serviceClassName: string;
  moduleClassName: string;
  entityClassName: string;
  modelClassName: string;
  objectTypeClassName: string;
  repositorySymbolName: string;
  repositoryInterfaceName: string;
  createDtoClassName: string;
  updateDtoClassName: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ArtifactNames {
  raw: string;
  kebab: string;
  pascal: string;
}
