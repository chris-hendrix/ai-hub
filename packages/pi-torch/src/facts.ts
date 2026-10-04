import type { ExecOptions, ExecResult } from "@earendil-works/pi-coding-agent";

export type FactsInput = {
  branch: string;
  head: string;
  status: string;
  log: string;
};

/** Exec function with cwd already bound (see gatherFacts call site). */
export type ExecFn = (
  command: string,
  args: string[],
  options?: ExecOptions,
) => Promise<ExecResult>;

/**
 * Facts text (pure). Empty fields degrade to the parenthesized fallbacks.
 */
export function formatFacts(facts: FactsInput): string {
  const branch = facts.branch.trim() === "" ? "(unknown)" : facts.branch.trim();
  const head = facts.head.trim() === "" ? "(unknown)" : facts.head.trim();
  const status = facts.status.trim() === "" ? "(clean)" : facts.status;
  const log = facts.log.trim() === "" ? "(none)" : facts.log;
  return `branch: ${branch}\nhead: ${head}\nstatus:\n${status}\nrecent commits:\n${log}`;
}

async function run(exec: ExecFn, command: string, args: string[]): Promise<string> {
  try {
    const res = await exec(command, args);
    if (!res || res.code !== 0) return "";
    return res.stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Gather workspace facts via git. `status --short --branch` yields the
 * branch on line 1 prefixed `## `. Non-zero/empty output degrades to the
 * fallbacks in formatFacts; never throws.
 */
export function parseBranch(statusOut: string): string {
  const firstLine = statusOut.split("\n", 1)[0] ?? "";
  const m = /^##\s+(.*)$/.exec(firstLine.trim());
  if (!m) return "";
  const name = m[1]!.split("...")[0]!.trim();
  return name;
}

export async function gatherFacts(exec: ExecFn): Promise<string> {
  const [statusOut, head, log] = await Promise.all([
    run(exec, "git", ["status", "--short", "--branch"]),
    run(exec, "git", ["rev-parse", "--short", "HEAD"]),
    run(exec, "git", ["log", "--oneline", "-8"]),
  ]);
  const branch = parseBranch(statusOut);
  const rest = statusOut.split("\n").slice(1).join("\n").trim();
  return formatFacts({ branch, head, status: rest, log });
}
