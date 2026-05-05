<p align="center">
  <img src="assets/logo.png" alt="Skelenest Logo" width="320" />
</p>

`skelenest` is an opinionated CLI for scaffolding and growing NestJS projects.

It covers the first project bootstrap, architecture-aware code generation inside an existing project, and a `doctor` pass for checking whether a generated app still matches the selected stack.

## What it does

- Creates a new NestJS project in a new directory
- Lets you choose a package manager: `npm`, `pnpm`, or `yarn`
- Lets you choose an ORM: `Prisma`, `TypeORM`, `Sequelize`, or none
- Lets you enable optional features such as `Docker`, `Redis`, `BullMQ`, `Swagger`, `Throttler`, and an auth starter
- Generates modules, CRUD resources, DTOs, and use cases inside an existing Skelenest project
- Verifies generated projects with `doctor`, including stack wiring, required files, scripts, and selected feature checks
- Sets up request validation defaults with Nest's global `ValidationPipe`

## Install

Run it directly:

```bash
npx skelenest init
```

With `pnpm`:

```bash
pnpm dlx skelenest init
```

Or install globally:

```bash
npm install -g skelenest
skelenest --help
```

## Commands

```bash
skelenest init
skelenest generate module <name>
skelenest generate resource <name>
skelenest generate dto <module> <name>
skelenest generate use-case <module> <name>
skelenest doctor
skelenest doctor --json
```

`generate` also has the short alias `skelenest g`.

`init` accepts partial or fully non-interactive flags. If you provide only some values, Skelenest uses those and prompts for the rest.

Example:

```bash
skelenest init \
  --name my-api \
  --port 3000 \
  --package-manager pnpm \
  --orm prisma \
  --architecture clean \
  --features swagger,bullmq \
  --modules auth \
  --no-install \
  --no-git
```

## Quick start

Create a project:

```bash
npx skelenest init
```

You will be prompted for:

- Project name
- HTTP port
- Package manager
- ORM preference
- Architecture style
- Optional features
- Starter modules
- Whether dependencies should be installed automatically
- Whether git should be initialized with a first commit

Then move into the generated project and start it with the selected package manager:

```bash
cd <project-name>
pnpm run start:dev
```

Generated apps include `class-validator`, `class-transformer`, and a global `ValidationPipe` configured with `whitelist`, `forbidNonWhitelisted`, `transform`, implicit conversion, and `stopAtFirstError`.

If Swagger is selected, docs are mounted at `GET /api/docs`.

## Example outputs

### Minimal standard API

Command:

```bash
skelenest init --name standard-api --port 3000 --package-manager pnpm --orm none --architecture standard --features swagger --modules none --no-install --no-git
```

Representative output:

```text
standard-api/
├── .skelenest/project.json
├── package.json
├── src/
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

### Clean architecture API with Prisma, BullMQ, and auth

Command:

```bash
skelenest init --name clean-api --port 3000 --package-manager pnpm --orm prisma --architecture clean --features swagger,bullmq --modules auth --no-install --no-git
```

Representative output:

```text
clean-api/
├── .skelenest/project.json
├── prisma/
│   ├── example.prisma
│   └── schema.prisma
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   └── users/
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

## Stack options

### ORMs

- `Prisma`
- `TypeORM`
- `Sequelize`
- `None`

### Features

- `Docker`
- `Redis`
- `BullMQ`
- `Throttler`
- `Swagger`
- `Auth Starter Module`

Some options are dependency-aware. For example, selecting `BullMQ` automatically pulls in the Redis stack.

## What each choice adds

| Choice | Example values | What gets generated |
| --- | --- | --- |
| `--architecture` | `standard`, `clean`, `ddd` | Changes module layout and file structure across the whole app |
| `--orm` | `prisma`, `typeorm`, `sequelize`, `none` | Adds persistence config, dependencies, env entries, and ORM-specific wiring |
| `--features swagger` | `swagger` | Wires OpenAPI docs at `GET /api/docs` |
| `--features redis` | `redis` | Adds Redis dependencies and `REDIS_URL` configuration |
| `--features bullmq` | `bullmq` | Adds BullMQ and implicitly pulls in the Redis stack |
| `--features throttler` | `throttler` | Adds global throttling and Redis-backed storage when Redis is selected |
| `--features docker` | `docker` | Adds `Dockerfile`, `.dockerignore`, and `docker-compose.yml` |
| `--modules auth` | `auth` | Adds auth and users starter modules tailored to the selected architecture; supported with Prisma, TypeORM, or Sequelize |

## Generation model

`skelenest init` creates a new project folder in your current working directory.

- The target directory must be empty
- The generated app is created under the project name you provide
- Dependency installation is optional
- Template files are rendered from EJS templates and merged with your selected stack
- Generated projects include `.skelenest/project.json` metadata so later `generate` and `doctor` commands understand the original stack

## `doctor`

Run `doctor` inside a generated project to validate the app against its selected architecture, ORM, modules, and feature set.

Examples:

```bash
skelenest doctor
skelenest doctor --json
skelenest doctor --json --fail-on-warn
```

The JSON mode prints machine-readable output without the ASCII banner, so it can be piped into tools in CI or local scripts.

## Local development

If you want to work on this repository itself:

```bash
pnpm install
pnpm dev
```

Build the distributable CLI:

```bash
pnpm build
pnpm start --help
```

Verification scripts:

```bash
pnpm verify:init-combinations
pnpm verify:workflows
```

The build output is written to `dist/`. Template assets under `src/templates/` are copied into the final package so the published CLI can render projects correctly.

## Release

For a one-command release from `main`, use one of:

```bash
pnpm release:dry
pnpm release:patch
pnpm release:minor
pnpm release:major
```

These scripts:

- verify that you are on `main`
- verify that your git working tree is clean
- bump the npm version
- push the version commit and git tag to `origin/main`
- publish the package to npm

Use `pnpm release:dry` first if you want to preview the npm package contents without publishing.

## Project structure

- `bin/skelenest.ts`: CLI entrypoint
- `src/commands/`: `init`, `generate`, and `doctor` command definitions
- `src/prompts/`: interactive prompt flow
- `src/init/`: blueprint assembly and selection logic
- `src/generate/`: project-aware code generation helpers
- `src/doctor/`: generated-project validation
- `src/templates/`: project templates and feature templates
- `src/utils/`: shared helpers for rendering, filesystem work, git, and CLI output

## License

ISC. See [LICENSE](/Users/mehmet/Projects/skelenest/LICENSE).
