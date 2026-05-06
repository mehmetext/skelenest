import { SelectionValues } from "../core";
import { PackageManager } from "../data";
import { ApiTransport } from "../generate/types";

export interface InitPromptData {
  name: string;
  port: string;
  packageManager: PackageManager["id"];
  installDependencies: boolean;
  initializeGit: boolean;
  apiTransports: ApiTransport[];
  starterModuleTransports: Partial<Record<string, ApiTransport[]>>;
  selections: SelectionValues;
}

export interface InitPromptOverrides {
  name?: string;
  port?: string;
  packageManager?: PackageManager["id"];
  installDependencies?: boolean;
  initializeGit?: boolean;
  apiTransports?: ApiTransport[];
  starterModuleTransports?: Partial<Record<string, ApiTransport[]>>;
  selections?: Partial<SelectionValues>;
}
