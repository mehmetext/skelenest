export type DoctorSeverity = "ok" | "warn" | "error";

export interface DoctorFinding {
  severity: DoctorSeverity;
  title: string;
  detail: string;
}

export interface DoctorSummary {
  ok: number;
  warn: number;
  error: number;
}

export interface DoctorContext {
  cwd: string;
  architecture: "standard" | "clean" | "ddd";
  orm: "prisma" | "typeorm" | "sequelize" | "none";
  features: Set<string>;
  modules: Set<string>;
  packageManager: "npm" | "pnpm" | "yarn" | null;
  packageJson: {
    packageManager?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  env: Record<string, string>;
  appModuleContent: string;
  mainContent: string;
}
