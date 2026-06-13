import { describe, expect, test } from "bun:test";
import { getHelpText, parseArgs } from "./cli";

describe("parseArgs", () => {
  test("enables non-interactive mode with --yes and custom config path", () => {
    expect(parseArgs(["--yes", "--config=./prod.json"])).toEqual({
      ok: true,
      options: {
        configPath: "./prod.json",
        help: false,
        yes: true,
      },
    });
  });

  test("enables non-interactive mode with -y and space-separated config path", () => {
    expect(parseArgs(["-y", "--config", "./prod.json"])).toEqual({
      ok: true,
      options: {
        configPath: "./prod.json",
        help: false,
        yes: true,
      },
    });
  });

  test("prints help for -h, --help, and help", () => {
    expect(parseArgs(["-h"])).toEqual({
      ok: true,
      options: { configPath: ".oci-push.json", help: true, yes: false },
    });
    expect(parseArgs(["--help"])).toEqual({
      ok: true,
      options: { configPath: ".oci-push.json", help: true, yes: false },
    });
    expect(parseArgs(["help"])).toEqual({
      ok: true,
      options: { configPath: ".oci-push.json", help: true, yes: false },
    });
  });

  test("returns a parse error for missing config values and unknown args", () => {
    expect(parseArgs(["--config"])).toEqual({
      ok: false,
      error: "--config requires a path.",
    });
    expect(parseArgs(["--wat"])).toEqual({
      ok: false,
      error: "Unknown argument: --wat",
    });
  });
});

describe("getHelpText", () => {
  test("documents non-interactive mode and config files", () => {
    const help = getHelpText("oci-push");

    expect(help).toContain("oci-push --yes --config=./.oci-push.json");
    expect(help).toContain("-y, --yes");
    expect(help).toContain("--config <path>");
    expect(help).toContain("--config=<path>");
  });
});
