import path from "path";
import { TechnologyOption } from "../../core";
import { resolveTemplatesRoot } from "../template-root";
import { InitPromptData } from "../types";

const ormTemplateRoot = (...segments: string[]): string =>
  path.join(resolveTemplatesRoot(__dirname), "features", "orm", ...segments);

export const ormOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "prisma",
    label: "Prisma",
    contribute: (context) => ({
      templateRoots: [ormTemplateRoot("prisma")],
      slots: {
        "app.module.imports": [
          "import { PrismaModule } from './prisma/prisma.module';",
        ],
        "app.module.moduleImports": ["PrismaModule"],
        "gitignore.entries": ["src/generated/prisma"],
        "env.entries": [
          `DATABASE_URL="postgresql://postgres:postgres@${context.has("docker") ? "postgres" : "localhost"}:5432/${context.input.name}-db"`,
        ],
      },
      packageJson: {
        dependencies: {
          "@prisma/adapter-pg": "^7.8.0",
          "@prisma/client": "^7.8.0",
        },
        devDependencies: {
          prisma: "^7.8.0",
        },
        scripts: {
          "prisma:generate": "prisma generate --schema=prisma/schema.prisma",
          "prisma:migrate": "prisma migrate dev --schema=prisma/schema.prisma",
          "prisma:migrate:deploy":
            "prisma migrate deploy --schema=prisma/schema.prisma",
          "prisma:push": "prisma db push --schema=prisma/schema.prisma",
          "prisma:studio": "prisma studio",
        },
      },
    }),
  },
  {
    id: "typeorm",
    label: "TypeORM",
    contribute: (context) => ({
      templateRoots: [ormTemplateRoot("typeorm")],
      slots: {
        "app.module.imports": [
          "import { TypeOrmModule } from '@nestjs/typeorm';",
          "import { typeOrmConfig } from './database/typeorm.config';",
        ],
        "app.module.moduleImports": ["TypeOrmModule.forRoot(typeOrmConfig)"],
        "env.entries": [
          `DATABASE_URL="postgresql://postgres:postgres@${context.has("docker") ? "postgres" : "localhost"}:5432/${context.input.name}-db"`,
        ],
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
    contribute: (context) => ({
      templateRoots: [ormTemplateRoot("sequelize")],
      slots: {
        "app.module.imports": [
          "import { SequelizeModule } from '@nestjs/sequelize';",
          "import { sequelizeConfig } from './database/sequelize.config';",
        ],
        "app.module.moduleImports": [
          "SequelizeModule.forRoot(sequelizeConfig)",
        ],
        "env.entries": [
          `DATABASE_URL="postgresql://postgres:postgres@${context.has("docker") ? "postgres" : "localhost"}:5432/${context.input.name}-db"`,
        ],
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
