const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createInitBlueprint } = require("../dist/src/init/index.js");
const { copyTemplateTree } = require("../dist/src/utils/template.util.js");

const cliPath = path.resolve(__dirname, "../dist/bin/skelenest.js");

function ensure(condition, message) {
  assert.ok(condition, message);
}

function runCli(cwd, args) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function verifyDoctorJsonOutput() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "skelenest-doctor-"));

  try {
    const blueprint = createInitBlueprint({
      name: "doctor-app",
      port: "3000",
      packageManager: "pnpm",
      installDependencies: false,
      initializeGit: false,
      selections: {
        orm: "prisma",
        architecture: "clean",
        features: ["docker", "swagger", "bullmq", "throttler"],
        modules: ["auth"],
      },
    });

    await copyTemplateTree({
      templateRoots: blueprint.templateRoots,
      outputRoot: projectDir,
      data: blueprint.templateData,
      slots: blueprint.slots,
    });

    const stdout = runCli(projectDir, ["doctor", "--json"]);
    const report = JSON.parse(stdout);

    ensure(report.hasErrors === false, "doctor should not report errors");
    ensure(report.summary.warn === 1, `expected exactly one warning for missing lockfile, received ${report.summary.warn}`);
    ensure(
      report.findings.some(
        (finding) =>
          finding.title === "packageManager field found" &&
          finding.detail.includes("pnpm@10.28.0")
      ),
      "doctor report should confirm generated packageManager metadata"
    );
    ensure(
      !stdout.includes("███████"),
      "doctor --json output must not include the CLI banner"
    );
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
}

async function verifyGenerateCommands() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "skelenest-generate-"));
  const sequelizeProjectDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "skelenest-generate-sequelize-")
  );

  try {
    const blueprint = createInitBlueprint({
      name: "generate-app",
      port: "3000",
      packageManager: "pnpm",
      installDependencies: false,
      initializeGit: false,
      selections: {
        orm: "none",
        architecture: "standard",
        features: ["swagger"],
        modules: [],
      },
    });

    await copyTemplateTree({
      templateRoots: blueprint.templateRoots,
      outputRoot: projectDir,
      data: blueprint.templateData,
      slots: blueprint.slots,
    });

    runCli(projectDir, ["generate", "module", "health-check"]);
    runCli(projectDir, ["generate", "resource", "products"]);
    runCli(projectDir, ["generate", "dto", "products", "filter-products"]);
    runCli(projectDir, ["generate", "use-case", "products", "sync-products"]);

    ensure(
      fs.existsSync(path.join(projectDir, "src", "health-check", "health-check.module.ts")),
      "module generation should create the standard module file"
    );
    ensure(
      fs.existsSync(path.join(projectDir, "src", "products", "products.controller.ts")),
      "resource generation should create the controller file"
    );
    ensure(
      fs.existsSync(path.join(projectDir, "src", "products", "dto", "filter-products.dto.ts")),
      "dto generation should create the DTO file"
    );
    ensure(
      fs.existsSync(path.join(projectDir, "src", "products", "use-cases", "sync-products.use-case.ts")),
      "use-case generation should create the use case file"
    );

    const moduleFile = fs.readFileSync(
      path.join(projectDir, "src", "products", "products.module.ts"),
      "utf8"
    );

    ensure(
      moduleFile.includes("import { SyncProductsUseCase } from './use-cases/sync-products.use-case';"),
      "use-case generation should add the import to the module file"
    );
    ensure(
      moduleFile.includes("SyncProductsUseCase"),
      "use-case generation should register the provider in the module file"
    );

    const sequelizeBlueprint = createInitBlueprint({
      name: "sequelize-generate-app",
      port: "3000",
      packageManager: "pnpm",
      installDependencies: false,
      initializeGit: false,
      selections: {
        orm: "sequelize",
        architecture: "standard",
        features: [],
        modules: [],
      },
    });

    await copyTemplateTree({
      templateRoots: sequelizeBlueprint.templateRoots,
      outputRoot: sequelizeProjectDir,
      data: sequelizeBlueprint.templateData,
      slots: sequelizeBlueprint.slots,
    });

    runCli(sequelizeProjectDir, ["generate", "resource", "orders"]);

    const sequelizeModelFile = fs.readFileSync(
      path.join(sequelizeProjectDir, "src", "database", "models", "order.model.ts"),
      "utf8"
    );

    ensure(
      sequelizeModelFile.includes("InferCreationAttributes<OrderModel>"),
      "sequelize resource models should infer creation attributes for Model.create"
    );
    ensure(
      sequelizeModelFile.includes("declare id: CreationOptional<number>"),
      "sequelize resource primary keys should be optional on create"
    );
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(sequelizeProjectDir, { recursive: true, force: true });
  }
}

function verifyNonInteractiveInit() {
  const workspaceDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "skelenest-init-flags-")
  );

  try {
    runCli(workspaceDir, [
      "init",
      "--name",
      "flag-app",
      "--port",
      "4100",
      "--package-manager",
      "pnpm",
      "--orm",
      "prisma",
      "--architecture",
      "clean",
      "--features",
      "swagger,bullmq",
      "--modules",
      "auth",
      "--no-install",
      "--no-git",
    ]);

    const projectDir = path.join(workspaceDir, "flag-app");
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf8")
    );
    const projectMetadata = JSON.parse(
      fs.readFileSync(
        path.join(projectDir, ".skelenest", "project.json"),
        "utf8"
      )
    );
    const envFile = fs.readFileSync(path.join(projectDir, ".env"), "utf8");

    ensure(
      fs.existsSync(path.join(projectDir, ".skelenest", "project.json")),
      "non-interactive init should create project metadata"
    );
    ensure(
      packageJson.packageManager === "pnpm@10.28.0",
      "non-interactive init should persist the selected package manager"
    );
    ensure(
      projectMetadata.architecture === "clean" &&
        projectMetadata.orm === "prisma",
      "non-interactive init should persist selected architecture and ORM"
    );
    ensure(
      projectMetadata.features.includes("bullmq") &&
        projectMetadata.modules.includes("auth"),
      "non-interactive init should persist selected features and modules"
    );
    ensure(
      envFile.includes('PORT="4100"') || envFile.includes("PORT=4100"),
      "non-interactive init should persist the selected port"
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

async function main() {
  await verifyDoctorJsonOutput();
  await verifyGenerateCommands();
  verifyNonInteractiveInit();
  console.log(
    "Verified doctor JSON output, generate command workflows, and non-interactive init."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
