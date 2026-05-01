import { Command } from "commander";

const program = new Command();

program
  .name("skelenest")
  .description("Opinionated scaffolding tool for NestJS projects")
  .version("1.0.0");

// todo: register commands

program.parse(process.argv);
