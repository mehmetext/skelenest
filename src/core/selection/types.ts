import {
  ScaffoldingContribution,
  SelectionValue,
  SelectionValues,
} from "../blueprints/types";

export interface SelectionResolutionContext<TContext> {
  input: TContext;
  selections: SelectionValues;
  selectedOptionIds: string[];
  has(optionId: string): boolean;
}

export interface TechnologyOption<TContext> {
  id: string;
  label: string;
  description?: string;
  requires?: string[];
  conflictsWith?: string[];
  contribute(context: SelectionResolutionContext<TContext>): ScaffoldingContribution;
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
