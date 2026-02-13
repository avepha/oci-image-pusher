# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Single-file interactive CLI tool that guides users through building and pushing multi-arch Docker images to Oracle Cloud Infrastructure Container Registry (OCIR). Built with Bun.

## Commands

- `bun run dev` — run the CLI interactively
- `bun run build` — compile to standalone binary (`oci-push`)
- `bun check` — type-check with `tsc --noEmit` (tsconfig has `strict`, `noUncheckedIndexedAccess` enabled)

## Architecture

Split across four modules in `src/`:

- **`index.ts`** — entry point; orchestrates the sequential flow: load config → login → select mode → build
- **`config.ts`** — loads/saves `.oci-push.json`; prompts for region/namespace/image if no config exists; exports `Config` interface and `OCIR_REGIONS`
- **`docker.ts`** — `ensureDockerLogin(endpoint, namespace)` checks `~/.docker/config.json` and prompts credentials if needed (formats username as `namespace/user` for OCIR); `discoverDockerfile()` globs and selects Dockerfiles; `executeBuild()` runs `docker buildx build --platform linux/amd64,linux/arm64` with git short rev tag
- **`helpers.ts`** — `isCancel()` wraps prompt results for Ctrl+C handling; `run()` spawns commands with inherited stdio

## Key Details

- Uses `@clack/prompts` for all interactive UI and `picocolors` for coloring
- Build context is set to the Dockerfile's parent directory (not cwd)
- The `@clack/prompts` `text()` does not support a `hint` property
