#!/usr/bin/env node
import { Command } from "commander";
import { InitCommand } from "../src/commands";
import { printBanner } from "../src/utils/banner.util";

const program = new Command();

printBanner();

program
  .name("skelenest")
  .description("Opinionated scaffolding tool for NestJS projects")
  .version("1.0.0");

program.addCommand(new InitCommand());

program.action(() => {
  program.help();
});

program.parse(process.argv);
