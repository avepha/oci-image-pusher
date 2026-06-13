import { afterEach, describe, expect, test } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { loadConfigFile, loadRequiredConfig, type Config } from "./config";

const tempFiles: string[] = [];

afterEach(async () => {
  await Promise.all(tempFiles.map((file) => Bun.file(file).delete().catch(() => undefined)));
  tempFiles.length = 0;
});

function tempConfigPath(name: string): string {
  const path = join(tmpdir(), `oci-image-pusher-${process.pid}-${name}.json`);
  tempFiles.push(path);
  return path;
}

describe("loadConfigFile", () => {
  test("loads a valid custom config file", async () => {
    const config: Config = {
      dockerfile: "Dockerfile",
      endpoint: "ap-singapore-1.ocir.io",
      imageName: "my-app",
      namespace: "tenant",
    };
    const path = tempConfigPath("valid");
    await Bun.write(path, JSON.stringify(config));

    await expect(loadConfigFile(path)).resolves.toEqual({
      ok: true,
      config,
    });
  });

  test("reports missing config files", async () => {
    const path = tempConfigPath("missing");

    await expect(loadConfigFile(path)).resolves.toEqual({
      ok: false,
      reason: "missing",
      message: `Config file not found: ${path}`,
    });
  });

  test("reports invalid config files", async () => {
    const path = tempConfigPath("invalid");
    await Bun.write(path, JSON.stringify({ endpoint: "ap-singapore-1.ocir.io" }));

    await expect(loadConfigFile(path)).resolves.toEqual({
      ok: false,
      reason: "invalid",
      message: `Config file is missing required fields: ${path}`,
    });
  });

  test("requires an existing valid config file for non-interactive mode", async () => {
    const path = tempConfigPath("required-missing");

    await expect(loadRequiredConfig(path)).rejects.toThrow(
      `Config file not found: ${path}. Non-interactive mode requires an existing valid config file.`
    );
  });
});
