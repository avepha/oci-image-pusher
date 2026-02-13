import * as p from "@clack/prompts";
import pc from "picocolors";
import { join } from "path";
import { isCancel } from "./helpers";
import { discoverDockerfile } from "./docker";

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

const CONFIG_FILE = ".oci-push.json";

async function loadConfig(): Promise<Config | null> {
  const configPath = join(process.cwd(), CONFIG_FILE);
  const file = Bun.file(configPath);
  if (await file.exists()) {
    try {
      const data = JSON.parse(await file.text());
      if (data.endpoint && data.namespace && data.imageName && data.dockerfile) return data;
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

export async function loadOrPromptConfig(): Promise<Config> {
  const saved = await loadConfig();

  if (saved) {
    p.note(
      `Endpoint:    ${pc.cyan(saved.endpoint)}\nNamespace:   ${pc.cyan(saved.namespace)}\nImage:       ${pc.cyan(saved.imageName)}\nDockerfile:  ${pc.cyan(saved.dockerfile)}`,
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

  const img = await p.text({
    message: "Docker Image Name",
    placeholder: "my-app",
    validate: (v) => (!v ? "Image name is required" : undefined),
  });
  if (isCancel(img)) process.exit(0);

  const dockerfile = await discoverDockerfile();

  const config: Config = { endpoint, namespace: ns, imageName: img, dockerfile };
  await saveConfig(config);
  return config;
}
