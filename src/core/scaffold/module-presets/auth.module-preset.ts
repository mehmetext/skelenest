import path from "path";
import { ScaffoldingContribution } from "../../blueprints/types";
import { resolveTemplatesRoot } from "../../../init/template-root";
import { InitPromptData } from "../../../init/types";
import {
  ArchitectureId,
  ModulePresetDefinition,
} from "./types";
import { usersModulePreset } from "./users.module-preset";

const authTemplateRoot = (architecture: ArchitectureId): string =>
  path.join(
    resolveTemplatesRoot(__dirname),
    "features",
    "security",
    "auth",
    architecture
  );

function resolveModuleImportPath(architecture: ArchitectureId): string {
  if (architecture === "standard") {
    return "./auth/auth.module";
  }

  return "./modules/auth/auth.module";
}

export const authModulePreset: ModulePresetDefinition<InitPromptData> = {
  id: "auth",
  label: "Auth Starter Module",
  supportedArchitectures: ["standard", "clean", "ddd"],
  supportedOrms: ["prisma"],
  resolveContribution(input) {
    const { architecture } = input;
    const includesRedis = input.context.has("redis");
    const usersContribution = usersModulePreset.resolveContribution(input);

    return {
      templateRoots: [
        ...(usersContribution.templateRoots ?? []),
        authTemplateRoot(architecture),
      ],
      slots: {
        ...(usersContribution.slots ?? {}),
        "app.module.imports": [
          ...((usersContribution.slots?.["app.module.imports"] as string[]) ?? []),
          `import { AuthModule } from '${resolveModuleImportPath(architecture)}';`,
        ],
        "app.module.moduleImports": [
          ...((usersContribution.slots?.["app.module.moduleImports"] as string[]) ??
            []),
          "AuthModule",
        ],
        "env.entries": [
          'JWT_ACCESS_SECRET="change-me-access-secret"',
          'JWT_REFRESH_SECRET="change-me-refresh-secret"',
          'JWT_ACCESS_TTL="15m"',
          'JWT_REFRESH_TTL="7d"',
        ],
        "prisma.schema.models": [
          ...((usersContribution.slots?.["prisma.schema.models"] as string[]) ??
            []),
          ...(!includesRedis
            ? [
                `model RefreshSession {
  id           String    @id @default(uuid())
  tokenHash    String    @unique @map("token_hash")
  jti          String
  userId       String    @map("user_id")
  expiresAt    DateTime  @map("expires_at")
  revokedAt    DateTime? @map("revoked_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_sessions")
}`,
                `model RevokedAccessToken {
  id        String   @id @default(uuid())
  jti       String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("revoked_access_tokens")
}`,
              ]
            : []),
        ],
      },
      packageJson: {
        ...(usersContribution.packageJson ?? {}),
        dependencies: {
          ...(usersContribution.packageJson?.dependencies ?? {}),
          "@nestjs/jwt": "^11.0.1",
          "@nestjs/passport": "^11.0.5",
          "@nestjs/swagger": "^11.4.2",
          passport: "^0.7.0",
          "passport-jwt": "^4.0.1",
          "passport-local": "^1.0.0",
        },
        devDependencies: {
          ...(usersContribution.packageJson?.devDependencies ?? {}),
          "@types/passport-jwt": "^4.0.1",
          "@types/passport-local": "^1.0.38",
        },
        scripts: {
          ...(usersContribution.packageJson?.scripts ?? {}),
        },
      },
    } satisfies ScaffoldingContribution;
  },
};
