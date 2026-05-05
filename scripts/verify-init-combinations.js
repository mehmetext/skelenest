const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createInitBlueprint } = require("../dist/src/init/index.js");
const { copyTemplateTree } = require("../dist/src/utils/template.util.js");
const { initSelectionGroups } = require("../dist/src/init/selection-groups.js");

function ensure(condition, message) {
  assert.ok(condition, message);
}

function parseArguments(argv) {
  const result = {
    outputDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--output-dir") {
      result.outputDir = argv[index + 1] ? path.resolve(argv[index + 1]) : null;
      index += 1;
    }
  }

  return result;
}

function powerSet(values) {
  const result = [[]];

  for (const value of values) {
    const additions = result.map((existing) => [...existing, value]);
    result.push(...additions);
  }

  return result;
}

function listFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function getGroup(groupId) {
  const group = initSelectionGroups.find((entry) => entry.id === groupId);
  ensure(group, `Missing selection group: ${groupId}`);
  return group;
}

function expectedToSucceed({ orm, modules }) {
  return !(modules.includes("auth") && !["prisma", "sequelize"].includes(orm));
}

function createSelectionCases() {
  const ormGroup = getGroup("orm");
  const architectureGroup = getGroup("architecture");
  const featureGroup = getGroup("features");
  const moduleGroup = getGroup("modules");

  const ormIds = ["none", ...ormGroup.options.map((option) => option.id)];
  const architectureIds = architectureGroup.options.map((option) => option.id);
  const featureSets = powerSet(featureGroup.options.map((option) => option.id));
  const moduleSets = powerSet(moduleGroup.options.map((option) => option.id));

  const cases = [];

  for (const orm of ormIds) {
    for (const architecture of architectureIds) {
      for (const features of featureSets) {
        for (const modules of moduleSets) {
          cases.push({ orm, architecture, features, modules });
        }
      }
    }
  }

  return cases;
}

function createPromptData(selectionCase) {
  return {
    name: "demo-app",
    port: "3000",
    packageManager: "pnpm",
    installDependencies: false,
    initializeGit: false,
    selections: {
      orm: selectionCase.orm,
      architecture: selectionCase.architecture,
      features: selectionCase.features,
      modules: selectionCase.modules,
    },
  };
}

function createCaseId(selectionCase) {
  const features =
    selectionCase.features.length > 0 ? selectionCase.features.join("-") : "no-features";
  const modules =
    selectionCase.modules.length > 0 ? selectionCase.modules.join("-") : "no-modules";

  return [
    `orm-${selectionCase.orm}`,
    `arch-${selectionCase.architecture}`,
    `features-${features}`,
    `modules-${modules}`,
  ].join("__");
}

function ensureEmptyDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifactCase(baseDir, selectionCase, payload) {
  const caseDir = path.join(baseDir, createCaseId(selectionCase));
  fs.mkdirSync(caseDir, { recursive: true });

  writeJson(path.join(caseDir, "selection.json"), selectionCase);
  writeJson(path.join(caseDir, "result.json"), payload);

  if (payload.errorMessage) {
    fs.writeFileSync(path.join(caseDir, "error.txt"), `${payload.errorMessage}\n`, "utf8");
  }

  return caseDir;
}

function createSummaryReport(baseDir, summary) {
  const lines = [
    "# Init Combination Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Supported combinations: ${summary.supportedCount}`,
    `Rejected combinations: ${summary.rejectedCount}`,
    "",
    "## Rejection Reasons",
    "",
  ];

  const rejectionEntries = Object.entries(summary.rejectionReasons).sort(
    ([left], [right]) => right.localeCompare(left)
  );

  if (rejectionEntries.length === 0) {
    lines.push("No rejected combinations.");
  } else {
    for (const [reason, count] of rejectionEntries) {
      lines.push(`- ${count}x ${reason}`);
    }
  }

  lines.push("", "## Sample Paths", "");

  for (const samplePath of summary.samplePaths) {
    lines.push(`- ${samplePath}`);
  }

  fs.writeFileSync(path.join(baseDir, "README.md"), `${lines.join("\n")}\n`, "utf8");
  writeJson(path.join(baseDir, "summary.json"), summary);
}

function verifyGeneratedTree(outputRoot) {
  const files = listFilesRecursive(outputRoot);

  for (const filePath of files) {
    const relative = path.relative(outputRoot, filePath);
    ensure(
      !relative.includes(".when-") && !relative.includes(".unless-"),
      `Conditional filename leaked into output: ${relative}`
    );
  }
}

function verifyFeatureDependencies(blueprint, selectionCase) {
  const selectedOptionIds = blueprint.templateData.selectedOptionIds || [];
  const envEntries = blueprint.slots["env.entries"] || [];
  const packageJson = JSON.parse(blueprint.templateData.packageJson);

  ensure(
    packageJson.packageManager === "pnpm@10.28.0",
    `Expected generated packageManager metadata to be pnpm@10.28.0, received ${packageJson.packageManager}`
  );

  if (selectionCase.features.includes("bullmq")) {
    ensure(
      selectedOptionIds.includes("redis"),
      "bullmq should auto-select redis"
    );
    ensure(
      packageJson.dependencies["@nestjs/bullmq"],
      "bullmq dependency missing"
    );
    ensure(
      packageJson.dependencies["ioredis"],
      "redis dependency missing when bullmq is selected"
    );
    ensure(
      envEntries.some((entry) => entry.startsWith('REDIS_URL=')),
      "REDIS_URL must be present when bullmq is selected"
    );
  }

  if (selectionCase.features.includes("redis")) {
    ensure(
      packageJson.dependencies["@nestjs-modules/ioredis"],
      "redis package missing when redis is selected"
    );
    ensure(
      envEntries.some((entry) => entry.startsWith('REDIS_URL=')),
      "REDIS_URL must be present when redis is selected"
    );
  }

  if (
    !selectionCase.features.includes("redis") &&
    !selectionCase.features.includes("bullmq")
  ) {
    ensure(
      !envEntries.some((entry) => entry.startsWith('REDIS_URL=')),
      "REDIS_URL should not be present without redis or bullmq"
    );
  }

  if (selectionCase.features.includes("elasticsearch")) {
    ensure(
      packageJson.dependencies["@elastic/elasticsearch"],
      "@elastic/elasticsearch dependency missing when elasticsearch is selected"
    );
    ensure(
      packageJson.dependencies["@nestjs/elasticsearch"],
      "@nestjs/elasticsearch dependency missing when elasticsearch is selected"
    );
    ensure(
      envEntries.some((entry) => entry.startsWith("ELASTICSEARCH_NODE=")),
      "ELASTICSEARCH_NODE must be present when elasticsearch is selected"
    );
    ensure(
      envEntries.some((entry) => entry.startsWith("ELASTICSEARCH_USERNAME=")),
      "ELASTICSEARCH_USERNAME must be present when elasticsearch is selected"
    );
    ensure(
      envEntries.some((entry) => entry.startsWith("ELASTICSEARCH_PASSWORD=")),
      "ELASTICSEARCH_PASSWORD must be present when elasticsearch is selected"
    );
    if (selectionCase.features.includes("docker")) {
      ensure(
        envEntries.some((entry) => entry.startsWith("KIBANA_PASSWORD=")),
        "KIBANA_PASSWORD must be present when docker and elasticsearch are selected"
      );
    } else {
      ensure(
        !envEntries.some((entry) => entry.startsWith("KIBANA_PASSWORD=")),
        "KIBANA_PASSWORD should not be present without docker"
      );
    }
  } else {
    ensure(
      !envEntries.some((entry) => entry.startsWith("ELASTICSEARCH_")),
      "ELASTICSEARCH_* env entries should not be present without elasticsearch"
    );
    ensure(
      !envEntries.some((entry) => entry.startsWith("KIBANA_PASSWORD=")),
      "KIBANA_PASSWORD should not be present without elasticsearch"
    );
  }

  if (selectionCase.orm === "none") {
    ensure(
      !envEntries.some((entry) => entry.startsWith('DATABASE_URL=')),
      "DATABASE_URL should not be present when ORM is none"
    );
  } else {
    ensure(
      envEntries.some((entry) => entry.startsWith('DATABASE_URL=')),
      `DATABASE_URL missing for ORM ${selectionCase.orm}`
    );
  }
}

function verifyOptionalFeatureLeakage(blueprint, selectionCase) {
  const packageJson = JSON.parse(blueprint.templateData.packageJson);
  const selectedOptionIds = new Set(blueprint.templateData.selectedOptionIds || []);

  if (!selectedOptionIds.has("swagger")) {
    ensure(
      !packageJson.dependencies["@nestjs/swagger"],
      "@nestjs/swagger should not be present when swagger is not selected"
    );
  }

  if (!selectedOptionIds.has("redis")) {
    ensure(
      !packageJson.dependencies["@nestjs-modules/ioredis"],
      "@nestjs-modules/ioredis should not be present when redis is not selected"
    );
    ensure(
      !packageJson.dependencies["ioredis"],
      "ioredis should not be present when redis is not selected"
    );
  }

  if (!selectedOptionIds.has("elasticsearch")) {
    ensure(
      !packageJson.dependencies["@elastic/elasticsearch"],
      "@elastic/elasticsearch should not be present when elasticsearch is not selected"
    );
    ensure(
      !packageJson.dependencies["@nestjs/elasticsearch"],
      "@nestjs/elasticsearch should not be present when elasticsearch is not selected"
    );
  }
}

function verifyAuthVariant(outputRoot, selectionCase) {
  if (!selectionCase.modules.includes("auth")) {
    return;
  }

  const effectiveOptionIds = new Set(
    Array.isArray(selectionCase.selectedOptionIds)
      ? selectionCase.selectedOptionIds
      : []
  );
  const includesRedis = effectiveOptionIds.has("redis");
  const includesSwagger = effectiveOptionIds.has("swagger");

  if (selectionCase.orm === "prisma") {
    const schemaPath = path.join(outputRoot, "prisma", "schema.prisma");
    const schema = fs.readFileSync(schemaPath, "utf8");

    ensure(schema.includes("model User"), "auth scaffold must include User model");

    if (includesRedis) {
      ensure(
        !schema.includes("model RefreshSession"),
        "RefreshSession must not be generated when redis is selected"
      );
      ensure(
        !schema.includes("model RevokedAccessToken"),
        "RevokedAccessToken must not be generated when redis is selected"
      );
    } else {
      ensure(
        schema.includes("model RefreshSession"),
        "RefreshSession must be generated when redis is not selected"
      );
      ensure(
        schema.includes("model RevokedAccessToken"),
        "RevokedAccessToken must be generated when redis is not selected"
      );
    }
  }

  if (selectionCase.orm === "sequelize") {
    const userModelPath = path.join(outputRoot, "src", "database", "models", "user.model.ts");
    const refreshModelPath = path.join(outputRoot, "src", "database", "models", "refresh-session.model.ts");
    const revokedModelPath = path.join(outputRoot, "src", "database", "models", "revoked-access-token.model.ts");
    const sequelizeConfig = fs.readFileSync(
      path.join(outputRoot, "src", "database", "sequelize.config.ts"),
      "utf8"
    );

    ensure(fs.existsSync(userModelPath), "sequelize auth scaffold must include UserModel");
    ensure(
      sequelizeConfig.includes("UserModel"),
      "sequelize auth scaffold must register UserModel"
    );

    if (includesRedis) {
      ensure(
        !fs.existsSync(refreshModelPath),
        "RefreshSessionModel must not be generated when redis is selected"
      );
      ensure(
        !fs.existsSync(revokedModelPath),
        "RevokedAccessTokenModel must not be generated when redis is selected"
      );
    } else {
      ensure(
        fs.existsSync(refreshModelPath),
        "RefreshSessionModel must be generated when redis is not selected"
      );
      ensure(
        fs.existsSync(revokedModelPath),
        "RevokedAccessTokenModel must be generated when redis is not selected"
      );
      ensure(
        sequelizeConfig.includes("RefreshSessionModel") &&
          sequelizeConfig.includes("RevokedAccessTokenModel"),
        "sequelize auth scaffold must register auth session models"
      );
    }
  }

  if (selectionCase.architecture === "standard") {
    const authServicePath = path.join(outputRoot, "src", "auth", "auth.service.ts");
    const authService = fs.readFileSync(authServicePath, "utf8");
    const authControllerPath = path.join(outputRoot, "src", "auth", "auth.controller.ts");
    const authController = fs.readFileSync(authControllerPath, "utf8");
    const authDtoPath = path.join(outputRoot, "src", "auth", "dto", "auth.dto.ts");
    const authDto = fs.readFileSync(authDtoPath, "utf8");

    if (includesRedis) {
      ensure(
        authService.includes("@InjectRedis() private readonly redis: Redis"),
        "standard auth must inject redis when redis is selected"
      );
      ensure(
        !authService.includes("private readonly prisma: PrismaService"),
        "standard auth must not inject prisma when redis is selected"
      );
      ensure(
        !authService.includes("this.prisma.refreshSession"),
        "standard auth must not use prisma refresh sessions when redis is selected"
      );
      if (selectionCase.orm === "sequelize") {
        ensure(
          authService.includes("private readonly usersService: UsersService"),
          "standard sequelize auth must keep user persistence in UsersService when redis is selected"
        );
      }
    } else if (selectionCase.orm === "prisma") {
      ensure(
        !authService.includes("@InjectRedis() private readonly redis: Redis"),
        "standard auth must not inject redis when redis is not selected"
      );
      ensure(
        authService.includes("this.prisma.refreshSession"),
        "standard auth must use prisma refresh sessions when redis is not selected"
      );
    } else {
      ensure(
        authService.includes("private readonly refreshSessions: typeof RefreshSessionModel"),
        "standard sequelize auth must inject refresh session model when redis is not selected"
      );
      ensure(
        authService.includes("this.refreshSessions"),
        "standard sequelize auth must use sequelize refresh sessions when redis is not selected"
      );
    }

    if (includesSwagger) {
      ensure(
        authController.includes('from "@nestjs/swagger"'),
        "standard auth controller must include swagger decorators when swagger is selected"
      );
      ensure(
        authDto.includes('from "@nestjs/swagger"'),
        "standard auth DTO must include swagger decorators when swagger is selected"
      );
    } else {
      ensure(
        !authController.includes('from "@nestjs/swagger"'),
        "standard auth controller must not include swagger decorators when swagger is not selected"
      );
      ensure(
        !authDto.includes('from "@nestjs/swagger"'),
        "standard auth DTO must not include swagger decorators when swagger is not selected"
      );
    }

    return;
  }

  const authBaseDir = path.join(outputRoot, "src", "modules", "auth");
  const authModule = fs.readFileSync(
    path.join(authBaseDir, "auth.module.ts"),
    "utf8"
  );
  const authController = fs.readFileSync(
    path.join(authBaseDir, "presentation", "http", "auth.controller.ts"),
    "utf8"
  );
  const authDto = fs.readFileSync(
    path.join(authBaseDir, "application", "dto", "auth.dto.ts"),
    "utf8"
  );
  const prismaAdapterPath = path.join(
    authBaseDir,
    "infrastructure",
    "cache",
    "prisma-auth-session-store.adapter.ts"
  );
  const redisAdapterPath = path.join(
    authBaseDir,
    "infrastructure",
    "cache",
    "redis-auth-session-store.adapter.ts"
  );

  const sequelizeAdapterPath = path.join(
    authBaseDir,
    "infrastructure",
    "cache",
    "sequelize-auth-session-store.adapter.ts"
  );

  if (includesRedis) {
    ensure(
      !fs.existsSync(prismaAdapterPath),
      `${selectionCase.architecture} auth must not generate prisma adapter when redis is selected`
    );
    ensure(
      !fs.existsSync(sequelizeAdapterPath),
      `${selectionCase.architecture} auth must not generate sequelize adapter when redis is selected`
    );
    ensure(
      fs.existsSync(redisAdapterPath),
      `${selectionCase.architecture} auth must generate redis adapter when redis is selected`
    );
    ensure(
      authModule.includes("useClass: RedisAuthSessionStoreAdapter"),
      `${selectionCase.architecture} auth must wire RedisAuthSessionStoreAdapter when redis is selected`
    );
  } else if (selectionCase.orm === "prisma") {
    ensure(
      fs.existsSync(prismaAdapterPath),
      `${selectionCase.architecture} auth must generate prisma adapter when redis is not selected`
    );
    ensure(
      !fs.existsSync(sequelizeAdapterPath),
      `${selectionCase.architecture} auth must not generate sequelize adapter for prisma auth`
    );
    ensure(
      !fs.existsSync(redisAdapterPath),
      `${selectionCase.architecture} auth must not generate redis adapter when redis is not selected`
    );
    ensure(
      authModule.includes("useClass: PrismaAuthSessionStoreAdapter"),
      `${selectionCase.architecture} auth must wire PrismaAuthSessionStoreAdapter when redis is not selected`
    );
  } else {
    ensure(
      !fs.existsSync(prismaAdapterPath),
      `${selectionCase.architecture} auth must not generate prisma adapter for sequelize auth`
    );
    ensure(
      fs.existsSync(sequelizeAdapterPath),
      `${selectionCase.architecture} auth must generate sequelize adapter when redis is not selected`
    );
    ensure(
      !fs.existsSync(redisAdapterPath),
      `${selectionCase.architecture} auth must not generate redis adapter when redis is not selected`
    );
    ensure(
      authModule.includes("useClass: SequelizeAuthSessionStoreAdapter"),
      `${selectionCase.architecture} auth must wire SequelizeAuthSessionStoreAdapter when redis is not selected`
    );
  }

  if (includesSwagger) {
    ensure(
      authController.includes("from '@nestjs/swagger'"),
      `${selectionCase.architecture} auth controller must include swagger decorators when swagger is selected`
    );
    ensure(
      authDto.includes("from '@nestjs/swagger'"),
      `${selectionCase.architecture} auth DTO must include swagger decorators when swagger is selected`
    );
  } else {
    ensure(
      !authController.includes("from '@nestjs/swagger'"),
      `${selectionCase.architecture} auth controller must not include swagger decorators when swagger is not selected`
    );
    ensure(
      !authDto.includes("from '@nestjs/swagger'"),
      `${selectionCase.architecture} auth DTO must not include swagger decorators when swagger is not selected`
    );
  }
}

async function verifySuccessfulCase(selectionCase, options = {}) {
  const blueprint = createInitBlueprint(createPromptData(selectionCase));
  verifyFeatureDependencies(blueprint, selectionCase);
  verifyOptionalFeatureLeakage(blueprint, selectionCase);
  const effectiveSelectionCase = {
    ...selectionCase,
    selectedOptionIds: blueprint.templateData.selectedOptionIds || [],
  };

  const outputRoot = options.outputDir
    ? path.join(options.outputDir, createCaseId(selectionCase), "project")
    : fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `skelenest-${selectionCase.orm}-${selectionCase.architecture}-`
        )
      );

  try {
    if (options.outputDir) {
      fs.mkdirSync(outputRoot, { recursive: true });
    }

    await copyTemplateTree({
      templateRoots: blueprint.templateRoots,
      outputRoot,
      data: blueprint.templateData,
      slots: blueprint.slots,
    });

    verifyGeneratedTree(outputRoot);
    verifyAuthVariant(outputRoot, effectiveSelectionCase);

    if (options.outputDir) {
      writeArtifactCase(options.outputDir, selectionCase, {
        status: "supported",
        selectedOptionIds: effectiveSelectionCase.selectedOptionIds,
        outputRoot,
      });
    }
  } finally {
    if (!options.outputDir) {
      fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  }
}

async function verifyFailureCase(selectionCase, options = {}) {
  let thrownError = null;

  try {
    createInitBlueprint(createPromptData(selectionCase));
  } catch (error) {
    thrownError = error;
  }

  ensure(
    thrownError instanceof Error,
    `Expected case to fail but it succeeded: ${JSON.stringify(selectionCase)}`
  );
  ensure(
    thrownError.message.includes('does not support ORM'),
    `Unexpected failure reason for ${JSON.stringify(selectionCase)}: ${thrownError.message}`
  );

  if (options.outputDir) {
    writeArtifactCase(options.outputDir, selectionCase, {
      status: "rejected",
      errorMessage: thrownError.message,
    });
  }

  return thrownError.message;
}

async function main() {
  const cliOptions = parseArguments(process.argv.slice(2));
  const cases = createSelectionCases();
  let successCount = 0;
  let failureCount = 0;
  const rejectionReasons = {};
  const samplePaths = [];

  if (cliOptions.outputDir) {
    ensureEmptyDirectory(cliOptions.outputDir);
  }

  for (const selectionCase of cases) {
    if (expectedToSucceed(selectionCase)) {
      await verifySuccessfulCase(selectionCase, cliOptions);
      successCount += 1;

      if (cliOptions.outputDir && samplePaths.length < 12) {
        samplePaths.push(path.join(cliOptions.outputDir, createCaseId(selectionCase)));
      }

      continue;
    }

    const rejectionReason = await verifyFailureCase(selectionCase, cliOptions);
    rejectionReasons[rejectionReason] = (rejectionReasons[rejectionReason] ?? 0) + 1;
    failureCount += 1;

    if (cliOptions.outputDir && samplePaths.length < 12) {
      samplePaths.push(path.join(cliOptions.outputDir, createCaseId(selectionCase)));
    }
  }

  if (cliOptions.outputDir) {
    createSummaryReport(cliOptions.outputDir, {
      supportedCount: successCount,
      rejectedCount: failureCount,
      rejectionReasons,
      samplePaths,
    });
    console.log(`Wrote combination artifacts to ${cliOptions.outputDir}`);
  }

  console.log(
    `Verified ${successCount} supported combinations and ${failureCount} rejected combinations.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
