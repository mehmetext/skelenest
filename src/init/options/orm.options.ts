import path from "path";
import { TechnologyOption } from "../../core";
import { resolveTemplatesRoot } from "../template-root";
import { InitPromptData } from "../types";

const ormTemplateRoot = (...segments: string[]): string =>
  path.join(resolveTemplatesRoot(__dirname), "features", "orm", ...segments);

const defaultDatabaseUrl =
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app"';

export const ormOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "prisma",
    label: "Prisma",
    contribute: () => ({
      templateRoots: [ormTemplateRoot("prisma")],
      slots: {
        "app.module.imports": [
          "import { PrismaModule } from './prisma/prisma.module';",
        ],
        "app.module.moduleImports": ["PrismaModule"],
        "env.entries": [defaultDatabaseUrl],
      },
      packageJson: {
        dependencies: {
          "@prisma/client": "^6.7.0",
        },
        devDependencies: {
          prisma: "^6.7.0",
        },
        scripts: {
          "prisma:generate": "prisma generate",
          "prisma:migrate:dev": "prisma migrate dev",
        },
      },
    }),
  },
  {
    id: "typeorm",
    label: "TypeORM",
    contribute: () => ({
      templateRoots: [ormTemplateRoot("typeorm")],
      slots: {
        "app.module.imports": [
          "import { TypeOrmModule } from '@nestjs/typeorm';",
          "import { typeOrmConfig } from './database/typeorm.config';",
        ],
        "app.module.moduleImports": ["TypeOrmModule.forRoot(typeOrmConfig)"],
        "env.entries": [defaultDatabaseUrl],
      },
      packageJson: {
        dependencies: {
          "@nestjs/typeorm": "^11.0.0",
          pg: "^8.13.1",
          typeorm: "^0.3.24",
        },
      },
    }),
  },
  {
    id: "sequelize",
    label: "Sequelize",
    contribute: () => ({
      templateRoots: [ormTemplateRoot("sequelize")],
      slots: {
        "app.module.imports": [
          "import { SequelizeModule } from '@nestjs/sequelize';",
          "import { sequelizeConfig } from './database/sequelize.config';",
        ],
        "app.module.moduleImports": ["SequelizeModule.forRoot(sequelizeConfig)"],
        "env.entries": [defaultDatabaseUrl],
      },
      packageJson: {
        dependencies: {
          "@nestjs/sequelize": "^11.0.0",
          pg: "^8.13.1",
          "pg-hstore": "^2.3.4",
          sequelize: "^6.37.5",
          "sequelize-typescript": "^2.1.6",
        },
      },
    }),
  },
];
