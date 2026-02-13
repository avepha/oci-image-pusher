# oci-image-pusher

Interactive CLI tool for building and pushing multi-arch Docker images to Oracle Cloud Infrastructure Container Registry (OCIR).

## Features

- Guided setup for OCIR region, namespace, and image name
- Auto-discovers Dockerfiles in your project
- Builds multi-arch images (`linux/amd64`, `linux/arm64`) via `docker buildx`
- Tags images with git short rev
- Saves config to `.oci-push.json` for repeat use
- Handles Docker login to OCIR with proper username formatting

## Prerequisites

- [Bun](https://bun.sh) >= 1.0 (Node.js is not supported)
- [Docker](https://docs.docker.com/get-docker/) with buildx support
- An OCI account with access to OCIR

## Install

```bash
# Run directly without installing
bunx oci-image-pusher

# Or install globally
bun add -g oci-image-pusher
```

## Usage

Run the CLI in your project directory:

```bash
# If installed globally
oci-push

# Or via bunx
bunx oci-image-pusher
```

On first run it will prompt you to:

1. Select an OCIR region (or enter a custom endpoint)
2. Enter your tenancy namespace
3. Choose a Docker image name
4. Select a Dockerfile

The config is saved to `.oci-push.json` so subsequent runs skip the setup.

## Supported Regions

Singapore, Tokyo, Osaka, Seoul, Sydney, Mumbai, US East (Ashburn), US West (Phoenix), Frankfurt, Amsterdam, London, or any custom OCIR endpoint.

## License

[MIT](LICENSE)
