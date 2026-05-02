import { ScaffoldingContribution } from "../../blueprints/types";
import { SelectionResolutionContext } from "../../selection/types";
import { InitPromptData } from "../../../init/types";
import { modulePresetRegistry } from "./registry";
import { ArchitectureId, ModulePresetId, OrmId } from "./types";

function readArchitecture(
  context: SelectionResolutionContext<InitPromptData>
): ArchitectureId {
  const selectedArchitecture = context.selections.architecture;

  if (
    selectedArchitecture === "standard" ||
    selectedArchitecture === "clean" ||
    selectedArchitecture === "ddd"
  ) {
    return selectedArchitecture;
  }

  throw new Error("A valid architecture selection is required.");
}

function readOrm(context: SelectionResolutionContext<InitPromptData>): OrmId {
  const selectedOrm = context.selections.orm;

  if (
    selectedOrm === "prisma" ||
    selectedOrm === "typeorm" ||
    selectedOrm === "sequelize" ||
    selectedOrm === "none"
  ) {
    return selectedOrm;
  }

  throw new Error("A valid ORM selection is required.");
}

export function resolveModulePresetContribution(input: {
  presetId: ModulePresetId;
  context: SelectionResolutionContext<InitPromptData>;
}): ScaffoldingContribution {
  const { presetId, context } = input;
  const preset = modulePresetRegistry[presetId as ModulePresetId];

  if (!preset) {
    throw new Error(`Unknown module preset: "${presetId}".`);
  }

  const architecture = readArchitecture(context);
  const orm = readOrm(context);

  if (!preset.supportedArchitectures.includes(architecture)) {
    throw new Error(
      `Module preset "${presetId}" does not support architecture "${architecture}".`
    );
  }

  if (!preset.supportedOrms.includes(orm)) {
    throw new Error(
      `Module preset "${presetId}" does not support ORM "${orm}".`
    );
  }

  return preset.resolveContribution({
    architecture,
    context,
  });
}
