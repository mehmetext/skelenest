export interface PackageManager {
  id: "npm" | "yarn" | "pnpm";
  name: string;
  pmInstallCommand: string;
  pmRunCommand: string;
  pmGlobalInstallCommand: string;
}

export const packageManagers: PackageManager[] = [
  {
    id: "npm",
    name: "npm",
    pmInstallCommand: "npm install",
    pmRunCommand: "npm run",
    pmGlobalInstallCommand: "npm install -g",
  },
  {
    id: "yarn",
    name: "yarn",
    pmInstallCommand: "yarn",
    pmRunCommand: "yarn run",
    pmGlobalInstallCommand: "yarn global add",
  },
  {
    id: "pnpm",
    name: "pnpm",
    pmInstallCommand: "pnpm install",
    pmRunCommand: "pnpm run",
    pmGlobalInstallCommand: "pnpm install -g",
  },
];
