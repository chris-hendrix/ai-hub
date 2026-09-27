import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractTopic,
  extractSummary,
  formatRow,
  orderRows,
} from "../src/format.ts";
import type { SessionRow } from "../src/sessions.ts";

// Pin the timezone BEFORE any Date use so local-time formatting is deterministic.
// (Production renders in the user's local timezone; see formatStamp.)
process.env.TZ = "UTC";

// ---------------------------------------------------------------------------
// TASK 9 — Row formatting + ordering (RED)
// ---------------------------------------------------------------------------

describe("format (task 9: extractTopic)", () => {
  it("strips a leading handoff word plus em-dash separator", () => {
    assert.equal(extractTopic("# Handoff — auth refactor\n\nbody"), "auth refactor");
  });

  it("strips colon and hyphen separators", () => {
    assert.equal(extractTopic("# Handoff: auth refactor"), "auth refactor");
    assert.equal(extractTopic("# Handoff - auth refactor"), "auth refactor");
  });

  it("strips a bare leading handoff word", () => {
    assert.equal(extractTopic("# Handoff auth refactor"), "auth refactor");
  });

  it("keeps a non-handoff H1 as-is", () => {
    assert.equal(extractTopic("# Weekly notes\n\nbody"), "Weekly notes");
  });

  it("falls back when there is no H1", () => {
    assert.equal(extractTopic("just some text\nmore text"), "session handoff");
  });

  it("falls back when the H1 is only the word handoff", () => {
    assert.equal(extractTopic("# handoff"), "session handoff");
    assert.equal(extractTopic(""), "session handoff");
  });
});

describe("format (task 9: extractSummary)", () => {
  it("takes the first non-heading, non-blank line", () => {
    const doc = "# Handoff — t\n\n## 1. What went before\n\nDid the thing.\nSecond line.";
    assert.equal(extractSummary(doc), "Did the thing.");
  });

  it("returns short lines unchanged with no ellipsis", () => {
    assert.equal(extractSummary("short summary"), "short summary");
  });

  it("truncates ~120 chars on a word boundary with an ellipsis", () => {
    const long = "word ".repeat(40).trim(); // 199 chars
    const out = extractSummary(long);
    assert.ok(out.endsWith("…"), `expected ellipsis: ${out}`);
    assert.ok(out.length <= 121, `too long: ${out.length}`);
    assert.ok(!out.slice(0, -1).endsWith(" wor"), `split mid-word: ${out}`);
    // No partial trailing word: char before … must not be mid-word.
    assert.match(out, /^\S+( \S+)*…$/);
  });

  it("hard-cuts strings with no spaces", () => {
    const out = extractSummary("x".repeat(200));
    assert.equal(out, "x".repeat(120) + "…");
  });

  it("returns empty string when there is no body line", () => {
    assert.equal(extractSummary("# Only a heading\n## another"), "");
  });
});

describe("format (task 9: formatRow)", () => {
  // Fixed clock: tests must not depend on machine TZ (formatRow uses UTC).
  const NOW = Date.UTC(2026, 8, 26, 12, 0, 0);

  function ready(): SessionRow {
    return {
      path: "/s/--d--/a.jsonl",
      id: "aaa",
      cwd: "/home/u/proj",
      mtimeMs: Date.UTC(2026, 8, 22, 14, 3),
      bytes: 1024,
      mark: "ready",
      topic: "auth refactor",
      summary: "Reworked auth middleware.",
      signifier: {
        doc: "d",
        topic: "auth refactor",
        summary: "Reworked auth middleware.",
        createdAt: "2026-09-22T14:03:00.000Z",
      },
    };
  }

  function derive(): SessionRow {
    return {
      path: "/s/--d--/b.jsonl",
      id: "bbb",
      cwd: "/home/u/proj",
      mtimeMs: Date.UTC(2026, 8, 20, 9, 2),
      bytes: Math.round(12.4 * 1024 * 1024),
      mark: "derive",
    };
  }

  it("formats ready rows with topic + summary", () => {
    const { label, description } = formatRow(ready(), NOW);
    assert.equal(label, "⧉ 09-22 14:03 · auth refactor");
    assert.equal(description, "Reworked auth middleware.");
  });

  it("formats derive rows with size + cwd (no message count)", () => {
    const { label, description } = formatRow(derive(), NOW);
    assert.equal(label, "＋ 09-20 09:02 · proj");
    assert.equal(description, "12.4 MB · /home/u/proj");
  });

  it("formats byte sizes human-readably", () => {
    const base = derive();
    const kb = formatRow({ ...base, bytes: 512 }, NOW);
    assert.ok(kb.description.startsWith("512 B · "), kb.description);
    const gb = formatRow({ ...base, bytes: 2 * 1024 * 1024 * 1024 }, NOW);
    assert.ok(gb.description.startsWith("2.0 GB · "), gb.description);
  });
});

describe("format (task 9: orderRows)", () => {
  function row(id: string, cwd: string, mtimeMs: number): SessionRow {
    return { path: `/s/${id}.jsonl`, id, cwd, mtimeMs, bytes: 10, mark: "derive" };
  }

  it("pins matching-cwd rows first, then mtime desc", () => {
    const rows = [
      row("old-here", "/here", 1000),
      row("new-away", "/away", 3000),
      row("new-here", "/here", 2000),
    ];
    assert.deepEqual(
      orderRows(rows, "/here").map((r) => r.id),
      ["new-here", "old-here", "new-away"],
    );
  });

  it("is stable for equal keys", () => {
    const rows = [row("a", "/x", 1000), row("b", "/x", 1000), row("c", "/y", 1000)];
    assert.deepEqual(
      orderRows(rows, "/z").map((r) => r.id),
      ["a", "b", "c"],
    );
  });

  it("does not mutate the input array", () => {
    const rows = [row("a", "/x", 1000), row("b", "/x", 2000)];
    const copy = [...rows];
    orderRows(rows, "/x");
    assert.deepEqual(rows, copy);
  });
});
