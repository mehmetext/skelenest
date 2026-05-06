import { aiModulePreset } from "./ai.module-preset";
import { InitPromptData } from "../../../init/types";
import { authModulePreset } from "./auth.module-preset";
import { usersModulePreset } from "./users.module-preset";
import { ModulePresetDefinition, ModulePresetId } from "./types";

export const modulePresetRegistry: Record<
  ModulePresetId,
  ModulePresetDefinition<InitPromptData>
> = {
  ai: aiModulePreset,
  auth: authModulePreset,
  users: usersModulePreset,
};
