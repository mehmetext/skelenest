export interface PackageManager {
  id: "npm" | "yarn" | "pnpm";
  name: string;
  packageManagerField: string;
  pmInstallCommand: string;
  pmRunCommand: string;
  pmGlobalInstallCommand: string;
}

export const packageManagers: PackageManager[] = [
  {
    id: "npm",
    name: "npm",
    packageManagerField: "npm@11.7.0",
    pmInstallCommand: "npm install",
    pmRunCommand: "npm run",
    pmGlobalInstallCommand: "npm install -g",
  },
  {
    id: "yarn",
    name: "yarn",
    packageManagerField: "yarn@1.22.22",
    pmInstallCommand: "yarn",
    pmRunCommand: "yarn run",
    pmGlobalInstallCommand: "yarn global add",
  },
  {
    id: "pnpm",
    name: "pnpm",
    packageManagerField: "pnpm@10.28.0",
    pmInstallCommand: "pnpm install",
    pmRunCommand: "pnpm run",
    pmGlobalInstallCommand: "pnpm install -g",
  },
];
