# skelenest

An opinionated command-line scaffolding tool for NestJS projects. It collects the project name, port, package manager, and stack selections through interactive prompts; generates files from EJS templates; merges `package.json` dependencies; and optionally runs dependency installation.

## Install

Run directly with `npx`:

```bash
npx skelenest init
```

Or install globally:

```bash
npm install -g skelenest
skelenest init
```

With `pnpm`:

```bash
pnpm dlx skelenest init
```

## Quick start

Create a new NestJS project from your current directory:

```bash
npx skelenest init
```

Then move into the generated project and start development:

```bash
cd <project-name>
pnpm run start:dev
```

## Features

- **Interactive setup**: Project name, HTTP port, package manager, ORM selection, and multi-select feature selection via [@clack/prompts](https://github.com/natemoo-re/clack).
- **Package managers**: npm, yarn, pnpm.
- **ORM options** (or none):
  - **Prisma** — module wiring, sample schema, `prisma generate` / migrate scripts, `DATABASE_URL`.
  - **TypeORM** — `TypeOrmModule`, sample entity, Postgres-oriented config.
  - **Sequelize** — `@nestjs/sequelize`, sample model and configuration.
- **Feature options**:
  - **Docker** — `Dockerfile`, `.dockerignore`, and `docker-compose.yml`.
  - **Redis** — shared `REDIS_URL` runtime configuration.
  - **BullMQ** — queue bootstrap with automatic Redis dependency resolution.
  - **Throttler** — global request throttling.
  - **Swagger** — OpenAPI docs bootstrap in `main.ts`.
  - **Auth Starter Skeleton** — minimal auth module starter.
- **Dependency-aware architecture**: New options can declare requirements such as `BullMQ -> Redis`, and downstream templates can react to the final resolved stack.
- **Extensible architecture**: New options can be added through selection groups and “contributions” (template roots, `package.json` fragments, EJS **slots**).
- **NestJS 11**-focused base template: ConfigModule, ESLint 9, Jest, Prettier, e2e test scaffold.

## Requirements

- Node.js (this repo uses TypeScript 6 and modern Node APIs; a current LTS release is recommended).
- Package manager: the repo is pinned to `pnpm@10.28.0`; using `pnpm` for local development is the most straightforward path.

## Developing this repository

```bash
pnpm install
```

Watch and run the CLI from source during development:

```bash
pnpm dev
```

Production-like build and template copy:

```bash
pnpm build
pnpm start --help
```

The `build` output goes under `dist/` and copies `src/templates/**` to `dist/src/templates`; the runnable binary at `dist/bin/skelenest.js` resolves template paths accordingly.

The `dev:init` script in `package.json` (`pnpm build && skelenest init`) assumes the `skelenest` command is on your `PATH`; otherwise use `pnpm build && node ./dist/bin/skelenest.js init`.

## Usage

From the published package:

```bash
npx skelenest init
```

After a local build:

```bash
pnpm start init
```

Or, after a global or linked install via the `bin` field in `package.json`:

```bash
skelenest init
```

The command:

1. Requires the target directory to be **missing** or **empty**; it will not write into a non-empty folder.
2. After you answer the prompts, it creates a new folder named after your project in the **current working directory**.
3. Optionally runs `install` with the package manager you selected.

Typical flow in the generated project (see the generated `README` and scripts):

```bash
cd <project-name>
pnpm run start:dev
```

The same `start:dev` script exists regardless of which package manager you chose at init (`npm` / `yarn` / `pnpm`).

If you picked an ORM, update `DATABASE_URL` in `.env` for your environment; for Prisma, use the template’s scripts for `prisma generate` and migrate steps. If you selected Docker together with database or Redis-oriented features, the generated `docker-compose.yml` and connection URLs are automatically aligned to container hostnames.

## Architecture overview

| Area | Description |
|------|-------------|
| `bin/skelenest.ts` | [Commander](https://github.com/tj/commander.js) entry point; `init` subcommand. |
| `src/commands/` | Command classes and error handling. |
| `src/prompts/init.prompt.ts` | All prompts for the init flow. |
| `src/init/create-init-blueprint.ts` | Base Nest `package.json` shape, template data, and merging selected contributions. |
| `src/init/selection-groups.ts` | Definitions such as the `orm` selection group. |
| `src/init/options/orm.options.ts` | Per-ORM template roots, slots, and dependency/script contributions. |
| `src/init/options/feature.options.ts` | Feature-level contributions such as Docker, Redis, BullMQ, Swagger, and Auth starter. |
| `src/core/` | Blueprint composition (`composeScaffoldingBlueprint`), dependency-aware selection resolution, selection-group prompt factory. |
| `src/utils/template.util.ts` | Multiple template roots, `*.ejs` rendering, slot injection via `getSlot(...)`. |
| `src/templates/init/` | Core Nest app templates (`app.module.ts.ejs` uses `app.module.imports` / `app.module.moduleImports` slots). |
| `src/templates/features/**/*` | ORM- and feature-specific add-on files. |

To add a new technology option: define a `TechnologyOption` whose `contribute()` returns a `ScaffoldingContribution`, optionally declare `requires` / `conflictsWith`, and register the option on a new or existing group in `initSelectionGroups`. Slot names must be referenced in templates with `getSlot('...')`.

## License

ISC — see `package.json`.
