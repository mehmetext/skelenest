import { TechnologyOption } from "../../core";
import { InitPromptData } from "../types";

export const architectureOptions: TechnologyOption<InitPromptData>[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Classic NestJS modules with a simple controller/service structure",
    contribute: () => ({}),
  },
  {
    id: "clean",
    label: "Clean Architecture",
    description: "Separates presentation, application, and infrastructure layers",
    contribute: () => ({}),
  },
  {
    id: "ddd",
    label: "DDD + Clean",
    description:
      "Adds domain-driven structure with domain, application, and presentation layers",
    contribute: () => ({}),
  },
];
