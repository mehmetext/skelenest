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
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
}

async function main() {
  await verifyDoctorJsonOutput();
  await verifyGenerateCommands();
  console.log("Verified doctor JSON output and generate command workflows.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
