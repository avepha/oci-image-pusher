export const DEFAULT_CONFIG_FILE = ".oci-push.json";

export interface CliOptions {
  configPath: string;
  help: boolean;
  yes: boolean;
}

export type ParseArgsResult =
  | { ok: true; options: CliOptions }
  | { ok: false; error: string };

export function parseArgs(args: readonly string[]): ParseArgsResult {
  const options: CliOptions = {
    configPath: DEFAULT_CONFIG_FILE,
    help: false,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) continue;

    if (arg === "-h" || arg === "--help" || arg === "help") {
      options.help = true;
      continue;
    }

    if (arg === "-y" || arg === "--yes") {
      options.yes = true;
      continue;
    }

    if (arg === "--config") {
      const nextArg = args[index + 1];
      if (nextArg === undefined || nextArg.startsWith("-")) {
        return { ok: false, error: "--config requires a path." };
      }
      options.configPath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--config=")) {
      const configPath = arg.slice("--config=".length);
      if (configPath.length === 0) {
        return { ok: false, error: "--config requires a path." };
      }
      options.configPath = configPath;
      continue;
    }

    return { ok: false, error: `Unknown argument: ${arg}` };
  }

  return { ok: true, options };
}

export function getHelpText(commandName = "oci-push"): string {
  return [
    "OCI Image Pusher",
    "",
    "Usage:",
    `  ${commandName}`,
    `  ${commandName} --config=./.oci-push.json`,
    `  ${commandName} --yes --config=./.oci-push.json`,
    `  ${commandName} --help`,
    "",
    "Options:",
    "  -y, --yes           Run non-interactively. Requires an existing valid config and Docker login.",
    "  --config <path>     Load/save config from a JSON file instead of .oci-push.json.",
    "  --config=<path>     Same as --config <path>.",
    "  -h, --help          Show this help text.",
  ].join("\n");
}
