import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INSTRUCTION, resolvePrompt, resolvePromptPath } from "../src/prompt.ts";

const EXPECTED_DEFAULT = `You are writing a handoff for the agent that replaces you. It starts with zero history; this document is all it gets.

Read the conversation history provided and the workspace facts if present. Produce a handoff that is self-contained and actionable.

Exactly these headings:
# Handoff — <one-line title>
## 1. What went before — goals, progress, key decisions with \`file:line\` refs, blockers.
## 2. Where things stand — branch/HEAD/uncommitted state, verified vs assumed, risks.
## 3. What comes next — next steps in priority order, open questions, what done looks like.

Aim for 400-600 words. Redact keys, tokens, passwords, and PII.`;

describe("prompt (task 4: inline override + precedence)", () => {
  it("project inline beats global inline", () => {
    const result = resolvePrompt([
      { values: { instructions: "project text" }, originDir: "/proj/.pi" },
      { values: { instructions: "global text" }, originDir: "/home/u/.pi/agent" },
    ]);
    assert.deepEqual(result, { ok: true, instruction: "project text", custom: true });
  });

  it("global inline wins when project sets nothing", () => {
    const result = resolvePrompt([
      { values: {}, originDir: "/proj/.pi" },
      { values: { instructions: "global text" }, originDir: "/home/u/.pi/agent" },
    ]);
    assert.deepEqual(result, { ok: true, instruction: "global text", custom: true });
  });

  it("empty/whitespace-only instructions are treated as unset", () => {
    const result = resolvePrompt([
      { values: { instructions: "   " }, originDir: "/proj/.pi" },
      { values: { instructions: "" }, originDir: "/home/u/.pi/agent" },
    ]);
    assert.deepEqual(result, { ok: true, instruction: EXPECTED_DEFAULT, custom: false });
  });

  it("whitespace-only project inline falls through to global inline", () => {
    const result = resolvePrompt([
      { values: { instructions: " \n\t " }, originDir: "/proj/.pi" },
      { values: { instructions: "global text" }, originDir: "/home/u/.pi/agent" },
    ]);
    assert.deepEqual(result, { ok: true, instruction: "global text", custom: true });
  });
});

describe("prompt (task 5: file override, origin resolution, failure)", () => {
  it("within one source instructionsFile beats instructions", () => {
    const files: Record<string, string> = { "/proj/.pi/custom.md": "file text" };
    const result = resolvePrompt(
      [{ values: { instructions: "inline text", instructionsFile: "custom.md" }, originDir: "/proj/.pi" }],
      (p) => files[p]!,
    );
    assert.deepEqual(result, { ok: true, instruction: "file text", custom: true });
  });

  it("a relative path resolves against that source's originDir", () => {
    const seen: string[] = [];
    const result = resolvePrompt(
      [{ values: { instructionsFile: "sub/dir/custom.md" }, originDir: "/proj/.pi" }],
      (p) => {
        seen.push(p);
        return "file text";
      },
    );
    assert.deepEqual(seen, ["/proj/.pi/sub/dir/custom.md"]);
    assert.deepEqual(result, { ok: true, instruction: "file text", custom: true });
  });

  it("a leading ~ expands to the home directory", () => {
    const seen: string[] = [];
    const result = resolvePrompt(
      [{ values: { instructionsFile: "~/shared/handoff.md" }, originDir: "/proj/.pi" }],
      (p) => {
        seen.push(p);
        return "file text";
      },
    );
    assert.ok(seen[0]!.endsWith("/shared/handoff.md"), `unexpected path: ${seen[0]}`);
    assert.ok(!seen[0]!.startsWith("/proj"), `should not resolve against originDir: ${seen[0]}`);
    assert.deepEqual(result, { ok: true, instruction: "file text", custom: true });
  });

  it("absolute paths are used as-is", () => {
    const seen: string[] = [];
    const result = resolvePrompt(
      [{ values: { instructionsFile: "/etc/handoff.md" }, originDir: "/proj/.pi" }],
      (p) => {
        seen.push(p);
        return "file text";
      },
    );
    assert.deepEqual(seen, ["/etc/handoff.md"]);
    assert.deepEqual(result, { ok: true, instruction: "file text", custom: true });
  });

  it("a read failure aborts with the path in the error and never falls back", () => {
    const result = resolvePrompt(
      [
        { values: { instructionsFile: "missing.md" }, originDir: "/proj/.pi" },
        { values: { instructions: "global fallback" }, originDir: "/home/u/.pi/agent" },
      ],
      (_p) => {
        throw new Error("ENOENT: no such file");
      },
    );
    assert.equal(result.ok, false);
    assert.ok(
      (result as { ok: false; error: string }).error.includes("/proj/.pi/missing.md"),
      `error should contain the path: ${JSON.stringify(result)}`,
    );
  });
});

describe("prompt (task 5b: resolvePromptPath pure helper)", () => {
  it("resolves relative against originDir, ~ against homedir, absolute as-is", () => {
    assert.equal(resolvePromptPath("a/b.md", "/proj/.pi", "/home/u"), "/proj/.pi/a/b.md");
    assert.equal(resolvePromptPath("~/x.md", "/proj/.pi", "/home/u"), "/home/u/x.md");
    assert.equal(resolvePromptPath("/abs/x.md", "/proj/.pi", "/home/u"), "/abs/x.md");
  });
});

describe("prompt (task 3: default instruction)", () => {
  it("DEFAULT_INSTRUCTION is exactly the specified text", () => {
    assert.equal(DEFAULT_INSTRUCTION, EXPECTED_DEFAULT);
  });

  it("resolvePrompt([]) returns the default with custom:false", () => {
    const result = resolvePrompt([]);
    assert.deepEqual(result, { ok: true, instruction: EXPECTED_DEFAULT, custom: false });
  });
});
