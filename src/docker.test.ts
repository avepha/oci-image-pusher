import { describe, expect, test } from "bun:test";
import { buildDockerBuildCommand, formatDockerBuildCommand } from "./docker";
import type { ImageTarget } from "./config";

const frontendImage: ImageTarget = {
  name: "nara-coop-frontend",
  dockerfile: "Dockerfile",
  context: ".",
  buildArgs: {
    VITE_SUPABASE_URL: "https://your-project-ref.supabase.co",
    VITE_API_BASE_URL: "https://api.example.com",
  },
};

describe("buildDockerBuildCommand", () => {
  test("builds push command with tags, build args, dockerfile, and context", () => {
    const command = buildDockerBuildCommand({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      image: frontendImage,
      rev: "f85dbc5",
      push: true,
    });

    expect(command).toEqual([
      "docker",
      "buildx",
      "build",
      "--platform",
      "linux/amd64,linux/arm64",
      "-t",
      "ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-frontend:latest",
      "-t",
      "ap-singapore-1.ocir.io/kx7mp2wrtqdf/nara-coop-frontend:f85dbc5",
      "--build-arg",
      "VITE_SUPABASE_URL=https://your-project-ref.supabase.co",
      "--build-arg",
      "VITE_API_BASE_URL=https://api.example.com",
      "--push",
      "-f",
      "Dockerfile",
      ".",
    ]);
  });

  test("omits push flag for local builds", () => {
    const command = buildDockerBuildCommand({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      image: frontendImage,
      rev: "f85dbc5",
      push: false,
    });

    expect(command).not.toContain("--push");
  });
});

describe("formatDockerBuildCommand", () => {
  test("hides build arg values but keeps names visible", () => {
    const command = buildDockerBuildCommand({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      image: frontendImage,
      rev: "f85dbc5",
      push: true,
    });

    expect(formatDockerBuildCommand(command)).toContain(
      "--build-arg VITE_SUPABASE_URL=<hidden>"
    );
    expect(formatDockerBuildCommand(command)).toContain(
      "--build-arg VITE_API_BASE_URL=<hidden>"
    );
    expect(formatDockerBuildCommand(command)).not.toContain(
      "https://your-project-ref.supabase.co"
    );
    expect(formatDockerBuildCommand(command)).not.toContain("https://api.example.com");
  });
});
