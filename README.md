# oci-image-pusher

Interactive CLI tool for building and pushing multi-arch Docker images to Oracle Cloud Infrastructure Container Registry (OCIR).

## Features

- Guided setup for OCIR region, namespace, and image name
- Auto-discovers Dockerfiles in your project
- Supports one or more Docker image targets per project
- Supports per-image Docker build args
- Builds multi-arch images (`linux/amd64`, `linux/arm64`) via `docker buildx`
- Tags images with both `latest` and git short rev (e.g. `f85dbc5`)
- Saves config to `.oci-push.json` for repeat use
- Handles Docker login to OCIR with proper username formatting (`namespace/user`)

## Prerequisites

- [Bun](https://bun.sh) >= 1.0 (Node.js is not supported)
- [Docker](https://docs.docker.com/get-docker/) with [buildx](https://docs.docker.com/build/buildx/) support
- An OCI account with access to OCIR
- An [Auth Token](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingcredentials.htm) for Docker login

## Install

```bash
# Run directly without installing
bunx oci-image-pusher

# Or install globally
bun add -g oci-image-pusher
oci-push
```

## Usage

Run the CLI from a directory that contains a Dockerfile:

```bash
bunx oci-image-pusher
```

The CLI walks you through the entire workflow interactively. Press `Ctrl+C` at any prompt to cancel.

### Step 1: Configure OCIR and images (first run only)

On first run, the CLI prompts for OCIR settings and one or more image targets.

**1. OCIR Region** — select from the list or enter a custom endpoint:

```
◆  Select OCIR Region
│  ○ Singapore (ap-singapore-1.ocir.io)
│  ○ Tokyo (ap-tokyo-1.ocir.io)
│  ○ Osaka (ap-osaka-1.ocir.io)
│  ○ Seoul (ap-seoul-1.ocir.io)
│  ○ Sydney (ap-sydney-1.ocir.io)
│  ○ Mumbai (ap-mumbai-1.ocir.io)
│  ○ US East - Ashburn (us-ashburn-1.ocir.io)
│  ○ US West - Phoenix (us-phoenix-1.ocir.io)
│  ○ Frankfurt (eu-frankfurt-1.ocir.io)
│  ○ Amsterdam (eu-amsterdam-1.ocir.io)
│  ○ London (uk-london-1.ocir.io)
│  ○ Custom endpoint
└
```

**2. Tenancy Namespace** — your OCI Object Storage namespace (find it at OCI Console → Profile → Tenancy → Object Storage Namespace):

```
◆  OCIR Tenancy Namespace
│  e.g. kx7mp2wrtqdf
└
```

**3. Image targets** — the CLI first displays every discovered Dockerfile so you can decide which image targets to name:

```
◇  Discovered Dockerfiles
│  Dockerfile
│  server/Dockerfile
└
```

For each Docker image, enter:

- Docker image name
- Dockerfile path

Example image target prompts:

```
◆  Docker Image Name
│  nara-coop-frontend
└

◆  Select a Dockerfile
│  ○ Dockerfile
│  ○ server/Dockerfile
└
```

The onboarding flow does not ask for build context or build args. Add optional `context` and `buildArgs` fields in `.oci-push.json` later when a target needs them.

After setup, the config is saved to `.oci-push.json` in the current directory. Subsequent runs load this file automatically and skip the setup:

```
┌  OCI Image Pusher
│
◇  Using saved config (.oci-push.json)
│  Endpoint:    ap-singapore-1.ocir.io
│  Namespace:   kx7mp2wrtqdf
│  Image:       my-app
│  Dockerfile:  Dockerfile
│  Context:     .
│  Build args:  none
│
└
```

### Step 2: Dockerfile discovery

The CLI scans the current directory (recursively) for files matching `Dockerfile*`. It skips `node_modules` and `.git` directories.

- **One Dockerfile found** — asks you to confirm:
  ```
  ◆  Use Dockerfile?
  │  Yes / No
  └
  ```
- **Multiple Dockerfiles found** — lets you pick one:
  ```
  ◆  Select a Dockerfile
  │  ○ Dockerfile
  │  ○ services/api/Dockerfile.prod
  │  ○ services/worker/Dockerfile
  └
  ```

### Step 3: Docker login

The CLI checks `~/.docker/config.json` for an existing login to the OCIR endpoint.

- **Already logged in** — skips ahead
- **Not logged in** — prompts for credentials:
  ```
  ◆  Docker Username (OCI email or federated user)
  │  user@example.com
  └
  ◆  Docker Password / Auth Token
  │  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪
  └
  ```
  The username is automatically formatted as `namespace/user` for OCIR authentication.

### Step 4: Build mode

For a single-image config, choose what to do:

```
◆  What would you like to do?
│  ○ Build and push
│  ○ Build only
└
```

- **Build and push** — builds the multi-arch image and pushes it to OCIR
- **Build only** — builds locally without pushing (useful for testing)

For a multi-image config, choose one of:

```
◆  What would you like to do?
│  ○ Build and push one image
│  ○ Build and push all images
│  ○ Build one image locally
│  ○ Build all images locally
└
```

When building one image, the CLI prompts you to select the image target.

### Step 5: Build

The CLI runs `docker buildx build` with:

- **Platforms**: `linux/amd64`, `linux/arm64`
- **Tags**: `latest` and current git short rev (falls back to `dev` if not in a git repo)
- **Build args**: each configured build arg as `--build-arg KEY=VALUE`
- **Build context**: the configured image context

```
◇  Running: docker buildx build --platform linux/amd64,linux/arm64 \
     -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/my-app:latest \
     -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/my-app:f85dbc5 \
     --push -f Dockerfile .
```

## Config file

The `.oci-push.json` file stores your project configuration.

The legacy single-image config shape is still supported:

```json
{
  "endpoint": "ap-singapore-1.ocir.io",
  "namespace": "kx7mp2wrtqdf",
  "imageName": "my-app",
  "dockerfile": "Dockerfile"
}
```

New configs can use the `images` array for one or more image targets. The CLI writes this minimal shape during onboarding:

```json
{
  "endpoint": "ap-singapore-1.ocir.io",
  "namespace": "kx7mp2wrtqdf",
  "images": [
    {
      "name": "nara-coop-frontend",
      "dockerfile": "Dockerfile"
    },
    {
      "name": "nara-coop-api",
      "dockerfile": "server/Dockerfile"
    }
  ]
}
```

You can manually add optional `context` and `buildArgs` fields:

```json
{
  "endpoint": "ap-singapore-1.ocir.io",
  "namespace": "kx7mp2wrtqdf",
  "images": [
    {
      "name": "nara-coop-frontend",
      "dockerfile": "Dockerfile",
      "context": ".",
      "buildArgs": {
        "VITE_SUPABASE_URL": "https://your-project-ref.supabase.co",
        "VITE_SUPABASE_PUBLISHABLE_KEY": "your-public-key",
        "VITE_API_BASE_URL": "https://api.example.com"
      }
    },
    {
      "name": "nara-coop-api",
      "dockerfile": "server/Dockerfile",
      "context": "server",
      "buildArgs": {}
    }
  ]
}
```

If `context` is omitted for an image target, the CLI defaults it to the Dockerfile parent directory. If `buildArgs` is omitted, the CLI uses no build args.

Build args are not secrets. Do not put passwords, private API keys, OCI auth tokens, Supabase service-role keys, or other private credentials in `buildArgs`. Build args are appropriate for public frontend values such as Vite public environment variables, Supabase publishable keys, and public API base URLs.

Example frontend build command:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-frontend:latest \
  -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-frontend:f85dbc5 \
  --build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  -f Dockerfile .
```

Example backend build command:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-api:latest \
  -t ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-api:f85dbc5 \
  -f server/Dockerfile server
```

To reconfigure, delete `.oci-push.json` and run the CLI again. This file is typically added to `.gitignore` since it may contain project-specific settings.

## Supported Regions

| Region | Endpoint |
|--------|----------|
| Singapore | `ap-singapore-1.ocir.io` |
| Tokyo | `ap-tokyo-1.ocir.io` |
| Osaka | `ap-osaka-1.ocir.io` |
| Seoul | `ap-seoul-1.ocir.io` |
| Sydney | `ap-sydney-1.ocir.io` |
| Mumbai | `ap-mumbai-1.ocir.io` |
| US East (Ashburn) | `us-ashburn-1.ocir.io` |
| US West (Phoenix) | `us-phoenix-1.ocir.io` |
| Frankfurt | `eu-frankfurt-1.ocir.io` |
| Amsterdam | `eu-amsterdam-1.ocir.io` |
| London | `uk-london-1.ocir.io` |
| Custom | Any `*.ocir.io` endpoint |

## License

[MIT](LICENSE)
