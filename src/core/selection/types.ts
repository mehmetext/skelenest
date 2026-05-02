import { ScaffoldingContribution, SelectionValue } from "../blueprints/types";

export interface TechnologyOption<TContext> {
  id: string;
  label: string;
  description?: string;
  contribute(context: TContext): ScaffoldingContribution;
}

export interface SelectionGroupDefinition<TContext> {
  id: string;
  message: string;
  type: "single" | "multi";
  options: TechnologyOption<TContext>[];
  allowNone?: boolean;
  noneOptionLabel?: string;
  initialValue?: SelectionValue;
}
