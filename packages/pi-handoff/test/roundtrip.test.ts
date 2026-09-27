import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatRow } from "../src/format.ts";
import { reuse } from "../src/picker.ts";
import { nodeScanFs, parseSignifierTail, scanRootFor, scanSessions } from "../src/sessions.ts";

// ---------------------------------------------------------------------------
// TASK 19 — Round-trip fixture (RED)
// ---------------------------------------------------------------------------

const DOC = "# Handoff — auth refactor\n\nReworked auth middleware; sessions now rotate on refresh.";
const TOPIC = "auth refactor";
const SUMMARY = "Reworked auth middleware; sessions now rotate on refresh.";
const CREATED_AT = "2026-09-22T14:03:00.000Z";
const SESSION_ID = "abc123def456";
const SESSION_CWD = "/home/u/proj";

describe("round-trip (task 19)", () => {
  it("signifier line -> tail parse -> formatRow -> reuse preserves everything", () => {
    // Serialize exactly as pi.appendEntry("handoff", sig) shapes it: a CustomEntry line.
    const line = JSON.stringify({
      type: "custom",
      customType: "handoff",
      id: "entry-1",
      parentId: null,
      timestamp: CREATED_AT,
      data: { doc: DOC, topic: TOPIC, summary: SUMMARY, createdAt: CREATED_AT },
    });

    const sig = parseSignifierTail(line, { fromStart: true });
    assert.ok(sig !== undefined);
    assert.equal(sig.doc, DOC);
    assert.equal(sig.topic, TOPIC);
    assert.equal(sig.summary, SUMMARY);
    assert.equal(sig.createdAt, CREATED_AT);

    const row = {
      path: "/sessions/--x--/abc.jsonl",
      id: SESSION_ID,
      cwd: SESSION_CWD,
      mtimeMs: Date.parse(CREATED_AT),
      bytes: 100,
      mark: "ready" as const,
      topic: sig.topic,
      summary: sig.summary,
      signifier: sig,
    };
    const { label, description } = formatRow(row, Date.now());
    assert.ok(label.includes(TOPIC), `label missing topic: ${label}`);
    assert.equal(description, SUMMARY);

    const res = reuse(row);
    assert.equal(res.ok, true);
    assert.deepEqual(res.ok && res.handoff, {
      doc: DOC,
      topic: TOPIC,
      summary: SUMMARY,
      sourceSession: SESSION_ID,
    });
  });

  it("real temp dir: genuine .jsonl session file round-trips through the real reader", () => {
    const root = mkdtempSync(join(tmpdir(), "pi-handoff-roundtrip-"));
    try {
      const encDir = join(root, "--home-u-proj--");
      mkdirSync(encDir, { recursive: true });
      const header = JSON.stringify({ type: "session", id: SESSION_ID, cwd: SESSION_CWD });
      const assistantMsg = JSON.stringify({
        type: "message",
        message: { role: "assistant", content: "did the auth work", timestamp: Date.now() },
      });
      const signifierLine = JSON.stringify({
        type: "custom",
        customType: "handoff",
        id: "entry-9",
        parentId: "entry-8",
        timestamp: CREATED_AT,
        data: { doc: DOC, topic: TOPIC, summary: SUMMARY, createdAt: CREATED_AT },
      });
      const filePath = join(encDir, `${SESSION_ID}.jsonl`);
      writeFileSync(filePath, [header, assistantMsg, signifierLine].join("\n") + "\n");

      // The REAL reader (node:fs), not the fake fs.
      const rows = scanSessions({ root, fs: nodeScanFs() });
      assert.equal(rows.length, 1);
      const row = rows[0]!;
      assert.equal(row.id, SESSION_ID);
      assert.equal(row.cwd, SESSION_CWD);
      assert.equal(row.mark, "ready");
      assert.equal(row.signifier?.doc, DOC);
      assert.equal(row.signifier?.topic, TOPIC);
      assert.equal(row.signifier?.summary, SUMMARY);
      assert.equal(row.signifier?.createdAt, CREATED_AT);

      const res = reuse(row);
      assert.equal(res.ok, true);
      assert.deepEqual(res.ok && res.handoff, {
        doc: DOC,
        topic: TOPIC,
        summary: SUMMARY,
        sourceSession: SESSION_ID,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // DEFECT REGRESSION: the default session dir is the encoded leaf, which holds
  // .jsonl files directly. Scanning it must find them (real node:fs, flat root).
  it("real temp leaf dir (files directly in root) yields rows", () => {
    const parent = mkdtempSync(join(tmpdir(), "pi-handoff-flatroot-"));
    try {
      const leaf = join(parent, "--home-u-proj--");
      mkdirSync(leaf, { recursive: true });
      const header = JSON.stringify({ type: "session", id: SESSION_ID, cwd: SESSION_CWD });
      const signifierLine = JSON.stringify({
        type: "custom",
        customType: "handoff",
        id: "entry-9",
        parentId: "entry-8",
        timestamp: CREATED_AT,
        data: { doc: DOC, topic: TOPIC, summary: SUMMARY, createdAt: CREATED_AT },
      });
      writeFileSync(
        join(leaf, `${SESSION_ID}.jsonl`),
        [header, signifierLine].join("\n") + "\n",
      );

      // What index.ts does: the manager's dir goes through scanRootFor.
      const rows = scanSessions({ root: scanRootFor(leaf), fs: nodeScanFs() });
      assert.equal(rows.length, 1);
      assert.equal(rows[0]!.id, SESSION_ID);
      assert.equal(rows[0]!.mark, "ready");

      // And a flat root (a custom --session-dir) is scanned as-is.
      const flat = scanSessions({ root: leaf, fs: nodeScanFs() });
      assert.equal(flat.length, 1);
      assert.equal(flat[0]!.id, SESSION_ID);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
