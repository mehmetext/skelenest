import path from "path";
import { ScaffoldingContribution } from "../../blueprints/types";
import { resolveTemplatesRoot } from "../../../init/template-root";
import {
  AiProviderOption,
  InitPromptData,
} from "../../../init/types";
import { ArchitectureId, ModulePresetDefinition } from "./types";

const aiTemplateRoot = (architecture: ArchitectureId): string =>
  path.join(
    resolveTemplatesRoot(__dirname),
    "features",
    "modules",
    "ai",
    architecture
  );

function resolveAiModuleImportPath(architecture: ArchitectureId): string {
  if (architecture === "standard") {
    return "./ai/ai.module";
  }

  return "./modules/ai/ai.module";
}

interface AiProviderTemplateConfig {
  id: AiProviderOption;
  label: string;
  envKey: string;
  packageName: string;
  packageVersion: string;
  className: string;
  importPath: string;
  modelId: string;
}

const AI_PROVIDER_CONFIG: Record<AiProviderOption, AiProviderTemplateConfig> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    packageName: "@openrouter/ai-sdk-provider",
    packageVersion: "^2.8.0",
    className: "OpenRouterProvider",
    importPath: "./providers/openrouter.provider",
    modelId: "inclusionai/ling-2.6-1t:free",
  },
  google: {
    id: "google",
    label: "Gemini",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    packageName: "@ai-sdk/google",
    packageVersion: "^3.0.64",
    className: "GoogleProvider",
    importPath: "./providers/google.provider",
    modelId: "gemini-2.5-pro",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    packageName: "@ai-sdk/openai",
    packageVersion: "^2.0.24",
    className: "OpenAIProvider",
    importPath: "./providers/openai.provider",
    modelId: "gpt-4.1",
  },
};

function resolveAiProviders(context: InitPromptData): AiProviderTemplateConfig[] {
  const configured = context.starterModuleProviders?.ai;
  const providerIds =
    configured && configured.length > 0
      ? configured
      : (["openrouter", "google", "openai"] satisfies AiProviderOption[]);

  return providerIds.map((providerId) => {
    const provider = AI_PROVIDER_CONFIG[providerId as AiProviderOption];

    if (!provider) {
      throw new Error(`Unknown AI provider selection: "${providerId}".`);
    }

    return provider;
  });
}

function resolveModelAliases(
  providers: AiProviderTemplateConfig[]
): { simple: string; complex: string } {
  const [firstProvider] = providers;
  const simpleProvider =
    providers.find((provider) => provider.id === "openrouter") ?? firstProvider;
  const complexProvider =
    providers.find((provider) => provider.id === "google") ??
    providers.find((provider) => provider.id === "openai") ??
    firstProvider;

  return {
    simple: `${simpleProvider.id}:${simpleProvider.modelId}`,
    complex: `${complexProvider.id}:${complexProvider.modelId}`,
  };
}

export const aiModulePreset: ModulePresetDefinition<InitPromptData> = {
  id: "ai",
  label: "Starter AI Module",
  supportedArchitectures: ["standard", "clean", "ddd"],
  supportedOrms: ["none", "prisma", "typeorm", "sequelize"],
  resolveContribution(input) {
    const { architecture } = input;
    const providers = resolveAiProviders(input.context.input);
    const models = resolveModelAliases(providers);
    const apiKeyEntries = providers.map(
      (provider) =>
        `        ${provider.id}: configService.getOrThrow('${provider.envKey}'),`
    );

    return {
      templateRoots: [aiTemplateRoot(architecture)],
      slots: {
        "app.module.imports": [
          "import { ConfigService } from '@nestjs/config';",
          `import { AiModule } from '${resolveAiModuleImportPath(architecture)}';`,
        ],
        "app.module.moduleImports": [
          `AiModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKeys: {
${apiKeyEntries.join("\n")}
        },
      }),
    })`,
        ],
        "env.entries": providers.map(
          (provider) => `${provider.envKey}="replace-me"`
        ),
      },
      packageJson: {
        dependencies: {
          ai: "^6.0.168",
          zod: "^4.3.6",
          ...Object.fromEntries(
            providers.map((provider) => [
              provider.packageName,
              provider.packageVersion,
            ])
          ),
        },
      },
      templateData: {
        aiProviders: providers,
        aiModels: models,
      },
    } satisfies ScaffoldingContribution;
  },
};
