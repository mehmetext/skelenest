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
import { initSelectionGroups, InitPromptData } from "../init";
import { BasePrompt } from "./base.prompt";

export class InitPrompt extends BasePrompt<InitPromptData> {
  constructor() {
    super();
  }

  async execute(): Promise<InitPromptData> {
    intro(chalk.bgCyanBright.white(" skelenest "));

    const onCancel = () => {
      cancel(chalk.red("Operation cancelled."));
      process.exit(0);
    };

    const name = await text({
      message: "What is the project name?",
      placeholder: "my-skelenest-app",
      validate(value) {
        if (value?.length === 0) return "Project name cannot be empty.";
      },
      defaultValue: "my-skelenest-app",
    });
    if (isCancel(name)) onCancel();

    const port = await text({
      message: "What is the port number?",
      defaultValue: "3000",
      placeholder: "3000",
    });
    if (isCancel(port)) onCancel();

    const packageManager = await select({
      message: "Which package manager do you want to use?",
      options: packageManagers.map((pm) => ({
        value: pm.id,
        label: pm.name,
      })),
    });
    if (isCancel(packageManager)) onCancel();

    const ormGroup = initSelectionGroups.find((group) => group.id === "orm");
    const architectureGroup = initSelectionGroups.find(
      (group) => group.id === "architecture"
    );
    const featuresGroup = initSelectionGroups.find(
      (group) => group.id === "features"
    );
    const modulesGroup = initSelectionGroups.find(
      (group) => group.id === "modules"
    );

    if (!ormGroup || !architectureGroup || !featuresGroup || !modulesGroup) {
      throw new Error("Init selection groups are not configured correctly.");
    }

    const orm = await select({
      message: ormGroup.message,
      initialValue:
        typeof ormGroup.initialValue === "string" ? ormGroup.initialValue : undefined,
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
    });
    if (isCancel(orm)) onCancel();

    const architecture = await select({
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
    });
    if (isCancel(architecture)) onCancel();

    const features = await multiselect({
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
    });
    if (isCancel(features)) onCancel();

    const modules = await multiselect({
      message: modulesGroup.message,
      required: modulesGroup.required ?? true,
      initialValues: Array.isArray(modulesGroup.initialValue)
        ? modulesGroup.initialValue
        : undefined,
      options: modulesGroup.options.map((option) => {
        const isSupported =
          !option.supportedOrms ||
          option.supportedOrms.includes(orm as string);

        return {
          value: option.id,
          label: option.label,
          hint: isSupported
            ? option.description
            : `Currently supported only with ${option.supportedOrms?.join(", ")}`,
          disabled: !isSupported,
        };
      }),
    });
    if (isCancel(modules)) onCancel();

    const installDependencies = await confirm({
      message: "Do you want to install dependencies?",
      initialValue: true,
    });
    if (isCancel(installDependencies)) onCancel();

    const initializeGit = await confirm({
      message: "Do you want to initialize git and create the first commit?",
      initialValue: true,
    });
    if (isCancel(initializeGit)) onCancel();

    return {
      name: name as string,
      port: port as string,
      packageManager: packageManager as PackageManager["id"],
      installDependencies: installDependencies as boolean,
      initializeGit: initializeGit as boolean,
      selections: {
        orm: orm as string,
        architecture: architecture as string,
        features: features as string[],
        modules: modules as string[],
      },
    };
  }
}
