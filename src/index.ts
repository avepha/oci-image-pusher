#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadOrPromptConfig } from "./config";
import { ensureDockerLogin, executeBuild } from "./docker";
import { isCancel } from "./helpers";

async function main() {
  p.intro(pc.bgCyan(pc.black(" OCI Image Pusher ")));

  const config = await loadOrPromptConfig();
  const ocirRepo = `${config.endpoint}/${config.namespace}/${config.imageName}`;
  p.log.info(`Repository: ${pc.cyan(ocirRepo)}`);

  await ensureDockerLogin(config.endpoint, config.namespace);

  const mode = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "build-push", label: "Build and push" },
      { value: "build", label: "Build only" },
    ],
  });
  if (isCancel(mode)) return;

  await executeBuild(ocirRepo, config.dockerfile, mode === "build-push");
}

main();
