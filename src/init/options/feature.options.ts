import path from "path";
import { TechnologyOption } from "../../core";
import { resolveTemplatesRoot } from "../template-root";
import { InitPromptData } from "../types";

const featureTemplateRoot = (...segments: string[]): string =>
  path.join(resolveTemplatesRoot(__dirname), "features", ...segments);

const ELASTIC_STACK_VERSION = "9.3.4";

export const featureOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "docker",
    label: "Docker",
    description: "Generates Dockerfile, .dockerignore, and docker-compose.yml",
    contribute: (context) => ({
      templateRoots: [featureTemplateRoot("runtime", "docker")],
      templateData: {
        docker: {
          includesDatabase: context.has("prisma") || context.has("typeorm") || context.has("sequelize"),
          includesRedis: context.has("redis") || context.has("bullmq"),
          includesElasticsearch: context.has("elasticsearch"),
          includesKibana: context.has("elasticsearch"),
          elasticStackVersion: ELASTIC_STACK_VERSION,
        },
      },
      packageJson: {
        scripts: {
          "docker:build": "docker compose build",
          "docker:up": "docker compose up --build",
          "docker:down": "docker compose down",
        },
      },
    }),
  },
  {
    id: "redis",
    label: "Redis",
    description: "Adds REDIS_URL and shared Redis runtime settings",
    contribute: (context) => ({
      packageJson: {
        dependencies: {
          "@nestjs-modules/ioredis": "^2.2.1",
          ioredis: "^5.10.1",
        },
      },
      slots: {
        "env.entries": [
          `REDIS_URL="redis://${context.has("docker") ? "redis" : "localhost"}:6379"`,
        ],
      },
    }),
  },
  {
    id: "bullmq",
    label: "BullMQ",
    description: "Adds queue infrastructure and automatically includes Redis",
    requires: ["redis"],
    contribute: () => ({
      packageJson: {
        dependencies: {
          "@nestjs/bullmq": "^11.0.4",
          bullmq: "^5.76.4",
        },
      },
    }),
  },
  {
    id: "throttler",
    label: "Throttler",
    description: "Configures global request throttling",
    contribute: (context) => ({
      packageJson: {
        dependencies: {
          ...(context.has("redis")
            ? {
                "@nest-lab/throttler-storage-redis": "^1.2.0",
              }
            : {}),
          "@nestjs/throttler": "^6.5.0",
        },
      },
    }),
  },
  {
    id: "swagger",
    label: "Swagger",
    description: "Bootstraps OpenAPI docs under /docs",
    contribute: () => ({
      packageJson: {
        dependencies: {
          "@nestjs/swagger": "^11.4.2",
        },
      },
    }),
  },
  {
    id: "sentry",
    label: "Sentry",
    description: "Adds Sentry error tracking with bootstrap instrumentation",
    contribute: () => ({
      templateRoots: [featureTemplateRoot("observability", "sentry")],
      slots: {
        "main.preImports": ["import './instrument';"],
        "app.module.imports": [
          "import { APP_FILTER } from '@nestjs/core';",
          "import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';",
        ],
        "app.module.moduleImports": ["SentryModule.forRoot()"],
        "app.module.providers": [
          "{ provide: APP_FILTER, useClass: SentryGlobalFilter }",
        ],
        "env.entries": [
          'SENTRY_DSN=""',
          'SENTRY_TRACES_SAMPLE_RATE="1.0"',
        ],
      },
      packageJson: {
        dependencies: {
          "@sentry/nestjs": "^10.10.0",
        },
      },
    }),
  },
  {
    id: "schedule",
    label: "Task Scheduling",
    description: "Enables @nestjs/schedule with an example cron job",
    contribute: () => ({
      slots: {
        "app.module.imports": [
          "import { ScheduleModule } from '@nestjs/schedule';",
          "import { TasksService } from './tasks/tasks.service';",
        ],
        "app.module.moduleImports": ["ScheduleModule.forRoot()"],
        "app.module.providers": ["TasksService"],
      },
      packageJson: {
        dependencies: {
          "@nestjs/schedule": "^6.0.0",
        },
      },
    }),
  },
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    description: "Configures ElasticsearchModule with environment-based auth",
    contribute: (context) => ({
      slots: {
        "app.module.imports": [
          "import { ElasticsearchModule } from '@nestjs/elasticsearch';",
        ],
        "app.module.moduleImports": [
          `ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: configService.getOrThrow('ELASTICSEARCH_NODE'),
        auth: {
          username: configService.getOrThrow('ELASTICSEARCH_USERNAME'),
          password: configService.getOrThrow('ELASTICSEARCH_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    })`,
        ],
        "env.entries": [
          `ELASTICSEARCH_NODE="http://${context.has("docker") ? "elasticsearch" : "localhost"}:9200"`,
          `ELASTICSEARCH_USERNAME="elastic"`,
          `ELASTICSEARCH_PASSWORD="changeme"`,
          ...(context.has("docker") ? [`KIBANA_PASSWORD="changeme"`] : []),
        ],
      },
      packageJson: {
        dependencies: {
          "@elastic/elasticsearch": "^9.3.4",
          "@nestjs/elasticsearch": "^11.1.0",
        },
      },
    }),
  },
];
