import { SelectionGroupDefinition } from "../core";
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
];
