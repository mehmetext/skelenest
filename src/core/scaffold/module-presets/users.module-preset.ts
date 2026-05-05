import path from "path";
import { resolveTemplatesRoot } from "../../../init/template-root";
import { InitPromptData } from "../../../init/types";
import { ArchitectureId, ModulePresetDefinition } from "./types";

const usersTemplateRoot = (architecture: ArchitectureId): string =>
  path.join(
    resolveTemplatesRoot(__dirname),
    "features",
    "modules",
    "users",
    architecture
  );

function resolveUsersModuleImportPath(architecture: ArchitectureId): string {
  if (architecture === "standard") {
    return "./users/users.module";
  }

  return "./modules/users/users.module";
}

export const usersModulePreset: ModulePresetDefinition<InitPromptData> = {
  id: "users",
  label: "Users Starter Module",
  supportedArchitectures: ["standard", "clean", "ddd"],
  supportedOrms: ["prisma", "typeorm", "sequelize"],
  resolveContribution(input) {
    const { architecture, context } = input;
    const includesAuth = context.has("auth");
    const includesRedis = context.has("redis");

    return {
      templateRoots: [usersTemplateRoot(architecture)],
      slots: {
        "app.module.imports": [
          `import { UsersModule } from '${resolveUsersModuleImportPath(architecture)}';`,
        ],
        "app.module.moduleImports": ["UsersModule"],
        "prisma.schema.models": [
          `model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  firstName    String?  @map("first_name")
  lastName     String?  @map("last_name")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
${includesAuth && !includesRedis ? "\n  refreshSessions RefreshSession[]" : ""}

  @@map("users")
}`,
        ],
        "sequelize.models.imports": [
          `import { UserModel } from './models/user.model';`,
        ],
        "sequelize.models.entries": ["UserModel"],
        "typeorm.entities.imports": [
          `import { UserEntity } from './entities/user.entity';`,
        ],
        "typeorm.entities.entries": ["UserEntity"],
      },
    };
  },
};
