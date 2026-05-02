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

    this.option("--json", "Print doctor findings as JSON");
    this.option(
      "--fail-on-warn",
      "Return a failing exit code when warnings are present"
    );
  }

  async execute(): Promise<void> {
    const options = this.opts<{ json?: boolean; failOnWarn?: boolean }>();
    const { findings, summary, hasErrors } = await runDoctor(process.cwd());

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            findings,
            summary,
            hasErrors,
          },
          null,
          2
        )
      );

      if (hasErrors || (options.failOnWarn && summary.warn > 0)) {
        process.exitCode = 1;
      }
      return;
    }

    const ordered = [
      ...findings.filter((finding) => finding.severity === "error"),
      ...findings.filter((finding) => finding.severity === "warn"),
      ...findings.filter((finding) => finding.severity === "ok"),
    ];

    for (const finding of ordered) {
      console.log(`${renderSeverity(finding.severity)} ${finding.title}`);
      console.log(`  ${finding.detail}`);
    }

    console.log("");
    console.log(
      [
        chalk.cyan("Doctor summary"),
        `ok=${summary.ok}`,
        `warn=${summary.warn}`,
        `error=${summary.error}`,
      ].join(" | ")
    );

    if (hasErrors || (options.failOnWarn && summary.warn > 0)) {
      process.exitCode = 1;
    }
  }
}
