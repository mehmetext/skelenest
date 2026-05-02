#!/usr/bin/env node
import { Command } from "commander";
import { DoctorCommand, GenerateCommand, InitCommand } from "../src/commands";
import { printBanner } from "../src/utils";

const program = new Command();

printBanner();

program
  .name("skelenest")
  .description("Opinionated scaffolding tool for NestJS projects")
  .version("1.0.0");

program.addCommand(new InitCommand());
program.addCommand(new GenerateCommand());
program.addCommand(new DoctorCommand());

program.action(() => {
  program.help();
});

program.parse(process.argv);
