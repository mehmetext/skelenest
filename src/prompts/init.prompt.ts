import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import chalk from "chalk";
import { PackageManager, packageManagers } from "../data";
import {
  initSelectionGroups,
  InitPromptData,
  InitPromptOverrides,
} from "../init";
import { BasePrompt } from "./base.prompt";

function findGroup(groupId: string) {
  const group = initSelectionGroups.find((entry) => entry.id === groupId);

  if (!group) {
    throw new Error(`Init selection group "${groupId}" is not configured.`);
  }

  return group;
}

function normalizeTextValue(
  value: string | undefined,
  label: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }

  return trimmed;
}

function normalizePackageManager(
  value: string | undefined
): PackageManager["id"] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase() as PackageManager["id"];

  if (!packageManagers.some((entry) => entry.id === normalized)) {
    throw new Error(
      `Unsupported package manager "${value}". Expected one of: ${packageManagers
        .map((entry) => entry.id)
        .join(", ")}.`
    );
  }

  return normalized;
}

function normalizeSingleSelection(
  groupId: string,
  value: string | undefined
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const group = findGroup(groupId);
  const normalized = value.trim().toLowerCase();
  const allowedIds = [
    ...(group.allowNone ? ["none"] : []),
    ...group.options.map((option) => option.id),
  ];

  if (!allowedIds.includes(normalized)) {
    throw new Error(
      `Unsupported ${groupId} "${value}". Expected one of: ${allowedIds.join(", ")}.`
    );
  }

  return normalized;
}

function singularizeGroupLabel(groupId: string): string {
  return groupId.endsWith("s") ? groupId.slice(0, -1) : groupId;
}

function normalizeMultiSelection(
  groupId: string,
  values: string[] | undefined
): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  const group = findGroup(groupId);
  const allowedIds = new Set(group.options.map((option) => option.id));
  const normalizedValues = Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))
  );

  for (const value of normalizedValues) {
    if (!allowedIds.has(value)) {
      throw new Error(
        `Unsupported ${singularizeGroupLabel(groupId)} "${value}" in --${groupId}. Expected one of: ${Array.from(
          allowedIds
        ).join(", ")}.`
      );
    }
  }

  return normalizedValues;
}

function validateModuleSupport(orm: string, modules: string[]): void {
  const modulesGroup = findGroup("modules");

  for (const moduleId of modules) {
    const option = modulesGroup.options.find((entry) => entry.id === moduleId);

    if (!option) {
      continue;
    }

    if (option.supportedOrms && !option.supportedOrms.includes(orm)) {
      throw new Error(
        `Starter module "${moduleId}" supports only: ${option.supportedOrms.join(
          ", "
        )}. Current ORM: ${orm}.`
      );
    }
  }
}

export class InitPrompt extends BasePrompt<InitPromptData> {
  constructor() {
    super();
  }

  async execute(overrides: InitPromptOverrides = {}): Promise<InitPromptData> {
    intro(chalk.bgCyanBright.white(" skelenest "));

    const onCancel = () => {
      cancel(chalk.red("Operation cancelled."));
      process.exit(0);
    };

    const ormGroup = findGroup("orm");
    const architectureGroup = findGroup("architecture");
    const featuresGroup = findGroup("features");
    const modulesGroup = findGroup("modules");

    const initialName = normalizeTextValue(overrides.name, "Project name");
    const initialPort = normalizeTextValue(overrides.port, "Port");
    const initialPackageManager = normalizePackageManager(
      overrides.packageManager
    );
    const initialOrm = normalizeSingleSelection(
      "orm",
      typeof overrides.selections?.orm === "string"
        ? overrides.selections.orm
        : undefined
    );
    const initialArchitecture = normalizeSingleSelection(
      "architecture",
      typeof overrides.selections?.architecture === "string"
        ? overrides.selections.architecture
        : undefined
    );
    const initialFeatures = normalizeMultiSelection(
      "features",
      Array.isArray(overrides.selections?.features)
        ? overrides.selections.features.map(String)
        : undefined
    );
    const initialModules = normalizeMultiSelection(
      "modules",
      Array.isArray(overrides.selections?.modules)
        ? overrides.selections.modules.map(String)
        : undefined
    );

    const name =
      initialName ??
      ((await text({
        message: "What is the project name?",
        placeholder: "my-skelenest-app",
        validate(value) {
          if (value?.length === 0) return "Project name cannot be empty.";
        },
        defaultValue: "my-skelenest-app",
      })) as string);
    if (isCancel(name)) onCancel();

    const port =
      initialPort ??
      ((await text({
        message: "What is the port number?",
        defaultValue: "3000",
        placeholder: "3000",
      })) as string);
    if (isCancel(port)) onCancel();

    const packageManager =
      initialPackageManager ??
      ((await select({
        message: "Which package manager do you want to use?",
        options: packageManagers.map((pm) => ({
          value: pm.id,
          label: pm.name,
        })),
      })) as PackageManager["id"]);
    if (isCancel(packageManager)) onCancel();

    const orm =
      initialOrm ??
      ((await select({
        message: ormGroup.message,
        initialValue:
          typeof ormGroup.initialValue === "string"
            ? ormGroup.initialValue
            : undefined,
        options: [
          ...(ormGroup.allowNone
            ? [
                {
                  value: "none",
                  label: ormGroup.noneOptionLabel ?? "None",
                },
              ]
            : []),
          ...ormGroup.options.map((option) => ({
            value: option.id,
            label: option.label,
            hint: option.description,
          })),
        ],
      })) as string);
    if (isCancel(orm)) onCancel();

    const architecture =
      initialArchitecture ??
      ((await select({
        message: architectureGroup.message,
        initialValue:
          typeof architectureGroup.initialValue === "string"
            ? architectureGroup.initialValue
            : undefined,
        options: architectureGroup.options.map((option) => ({
          value: option.id,
          label: option.label,
          hint: option.description,
        })),
      })) as string);
    if (isCancel(architecture)) onCancel();

    const features =
      initialFeatures ??
      ((await multiselect({
        message: featuresGroup.message,
        required: featuresGroup.required ?? true,
        initialValues: Array.isArray(featuresGroup.initialValue)
          ? featuresGroup.initialValue
          : undefined,
        options: featuresGroup.options.map((option) => ({
          value: option.id,
          label: option.label,
          hint: option.description,
        })),
      })) as string[]);
    if (isCancel(features)) onCancel();

    if (initialModules) {
      validateModuleSupport(orm, initialModules);
    }

    const modules =
      initialModules ??
      ((await multiselect({
        message: modulesGroup.message,
        required: modulesGroup.required ?? true,
        initialValues: Array.isArray(modulesGroup.initialValue)
          ? modulesGroup.initialValue
          : undefined,
        options: modulesGroup.options.map((option) => {
          const isSupported =
            !option.supportedOrms || option.supportedOrms.includes(orm);

          return {
            value: option.id,
            label: option.label,
            hint: isSupported
              ? option.description
              : `Currently supported only with ${option.supportedOrms?.join(", ")}`,
            disabled: !isSupported,
          };
        }),
      })) as string[]);
    if (isCancel(modules)) onCancel();

    validateModuleSupport(orm, modules);

    const installDependencies =
      overrides.installDependencies ??
      ((await confirm({
        message: "Do you want to install dependencies?",
        initialValue: true,
      })) as boolean);
    if (isCancel(installDependencies)) onCancel();

    const initializeGit =
      overrides.initializeGit ??
      ((await confirm({
        message: "Do you want to initialize git and create the first commit?",
        initialValue: true,
      })) as boolean);
    if (isCancel(initializeGit)) onCancel();

    return {
      name,
      port,
      packageManager,
      installDependencies,
      initializeGit,
      selections: {
        orm,
        architecture,
        features,
        modules,
      },
    };
  }
}
