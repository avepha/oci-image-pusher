import { describe, expect, test } from "bun:test";
import { normalizeConfig, parseBuildArg } from "./config";

describe("normalizeConfig", () => {
  test("normalizes legacy single-image config", () => {
    const config = normalizeConfig({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      imageName: "my-app",
      dockerfile: "Dockerfile",
    });

    expect(config).toEqual({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      images: [
        {
          name: "my-app",
          dockerfile: "Dockerfile",
          context: ".",
          buildArgs: {},
        },
      ],
    });
  });

  test("normalizes multi-image config and preserves explicit fields", () => {
    const config = normalizeConfig({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      images: [
        {
          name: "nara-coop-frontend",
          dockerfile: "Dockerfile",
          context: ".",
          buildArgs: {
            VITE_API_BASE_URL: "https://api.example.com",
          },
        },
        {
          name: "nara-coop-api",
          dockerfile: "server/Dockerfile",
          context: "server",
          buildArgs: {},
        },
      ],
    });

    expect(config).toEqual({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      images: [
        {
          name: "nara-coop-frontend",
          dockerfile: "Dockerfile",
          context: ".",
          buildArgs: {
            VITE_API_BASE_URL: "https://api.example.com",
          },
        },
        {
          name: "nara-coop-api",
          dockerfile: "server/Dockerfile",
          context: "server",
          buildArgs: {},
        },
      ],
    });
  });

  test("defaults omitted multi-image context to Dockerfile parent", () => {
    const config = normalizeConfig({
      endpoint: "ap-singapore-1.ocir.io",
      namespace: "kx7mp2wrtqdf",
      images: [
        {
          name: "nara-coop-api",
          dockerfile: "server/Dockerfile",
        },
      ],
    });

    expect(config?.images[0]).toEqual({
      name: "nara-coop-api",
      dockerfile: "server/Dockerfile",
      context: "server",
      buildArgs: {},
    });
  });

  test("rejects invalid config shapes", () => {
    expect(normalizeConfig({ endpoint: "ap-singapore-1.ocir.io" })).toBeNull();
    expect(
      normalizeConfig({
        endpoint: "ap-singapore-1.ocir.io",
        namespace: "kx7mp2wrtqdf",
        images: [],
      })
    ).toBeNull();
  });
});

describe("parseBuildArg", () => {
  test("parses KEY=VALUE input and keeps equals signs in values", () => {
    expect(parseBuildArg("VITE_API_BASE_URL=https://api.example.com?a=b")).toEqual([
      "VITE_API_BASE_URL",
      "https://api.example.com?a=b",
    ]);
  });

  test("rejects malformed build arg input", () => {
    expect(parseBuildArg("")).toBeNull();
    expect(parseBuildArg("NO_VALUE")).toBeNull();
    expect(parseBuildArg("=missing-key")).toBeNull();
  });
});
