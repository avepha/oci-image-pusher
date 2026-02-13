import * as p from "@clack/prompts";

export function isCancel(value: unknown): value is symbol {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return false;
}

export async function run(cmd: string[]) {
  const proc = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  return await proc.exited;
}
