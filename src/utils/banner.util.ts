import chalk from "chalk";
import figlet from "figlet";

export const BANNER_TEXT = "skelenest";
export const BANNER_FONT = "ANSI Shadow";

export function printBanner(): void {
  const rendered = figlet.textSync(BANNER_TEXT, {
    font: BANNER_FONT,
  });
  process.stdout.write(`${chalk.cyanBright(rendered)}\n`);
}

export function shouldPrintBanner(argv: string[]): boolean {
  return !(argv.includes("doctor") && argv.includes("--json"));
}
