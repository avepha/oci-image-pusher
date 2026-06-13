import * as p from "@clack/prompts";
import pc from "picocolors";
import { dirname, isAbsolute, join } from "path";
import { mkdir } from "node:fs/promises";
import { isCancel } from "./helpers";
import { discoverDockerfile } from "./docker";
import { DEFAULT_CONFIG_FILE } from "./cli";

export interface Config {
  endpoint: string;
  namespace: string;
  imageName: string;
  dockerfile: string;
}

export const OCIR_REGIONS = [
  { value: "ap-singapore-1.ocir.io", label: "Singapore (ap-singapore-1.ocir.io)" },
  { value: "ap-tokyo-1.ocir.io", label: "Tokyo (ap-tokyo-1.ocir.io)" },
  { value: "ap-osaka-1.ocir.io", label: "Osaka (ap-osaka-1.ocir.io)" },
  { value: "ap-seoul-1.ocir.io", label: "Seoul (ap-seoul-1.ocir.io)" },
  { value: "ap-sydney-1.ocir.io", label: "Sydney (ap-sydney-1.ocir.io)" },
  { value: "ap-mumbai-1.ocir.io", label: "Mumbai (ap-mumbai-1.ocir.io)" },
  { value: "us-ashburn-1.ocir.io", label: "US East - Ashburn (us-ashburn-1.ocir.io)" },
  { value: "us-phoenix-1.ocir.io", label: "US West - Phoenix (us-phoenix-1.ocir.io)" },
  { value: "eu-frankfurt-1.ocir.io", label: "Frankfurt (eu-frankfurt-1.ocir.io)" },
  { value: "eu-amsterdam-1.ocir.io", label: "Amsterdam (eu-amsterdam-1.ocir.io)" },
  { value: "uk-london-1.ocir.io", label: "London (uk-london-1.ocir.io)" },
  { value: "custom", label: "Custom endpoint" },
];

export type ConfigLoadResult =
  | { ok: true; config: Config }
  | { ok: false; reason: "missing" | "invalid"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConfig(value: unknown): value is Config {
  if (!isRecord(value)) return false;
  return (
    typeof value.endpoint === "string" &&
    typeof value.namespace === "string" &&
    typeof value.imageName === "string" &&
    typeof value.dockerfile === "string" &&
    value.endpoint.length > 0 &&
    value.namespace.length > 0 &&
    value.imageName.length > 0 &&
    value.dockerfile.length > 0
  );
}

function resolveConfigPath(configPath: string): string {
  return isAbsolute(configPath) ? configPath : join(process.cwd(), configPath);
}

export async function loadConfigFile(configPath: string): Promise<ConfigLoadResult> {
  const resolvedConfigPath = resolveConfigPath(configPath);
  const file = Bun.file(resolvedConfigPath);
  if (!(await file.exists())) {
    return {
      ok: false,
      reason: "missing",
      message: `Config file not found: ${resolvedConfigPath}`,
    };
  }

  try {
    const data: unknown = JSON.parse(await file.text());
    if (isConfig(data)) return { ok: true, config: data };
  } catch {
    return {
      ok: false,
      reason: "invalid",
      message: `Config file could not be parsed: ${resolvedConfigPath}`,
    };
  }

  return {
    ok: false,
    reason: "invalid",
    message: `Config file is missing required fields: ${resolvedConfigPath}`,
  };
}

async function saveConfig(config: Config, configPath: string) {
  const resolvedConfigPath = resolveConfigPath(configPath);
  await mkdir(dirname(resolvedConfigPath), { recursive: true });
  await Bun.write(
    resolvedConfigPath,
    JSON.stringify(config, null, 2) + "\n"
  );
}

export async function loadRequiredConfig(configPath = DEFAULT_CONFIG_FILE): Promise<Config> {
  const result = await loadConfigFile(configPath);
  if (result.ok) return result.config;

  throw new Error(`${result.message}. Non-interactive mode requires an existing valid config file.`);
}

export async function loadOrPromptConfig(configPath = DEFAULT_CONFIG_FILE): Promise<Config> {
  const saved = await loadConfigFile(configPath);

  if (saved.ok) {
    p.note(
      `Endpoint:    ${pc.cyan(saved.config.endpoint)}\nNamespace:   ${pc.cyan(saved.config.namespace)}\nImage:       ${pc.cyan(saved.config.imageName)}\nDockerfile:  ${pc.cyan(saved.config.dockerfile)}`,
      `Using saved config (${configPath})`
    );
    return saved.config;
  }

  if (saved.reason === "invalid") {
    p.log.warn(`${saved.message} - ignoring.`);
  }

  const regionChoice = await p.select({
    message: "Select OCIR Region",
    options: OCIR_REGIONS,
    initialValue: "ap-singapore-1.ocir.io",
  });
  if (isCancel(regionChoice)) process.exit(0);

  let endpoint: string;
  if (regionChoice === "custom") {
    const customEp = await p.text({
      message: "Enter custom OCIR endpoint",
      placeholder: "region-key.ocir.io",
      validate: (v) => (!v ? "Endpoint is required" : undefined),
    });
    if (isCancel(customEp)) process.exit(0);
    endpoint = customEp;
  } else {
    endpoint = regionChoice;
  }

  p.log.info(
    pc.dim("Find it at: OCI Console → Profile → Tenancy → Object Storage Namespace")
  );
  const ns = await p.text({
    message: "OCIR Tenancy Namespace",
    placeholder: "e.g. kx7mp2wrtqdf",
    validate: (v) => (!v ? "Namespace is required" : undefined),
  });
  if (isCancel(ns)) process.exit(0);

  const img = await p.text({
    message: "Docker Image Name",
    placeholder: "my-app",
    validate: (v) => (!v ? "Image name is required" : undefined),
  });
  if (isCancel(img)) process.exit(0);

  const dockerfile = await discoverDockerfile();

  const config: Config = { endpoint, namespace: ns, imageName: img, dockerfile };
  await saveConfig(config, configPath);
  return config;
}
