import * as p from "@clack/prompts";
import pc from "picocolors";
import { dirname, join } from "path";
import { isCancel } from "./helpers";
import { discoverDockerfile } from "./docker";

export interface ImageTarget {
  name: string;
  dockerfile: string;
  context: string;
  buildArgs: Record<string, string>;
}

export interface Config {
  endpoint: string;
  namespace: string;
  images: ImageTarget[];
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

const CONFIG_FILE = ".oci-push.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function getDefaultContext(dockerfile: string): string {
  return dirname(dockerfile) || ".";
}

function normalizeBuildArgs(value: unknown): Record<string, string> | null {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;

  const buildArgs: Record<string, string> = {};
  for (const [key, argValue] of Object.entries(value)) {
    if (typeof argValue !== "string") return null;
    buildArgs[key] = argValue;
  }
  return buildArgs;
}

export function normalizeImageTarget(raw: unknown): ImageTarget | null {
  if (!isRecord(raw)) return null;

  const name = readString(raw.name);
  const dockerfile = readString(raw.dockerfile);
  if (!name || !dockerfile) return null;

  const context = readString(raw.context) ?? getDefaultContext(dockerfile);
  const buildArgs = normalizeBuildArgs(raw.buildArgs);
  if (!buildArgs) return null;

  return { name, dockerfile, context, buildArgs };
}

export function normalizeConfig(raw: unknown): Config | null {
  if (!isRecord(raw)) return null;

  const endpoint = readString(raw.endpoint);
  const namespace = readString(raw.namespace);
  if (!endpoint || !namespace) return null;

  const legacyImageName = readString(raw.imageName);
  const legacyDockerfile = readString(raw.dockerfile);
  if (legacyImageName && legacyDockerfile) {
    return {
      endpoint,
      namespace,
      images: [
        {
          name: legacyImageName,
          dockerfile: legacyDockerfile,
          context: ".",
          buildArgs: {},
        },
      ],
    };
  }

  if (!Array.isArray(raw.images) || raw.images.length === 0) return null;

  const images = raw.images.map(normalizeImageTarget);
  if (images.some((image) => image === null)) return null;

  return {
    endpoint,
    namespace,
    images: images.filter((image): image is ImageTarget => image !== null),
  };
}

export function parseBuildArg(input: string): [string, string] | null {
  const separator = input.indexOf("=");
  if (separator <= 0) return null;

  const key = input.slice(0, separator).trim();
  const value = input.slice(separator + 1);
  if (!key) return null;

  return [key, value];
}

function buildArgNames(buildArgs: Record<string, string>): string {
  const names = Object.keys(buildArgs);
  return names.length > 0 ? names.join(", ") : pc.dim("none");
}

function formatImagesSummary(images: readonly ImageTarget[]): string {
  return images
    .map((image) =>
      [
        `Image:       ${pc.cyan(image.name)}`,
        `Dockerfile:  ${pc.cyan(image.dockerfile)}`,
        `Context:     ${pc.cyan(image.context)}`,
        `Build args:  ${buildArgNames(image.buildArgs)}`,
      ].join("\n")
    )
    .join("\n\n");
}

async function loadConfig(): Promise<Config | null> {
  const configPath = join(process.cwd(), CONFIG_FILE);
  const file = Bun.file(configPath);
  if (await file.exists()) {
    try {
      return normalizeConfig(JSON.parse(await file.text()));
    } catch {
      p.log.warn("Found .oci-push.json but it could not be parsed — ignoring.");
    }
  }
  return null;
}

async function saveConfig(config: Config) {
  await Bun.write(
    join(process.cwd(), CONFIG_FILE),
    JSON.stringify(config, null, 2) + "\n"
  );
}

async function promptBuildArgs(): Promise<Record<string, string>> {
  p.log.warn(
    "Build args are not secrets. Do not store passwords, private API keys, OCI auth tokens, Supabase service-role keys, or other private credentials."
  );

  const buildArgs: Record<string, string> = {};
  while (true) {
    const entry = await p.text({
      message: "Build arg KEY=VALUE (leave blank when done)",
      placeholder: "VITE_API_BASE_URL=https://api.example.com",
      validate: (value) => {
        if (!value) return undefined;
        return parseBuildArg(value) ? undefined : "Use KEY=VALUE format";
      },
    });
    if (isCancel(entry)) process.exit(0);
    if (!entry) return buildArgs;

    const parsed = parseBuildArg(entry);
    if (parsed) {
      const [key, value] = parsed;
      buildArgs[key] = value;
    }
  }
}

async function promptImageTarget(): Promise<ImageTarget> {
  const name = await p.text({
    message: "Docker Image Name",
    placeholder: "my-app",
    validate: (value) => (!value ? "Image name is required" : undefined),
  });
  if (isCancel(name)) process.exit(0);

  const dockerfile = await discoverDockerfile();
  const defaultContext = getDefaultContext(dockerfile);
  const contextInput = await p.text({
    message: "Build context",
    placeholder: defaultContext,
  });
  if (isCancel(contextInput)) process.exit(0);

  const buildArgs = await promptBuildArgs();

  return {
    name,
    dockerfile,
    context: contextInput || defaultContext,
    buildArgs,
  };
}

async function promptImageTargets(): Promise<ImageTarget[]> {
  const images: ImageTarget[] = [];

  while (true) {
    images.push(await promptImageTarget());

    const addAnother = await p.confirm({
      message: "Add another image target?",
      initialValue: false,
    });
    if (isCancel(addAnother)) process.exit(0);
    if (!addAnother) return images;
  }
}

export async function loadOrPromptConfig(): Promise<Config> {
  const saved = await loadConfig();

  if (saved) {
    p.note(
      `Endpoint:    ${pc.cyan(saved.endpoint)}\nNamespace:   ${pc.cyan(saved.namespace)}\n\n${formatImagesSummary(saved.images)}`,
      "Using saved config (.oci-push.json)"
    );
    return saved;
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

  const images = await promptImageTargets();

  const config: Config = { endpoint, namespace: ns, images };
  await saveConfig(config);
  return config;
}
