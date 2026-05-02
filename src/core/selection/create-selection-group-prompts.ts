import { isCancel, multiselect, select } from "@clack/prompts";
import { SelectionGroupDefinition } from "./types";

async function renderSelectionGroup<TContext>(
  selectionGroup: SelectionGroupDefinition<TContext>
): Promise<string | string[]> {
  const options = [
    ...(selectionGroup.allowNone
      ? [
          {
            value: "none",
            label: selectionGroup.noneOptionLabel ?? "None",
          },
        ]
      : []),
    ...selectionGroup.options.map((option) => ({
      value: option.id,
      label: option.label,
      hint: option.description,
    })),
  ];

  if (selectionGroup.type === "multi") {
    const selection = await multiselect({
      message: selectionGroup.message,
      initialValues: Array.isArray(selectionGroup.initialValue)
        ? selectionGroup.initialValue
        : undefined,
      options,
    });

    return isCancel(selection) ? [] : selection;
  }

  const selection = await select({
    message: selectionGroup.message,
    initialValue:
      typeof selectionGroup.initialValue === "string"
        ? selectionGroup.initialValue
        : undefined,
    options,
  });

  return isCancel(selection) ? "none" : selection;
}

export function createSelectionGroupPrompts<TContext>(
  selectionGroups: SelectionGroupDefinition<TContext>[]
): Record<string, () => Promise<string | string[]>> {
  return Object.fromEntries(
    selectionGroups.map((selectionGroup) => [
      selectionGroup.id,
      () => renderSelectionGroup(selectionGroup),
    ])
  );
}
