import { TechnologyOption } from "../../core";
import { resolveModulePresetContribution } from "../../core/scaffold/module-presets";
import { InitPromptData } from "../types";

export const moduleOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "ai",
    label: "Starter AI Module",
    description:
      "Adds a reusable AI module scaffold with provider selection support",
    contribute: (context) =>
      resolveModulePresetContribution({
        presetId: "ai",
        context,
      }),
  },
  {
    id: "auth",
    label: "Auth Starter Module",
    description:
      "Adds an auth module scaffold tailored to the selected architecture",
    supportedOrms: ["prisma", "typeorm", "sequelize"],
    contribute: (context) =>
      resolveModulePresetContribution({
        presetId: "auth",
        context,
      }),
  },
];
