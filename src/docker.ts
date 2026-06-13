import * as p from "@clack/prompts";
import pc from "picocolors";
import { join, dirname } from "path";
import { $, Glob } from "bun";
import { isCancel, run } from "./helpers";

interface DockerLoginOptions {
  nonInteractive?: boolean;
}

export async function ensureDockerLogin(
  endpoint: string,
  namespace: string,
  options: DockerLoginOptions = {}
): Promise<void> {
  const loginSpinner = p.spinner();
  loginSpinner.start("Checking Docker login status...");

  let loggedIn = false;
  let couldReadDockerConfig = true;
  try {
    const dockerConfigPath = join(
      process.env.HOME ?? "~",
      ".docker",
      "config.json"
    );
    const dockerConfigFile = Bun.file(dockerConfigPath);
    if (await dockerConfigFile.exists()) {
      const dockerConfig = JSON.parse(await dockerConfigFile.text());
      const auths = dockerConfig.auths ?? {};
      loggedIn = endpoint in auths;
    }
  } catch {
    couldReadDockerConfig = false;
  }

  if (loggedIn) {
    loginSpinner.stop(`Already logged in to ${pc.green(endpoint)}`);
    return;
  }

  if (options.nonInteractive) {
    loginSpinner.stop(`Not logged in to ${pc.yellow(endpoint)}`);
    const reason = couldReadDockerConfig
      ? `Docker login for ${endpoint} was not found.`
      : "Could not read Docker config to verify login.";
    p.log.error(`${reason} Run docker login first or retry without --yes.`);
    process.exit(1);
  }

  loginSpinner.stop(`Not logged in to ${pc.yellow(endpoint)}`);

  if (!couldReadDockerConfig) {
    p.log.warn("Could not read Docker config - will prompt for login.");
  }

  const username = await p.text({
    message: "Docker Username (OCI email or federated user)",
    validate: (v) => (!v ? "Username is required" : undefined),
  });
  if (isCancel(username)) return;

  const password = await p.password({
    message: "Docker Password / Auth Token",
    validate: (v) => (!v ? "Password is required" : undefined),
  });
  if (isCancel(password)) return;

  const proc = Bun.spawn(
    ["docker", "login", endpoint, "-u", `${namespace}/${username}`, "--password-stdin"],
    {
      stdin: new Response(password).body,
      stdout: "inherit",
      stderr: "inherit",
    }
  );
  const loginCode = await proc.exited;

  if (loginCode !== 0) {
    p.log.error("Docker login failed.");
    process.exit(1);
  }
  p.log.success("Docker login successful.");
}

export async function discoverDockerfile(): Promise<string> {
  const dockerfiles: string[] = [];
  const globber = new Glob("**/Dockerfile*");
  for await (const file of globber.scan(process.cwd())) {
    if (file.includes("node_modules") || file.includes(".git")) continue;
    dockerfiles.push(file);
  }

  if (dockerfiles.length === 0) {
    p.log.error("No Dockerfile found in current directory.");
    process.exit(1);
  }

  const dockerfile = dockerfiles[0];
  if (!dockerfile) {
    p.log.error("No Dockerfile found in current directory.");
    process.exit(1);
  }

  let selectedDockerfile = dockerfile;

  if (dockerfiles.length === 1) {
    const confirm = await p.confirm({
      message: `Use ${pc.cyan(dockerfile)}?`,
      initialValue: true,
    });
    if (isCancel(confirm)) process.exit(0);
    if (!confirm) {
      p.cancel("No Dockerfile selected.");
      process.exit(0);
    }
  } else {
    const selected = await p.select({
      message: "Select a Dockerfile",
      options: dockerfiles.map((f) => ({ value: f, label: f })),
    });
    if (isCancel(selected)) process.exit(0);
    selectedDockerfile = selected;
  }

  p.log.info(`Dockerfile: ${pc.cyan(selectedDockerfile)}`);
  return selectedDockerfile;
}

export async function executeBuild(ocirRepo: string, dockerfile: string, push: boolean) {
  let rev = "dev";
  try {
    rev = (await $`git rev-parse --short HEAD`.text()).trim() || "dev";
  } catch {
    // Not a git repo or git not available — fall back to "dev" tag
  }

  const args = [
    "docker", "buildx", "build",
    "--platform", "linux/amd64,linux/arm64",
    "-t", `${ocirRepo}:latest`,
    "-t", `${ocirRepo}:${rev}`,
  ];

  if (push) args.push("--push");

  const buildContext = dirname(dockerfile);
  args.push("-f", dockerfile, buildContext);

  p.log.step(`Running: ${pc.dim(args.join(" "))}`);

  const buildCode = await run(args);

  if (buildCode !== 0) {
    p.outro(pc.red("Build failed."));
    process.exit(1);
  }

  if (push) {
    p.outro(pc.green(`Pushed ${ocirRepo}:latest and ${ocirRepo}:${rev}`));
  } else {
    p.outro(pc.green("Build completed successfully."));
  }
}
