import { SelectionValues } from "../core";
import { PackageManager } from "../data";
import { ApiTransport } from "../generate/types";

export type AiProviderOption = "openrouter" | "google" | "openai";

export interface InitPromptData {
  name: string;
  port: string;
  packageManager: PackageManager["id"];
  installDependencies: boolean;
  initializeGit: boolean;
  apiTransports: ApiTransport[];
  starterModuleTransports: Partial<Record<string, ApiTransport[]>>;
  starterModuleProviders: Partial<Record<string, string[]>>;
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
  starterModuleProviders?: Partial<Record<string, string[]>>;
  selections?: Partial<SelectionValues>;
}
