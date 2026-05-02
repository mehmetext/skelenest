import { SelectionGroupDefinition } from "../core";
import { architectureOptions } from "./options/architecture.options";
import { featureOptions } from "./options/feature.options";
import { moduleOptions } from "./options/module.options";
import { ormOptions } from "./options/orm.options";
import { InitPromptData } from "./types";

export const initSelectionGroups: SelectionGroupDefinition<InitPromptData>[] = [
  {
    id: "orm",
    message: "Which ORM do you want to use?",
    type: "single",
    allowNone: true,
    noneOptionLabel: "None",
    options: ormOptions,
    initialValue: "none",
  },
  {
    id: "architecture",
    message: "Which architecture style do you want to use?",
    type: "single",
    options: architectureOptions,
    initialValue: "standard",
  },
  {
    id: "features",
    message: "Select features to include (press Space to toggle):",
    type: "multi",
    required: false,
    options: featureOptions,
    initialValue: [],
  },
  {
    id: "modules",
    message: "Select starter modules to include (press Space to toggle):",
    type: "multi",
    required: false,
    options: moduleOptions,
    initialValue: [],
  },
];
