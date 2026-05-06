import fs from "fs-extra";
import path from "path";
import { PackageManager } from "../data/package-managers";
import {
  ApiTransport,
  GenerateOrm,
  GenerateProjectContext,
  SkelenestProjectConfig,
} from "./types";

function isArchitecture(
  value: unknown
): value is SkelenestProjectConfig["architecture"] {
  return value === "standard" || value === "clean" || value === "ddd";
}

function isOrm(value: unknown): value is SkelenestProjectConfig["orm"] {
  return (
    value === null ||
    value === "prisma" ||
    value === "typeorm" ||
    value === "sequelize"
  );
}

function isApiTransport(value: unknown): value is ApiTransport {
  return value === "rest" || value === "graphql";
}

export async function loadGenerateProjectContext(
  cwd: string
): Promise<GenerateProjectContext> {
  const configPath = path.join(cwd, ".skelenest", "project.json");
  const appModulePath = path.join(cwd, "src", "app.module.ts");

  if (!(await fs.pathExists(configPath))) {
    throw new Error(
      `No Skelenest project metadata found at ${configPath}. Run this command inside a generated project.`
    );
  }

  if (!(await fs.pathExists(appModulePath))) {
    throw new Error(`Could not find src/app.module.ts in ${cwd}.`);
  }

  const parsed = (await fs.readJson(configPath)) as Partial<SkelenestProjectConfig>;

  if (!isArchitecture(parsed.architecture)) {
    throw new Error("Invalid Skelenest project metadata: unknown architecture.");
  }

  if (!isOrm(parsed.orm)) {
    throw new Error("Invalid Skelenest project metadata: unknown ORM.");
  }

  if (!Array.isArray(parsed.features) || !Array.isArray(parsed.modules)) {
    throw new Error("Invalid Skelenest project metadata: features/modules must be arrays.");
  }

  const apiTransports =
    parsed.api &&
    Array.isArray(parsed.api.transports) &&
    parsed.api.transports.length > 0
      ? parsed.api.transports
      : null;

  if (!apiTransports || !apiTransports.every(isApiTransport)) {
    throw new Error(
      "Invalid Skelenest project metadata: api.transports must be a non-empty array."
    );
  }

  const orm: GenerateOrm = parsed.orm ?? "none";

  return {
    cwd,
    config: {
      version: parsed.version ?? 1,
      architecture: parsed.architecture,
      orm: parsed.orm,
      api: {
        transports: apiTransports,
      },
      features: parsed.features,
      modules: parsed.modules,
    },
    architecture: parsed.architecture,
    orm,
    apiTransports,
    selectedOptionIds: [
      parsed.architecture,
      ...(parsed.orm ? [parsed.orm] : []),
      ...parsed.features,
      ...parsed.modules,
    ],
  };
}

export async function detectProjectPackageManager(
  cwd: string
): Promise<PackageManager["id"] | null> {
  if (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await fs.pathExists(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }

  if (await fs.pathExists(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }

  return null;
}
