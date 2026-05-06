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
import process from "node:process";
import { PackageManager, packageManagers } from "../data";
import { ApiTransport } from "../generate/types";
import {
  initSelectionGroups,
  AiProviderOption,
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

  if (normalizedValues.length === 1 && normalizedValues[0] === "none") {
    return [];
  }

  for (const value of normalizedValues) {
    if (!allowedIds.has(value)) {
      throw new Error(
        `Unsupported ${singularizeGroupLabel(groupId)} "${value}" in --${groupId}. Expected one of: ${Array.from(
          allowedIds
        ).join(", ")}.`
      );
    }
  }

  return normalizedValues.filter(isApiTransport);
}

function isApiTransport(value: string): value is ApiTransport {
  return value === "rest" || value === "graphql";
}

function normalizeApiTransports(
  values: string[] | undefined
): ApiTransport[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  const normalizedValues = Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))
  );

  if (normalizedValues.length === 0) {
    throw new Error("At least one API transport must be selected.");
  }

  for (const value of normalizedValues) {
    if (!isApiTransport(value)) {
      throw new Error(
        `Unsupported API transport "${value}". Expected one of: rest, graphql.`
      );
    }
  }

  return normalizedValues as ApiTransport[];
}

function validateFeatureSupport(
  apiTransports: ApiTransport[],
  features: string[]
): void {
  if (features.includes("swagger") && !apiTransports.includes("rest")) {
    throw new Error('Feature "swagger" requires the REST transport.');
  }
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

function validateModuleArchitectureSupport(
  architecture: string,
  modules: string[]
): void {
  const modulesGroup = findGroup("modules");

  for (const moduleId of modules) {
    const option = modulesGroup.options.find((entry) => entry.id === moduleId);

    if (!option) {
      continue;
    }

    if (
      option.supportedArchitectures &&
      !option.supportedArchitectures.includes(architecture)
    ) {
      throw new Error(
        `Starter module "${moduleId}" supports only: ${option.supportedArchitectures.join(
          ", "
        )}. Current architecture: ${architecture}.`
      );
    }
  }
}

function normalizeAiProviders(
  values: string[] | undefined
): AiProviderOption[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  const allowedValues: AiProviderOption[] = ["openrouter", "google", "openai"];
  const normalizedValues = Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))
  );

  if (normalizedValues.length === 0) {
    throw new Error("At least one AI provider must be selected.");
  }

  for (const value of normalizedValues) {
    if (!allowedValues.includes(value as AiProviderOption)) {
      throw new Error(
        `Unsupported AI provider "${value}". Expected one of: ${allowedValues.join(
          ", "
        )}.`
      );
    }
  }

  return normalizedValues as AiProviderOption[];
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
    const overrideFeatureValues = Array.isArray(overrides.selections?.features)
      ? overrides.selections.features.map(String)
      : undefined;
    const overrideModuleValues = Array.isArray(overrides.selections?.modules)
      ? overrides.selections.modules.map(String)
      : undefined;

    const initialName = normalizeTextValue(overrides.name, "Project name");
    const initialPort = normalizeTextValue(overrides.port, "Port");
    const initialPackageManager = normalizePackageManager(
      overrides.packageManager
    );
    const initialApiTransports =
      normalizeApiTransports(overrides.apiTransports) ??
      normalizeApiTransports(
        Array.isArray(overrides.selections?.apiTransports)
          ? overrides.selections.apiTransports.map(String)
          : undefined
      ) ??
      (!process.stdin.isTTY ? ["rest"] : undefined);
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
      overrideFeatureValues
    );
    const initialModules = normalizeMultiSelection(
      "modules",
      overrideModuleValues
    );
    const initialAiProviders = normalizeAiProviders(
      overrides.starterModuleProviders?.ai
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

    const apiTransports =
      initialApiTransports ??
      ((await multiselect({
        message: "Which API transports should this project support?",
        required: true,
        initialValues: ["rest"],
        options: [
          {
            value: "rest",
            label: "REST",
            hint: "Controllers, HTTP routes, and Swagger support",
          },
          {
            value: "graphql",
            label: "GraphQL",
            hint: "Resolvers with Nest GraphQL code-first support",
          },
        ],
      })) as ApiTransport[]);
    if (isCancel(apiTransports)) onCancel();

    if (apiTransports.length === 0) {
      throw new Error("At least one API transport must be selected.");
    }

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
        options: featuresGroup.options.map((option) => {
          const isSupported =
            option.id !== "swagger" || apiTransports.includes("rest");

          return {
            value: option.id,
            label: option.label,
            hint: isSupported
              ? option.description
              : "Requires the REST transport",
            disabled: !isSupported,
          };
        }),
      })) as string[]);
    if (isCancel(features)) onCancel();
    const resolvedFeatures =
      features.length === 0 && overrideFeatureValues && overrideFeatureValues.length > 0
        ? overrideFeatureValues
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)
        : features;
    validateFeatureSupport(apiTransports, resolvedFeatures);

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
            (!option.supportedOrms || option.supportedOrms.includes(orm)) &&
            (!option.supportedArchitectures ||
              option.supportedArchitectures.includes(architecture));
          const unsupportedReason = option.supportedArchitectures &&
            !option.supportedArchitectures.includes(architecture)
              ? `Currently supported only with ${option.supportedArchitectures.join(", ")} architecture`
              : `Currently supported only with ${option.supportedOrms?.join(", ")}`;

          return {
            value: option.id,
            label: option.label,
            hint: isSupported
              ? option.description
              : unsupportedReason,
            disabled: !isSupported,
          };
        }),
      })) as string[]);
    if (isCancel(modules)) onCancel();

    const resolvedModules =
      modules.length === 0 && overrideModuleValues && overrideModuleValues.length > 0
        ? overrideModuleValues
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)
        : modules;

    validateModuleSupport(orm, resolvedModules);
    validateModuleArchitectureSupport(architecture, resolvedModules);

    const starterModuleTransports: Partial<Record<string, ApiTransport[]>> = {};
    const starterModuleProviders: Partial<Record<string, string[]>> = {};

    if (resolvedModules.includes("auth")) {
      starterModuleTransports.auth =
        apiTransports.length === 1
          ? [...apiTransports]
          : ((await multiselect({
              message: "Which transports should the Auth module expose?",
              required: true,
              initialValues: [...apiTransports],
              options: apiTransports.map((transport) => ({
                value: transport,
                label: transport === "rest" ? "REST" : "GraphQL",
                hint:
                  transport === "rest"
                    ? "Auth controller endpoints"
                    : "Auth resolver operations",
              })),
            })) as ApiTransport[]);

      if (isCancel(starterModuleTransports.auth)) onCancel();

      if (!starterModuleTransports.auth?.length) {
        throw new Error("Auth module must expose at least one transport.");
      }
    }

    if (resolvedModules.includes("ai")) {
      starterModuleProviders.ai =
        initialAiProviders ??
        (!process.stdin.isTTY
          ? ["openrouter", "google", "openai"]
          : ((await multiselect({
              message: "Which AI providers should the AI module support?",
              required: true,
              initialValues: ["openrouter", "google", "openai"],
              options: [
                {
                  value: "openrouter",
                  label: "OpenRouter",
                  hint: "Adds the OpenRouter provider and API key wiring",
                },
                {
                  value: "google",
                  label: "Gemini",
                  hint: "Adds the Google Gemini provider and API key wiring",
                },
                {
                  value: "openai",
                  label: "OpenAI",
                  hint: "Adds the OpenAI provider and API key wiring",
                },
              ],
            })) as AiProviderOption[]));

      if (isCancel(starterModuleProviders.ai)) onCancel();

      if (!starterModuleProviders.ai?.length) {
        throw new Error("AI module must support at least one provider.");
      }
    }

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
      apiTransports,
      starterModuleTransports,
      starterModuleProviders,
      installDependencies,
      initializeGit,
      selections: {
        apiTransports,
        orm,
        architecture,
        features: resolvedFeatures,
        modules: resolvedModules,
      },
    };
  }
}
