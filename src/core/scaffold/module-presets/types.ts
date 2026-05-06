import { ScaffoldingContribution } from "../../blueprints/types";
import { SelectionResolutionContext } from "../../selection/types";

export type ArchitectureId = "standard" | "clean" | "ddd";
export type ModulePresetId = "ai" | "auth" | "users";
export type OrmId = "prisma" | "typeorm" | "sequelize" | "none";

export interface ModulePresetDefinition<TContext> {
  id: ModulePresetId;
  label: string;
  supportedArchitectures: readonly ArchitectureId[];
  supportedOrms: readonly OrmId[];
  resolveContribution(input: {
    architecture: ArchitectureId;
    context: SelectionResolutionContext<TContext>;
  }): ScaffoldingContribution;
}
