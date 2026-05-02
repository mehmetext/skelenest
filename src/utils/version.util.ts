import fs from "fs";
import path from "path";

interface PackageJsonVersionShape {
  version?: string;
  name?: string;
}

function readPackageVersion(): string | null {
  let currentDir = __dirname;

  for (let depth = 0; depth < 5; depth += 1) {
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      try {
        const parsed = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        ) as PackageJsonVersionShape;

        if (parsed.name === "skelenest" && typeof parsed.version === "string") {
          return parsed.version;
        }
      } catch {
        return null;
      }
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

export function getCliVersion(): string {
  return readPackageVersion() ?? "0.0.0";
}
