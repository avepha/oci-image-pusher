# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Interactive CLI tool that guides users through building and pushing one or more multi-arch Docker images to Oracle Cloud Infrastructure Container Registry (OCIR). Built with Bun.

## Commands

- `bun run dev` — run the CLI interactively
- `bun run build` — compile to standalone binary (`oci-push`)
- `bun check` — type-check with `tsc --noEmit` (tsconfig has `strict`, `noUncheckedIndexedAccess` enabled)

## Architecture

Split across four modules in `src/`:

- **`index.ts`** — entry point; orchestrates the flow: load config → select one/all target mode → login for push flows → build selected image targets
- **`config.ts`** — loads/saves `.oci-push.json`; normalizes legacy single-image config and new `images[]` config; prompts for region/namespace/images if no config exists; exports `Config`, `ImageTarget`, and `OCIR_REGIONS`
- **`docker.ts`** — `ensureDockerLogin(endpoint, namespace)` checks `~/.docker/config.json` and prompts credentials if needed (formats username as `namespace/user` for OCIR); `listDockerfiles()` and `discoverDockerfile()` glob and select Dockerfiles; `buildDockerBuildCommand()` builds testable `docker buildx build` args; `executeBuild()` runs the command with git short rev tag
- **`helpers.ts`** — `isCancel()` wraps prompt results for Ctrl+C handling; `run()` spawns commands with inherited stdio

## Key Details

- Uses `@clack/prompts` for all interactive UI and `picocolors` for coloring
- Legacy configs are normalized in memory; onboarding saves minimal `images[].name` and `images[].dockerfile`
- Build context defaults to the Dockerfile's parent directory when omitted in a new image target
- Build args are supported from `.oci-push.json`, but onboarding does not prompt for them
- Build arg values should be hidden in CLI summaries/logged commands
- The `@clack/prompts` `text()` does not support a `hint` property
