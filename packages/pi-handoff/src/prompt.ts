export const DEFAULT_INSTRUCTION = `You are writing a handoff for the agent that replaces you. It starts with zero history; this document is all it gets.

Read the conversation history provided and the workspace facts if present. Produce a handoff that is self-contained and actionable.

Exactly these headings:
# Handoff — <one-line title>
## 1. What went before — goals, progress, key decisions with \`file:line\` refs, blockers.
## 2. Where things stand — branch/HEAD/uncommitted state, verified vs assumed, risks.
## 3. What comes next — next steps in priority order, open questions, what done looks like.

Aim for 400-600 words. Redact keys, tokens, passwords, and PII.`;

import { homedir } from "node:os";
import { isAbsolute, join, normalize, resolve } from "node:path";

export const RECEIVE_DIRECTIVE = [
  "A handoff from a previous session is above. Do not start work.",
  "Propose the next actions in priority order, based on the handoff's \u201CWhat comes next\u201D section.",
  "State what you will do and what you need from me. Then stop and wait for my confirmation.",
].join("\n");

export function resolvePromptPath(p: string, originDir: string, home: string): string {
  if (p === "~") return home;
  if (p.startsWith("~/")) return join(home, p.slice(2));
  if (isAbsolute(p)) return normalize(p);
  return resolve(originDir, p);
}

export type ConfigSource = {
  values: { instructions?: string; instructionsFile?: string };
  originDir: string;
};

export type ResolvePromptResult =
  | { ok: true; instruction: string; custom: boolean }
  | { ok: false; error: string };

function asSet(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value;
}

export function resolvePrompt(
  sources: ConfigSource[],
  readFile?: (p: string) => string,
): ResolvePromptResult {
  for (const source of sources) {
    const fileRef = asSet(source.values.instructionsFile);
    if (fileRef !== undefined) {
      const fullPath = resolvePromptPath(fileRef.trim(), source.originDir, homedir());
      if (readFile === undefined) {
        return { ok: false, error: `cannot read instructions file "${fullPath}": no readFile provided` };
      }
      let content: string;
      try {
        content = readFile(fullPath);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `cannot read instructions file "${fullPath}": ${detail}` };
      }
      return { ok: true, instruction: content, custom: true };
    }
    const inline = asSet(source.values.instructions);
    if (inline !== undefined) return { ok: true, instruction: inline, custom: true };
  }
  return { ok: true, instruction: DEFAULT_INSTRUCTION, custom: false };
}
