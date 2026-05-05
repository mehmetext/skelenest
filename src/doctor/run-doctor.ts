import fs from "fs-extra";
import path from "path";
import {
  detectProjectPackageManager,
  loadGenerateProjectContext,
} from "../generate/project-context";
import { DoctorContext, DoctorFinding, DoctorSummary } from "./types";

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key.length > 0) {
      entries[key] = value;
    }
  }

  return entries;
}

function hasDependency(context: DoctorContext, name: string): boolean {
  return Boolean(
    context.packageJson.dependencies?.[name] ||
      context.packageJson.devDependencies?.[name]
  );
}

function hasScript(context: DoctorContext, name: string): boolean {
  return Boolean(context.packageJson.scripts?.[name]);
}

function pushFinding(
  findings: DoctorFinding[],
  severity: DoctorFinding["severity"],
  title: string,
  detail: string
): void {
  findings.push({ severity, title, detail });
}

async function pathExists(cwd: string, relativePath: string): Promise<boolean> {
  return fs.pathExists(path.join(cwd, relativePath));
}

function expectedModuleRoot(
  context: DoctorContext,
  moduleName: string
): string {
  return context.architecture === "standard"
    ? `src/${moduleName}`
    : `src/modules/${moduleName}`;
}

function expectedAuthModulePath(context: DoctorContext): string {
  return context.architecture === "standard"
    ? "src/auth/auth.module.ts"
    : "src/modules/auth/auth.module.ts";
}

function expectedUsersModulePath(context: DoctorContext): string {
  return context.architecture === "standard"
    ? "src/users/users.module.ts"
    : "src/modules/users/users.module.ts";
}

async function buildDoctorContext(cwd: string): Promise<DoctorContext> {
  const projectContext = await loadGenerateProjectContext(cwd);
  const packageJson = (await fs.readJson(path.join(cwd, "package.json"))) as DoctorContext["packageJson"];
  const packageManager = await detectProjectPackageManager(cwd);
  const envPath = path.join(cwd, ".env");
  const envContent = (await fs.pathExists(envPath))
    ? await fs.readFile(envPath, "utf8")
    : "";

  const features = new Set(projectContext.config.features);

  if (features.has("bullmq")) {
    features.add("redis");
  }

  return {
    cwd,
    architecture: projectContext.architecture,
    orm: projectContext.orm,
    features,
    modules: new Set(projectContext.config.modules),
    packageManager,
    packageJson,
    env: parseEnvFile(envContent),
    appModuleContent: await fs.readFile(path.join(cwd, "src", "app.module.ts"), "utf8"),
    mainContent: await fs.readFile(path.join(cwd, "src", "main.ts"), "utf8"),
  };
}

async function checkBaseProject(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  const requiredFiles = [
    ".skelenest/project.json",
    "package.json",
    ".env",
    ".gitignore",
    ".prettierrc",
    "nest-cli.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "eslint.config.mjs",
    "AGENTS.md",
    "CLAUDE.md",
    "SKILL.md",
    "README.md",
    "src/app.module.ts",
    "src/main.ts",
  ];

  for (const file of requiredFiles) {
    if (await pathExists(context.cwd, file)) {
      pushFinding(findings, "ok", "Base file present", `${file} is present.`);
    } else {
      pushFinding(findings, "error", "Missing required file", `${file} is required by generated Skelenest projects.`);
    }
  }

  const requiredScripts = [
    "build",
    "format",
    "start",
    "start:dev",
    "start:prod",
    "lint",
    "test",
    "test:e2e",
  ];

  for (const script of requiredScripts) {
    if (hasScript(context, script)) {
      pushFinding(findings, "ok", "Script available", `package.json contains the "${script}" script.`);
    } else {
      pushFinding(findings, "warn", "Missing script", `package.json does not contain the "${script}" script.`);
    }
  }

  if (context.appModuleContent.includes("ConfigModule.forRoot")) {
    pushFinding(findings, "ok", "Config bootstrap found", "AppModule config bootstrapping is present.");
  } else {
    pushFinding(findings, "error", "Config bootstrap missing", "AppModule should include ConfigModule.forRoot.");
  }

  if (context.mainContent.includes("ValidationPipe")) {
    pushFinding(findings, "ok", "ValidationPipe found", "main.ts still configures the global ValidationPipe.");
  } else {
    pushFinding(findings, "error", "ValidationPipe missing", "main.ts should configure a global ValidationPipe.");
  }

  if ("PORT" in context.env) {
    pushFinding(findings, "ok", "PORT env found", ".env contains PORT.");
  } else {
    pushFinding(findings, "error", "PORT env missing", ".env should define PORT.");
  }

  if (context.packageManager) {
    pushFinding(
      findings,
      "ok",
      "Package manager detected",
      `Detected ${context.packageManager} from the project lockfile.`
    );
  }

  if (context.packageJson.packageManager) {
    pushFinding(
      findings,
      "ok",
      "packageManager field found",
      `package.json declares packageManager=${context.packageJson.packageManager}.`
    );
  } else {
    pushFinding(
      findings,
      "warn",
      "packageManager field missing",
      "package.json does not declare the packageManager field."
    );
  }

  return findings;
}

async function checkArchitecture(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  const markers =
    context.architecture === "standard"
      ? [
          "src/app.module.ts",
        ]
      : context.architecture === "clean"
        ? [
            "src/modules",
          ]
        : [
            "src/modules",
          ];

  for (const marker of markers) {
    if (await pathExists(context.cwd, marker)) {
      pushFinding(findings, "ok", "Architecture marker found", `${marker} matches the selected ${context.architecture} architecture.`);
    } else {
      pushFinding(findings, "warn", "Architecture marker missing", `${marker} was expected for the selected ${context.architecture} architecture.`);
    }
  }

  if (context.architecture !== "standard") {
    const moduleRoots = await pathExists(context.cwd, "src/modules");
    if (!moduleRoots) {
      pushFinding(findings, "error", "Module root missing", "Layered architectures should keep feature modules under src/modules.");
    }
  }

  return findings;
}

async function checkOrm(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];

  const ormDependencies = [
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "@nestjs/typeorm",
    "typeorm",
    "@nestjs/sequelize",
    "sequelize",
    "sequelize-typescript",
  ];

  if (context.orm === "none") {
    if ("DATABASE_URL" in context.env) {
      pushFinding(findings, "warn", "Unexpected DATABASE_URL", "No ORM is selected, but .env still defines DATABASE_URL.");
    } else {
      pushFinding(findings, "ok", "No ORM env leakage", "DATABASE_URL is absent as expected for ORM=none.");
    }

    const leakedOrmDeps = ormDependencies.filter((dependency) =>
      hasDependency(context, dependency)
    );

    if (leakedOrmDeps.length > 0) {
      pushFinding(
        findings,
        "warn",
        "Unexpected ORM dependencies",
        `No ORM is selected, but these ORM packages are installed: ${leakedOrmDeps.join(", ")}.`
      );
    } else {
      pushFinding(findings, "ok", "No ORM dependency leakage", "No ORM-specific dependencies were detected.");
    }

    return findings;
  }

  if (!("DATABASE_URL" in context.env)) {
    pushFinding(findings, "error", "DATABASE_URL missing", ".env should define DATABASE_URL for the selected ORM.");
  } else {
    pushFinding(findings, "ok", "DATABASE_URL found", ".env contains DATABASE_URL.");
  }

  if (context.orm === "prisma") {
    const checks: Array<[string, string]> = [
      ["prisma/schema.prisma", "Prisma schema file exists."],
      ["src/prisma/prisma.module.ts", "Prisma module exists."],
      ["src/prisma/prisma.service.ts", "Prisma service exists."],
    ];

    for (const [file, detail] of checks) {
      if (await pathExists(context.cwd, file)) {
        pushFinding(findings, "ok", "Prisma file found", detail);
      } else {
        pushFinding(findings, "error", "Prisma file missing", `${file} is required for Prisma projects.`);
      }
    }

    for (const dep of ["@prisma/client", "@prisma/adapter-pg", "prisma"]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "Prisma dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "Prisma dependency missing", `${dep} should be present for Prisma projects.`);
      }
    }

    for (const script of ["prisma:generate", "prisma:migrate", "prisma:push"]) {
      if (hasScript(context, script)) {
        pushFinding(findings, "ok", "Prisma script found", `${script} is present.`);
      } else {
        pushFinding(findings, "warn", "Prisma script missing", `${script} is usually expected in Prisma projects.`);
      }
    }

    if (context.appModuleContent.includes("PrismaModule")) {
      pushFinding(findings, "ok", "Prisma wiring found", "AppModule references PrismaModule.");
    } else {
      pushFinding(findings, "error", "Prisma wiring missing", "AppModule should import PrismaModule.");
    }
  }

  if (context.orm === "typeorm") {
    if (await pathExists(context.cwd, "src/database/typeorm.config.ts")) {
      pushFinding(findings, "ok", "TypeORM config found", "src/database/typeorm.config.ts exists.");
    } else {
      pushFinding(findings, "error", "TypeORM config missing", "src/database/typeorm.config.ts is required for TypeORM projects.");
    }

    if (await pathExists(context.cwd, "src/database/entities")) {
      pushFinding(findings, "ok", "TypeORM entities directory found", "src/database/entities exists.");
    } else {
      pushFinding(findings, "warn", "TypeORM entities directory missing", "src/database/entities is expected for TypeORM projects.");
    }

    for (const dep of ["@nestjs/typeorm", "typeorm", "pg"]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "TypeORM dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "TypeORM dependency missing", `${dep} should be present for TypeORM projects.`);
      }
    }

    if (context.appModuleContent.includes("TypeOrmModule.forRoot")) {
      pushFinding(findings, "ok", "TypeORM wiring found", "AppModule configures TypeOrmModule.forRoot.");
    } else {
      pushFinding(findings, "error", "TypeORM wiring missing", "AppModule should configure TypeOrmModule.forRoot.");
    }
  }

  if (context.orm === "sequelize") {
    if (await pathExists(context.cwd, "src/database/sequelize.config.ts")) {
      pushFinding(findings, "ok", "Sequelize config found", "src/database/sequelize.config.ts exists.");
    } else {
      pushFinding(findings, "error", "Sequelize config missing", "src/database/sequelize.config.ts is required for Sequelize projects.");
    }

    if (await pathExists(context.cwd, "src/database/models")) {
      pushFinding(findings, "ok", "Sequelize models directory found", "src/database/models exists.");
    } else {
      pushFinding(findings, "warn", "Sequelize models directory missing", "src/database/models is expected for Sequelize projects.");
    }

    for (const dep of [
      "@nestjs/sequelize",
      "sequelize",
      "sequelize-typescript",
      "pg",
      "pg-hstore",
    ]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "Sequelize dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "Sequelize dependency missing", `${dep} should be present for Sequelize projects.`);
      }
    }

    if (context.appModuleContent.includes("SequelizeModule.forRoot")) {
      pushFinding(findings, "ok", "Sequelize wiring found", "AppModule configures SequelizeModule.forRoot.");
    } else {
      pushFinding(findings, "error", "Sequelize wiring missing", "AppModule should configure SequelizeModule.forRoot.");
    }
  }

  return findings;
}

async function checkFeatures(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];

  if (context.features.has("redis")) {
    if ("REDIS_URL" in context.env) {
      pushFinding(findings, "ok", "REDIS_URL found", ".env contains REDIS_URL.");
    } else {
      pushFinding(findings, "error", "REDIS_URL missing", "Redis-enabled projects should define REDIS_URL.");
    }

    for (const dep of ["@nestjs-modules/ioredis", "ioredis"]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "Redis dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "Redis dependency missing", `${dep} should be present when Redis is selected.`);
      }
    }

    if (context.appModuleContent.includes("RedisModule.forRootAsync")) {
      pushFinding(findings, "ok", "Redis wiring found", "AppModule configures RedisModule.forRootAsync.");
    } else {
      pushFinding(findings, "error", "Redis wiring missing", "AppModule should configure RedisModule.forRootAsync.");
    }
  }
  else {
    const redisLeakSignals = [
      "REDIS_URL" in context.env,
      hasDependency(context, "@nestjs-modules/ioredis"),
      hasDependency(context, "ioredis"),
      context.appModuleContent.includes("RedisModule.forRootAsync"),
    ];

    if (redisLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected Redis wiring",
        "Redis is not selected, but Redis env/config/dependencies were still detected."
      );
    } else {
      pushFinding(findings, "ok", "No Redis leakage", "Redis-only wiring is absent as expected.");
    }
  }

  if (context.features.has("bullmq")) {
    for (const dep of ["@nestjs/bullmq", "bullmq"]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "BullMQ dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "BullMQ dependency missing", `${dep} should be present when BullMQ is selected.`);
      }
    }

    if (context.appModuleContent.includes("BullModule.forRootAsync")) {
      pushFinding(findings, "ok", "BullMQ wiring found", "AppModule configures BullModule.forRootAsync.");
    } else {
      pushFinding(findings, "error", "BullMQ wiring missing", "AppModule should configure BullModule.forRootAsync.");
    }
  }
  else {
    const bullLeakSignals = [
      hasDependency(context, "@nestjs/bullmq"),
      hasDependency(context, "bullmq"),
      context.appModuleContent.includes("BullModule.forRootAsync"),
    ];

    if (bullLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected BullMQ wiring",
        "BullMQ is not selected, but queue-specific dependencies or wiring were detected."
      );
    } else {
      pushFinding(findings, "ok", "No BullMQ leakage", "BullMQ-only wiring is absent as expected.");
    }
  }

  if (context.features.has("throttler")) {
    if (hasDependency(context, "@nestjs/throttler")) {
      pushFinding(findings, "ok", "Throttler dependency found", "@nestjs/throttler is installed.");
    } else {
      pushFinding(findings, "error", "Throttler dependency missing", "@nestjs/throttler should be present when throttler is selected.");
    }

    if (context.features.has("redis")) {
      if (hasDependency(context, "@nest-lab/throttler-storage-redis")) {
        pushFinding(findings, "ok", "Redis throttler storage found", "@nest-lab/throttler-storage-redis is installed.");
      } else {
        pushFinding(findings, "warn", "Redis throttler storage missing", "Redis-backed throttler projects usually include @nest-lab/throttler-storage-redis.");
      }
    }

    if (context.appModuleContent.includes("ThrottlerModule.forRootAsync")) {
      pushFinding(findings, "ok", "Throttler wiring found", "AppModule configures ThrottlerModule.forRootAsync.");
    } else {
      pushFinding(findings, "error", "Throttler wiring missing", "AppModule should configure ThrottlerModule.forRootAsync.");
    }
  }
  else {
    const throttlerLeakSignals = [
      hasDependency(context, "@nestjs/throttler"),
      hasDependency(context, "@nest-lab/throttler-storage-redis"),
      context.appModuleContent.includes("ThrottlerModule.forRootAsync"),
    ];

    if (throttlerLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected throttler wiring",
        "Throttler is not selected, but throttler dependencies or AppModule wiring were detected."
      );
    } else {
      pushFinding(findings, "ok", "No throttler leakage", "Throttler-only wiring is absent as expected.");
    }
  }

  if (context.features.has("swagger")) {
    if (hasDependency(context, "@nestjs/swagger")) {
      pushFinding(findings, "ok", "Swagger dependency found", "@nestjs/swagger is installed.");
    } else {
      pushFinding(findings, "error", "Swagger dependency missing", "@nestjs/swagger should be present when Swagger is selected.");
    }

    if (
      context.mainContent.includes("SwaggerModule.setup") &&
      context.mainContent.includes("DocumentBuilder")
    ) {
      pushFinding(findings, "ok", "Swagger bootstrap found", "main.ts still wires SwaggerModule and DocumentBuilder.");
    } else {
      pushFinding(findings, "error", "Swagger bootstrap missing", "main.ts should configure SwaggerModule when Swagger is selected.");
    }
  }
  else {
    const swaggerLeakSignals = [
      hasDependency(context, "@nestjs/swagger"),
      context.mainContent.includes("SwaggerModule.setup"),
      context.mainContent.includes("DocumentBuilder"),
    ];

    if (swaggerLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected Swagger wiring",
        "Swagger is not selected, but Swagger dependencies or bootstrap code were detected."
      );
    } else {
      pushFinding(findings, "ok", "No Swagger leakage", "Swagger-only wiring is absent as expected.");
    }
  }

  if (context.features.has("elasticsearch")) {
    for (const key of [
      "ELASTICSEARCH_NODE",
      "ELASTICSEARCH_USERNAME",
      "ELASTICSEARCH_PASSWORD",
    ]) {
      if (key in context.env) {
        pushFinding(findings, "ok", "Elasticsearch env found", `.env contains ${key}.`);
      } else {
        pushFinding(findings, "error", "Elasticsearch env missing", `${key} should be defined when Elasticsearch is selected.`);
      }
    }

    if (context.features.has("docker")) {
      if ("KIBANA_PASSWORD" in context.env) {
        pushFinding(findings, "ok", "Kibana env found", ".env contains KIBANA_PASSWORD for the Docker dashboard.");
      } else {
        pushFinding(findings, "warn", "Kibana env missing", "Docker-enabled Elasticsearch projects should define KIBANA_PASSWORD for Kibana.");
      }
    }

    for (const dep of ["@elastic/elasticsearch", "@nestjs/elasticsearch"]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "Elasticsearch dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "Elasticsearch dependency missing", `${dep} should be present when Elasticsearch is selected.`);
      }
    }

    if (context.appModuleContent.includes("ElasticsearchModule.registerAsync")) {
      pushFinding(findings, "ok", "Elasticsearch wiring found", "AppModule configures ElasticsearchModule.registerAsync.");
    } else {
      pushFinding(findings, "error", "Elasticsearch wiring missing", "AppModule should configure ElasticsearchModule.registerAsync.");
    }
  } else {
    const elasticsearchLeakSignals = [
      "ELASTICSEARCH_NODE" in context.env,
      "ELASTICSEARCH_USERNAME" in context.env,
      "ELASTICSEARCH_PASSWORD" in context.env,
      "KIBANA_PASSWORD" in context.env,
      hasDependency(context, "@elastic/elasticsearch"),
      hasDependency(context, "@nestjs/elasticsearch"),
      context.appModuleContent.includes("ElasticsearchModule.registerAsync"),
    ];

    if (elasticsearchLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected Elasticsearch wiring",
        "Elasticsearch is not selected, but Elasticsearch env/config/dependencies were still detected."
      );
    } else {
      pushFinding(findings, "ok", "No Elasticsearch leakage", "Elasticsearch-only wiring is absent as expected.");
    }
  }

  if (context.features.has("docker")) {
    for (const file of ["Dockerfile", "docker-compose.yml"]) {
      if (await pathExists(context.cwd, file)) {
        pushFinding(findings, "ok", "Docker artifact found", `${file} exists.`);
      } else {
        pushFinding(findings, "warn", "Docker artifact missing", `${file} is usually expected when Docker is selected.`);
      }
    }
  }
  else {
    const dockerLeakSignals = [
      await pathExists(context.cwd, "Dockerfile"),
      await pathExists(context.cwd, "docker-compose.yml"),
    ];

    if (dockerLeakSignals.some(Boolean)) {
      pushFinding(
        findings,
        "warn",
        "Unexpected Docker artifacts",
        "Docker is not selected, but Dockerfile or docker-compose.yml was detected."
      );
    } else {
      pushFinding(findings, "ok", "No Docker leakage", "Docker-only artifacts are absent as expected.");
    }
  }

  return findings;
}

async function checkStarterModules(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];

  if (context.modules.has("auth")) {
    const authPath = expectedAuthModulePath(context);
    const usersPath = expectedUsersModulePath(context);

    if (await pathExists(context.cwd, authPath)) {
      pushFinding(findings, "ok", "Auth module found", `${authPath} exists.`);
    } else {
      pushFinding(findings, "error", "Auth module missing", `${authPath} should exist when the auth starter module is selected.`);
    }

    if (await pathExists(context.cwd, usersPath)) {
      pushFinding(findings, "ok", "Users module found", `${usersPath} exists.`);
    } else {
      pushFinding(findings, "error", "Users module missing", `${usersPath} should exist because the auth starter depends on users.`);
    }

    for (const dep of [
      "@nestjs/jwt",
      "@nestjs/passport",
      "passport",
      "passport-jwt",
      "passport-local",
    ]) {
      if (hasDependency(context, dep)) {
        pushFinding(findings, "ok", "Auth dependency found", `${dep} is installed.`);
      } else {
        pushFinding(findings, "error", "Auth dependency missing", `${dep} should be present when auth is selected.`);
      }
    }

    for (const key of [
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
      "JWT_ACCESS_TTL",
      "JWT_REFRESH_TTL",
    ]) {
      if (key in context.env) {
        pushFinding(findings, "ok", "JWT env found", `.env contains ${key}.`);
      } else {
        pushFinding(findings, "error", "JWT env missing", `.env should contain ${key} when auth is selected.`);
      }
    }

    if (
      context.orm !== "prisma" &&
      context.orm !== "typeorm" &&
      context.orm !== "sequelize"
    ) {
      pushFinding(findings, "warn", "Unexpected auth/ORM pairing", "The starter auth module is designed for Prisma, TypeORM, or Sequelize backed projects.");
    }

    if (context.appModuleContent.includes("AuthModule")) {
      pushFinding(findings, "ok", "Auth wiring found", "AppModule references AuthModule.");
    } else {
      pushFinding(findings, "error", "Auth wiring missing", "AppModule should import AuthModule when auth is selected.");
    }

    if (context.orm === "prisma" && (await pathExists(context.cwd, "prisma/schema.prisma"))) {
      const schema = await fs.readFile(path.join(context.cwd, "prisma", "schema.prisma"), "utf8");

      if (schema.includes("model User")) {
        pushFinding(findings, "ok", "Prisma User model found", "schema.prisma includes the User model expected by the auth starter.");
      } else {
        pushFinding(findings, "error", "Prisma User model missing", "schema.prisma should include the User model when auth is selected.");
      }

      if (context.features.has("redis")) {
        if (
          !schema.includes("model RefreshSession") &&
          !schema.includes("model RevokedAccessToken")
        ) {
          pushFinding(findings, "ok", "Redis auth session mode found", "Prisma auth session models are absent, matching Redis-backed auth sessions.");
        } else {
          pushFinding(findings, "warn", "Prisma auth session models still present", "Redis-backed auth sessions usually do not need RefreshSession or RevokedAccessToken models.");
        }
      } else {
        if (
          schema.includes("model RefreshSession") &&
          schema.includes("model RevokedAccessToken")
        ) {
          pushFinding(findings, "ok", "Prisma auth session models found", "schema.prisma includes the auth session models expected without Redis.");
        } else {
          pushFinding(findings, "error", "Prisma auth session models missing", "Non-Redis auth starter projects should include RefreshSession and RevokedAccessToken models.");
        }
      }
    }

    if (context.orm === "sequelize") {
      const userModelPath = "src/database/models/user.model.ts";
      const refreshModelPath = "src/database/models/refresh-session.model.ts";
      const revokedModelPath = "src/database/models/revoked-access-token.model.ts";

      if (await pathExists(context.cwd, userModelPath)) {
        pushFinding(findings, "ok", "Sequelize User model found", `${userModelPath} exists.`);
      } else {
        pushFinding(findings, "error", "Sequelize User model missing", `${userModelPath} should exist when auth is selected.`);
      }

      if (context.features.has("redis")) {
        if (
          !(await pathExists(context.cwd, refreshModelPath)) &&
          !(await pathExists(context.cwd, revokedModelPath))
        ) {
          pushFinding(findings, "ok", "Redis auth session mode found", "Sequelize auth session models are absent, matching Redis-backed auth sessions.");
        } else {
          pushFinding(findings, "warn", "Sequelize auth session models still present", "Redis-backed auth sessions usually do not need RefreshSessionModel or RevokedAccessTokenModel.");
        }
      } else if (
        (await pathExists(context.cwd, refreshModelPath)) &&
        (await pathExists(context.cwd, revokedModelPath))
      ) {
        pushFinding(findings, "ok", "Sequelize auth session models found", "Auth session models exist for non-Redis auth.");
      } else {
        pushFinding(findings, "error", "Sequelize auth session models missing", "Non-Redis auth starter projects should include RefreshSessionModel and RevokedAccessTokenModel.");
      }
    }

    if (context.orm === "typeorm") {
      const userEntityPath = "src/database/entities/user.entity.ts";
      const refreshEntityPath = "src/database/entities/refresh-session.entity.ts";
      const revokedEntityPath = "src/database/entities/revoked-access-token.entity.ts";

      if (await pathExists(context.cwd, userEntityPath)) {
        pushFinding(findings, "ok", "TypeORM User entity found", `${userEntityPath} exists.`);
      } else {
        pushFinding(findings, "error", "TypeORM User entity missing", `${userEntityPath} should exist when auth is selected.`);
      }

      if (context.features.has("redis")) {
        if (
          !(await pathExists(context.cwd, refreshEntityPath)) &&
          !(await pathExists(context.cwd, revokedEntityPath))
        ) {
          pushFinding(findings, "ok", "Redis auth session mode found", "TypeORM auth session entities are absent, matching Redis-backed auth sessions.");
        } else {
          pushFinding(findings, "warn", "TypeORM auth session entities still present", "Redis-backed auth sessions usually do not need RefreshSessionEntity or RevokedAccessTokenEntity.");
        }
      } else if (
        (await pathExists(context.cwd, refreshEntityPath)) &&
        (await pathExists(context.cwd, revokedEntityPath))
      ) {
        pushFinding(findings, "ok", "TypeORM auth session entities found", "Auth session entities exist for non-Redis auth.");
      } else {
        pushFinding(findings, "error", "TypeORM auth session entities missing", "Non-Redis auth starter projects should include RefreshSessionEntity and RevokedAccessTokenEntity.");
      }
    }
  }

  return findings;
}

async function checkLockfile(context: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  const lockfiles = ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"];
  const present = [];

  for (const lockfile of lockfiles) {
    if (await pathExists(context.cwd, lockfile)) {
      present.push(lockfile);
    }
  }

  if (present.length === 0) {
    pushFinding(findings, "warn", "No lockfile found", "The project does not contain pnpm-lock.yaml, yarn.lock, or package-lock.json.");
  } else {
    pushFinding(findings, "ok", "Lockfile found", `Detected ${present.join(", ")}.`);
  }

  if (present.length > 1) {
    pushFinding(
      findings,
      "warn",
      "Multiple lockfiles found",
      `More than one lockfile is present: ${present.join(", ")}. This can confuse installs.`
    );
  }

  if (context.packageManager && context.packageJson.packageManager) {
    if (context.packageJson.packageManager.startsWith(context.packageManager)) {
      pushFinding(
        findings,
        "ok",
        "Package manager metadata matches",
        "Lockfile detection matches package.json packageManager."
      );
    } else {
      pushFinding(
        findings,
        "warn",
        "Package manager mismatch",
        `Lockfile suggests ${context.packageManager}, but package.json declares ${context.packageJson.packageManager}.`
      );
    }
  }

  return findings;
}

function summarizeFindings(findings: DoctorFinding[]): DoctorSummary {
  return {
    ok: findings.filter((finding) => finding.severity === "ok").length,
    warn: findings.filter((finding) => finding.severity === "warn").length,
    error: findings.filter((finding) => finding.severity === "error").length,
  };
}

export async function runDoctor(cwd: string): Promise<{
  findings: DoctorFinding[];
  summary: DoctorSummary;
  hasErrors: boolean;
}> {
  const findings: DoctorFinding[] = [];

  try {
    const context = await buildDoctorContext(cwd);

    findings.push(...(await checkBaseProject(context)));
    findings.push(...(await checkLockfile(context)));
    findings.push(...(await checkArchitecture(context)));
    findings.push(...(await checkOrm(context)));
    findings.push(...(await checkFeatures(context)));
    findings.push(...(await checkStarterModules(context)));

    for (const moduleName of context.modules) {
      const moduleRoot = expectedModuleRoot(context, moduleName);
      if (await pathExists(context.cwd, moduleRoot)) {
        pushFinding(findings, "ok", "Starter module root found", `${moduleRoot} exists for starter module "${moduleName}".`);
      } else if (moduleName !== "auth") {
        pushFinding(findings, "warn", "Starter module root missing", `${moduleRoot} was expected for starter module "${moduleName}".`);
      }
    }
  } catch (error) {
    pushFinding(
      findings,
      "error",
      "Doctor could not initialize",
      error instanceof Error ? error.message : "Unknown initialization error."
    );
  }

  return {
    findings,
    summary: summarizeFindings(findings),
    hasErrors: findings.some((finding) => finding.severity === "error"),
  };
}
