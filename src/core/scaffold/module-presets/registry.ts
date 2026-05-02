import { InitPromptData } from "../../../init/types";
import { authModulePreset } from "./auth.module-preset";
import { usersModulePreset } from "./users.module-preset";
import { ModulePresetDefinition, ModulePresetId } from "./types";

export const modulePresetRegistry: Record<
  ModulePresetId,
  ModulePresetDefinition<InitPromptData>
> = {
  auth: authModulePreset,
  users: usersModulePreset,
};
