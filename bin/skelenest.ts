#!/usr/bin/env node
import { Command } from "commander";
import { DoctorCommand, GenerateCommand, InitCommand } from "../src/commands";
import { getCliVersion, printBanner, shouldPrintBanner } from "../src/utils";

const program = new Command();

if (shouldPrintBanner(process.argv.slice(2))) {
  printBanner();
}

program
  .name("skelenest")
  .description("Opinionated scaffolding tool for NestJS projects")
  .version(getCliVersion());

program.addCommand(new InitCommand());
program.addCommand(new GenerateCommand());
program.addCommand(new DoctorCommand());

program.action(() => {
  program.help();
});

program.parse(process.argv);
