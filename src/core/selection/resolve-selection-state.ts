import { SelectionValues } from "../blueprints/types";
import {
  SelectionGroupDefinition,
  SelectionResolutionContext,
  TechnologyOption,
} from "./types";

export interface SelectedTechnology<TContext> {
  groupId: string;
  option: TechnologyOption<TContext>;
}

export interface ResolvedSelectionState<TContext> {
  selections: SelectionValues;
  selectedOptionIds: string[];
  selectedTechnologies: SelectedTechnology<TContext>[];
  createContext(input: TContext): SelectionResolutionContext<TContext>;
}

export interface ResolveSelectionStateOptions<TContext> {
  selectionGroups: SelectionGroupDefinition<TContext>[];
  selections: SelectionValues;
}

function getExplicitSelectionIds(
  selectionGroups: SelectionGroupDefinition<unknown>[],
  selections: SelectionValues
): string[] {
  return selectionGroups.flatMap((group) => {
    const rawValue = selections[group.id];
    const selectedIds = Array.isArray(rawValue)
      ? rawValue
      : rawValue
      ? [rawValue]
      : [];

    return selectedIds.filter((selectedId) => selectedId !== "none");
  });
}

export function resolveSelectionState<TContext>(
  options: ResolveSelectionStateOptions<TContext>
): ResolvedSelectionState<TContext> {
  const { selectionGroups, selections } = options;

  const optionEntries = selectionGroups.flatMap((group) =>
    group.options.map((option) => ({
      groupId: group.id,
      option,
    }))
  );

  const optionMap = new Map(
    optionEntries.map((entry) => [entry.option.id, entry] as const)
  );

  const resolvedIds = new Set<string>();
  const visitingIds = new Set<string>();

  function visit(optionId: string): void {
    if (resolvedIds.has(optionId)) {
      return;
    }

    if (visitingIds.has(optionId)) {
      throw new Error(`Circular technology dependency detected for "${optionId}".`);
    }

    const entry = optionMap.get(optionId);
    if (!entry) {
      throw new Error(`Unknown technology option: "${optionId}".`);
    }

    visitingIds.add(optionId);

    for (const dependencyId of entry.option.requires ?? []) {
      visit(dependencyId);
    }

    visitingIds.delete(optionId);
    resolvedIds.add(optionId);
  }

  for (const selectedId of getExplicitSelectionIds(selectionGroups, selections)) {
    visit(selectedId);
  }

  const selectedTechnologies = optionEntries.filter((entry) =>
    resolvedIds.has(entry.option.id)
  );

  for (const entry of selectedTechnologies) {
    for (const conflictId of entry.option.conflictsWith ?? []) {
      if (resolvedIds.has(conflictId)) {
        throw new Error(
          `Technology conflict detected: "${entry.option.id}" cannot be used with "${conflictId}".`
        );
      }
    }
  }

  const selectedOptionIds = selectedTechnologies.map((entry) => entry.option.id);

  return {
    selections,
    selectedOptionIds,
    selectedTechnologies,
    createContext(input) {
      return {
        input,
        selections,
        selectedOptionIds,
        has(optionId) {
          return resolvedIds.has(optionId);
        },
      };
    },
  };
}
