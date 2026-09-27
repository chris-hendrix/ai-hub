import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import type { ConfigSource } from "./prompt.ts";

export type { ConfigSource } from "./prompt.ts";

type HandoffValues = { instructions?: string; instructionsFile?: string };

function defaultReadFile(p: string): string {
  return readFileSync(p, "utf-8");
}

function extractHandoffValues(parsed: unknown): HandoffValues {
  if (typeof parsed !== "object" || parsed === null) return {};
  const handoff: unknown = (parsed as Record<string, unknown>)["handoff"];
  if (typeof handoff !== "object" || handoff === null) return {};
  const record = handoff as Record<string, unknown>;
  const values: HandoffValues = {};
  if (typeof record["instructions"] === "string") values.instructions = record["instructions"];
  if (typeof record["instructionsFile"] === "string") values.instructionsFile = record["instructionsFile"];
  return values;
}

function loadSource(settingsPath: string, originDir: string, readFile: (p: string) => string): ConfigSource {
  let values: HandoffValues = {};
  try {
    values = extractHandoffValues(JSON.parse(readFile(settingsPath)) as unknown);
  } catch {
    values = {};
  }
  return { values, originDir };
}

export function readHandoffConfig(
  cwd: string,
  agentDir: string,
  readFile: (p: string) => string = defaultReadFile,
): ConfigSource[] {
  const projectDir = join(cwd, CONFIG_DIR_NAME);
  return [
    loadSource(join(projectDir, "settings.json"), projectDir, readFile),
    loadSource(join(agentDir, "settings.json"), agentDir, readFile),
  ];
}
