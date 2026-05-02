import { SelectionValues } from "../core";
import { PackageManager } from "../data";

export interface InitPromptData {
  name: string;
  port: string;
  packageManager: PackageManager["id"];
  installDependencies: boolean;
  initializeGit: boolean;
  selections: SelectionValues;
}

export interface InitPromptOverrides {
  name?: string;
  port?: string;
  packageManager?: PackageManager["id"];
  installDependencies?: boolean;
  initializeGit?: boolean;
  selections?: Partial<SelectionValues>;
}
