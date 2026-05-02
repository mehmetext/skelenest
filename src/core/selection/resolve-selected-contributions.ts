import { ScaffoldingContribution, SelectionValues } from "../blueprints/types";
import { SelectionGroupDefinition } from "./types";

export interface ResolveSelectedContributionsOptions<TContext> {
  context: TContext;
  selectionGroups: SelectionGroupDefinition<TContext>[];
  selections: SelectionValues;
}

export function resolveSelectedContributions<TContext>(
  options: ResolveSelectedContributionsOptions<TContext>
): ScaffoldingContribution[] {
  const { context, selectionGroups, selections } = options;

  return selectionGroups.flatMap((group) => {
    const rawValue = selections[group.id];
    const selectedIds = Array.isArray(rawValue)
      ? rawValue
      : rawValue
      ? [rawValue]
      : [];

    return selectedIds
      .map((selectedId) => group.options.find((option) => option.id === selectedId))
      .filter((option): option is NonNullable<typeof option> => Boolean(option))
      .map((option) => option.contribute(context));
  });
}
