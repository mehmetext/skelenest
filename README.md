# skelenest

`skelenest` is a CLI for scaffolding NestJS projects with a guided interactive flow.

Instead of starting from a blank Nest app and wiring everything by hand, `skelenest` asks a few questions, generates the project structure, adds the dependencies you selected, and prepares a working starting point.

## What it does

- Creates a new NestJS project in a new directory
- Lets you choose your package manager: `npm`, `pnpm`, or `yarn`
- Lets you choose an ORM: `Prisma`, `TypeORM`, `Sequelize`, or none
- Lets you enable optional features such as `Docker`, `Redis`, `BullMQ`, `Swagger`, `Throttler`, and an auth starter
- Merges dependencies and scripts based on your selections
- Sets up request validation defaults with Nest's global `ValidationPipe`
- Can install dependencies for you after generation

## Install

Use it directly with `npx`:

```bash
npx skelenest init
```

Or with `pnpm`:

```bash
pnpm dlx skelenest init
```

Or install it globally:

```bash
npm install -g skelenest
skelenest init
```

## Quick start

Run the generator:

```bash
npx skelenest init
```

You will be prompted for:

- Project name
- HTTP port
- Package manager
- ORM preference
- Optional features
- Whether dependencies should be installed automatically

After generation:

```bash
cd <project-name>
pnpm run start:dev
```

The generated project includes its own scripts, so after that point you work inside the new NestJS app as usual.

By default, generated apps also include `class-validator` and `class-transformer`, and configure a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, implicit conversion, and `stopAtFirstError`.

## Command

```bash
skelenest init
```

Help output:

```bash
skelenest --help
```

## Included options

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
- `Auth Starter Skeleton`

Some options are dependency-aware. For example, features that require Redis can automatically pull Redis-related setup into the generated project.

## How generation works

`skelenest` generates a new project folder in your current working directory.

Important behavior:

- The target directory must not already contain files
- The generated app is created under the project name you provide
- Dependency installation is optional
- Template files are rendered from EJS templates and combined with your selected stack

## Example flow

```bash
mkdir my-workspace
cd my-workspace
npx skelenest init
cd my-api
pnpm run start:dev
```

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

The build output is written to `dist/`. Template assets under `src/templates/` are copied into the final package so the published CLI can render projects correctly.

## Project structure

- `bin/skelenest.ts`: CLI entrypoint
- `src/commands/`: command definitions
- `src/prompts/`: interactive prompt flow
- `src/init/`: blueprint assembly and selection logic
- `src/templates/`: project templates and feature templates
- `src/utils/`: shared helpers for rendering, filesystem work, and command execution

## Publish notes

The published npm package exposes a single binary:

```bash
skelenest
```

Current primary command:

```bash
skelenest init
```

## License

ISC. See [LICENSE](/Users/mehmet/Projects/skelenest/LICENSE).
