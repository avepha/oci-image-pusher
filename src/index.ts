#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadOrPromptConfig } from "./config";
import { ensureDockerLogin, executeBuild } from "./docker";
import { isCancel } from "./helpers";
import type { ImageTarget } from "./config";

type BuildSelection = {
  push: boolean;
  images: ImageTarget[];
};

async function selectSingleImageBuild(image: ImageTarget): Promise<BuildSelection | null> {
  const mode = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "build-push", label: "Build and push" },
      { value: "build", label: "Build only" },
    ],
  });
  if (isCancel(mode)) return null;

  return {
    push: mode === "build-push",
    images: [image],
  };
}

async function selectTargetImage(images: readonly ImageTarget[]): Promise<ImageTarget | null> {
  const selectedName = await p.select({
    message: "Select image target",
    options: images.map((image) => ({
      value: image.name,
      label: image.name,
    })),
  });
  if (isCancel(selectedName)) return null;

  return images.find((image) => image.name === selectedName) ?? null;
}

async function selectMultiImageBuild(images: readonly ImageTarget[]): Promise<BuildSelection | null> {
  const mode = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "build-push-one", label: "Build and push one image" },
      { value: "build-push-all", label: "Build and push all images" },
      { value: "build-one", label: "Build one image locally" },
      { value: "build-all", label: "Build all images locally" },
    ],
  });
  if (isCancel(mode)) return null;

  const push = mode === "build-push-one" || mode === "build-push-all";
  const all = mode === "build-push-all" || mode === "build-all";

  if (all) {
    return {
      push,
      images: [...images],
    };
  }

  const image = await selectTargetImage(images);
  if (!image) return null;

  return {
    push,
    images: [image],
  };
}

async function main() {
  p.intro(pc.bgCyan(pc.black(" OCI Image Pusher ")));

  const config = await loadOrPromptConfig();
  const firstImage = config.images[0];
  if (!firstImage) {
    p.outro(pc.red("No image targets configured."));
    process.exit(1);
  }

  for (const image of config.images) {
    const ocirRepo = `${config.endpoint}/${config.namespace}/${image.name}`;
    p.log.info(`Repository: ${pc.cyan(ocirRepo)}`);
  }

  const selection =
    config.images.length === 1
      ? await selectSingleImageBuild(firstImage)
      : await selectMultiImageBuild(config.images);

  if (!selection) return;

  if (selection.push) {
    await ensureDockerLogin(config.endpoint, config.namespace);
  }

  for (const image of selection.images) {
    await executeBuild(config.endpoint, config.namespace, image, selection.push);
  }

  p.outro(pc.green(selection.push ? "Push flow completed." : "Build flow completed."));
}

main();
