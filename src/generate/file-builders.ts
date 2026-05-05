import path from "path";
import { GenerateProjectContext, GeneratedFile, ResourceNames } from "./types";

type GenerateMode = "module" | "resource";

function hasSwagger(context: GenerateProjectContext): boolean {
  return context.config.features.includes("swagger");
}

function servicePropertyName(names: ResourceNames): string {
  return `${names.serviceClassName.charAt(0).toLowerCase()}${names.serviceClassName.slice(1)}`;
}

function buildDtoContent(
  className: string,
  swaggerEnabled: boolean,
  isUpdateDto: boolean
): string {
  const swaggerImport = swaggerEnabled
    ? `import { ${
        isUpdateDto ? "ApiPropertyOptional" : "ApiProperty, ApiPropertyOptional"
      } } from '@nestjs/swagger';\n`
    : "";
  const nameDecorator = swaggerEnabled
    ? isUpdateDto
      ? "  @ApiPropertyOptional({ example: 'Example name' })\n"
      : "  @ApiProperty({ example: 'Example name' })\n"
    : "";
  const descriptionDecorator = swaggerEnabled
    ? "  @ApiPropertyOptional({ example: 'Optional description', required: false })\n"
    : "";
  const activeDecorator = swaggerEnabled
    ? "  @ApiPropertyOptional({ example: true, required: false })\n"
    : "";

  return `${swaggerImport}import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ${className} {
${nameDecorator}${isUpdateDto ? "  @IsOptional()\n" : ""}  @IsString()
  name${isUpdateDto ? "?" : ""}: string;

${descriptionDecorator}  @IsOptional()
  @IsString()
  description?: string;

${activeDecorator}  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
`;
}

function buildPrismaModel(names: ResourceNames): string {
  return `model ${names.singularPascal} {
  id          String   @id @default(uuid())
  name        String
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("${names.routeSegment}")
}
`;
}

function buildTypeOrmEntityFile(names: ResourceNames): string {
  return `import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: '${names.routeSegment}' })
export class ${names.entityClassName} {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`;
}

function buildSequelizeModelFile(names: ResourceNames): string {
  return `import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({ tableName: '${names.routeSegment}' })
export class ${names.modelClassName} extends Model<
  InferAttributes<${names.modelClassName}>,
  InferCreationAttributes<${names.modelClassName}>
> {
  @PrimaryKey
  @Column({
    autoIncrement: true,
    type: DataType.INTEGER,
  })
  declare id: CreationOptional<number>;

  @Column({
    allowNull: false,
    type: DataType.STRING,
  })
  declare name: string;

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  declare description: string | null;

  @Default(true)
  @Column({
    allowNull: false,
    type: DataType.BOOLEAN,
  })
  declare isActive: CreationOptional<boolean>;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;
}
`;
}

function buildStandardModuleFile(
  names: ResourceNames,
  orm: GenerateProjectContext["orm"],
  mode: GenerateMode
): string {
  const resourceImports =
    mode === "resource" && orm === "typeorm"
      ? `import { TypeOrmModule } from '@nestjs/typeorm';
import { ${names.entityClassName} } from '../database/entities/${names.singularKebab}.entity';
`
      : mode === "resource" && orm === "sequelize"
        ? `import { SequelizeModule } from '@nestjs/sequelize';
import { ${names.modelClassName} } from '../database/models/${names.singularKebab}.model';
`
        : "";
  const importsArray =
    mode === "resource" && orm === "typeorm"
      ? "  imports: [TypeOrmModule.forFeature([" + names.entityClassName + "])],\n"
      : mode === "resource" && orm === "sequelize"
        ? "  imports: [SequelizeModule.forFeature([" + names.modelClassName + "])],\n"
        : "";

  return `import { Module } from '@nestjs/common';
${resourceImports}import { ${names.controllerClassName} } from './${names.moduleSegment}.controller';
import { ${names.serviceClassName} } from './${names.moduleSegment}.service';

@Module({
${importsArray}  controllers: [${names.controllerClassName}],
  providers: [${names.serviceClassName}],
  exports: [${names.serviceClassName}],
})
export class ${names.moduleClassName} {}
`;
}

function buildStandardControllerFile(
  names: ResourceNames,
  swaggerEnabled: boolean,
  mode: GenerateMode
): string {
  const propertyName = servicePropertyName(names);
  const commonImports =
    mode === "resource"
      ? "Body,\n  Controller,\n  Delete,\n  Get,\n  Param,\n  Patch,\n  Post"
      : "Controller,\n  Get";
  const swaggerImports =
    swaggerEnabled && mode === "resource"
      ? `import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
`
      : swaggerEnabled
        ? "import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';\n"
        : "";
  const dtoImports =
    mode === "resource"
      ? `import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';
`
      : "";
  const swaggerTag = swaggerEnabled ? `@ApiTags('${names.pluralPascal}')\n` : "";
  const body =
    mode === "resource"
      ? `${swaggerEnabled ? "  @ApiOperation({ summary: 'List resources' })\n  @ApiOkResponse({ description: 'Resources returned successfully' })\n" : ""}  @Get()
  findAll() {
    return this.${propertyName}.findAll();
  }

${swaggerEnabled ? "  @ApiOperation({ summary: 'Get resource by id' })\n  @ApiOkResponse({ description: 'Resource returned successfully' })\n" : ""}  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${propertyName}.findOne(id);
  }

${swaggerEnabled ? "  @ApiOperation({ summary: 'Create resource' })\n  @ApiCreatedResponse({ description: 'Resource created successfully' })\n" : ""}  @Post()
  create(@Body() dto: ${names.createDtoClassName}) {
    return this.${propertyName}.create(dto);
  }

${swaggerEnabled ? "  @ApiOperation({ summary: 'Update resource' })\n  @ApiOkResponse({ description: 'Resource updated successfully' })\n" : ""}  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ${names.updateDtoClassName}) {
    return this.${propertyName}.update(id, dto);
  }

${swaggerEnabled ? "  @ApiOperation({ summary: 'Remove resource' })\n  @ApiOkResponse({ description: 'Resource removed successfully' })\n" : ""}  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${propertyName}.remove(id);
  }`
      : `${swaggerEnabled ? "  @ApiOperation({ summary: 'Read module status' })\n  @ApiOkResponse({ description: 'Module is available' })\n" : ""}  @Get()
  status() {
    return this.${propertyName}.getStatus();
  }`;

  return `import {
  ${commonImports},
} from '@nestjs/common';
${swaggerImports}${dtoImports}import { ${names.serviceClassName} } from './${names.moduleSegment}.service';

${swaggerTag}@Controller('${names.routeSegment}')
export class ${names.controllerClassName} {
  constructor(private readonly ${propertyName}: ${names.serviceClassName}) {}

${body}
}
`;
}

function buildStandardServiceFile(
  names: ResourceNames,
  orm: GenerateProjectContext["orm"],
  mode: GenerateMode
): string {
  if (mode === "module") {
    return `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${names.serviceClassName} {
  getStatus() {
    return {
      module: '${names.moduleSegment}',
      ready: true,
    };
  }
}
`;
  }

  if (orm === "prisma") {
    const modelAccessor =
      names.singularPascal.charAt(0).toLowerCase() + names.singularPascal.slice(1);

    return `import type { ${names.singularPascal} } from 'src/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';

@Injectable()
export class ${names.serviceClassName} {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<${names.singularPascal}[]> {
    return this.prisma.${modelAccessor}.findMany();
  }

  findOne(id: string): Promise<${names.singularPascal} | null> {
    return this.prisma.${modelAccessor}.findUnique({
      where: { id },
    });
  }

  create(dto: ${names.createDtoClassName}): Promise<${names.singularPascal}> {
    return this.prisma.${modelAccessor}.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  update(id: string, dto: ${names.updateDtoClassName}): Promise<${names.singularPascal}> {
    return this.prisma.${modelAccessor}.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.prisma.${modelAccessor}.delete({
      where: { id },
    });

    return { deleted: true, id };
  }
}
`;
  }

  if (orm === "typeorm") {
    return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${names.entityClassName} } from '../database/entities/${names.singularKebab}.entity';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';

@Injectable()
export class ${names.serviceClassName} {
  constructor(
    @InjectRepository(${names.entityClassName})
    private readonly repository: Repository<${names.entityClassName}>,
  ) {}

  findAll(): Promise<${names.entityClassName}[]> {
    return this.repository.find();
  }

  findOne(id: string): Promise<${names.entityClassName} | null> {
    return this.repository.findOne({ where: { id: Number(id) } });
  }

  create(dto: ${names.createDtoClassName}): Promise<${names.entityClassName}> {
    return this.repository.save(
      this.repository.create({
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async update(id: string, dto: ${names.updateDtoClassName}): Promise<${names.entityClassName} | null> {
    await this.repository.update(Number(id), dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.repository.delete(Number(id));
    return { deleted: true, id };
  }
}
`;
  }

  if (orm === "sequelize") {
    return `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ${names.modelClassName} } from '../database/models/${names.singularKebab}.model';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';

@Injectable()
export class ${names.serviceClassName} {
  constructor(
    @InjectModel(${names.modelClassName})
    private readonly model: typeof ${names.modelClassName},
  ) {}

  findAll(): Promise<${names.modelClassName}[]> {
    return this.model.findAll();
  }

  findOne(id: string): Promise<${names.modelClassName} | null> {
    return this.model.findByPk(Number(id));
  }

  create(dto: ${names.createDtoClassName}): Promise<${names.modelClassName}> {
    return this.model.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: ${names.updateDtoClassName}): Promise<${names.modelClassName} | null> {
    const record = await this.model.findByPk(Number(id));

    if (!record) {
      return null;
    }

    await record.update(dto);
    return record;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const record = await this.model.findByPk(Number(id));

    if (record) {
      await record.destroy();
    }

    return { deleted: true, id };
  }
}
`;
  }

  return `import { Injectable } from '@nestjs/common';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';

interface ${names.singularPascal}Record {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

@Injectable()
export class ${names.serviceClassName} {
  findAll(): ${names.singularPascal}Record[] {
    return [];
  }

  findOne(id: string): ${names.singularPascal}Record | null {
    return {
      id,
      name: '${names.singularPascal}',
      description: null,
      isActive: true,
    };
  }

  create(dto: ${names.createDtoClassName}): ${names.singularPascal}Record {
    return {
      id: 'temp-id',
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    };
  }

  update(id: string, dto: ${names.updateDtoClassName}): ${names.singularPascal}Record {
    return {
      id,
      name: dto.name ?? '${names.singularPascal}',
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    };
  }

  remove(id: string): { deleted: true; id: string } {
    return { deleted: true, id };
  }
}
`;
}

function buildLayeredModuleFile(
  names: ResourceNames,
  context: GenerateProjectContext,
  mode: GenerateMode
): string {
  const persistenceImports =
    mode === "resource" && context.orm === "typeorm"
      ? `import { TypeOrmModule } from '@nestjs/typeorm';
import { ${names.entityClassName} } from '../../database/entities/${names.singularKebab}.entity';
`
      : mode === "resource" && context.orm === "sequelize"
        ? `import { SequelizeModule } from '@nestjs/sequelize';
import { ${names.modelClassName} } from '../../database/models/${names.singularKebab}.model';
`
        : "";
  const repositoryImports =
    mode === "resource" && context.orm !== "none"
      ? `import { ${names.repositorySymbolName} } from './application/ports/${names.singularKebab}-repository.port';
import { ${
          context.orm === "prisma"
            ? `Prisma${names.pluralPascal}Repository`
            : context.orm === "typeorm"
              ? `TypeOrm${names.pluralPascal}Repository`
              : `Sequelize${names.pluralPascal}Repository`
        } } from './infrastructure/persistence/${context.orm}-${names.moduleSegment}.repository';
`
      : "";
  const importsList = [
    mode === "resource" && context.orm === "typeorm"
      ? `TypeOrmModule.forFeature([${names.entityClassName}])`
      : null,
    mode === "resource" && context.orm === "sequelize"
      ? `SequelizeModule.forFeature([${names.modelClassName}])`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  const providerList = [
    names.serviceClassName,
    mode === "resource" && context.orm !== "none"
      ? `{
      provide: ${names.repositorySymbolName},
      useClass: ${
        context.orm === "prisma"
          ? `Prisma${names.pluralPascal}Repository`
          : context.orm === "typeorm"
            ? `TypeOrm${names.pluralPascal}Repository`
            : `Sequelize${names.pluralPascal}Repository`
      },
    }`
      : null,
  ]
    .filter(Boolean)
    .join(",\n    ");

  return `import { Module } from '@nestjs/common';
${persistenceImports}${repositoryImports}import { ${names.serviceClassName} } from './application/${names.moduleSegment}.service';
import { ${names.controllerClassName} } from './presentation/http/${names.moduleSegment}.controller';

@Module({
${importsList ? `  imports: [${importsList}],\n` : ""}  controllers: [${names.controllerClassName}],
  providers: [
    ${providerList},
  ],
  exports: [${names.serviceClassName}],
})
export class ${names.moduleClassName} {}
`;
}

function buildLayeredControllerFile(
  names: ResourceNames,
  swaggerEnabled: boolean,
  mode: GenerateMode
): string {
  return buildStandardControllerFile(names, swaggerEnabled, mode)
    .replace(
      `import { ${names.serviceClassName} } from './${names.moduleSegment}.service';`,
      `import { ${names.serviceClassName} } from '../../application/${names.moduleSegment}.service';`
    )
    .replace(
      `import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';`,
      `import { ${names.createDtoClassName} } from '../../application/dto/create-${names.singularKebab}.dto';`
    )
    .replace(
      `import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';`,
      `import { ${names.updateDtoClassName} } from '../../application/dto/update-${names.singularKebab}.dto';`
    );
}

function buildLayeredServiceFile(
  names: ResourceNames,
  context: GenerateProjectContext,
  mode: GenerateMode
): string {
  if (mode === "module") {
    return `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${names.serviceClassName} {
  getStatus() {
    return {
      module: '${names.moduleSegment}',
      ready: true,
    };
  }
}
`;
  }

  if (context.orm === "none") {
    return `import { Injectable } from '@nestjs/common';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';

interface ${names.singularPascal}Record {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

@Injectable()
export class ${names.serviceClassName} {
  findAll(): ${names.singularPascal}Record[] {
    return [];
  }

  findOne(id: string): ${names.singularPascal}Record | null {
    return {
      id,
      name: '${names.singularPascal}',
      description: null,
      isActive: true,
    };
  }

  create(dto: ${names.createDtoClassName}): ${names.singularPascal}Record {
    return {
      id: 'temp-id',
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    };
  }

  update(id: string, dto: ${names.updateDtoClassName}): ${names.singularPascal}Record {
    return {
      id,
      name: dto.name ?? '${names.singularPascal}',
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    };
  }

  remove(id: string): { deleted: true; id: string } {
    return { deleted: true, id };
  }
}
`;
  }

  const resultType =
    context.architecture === "ddd"
      ? `${names.singularPascal}Entity`
      : context.orm === "prisma"
        ? names.singularPascal
        : context.orm === "typeorm"
          ? names.entityClassName
          : names.modelClassName;
  const typeImport =
    context.architecture === "ddd"
      ? `import type { ${names.singularPascal}Entity } from '../domain/entities/${names.singularKebab}.entity';\n`
      : context.orm === "prisma"
        ? `import type { ${names.singularPascal} } from 'src/generated/prisma/client';\n`
        : context.orm === "typeorm"
          ? `import type { ${names.entityClassName} } from '../../../database/entities/${names.singularKebab}.entity';\n`
          : `import type { ${names.modelClassName} } from '../../../database/models/${names.singularKebab}.model';\n`;

  return `${typeImport}import { Inject, Injectable } from '@nestjs/common';
import { ${names.createDtoClassName} } from './dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from './dto/update-${names.singularKebab}.dto';
import { ${names.repositorySymbolName} } from './ports/${names.singularKebab}-repository.port';
import type { ${names.repositoryInterfaceName} } from './ports/${names.singularKebab}-repository.port';

@Injectable()
export class ${names.serviceClassName} {
  constructor(
    @Inject(${names.repositorySymbolName})
    private readonly repository: ${names.repositoryInterfaceName},
  ) {}

  findAll(): Promise<${resultType}[]> {
    return this.repository.findAll();
  }

  findOne(id: string): Promise<${resultType} | null> {
    return this.repository.findOne(id);
  }

  create(dto: ${names.createDtoClassName}): Promise<${resultType}> {
    return this.repository.create(dto);
  }

  update(id: string, dto: ${names.updateDtoClassName}): Promise<${resultType} | null> {
    return this.repository.update(id, dto);
  }

  remove(id: string): Promise<{ deleted: true; id: string }> {
    return this.repository.remove(id);
  }
}
`;
}

function buildRepositoryPortFile(
  names: ResourceNames,
  context: GenerateProjectContext
): string {
  const typeImport =
    context.architecture === "ddd"
      ? `import type { ${names.singularPascal}Entity } from '../../domain/entities/${names.singularKebab}.entity';`
      : context.orm === "prisma"
        ? `import type { ${names.singularPascal} } from 'src/generated/prisma/client';`
        : context.orm === "typeorm"
          ? `import type { ${names.entityClassName} } from '../../../../database/entities/${names.singularKebab}.entity';`
          : `import type { ${names.modelClassName} } from '../../../../database/models/${names.singularKebab}.model';`;
  const resultType =
    context.architecture === "ddd"
      ? `${names.singularPascal}Entity`
      : context.orm === "prisma"
        ? names.singularPascal
        : context.orm === "typeorm"
          ? names.entityClassName
          : names.modelClassName;

  return `${typeImport}
import { ${names.createDtoClassName} } from '../dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from '../dto/update-${names.singularKebab}.dto';

export interface ${names.repositoryInterfaceName} {
  findAll(): Promise<${resultType}[]>;
  findOne(id: string): Promise<${resultType} | null>;
  create(dto: ${names.createDtoClassName}): Promise<${resultType}>;
  update(id: string, dto: ${names.updateDtoClassName}): Promise<${resultType} | null>;
  remove(id: string): Promise<{ deleted: true; id: string }>;
}

export const ${names.repositorySymbolName} = Symbol('${names.repositorySymbolName}');
`;
}

function buildDddEntityFile(
  names: ResourceNames,
  orm: GenerateProjectContext["orm"]
): string {
  const idType = orm === "prisma" || orm === "none" ? "string" : "number";

  return `export interface ${names.singularPascal}Entity {
  id: ${idType};
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
`;
}

function buildPrismaRepositoryFile(
  names: ResourceNames,
  context: GenerateProjectContext
): string {
  const modelAccessor =
    names.singularPascal.charAt(0).toLowerCase() + names.singularPascal.slice(1);
  const dddImport =
    context.architecture === "ddd"
      ? `import type { ${names.singularPascal}Entity } from '../../domain/entities/${names.singularKebab}.entity';\n`
      : "";
  const mapper =
    context.architecture === "ddd"
      ? `
function toEntity(record: ${names.singularPascal}): ${names.singularPascal}Entity {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
`
      : "";
  const resultType =
    context.architecture === "ddd" ? `${names.singularPascal}Entity` : names.singularPascal;
  const findAllBody =
    context.architecture === "ddd"
      ? `const records = await this.prisma.${modelAccessor}.findMany();
    return records.map(toEntity);`
      : `return this.prisma.${modelAccessor}.findMany();`;
  const findOneBody =
    context.architecture === "ddd"
      ? `const record = await this.prisma.${modelAccessor}.findUnique({
      where: { id },
    });

    return record ? toEntity(record) : null;`
      : `return this.prisma.${modelAccessor}.findUnique({
      where: { id },
    });`;
  const createBody =
    context.architecture === "ddd"
      ? `const record = await this.prisma.${modelAccessor}.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return toEntity(record);`
      : `return this.prisma.${modelAccessor}.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    });`;
  const updateBody =
    context.architecture === "ddd"
      ? `const record = await this.prisma.${modelAccessor}.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return toEntity(record);`
      : `return this.prisma.${modelAccessor}.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });`;

  return `import type { ${names.singularPascal} } from 'src/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { ${names.repositoryInterfaceName} } from '../../application/ports/${names.singularKebab}-repository.port';
import { ${names.createDtoClassName} } from '../../application/dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from '../../application/dto/update-${names.singularKebab}.dto';
${dddImport}${mapper}@Injectable()
export class Prisma${names.pluralPascal}Repository implements ${names.repositoryInterfaceName} {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<${resultType}[]> {
    ${findAllBody}
  }

  async findOne(id: string): Promise<${resultType} | null> {
    ${findOneBody}
  }

  async create(dto: ${names.createDtoClassName}): Promise<${resultType}> {
    ${createBody}
  }

  async update(id: string, dto: ${names.updateDtoClassName}): Promise<${resultType}> {
    ${updateBody}
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.prisma.${modelAccessor}.delete({
      where: { id },
    });

    return { deleted: true, id };
  }
}
`;
}

function buildTypeOrmRepositoryFile(
  names: ResourceNames,
  context: GenerateProjectContext
): string {
  const ormEntityReference =
    context.architecture === "ddd" ? `${names.entityClassName}Record` : names.entityClassName;
  const ormEntityImport =
    context.architecture === "ddd"
      ? `import { ${names.entityClassName} as ${ormEntityReference} } from '../../../../database/entities/${names.singularKebab}.entity';`
      : `import { ${names.entityClassName} } from '../../../../database/entities/${names.singularKebab}.entity';`;
  const dddImport =
    context.architecture === "ddd"
      ? `import type { ${names.singularPascal}Entity } from '../../domain/entities/${names.singularKebab}.entity';\n`
      : "";
  const mapper =
    context.architecture === "ddd"
      ? `
function toEntity(record: ${ormEntityReference}): ${names.singularPascal}Entity {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
`
      : "";
  const resultType =
    context.architecture === "ddd" ? `${names.singularPascal}Entity` : names.entityClassName;

  return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ${names.repositoryInterfaceName} } from '../../application/ports/${names.singularKebab}-repository.port';
import { ${names.createDtoClassName} } from '../../application/dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from '../../application/dto/update-${names.singularKebab}.dto';
${ormEntityImport}
${dddImport}import { Repository } from 'typeorm';
${mapper}@Injectable()
export class TypeOrm${names.pluralPascal}Repository implements ${names.repositoryInterfaceName} {
  constructor(
    @InjectRepository(${ormEntityReference})
    private readonly repository: Repository<${ormEntityReference}>,
  ) {}

  async findAll(): Promise<${resultType}[]> {
    const records = await this.repository.find();
    return ${context.architecture === "ddd" ? "records.map(toEntity)" : "records"};
  }

  async findOne(id: string): Promise<${resultType} | null> {
    const record = await this.repository.findOne({ where: { id: Number(id) } });
    return record ? ${context.architecture === "ddd" ? "toEntity(record)" : "record"} : null;
  }

  async create(dto: ${names.createDtoClassName}): Promise<${resultType}> {
    const record = await this.repository.save(
      this.repository.create({
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      }),
    );

    return ${context.architecture === "ddd" ? "toEntity(record)" : "record"};
  }

  async update(id: string, dto: ${names.updateDtoClassName}): Promise<${resultType} | null> {
    await this.repository.update(Number(id), dto);
    const record = await this.repository.findOne({ where: { id: Number(id) } });
    return record ? ${context.architecture === "ddd" ? "toEntity(record)" : "record"} : null;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.repository.delete(Number(id));
    return { deleted: true, id };
  }
}
`;
}

function buildSequelizeRepositoryFile(
  names: ResourceNames,
  context: GenerateProjectContext
): string {
  const dddImport =
    context.architecture === "ddd"
      ? `import type { ${names.singularPascal}Entity } from '../../domain/entities/${names.singularKebab}.entity';\n`
      : "";
  const mapper =
    context.architecture === "ddd"
      ? `
function toEntity(record: ${names.modelClassName}): ${names.singularPascal}Entity {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
`
      : "";
  const resultType =
    context.architecture === "ddd" ? `${names.singularPascal}Entity` : names.modelClassName;

  return `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { ${names.repositoryInterfaceName} } from '../../application/ports/${names.singularKebab}-repository.port';
import { ${names.createDtoClassName} } from '../../application/dto/create-${names.singularKebab}.dto';
import { ${names.updateDtoClassName} } from '../../application/dto/update-${names.singularKebab}.dto';
import { ${names.modelClassName} } from '../../../../database/models/${names.singularKebab}.model';
${dddImport}${mapper}@Injectable()
export class Sequelize${names.pluralPascal}Repository implements ${names.repositoryInterfaceName} {
  constructor(
    @InjectModel(${names.modelClassName})
    private readonly model: typeof ${names.modelClassName},
  ) {}

  async findAll(): Promise<${resultType}[]> {
    const records = await this.model.findAll();
    return ${context.architecture === "ddd" ? "records.map(toEntity)" : "records"};
  }

  async findOne(id: string): Promise<${resultType} | null> {
    const record = await this.model.findByPk(Number(id));
    return record ? ${context.architecture === "ddd" ? "toEntity(record)" : "record"} : null;
  }

  async create(dto: ${names.createDtoClassName}): Promise<${resultType}> {
    const record = await this.model.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });

    return ${context.architecture === "ddd" ? "toEntity(record)" : "record"};
  }

  async update(id: string, dto: ${names.updateDtoClassName}): Promise<${resultType} | null> {
    const record = await this.model.findByPk(Number(id));

    if (!record) {
      return null;
    }

    await record.update(dto);
    return ${context.architecture === "ddd" ? "toEntity(record)" : "record"};
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const record = await this.model.findByPk(Number(id));

    if (record) {
      await record.destroy();
    }

    return { deleted: true, id };
  }
}
`;
}

function buildStandardFiles(
  context: GenerateProjectContext,
  names: ResourceNames,
  mode: GenerateMode
): GeneratedFile[] {
  const baseDir = path.join(context.cwd, "src", names.moduleSegment);
  const files: GeneratedFile[] = [
    {
      path: path.join(baseDir, `${names.moduleSegment}.module.ts`),
      content: buildStandardModuleFile(names, context.orm, mode),
    },
    {
      path: path.join(baseDir, `${names.moduleSegment}.controller.ts`),
      content: buildStandardControllerFile(names, hasSwagger(context), mode),
    },
    {
      path: path.join(baseDir, `${names.moduleSegment}.service.ts`),
      content: buildStandardServiceFile(names, context.orm, mode),
    },
  ];

  if (mode === "resource") {
    files.push(
      {
        path: path.join(baseDir, "dto", `create-${names.singularKebab}.dto.ts`),
        content: buildDtoContent(names.createDtoClassName, hasSwagger(context), false),
      },
      {
        path: path.join(baseDir, "dto", `update-${names.singularKebab}.dto.ts`),
        content: buildDtoContent(names.updateDtoClassName, hasSwagger(context), true),
      }
    );
  }

  if (mode === "resource" && context.orm === "typeorm") {
    files.push({
      path: path.join(
        context.cwd,
        "src",
        "database",
        "entities",
        `${names.singularKebab}.entity.ts`
      ),
      content: buildTypeOrmEntityFile(names),
    });
  }

  if (mode === "resource" && context.orm === "sequelize") {
    files.push({
      path: path.join(
        context.cwd,
        "src",
        "database",
        "models",
        `${names.singularKebab}.model.ts`
      ),
      content: buildSequelizeModelFile(names),
    });
  }

  return files;
}

function buildLayeredFiles(
  context: GenerateProjectContext,
  names: ResourceNames,
  mode: GenerateMode
): GeneratedFile[] {
  const baseDir = path.join(context.cwd, "src", "modules", names.moduleSegment);
  const files: GeneratedFile[] = [
    {
      path: path.join(baseDir, `${names.moduleSegment}.module.ts`),
      content: buildLayeredModuleFile(names, context, mode),
    },
    {
      path: path.join(baseDir, "application", `${names.moduleSegment}.service.ts`),
      content: buildLayeredServiceFile(names, context, mode),
    },
    {
      path: path.join(
        baseDir,
        "presentation",
        "http",
        `${names.moduleSegment}.controller.ts`
      ),
      content: buildLayeredControllerFile(names, hasSwagger(context), mode),
    },
    {
      path: path.join(baseDir, "infrastructure", ".gitkeep"),
      content: "",
    },
  ];

  if (mode === "module") {
    files.push(
      { path: path.join(baseDir, "application", ".gitkeep"), content: "" },
      { path: path.join(baseDir, "presentation", ".gitkeep"), content: "" },
      {
        path: path.join(baseDir, "presentation", "http", ".gitkeep"),
        content: "",
      }
    );
  }

  if (mode === "resource") {
    files.push(
      {
        path: path.join(
          baseDir,
          "application",
          "dto",
          `create-${names.singularKebab}.dto.ts`
        ),
        content: buildDtoContent(names.createDtoClassName, hasSwagger(context), false),
      },
      {
        path: path.join(
          baseDir,
          "application",
          "dto",
          `update-${names.singularKebab}.dto.ts`
        ),
        content: buildDtoContent(names.updateDtoClassName, hasSwagger(context), true),
      }
    );

    if (context.orm !== "none") {
      files.push({
        path: path.join(
          baseDir,
          "application",
          "ports",
          `${names.singularKebab}-repository.port.ts`
        ),
        content: buildRepositoryPortFile(names, context),
      });
    }
  }

  if (mode === "module" && context.architecture === "ddd") {
    files.push(
      { path: path.join(baseDir, "domain", "entities", ".gitkeep"), content: "" },
      { path: path.join(baseDir, "domain", "services", ".gitkeep"), content: "" },
      {
        path: path.join(baseDir, "domain", "value-objects", ".gitkeep"),
        content: "",
      }
    );
  }

  if (mode === "resource" && context.architecture === "ddd") {
    files.push({
      path: path.join(baseDir, "domain", "entities", `${names.singularKebab}.entity.ts`),
      content: buildDddEntityFile(names, context.orm),
    });
  }

  if (mode === "resource" && context.orm === "prisma") {
    files.push({
      path: path.join(
        baseDir,
        "infrastructure",
        "persistence",
        `prisma-${names.moduleSegment}.repository.ts`
      ),
      content: buildPrismaRepositoryFile(names, context),
    });
  }

  if (mode === "resource" && context.orm === "typeorm") {
    files.push(
      {
        path: path.join(
          context.cwd,
          "src",
          "database",
          "entities",
          `${names.singularKebab}.entity.ts`
        ),
        content: buildTypeOrmEntityFile(names),
      },
      {
        path: path.join(
          baseDir,
          "infrastructure",
          "persistence",
          `typeorm-${names.moduleSegment}.repository.ts`
        ),
        content: buildTypeOrmRepositoryFile(names, context),
      }
    );
  }

  if (mode === "resource" && context.orm === "sequelize") {
    files.push(
      {
        path: path.join(
          context.cwd,
          "src",
          "database",
          "models",
          `${names.singularKebab}.model.ts`
        ),
        content: buildSequelizeModelFile(names),
      },
      {
        path: path.join(
          baseDir,
          "infrastructure",
          "persistence",
          `sequelize-${names.moduleSegment}.repository.ts`
        ),
        content: buildSequelizeRepositoryFile(names, context),
      }
    );
  }

  return files;
}

export function buildGeneratedFiles(input: {
  context: GenerateProjectContext;
  names: ResourceNames;
  mode: GenerateMode;
}): GeneratedFile[] {
  const { context, names, mode } = input;

  if (context.architecture === "standard") {
    return buildStandardFiles(context, names, mode);
  }

  return buildLayeredFiles(context, names, mode);
}

export function buildPrismaSchemaModel(names: ResourceNames): string {
  return buildPrismaModel(names);
}
