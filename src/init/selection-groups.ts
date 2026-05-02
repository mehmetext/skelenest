import { SelectionGroupDefinition } from "../core";
import { featureOptions } from "./options/feature.options";
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
    id: "features",
    message: "Select features to include (press Space to toggle):",
    type: "multi",
    required: false,
    options: featureOptions,
    initialValue: [],
  },
];
