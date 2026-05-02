import { ScaffoldingContribution } from "../blueprints/types";
import { ResolvedSelectionState } from "./resolve-selection-state";
import { SelectionGroupDefinition } from "./types";

export interface ResolveSelectedContributionsOptions<TContext> {
  selectionGroups: SelectionGroupDefinition<TContext>[];
  selectionState: ResolvedSelectionState<TContext>;
  context: TContext;
}

export function resolveSelectedContributions<TContext>(
  options: ResolveSelectedContributionsOptions<TContext>
): ScaffoldingContribution[] {
  const { context, selectionState } = options;
  const contributionContext = selectionState.createContext(context);

  return selectionState.selectedTechnologies.map(({ option }) =>
    option.contribute(contributionContext)
  );
}
