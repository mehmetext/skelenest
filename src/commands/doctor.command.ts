import chalk from "chalk";
import { runDoctor } from "../doctor/run-doctor";
import { BaseCommand } from "./base.command";

function renderSeverity(severity: "ok" | "warn" | "error"): string {
  if (severity === "ok") {
    return chalk.green("[OK]");
  }

  if (severity === "warn") {
    return chalk.yellow("[WARN]");
  }

  return chalk.red("[ERROR]");
}

export class DoctorCommand extends BaseCommand {
  constructor() {
    super({
      name: "doctor",
      description: "Inspect a generated Skelenest project and report configuration issues",
    });
  }

  async execute(): Promise<void> {
    const { findings, hasErrors } = await runDoctor(process.cwd());
    const ordered = [
      ...findings.filter((finding) => finding.severity === "error"),
      ...findings.filter((finding) => finding.severity === "warn"),
      ...findings.filter((finding) => finding.severity === "ok"),
    ];

    for (const finding of ordered) {
      console.log(`${renderSeverity(finding.severity)} ${finding.title}`);
      console.log(`  ${finding.detail}`);
    }

    const okCount = findings.filter((finding) => finding.severity === "ok").length;
    const warnCount = findings.filter((finding) => finding.severity === "warn").length;
    const errorCount = findings.filter((finding) => finding.severity === "error").length;

    console.log("");
    console.log(
      [
        chalk.cyan("Doctor summary"),
        `ok=${okCount}`,
        `warn=${warnCount}`,
        `error=${errorCount}`,
      ].join(" | ")
    );

    if (hasErrors) {
      process.exitCode = 1;
    }
  }
}
