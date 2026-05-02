import { TechnologyOption } from "../../core";
import { resolveModulePresetContribution } from "../../core/scaffold/module-presets";
import { InitPromptData } from "../types";

export const moduleOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "auth",
    label: "Auth Starter Module",
    description:
      "Adds an auth module scaffold tailored to the selected architecture",
    supportedOrms: ["prisma"],
    contribute: (context) =>
      resolveModulePresetContribution({
        presetId: "auth",
        context,
      }),
  },
];
