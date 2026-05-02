import fs from "fs-extra";
import path from "path";
import { buildPrismaSchemaModel } from "./file-builders";
import { GenerateProjectContext, ResourceNames } from "./types";

function insertBefore(source: string, needle: string, insertion: string): string {
  const index = source.indexOf(needle);

  if (index === -1) {
    throw new Error(`Could not find insertion point: ${needle}`);
  }

  return `${source.slice(0, index)}${insertion}${source.slice(index)}`;
}

export async function addModuleToAppModule(
  context: GenerateProjectContext,
  names: ResourceNames
): Promise<void> {
  const appModulePath = path.join(context.cwd, "src", "app.module.ts");
  const importPath =
    context.architecture === "standard"
      ? `./${names.moduleSegment}/${names.moduleSegment}.module`
      : `./modules/${names.moduleSegment}/${names.moduleSegment}.module`;
  const importStatement = `import { ${names.moduleClassName} } from '${importPath}';\n`;
  let content = await fs.readFile(appModulePath, "utf8");

  if (!content.includes(importStatement.trim())) {
    content = insertBefore(content, "import { AppController }", importStatement);
  }

  const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]\s*,\s*controllers:/);

  if (!importsMatch) {
    throw new Error("Could not find AppModule imports array.");
  }

  if (!importsMatch[1].includes(names.moduleClassName)) {
    const existingEntries = importsMatch[1].trim();
    const nextEntries = existingEntries.length > 0
      ? `${existingEntries}\n    ${names.moduleClassName},\n  `
      : `\n    ${names.moduleClassName},\n  `;
    const updatedSection = `imports: [${nextEntries}],\n  controllers:`;
    content = content.replace(importsMatch[0], updatedSection);
  }

  await fs.writeFile(appModulePath, content, "utf8");
}

export async function addTypeOrmEntity(
  context: GenerateProjectContext,
  names: ResourceNames
): Promise<void> {
  const configPath = path.join(context.cwd, "src", "database", "typeorm.config.ts");
  let content = await fs.readFile(configPath, "utf8");
  const importStatement = `import { ${names.entityClassName} } from "./entities/${names.singularKebab}.entity";\n`;

  if (!content.includes(importStatement.trim())) {
    content = insertBefore(content, "export const typeOrmConfig", importStatement);
  }

  const entitiesMatch = content.match(/entities:\s*\[([\s\S]*?)\]/);

  if (!entitiesMatch) {
    throw new Error("Could not find TypeORM entities array.");
  }

  if (!entitiesMatch[1].includes(names.entityClassName)) {
    const existingEntries = entitiesMatch[1].trim();
    const nextEntries = existingEntries.length > 0
      ? `${existingEntries}, ${names.entityClassName}`
      : names.entityClassName;
    content = content.replace(entitiesMatch[0], `entities: [${nextEntries}]`);
  }

  await fs.writeFile(configPath, content, "utf8");
}

export async function addSequelizeModel(
  context: GenerateProjectContext,
  names: ResourceNames
): Promise<void> {
  const configPath = path.join(context.cwd, "src", "database", "sequelize.config.ts");
  let content = await fs.readFile(configPath, "utf8");
  const importStatement = `import { ${names.modelClassName} } from "./models/${names.singularKebab}.model";\n`;

  if (!content.includes(importStatement.trim())) {
    content = insertBefore(content, "export const sequelizeConfig", importStatement);
  }

  const modelsMatch = content.match(/models:\s*\[([\s\S]*?)\]/);

  if (!modelsMatch) {
    throw new Error("Could not find Sequelize models array.");
  }

  if (!modelsMatch[1].includes(names.modelClassName)) {
    const existingEntries = modelsMatch[1].trim();
    const nextEntries = existingEntries.length > 0
      ? `${existingEntries}, ${names.modelClassName}`
      : names.modelClassName;
    content = content.replace(modelsMatch[0], `models: [${nextEntries}]`);
  }

  await fs.writeFile(configPath, content, "utf8");
}

export async function addPrismaModel(
  context: GenerateProjectContext,
  names: ResourceNames
): Promise<void> {
  const schemaPath = path.join(context.cwd, "prisma", "schema.prisma");
  let content = await fs.readFile(schemaPath, "utf8");
  const modelSignature = `model ${names.singularPascal} {`;

  if (content.includes(modelSignature)) {
    return;
  }

  content = `${content.trimEnd()}\n\n${buildPrismaSchemaModel(names)}`;
  await fs.writeFile(schemaPath, content, "utf8");
}
