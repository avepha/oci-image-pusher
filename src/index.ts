#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { getHelpText, parseArgs } from "./cli";
import { loadOrPromptConfig, loadRequiredConfig } from "./config";
import { ensureDockerLogin, executeBuild } from "./docker";
import { isCancel } from "./helpers";

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  if (!parsedArgs.ok) {
    console.error(`${parsedArgs.error}\n\n${getHelpText()}`);
    process.exit(1);
  }

  if (parsedArgs.options.help) {
    console.log(getHelpText());
    return;
  }

  p.intro(pc.bgCyan(pc.black(" OCI Image Pusher ")));

  const config = parsedArgs.options.yes
    ? await loadRequiredConfig(parsedArgs.options.configPath)
    : await loadOrPromptConfig(parsedArgs.options.configPath);
  const ocirRepo = `${config.endpoint}/${config.namespace}/${config.imageName}`;
  p.log.info(`Repository: ${pc.cyan(ocirRepo)}`);

  await ensureDockerLogin(config.endpoint, config.namespace, {
    nonInteractive: parsedArgs.options.yes,
  });

  let shouldPush = true;
  if (!parsedArgs.options.yes) {
    const mode = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "build-push", label: "Build and push" },
        { value: "build", label: "Build only" },
      ],
    });
    if (isCancel(mode)) return;
    shouldPush = mode === "build-push";
  }

  await executeBuild(ocirRepo, config.dockerfile, shouldPush);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  p.log.error(message);
  process.exit(1);
});
