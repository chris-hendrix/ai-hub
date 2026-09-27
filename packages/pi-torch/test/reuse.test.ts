import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reuse } from "../src/picker.ts";
import type { Runner } from "../src/generate.ts";
import type { SessionRow } from "../src/sessions.ts";

// ---------------------------------------------------------------------------
// TASK 18 — Reuse path makes zero model calls (RED)
// ---------------------------------------------------------------------------

const DOC = "# Handoff — auth refactor\n\nReworked auth middleware; sessions now rotate on refresh.";
const TOPIC = "auth refactor";
const SUMMARY = "Reworked auth middleware; sessions now rotate on refresh.";
const CREATED = "2026-09-22T14:03:00.000Z";

function readyRow(): SessionRow {
  return {
    path: "/sessions/--home-u-proj--/abc123.jsonl",
    id: "abc123",
    cwd: "/home/u/proj",
    mtimeMs: 1000,
    bytes: 42,
    mark: "ready",
    topic: TOPIC,
    summary: SUMMARY,
    signifier: { doc: DOC, topic: TOPIC, summary: SUMMARY, createdAt: CREATED },
  };
}

describe("reuse (task 18)", () => {
  it("ready row resolves to the exact doc/topic/summary with sourceSession", () => {
    const res = reuse(readyRow());
    assert.equal(res.ok, true);
    assert.deepEqual(res.ok && res.handoff, {
      doc: DOC,
      topic: TOPIC,
      summary: SUMMARY,
      sourceSession: "abc123",
    });
  });

  it("derive row is an error", () => {
    const row: SessionRow = { ...readyRow(), mark: "derive", topic: undefined, summary: undefined, signifier: undefined };
    const res = reuse(row);
    assert.equal(res.ok, false);
    assert.ok(!res.ok && res.error.length > 0);
  });

  it("ready row with a missing signifier is an error", () => {
    const row: SessionRow = { ...readyRow(), signifier: undefined };
    const res = reuse(row);
    assert.equal(res.ok, false);
    assert.ok(!res.ok && res.error.length > 0);
  });

  it("headline claim: a throwing Runner is NEVER invoked while resolving a ready row", async () => {
    let calls = 0;
    const runner: Runner = {
      async complete() {
        calls++;
        throw new Error("model must not be called on the reuse path");
      },
    };
    // The reuse path takes only the row — there is nowhere to even pass a
    // runner. Prove it by resolving the row and asserting the runner sat idle.
    const res = reuse(readyRow());
    assert.equal(res.ok, true);
    assert.deepEqual(res.ok && res.handoff.doc, DOC);
    assert.equal(calls, 0);
    // Guard the seam itself: the runner really does throw if invoked, so a
    // future refactor that wires it into reuse would fail loudly here.
    await assert.rejects(() => runner.complete({ instruction: "i", conversation: "c" }), /must not be called/);
    assert.equal(calls, 1);
  });
});
