export type SelectionValue = string | string[];
export type SelectionValues = Record<string, SelectionValue>;

export interface PackageJsonContribution {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ScaffoldingContribution {
  templateRoots?: string[];
  templateData?: Record<string, unknown>;
  slots?: Record<string, string[]>;
  packageJson?: PackageJsonContribution;
}

export interface ScaffoldingBlueprint {
  templateRoots: string[];
  templateData: Record<string, unknown>;
  slots: Record<string, string[]>;
}
