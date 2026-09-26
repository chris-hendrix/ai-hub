import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseSignifierTail,
  scanSessions,
  nodeScanFs,
  type ScanFs,
} from "../src/sessions.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sigLine(doc: string, topic: string, summary = "s", createdAt = "2026-09-22T14:03:00.000Z"): string {
  return JSON.stringify({
    type: "custom",
    customType: "handoff",
    data: { doc, topic, summary, createdAt },
  });
}

function headerLine(id: string, cwd: string): string {
  return JSON.stringify({ type: "session", id, cwd });
}

// Minimal in-memory fs facade: files maps absolute path -> full content.
function makeFakeFs(files: Record<string, string>, mtimes: Record<string, number> = {}): ScanFs {
  const norm = (p: string) => p.replace(/\/+$/, "") || "/";
  const isFile = (p: string) => Object.hasOwn(files, p);
  const childNames = (dir: string): string[] => {
    const prefix = norm(dir) + "/";
    const names = new Set<string>();
    for (const p of Object.keys(files)) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      const seg = rest.split("/")[0]!;
      if (seg !== undefined && seg !== "") names.add(seg);
    }
    // Include intermediate dirs implied by nested paths.
    return [...names];
  };
  const isDir = (p: string) => !isFile(p) && childNames(p).length > 0;
  return {
    readdir(path: string): string[] {
      if (!isDir(path)) throw new Error(`ENOTDIR: ${path}`);
      return childNames(path);
    },
    stat(path: string): { mtimeMs: number; size: number } {
      if (!isFile(path)) throw new Error(`ENOENT: ${path}`);
      const content = files[path]!;
      return { mtimeMs: mtimes[path] ?? 0, size: Buffer.byteLength(content) };
    },
    readHead(path: string, bytes: number): string {
      if (!isFile(path)) throw new Error(`ENOENT: ${path}`);
      return Buffer.from(files[path]!).subarray(0, bytes).toString("utf8");
    },
    readTail(path: string, bytes: number): string {
      if (!isFile(path)) throw new Error(`ENOENT: ${path}`);
      const buf = Buffer.from(files[path]!);
      return buf.subarray(Math.max(0, buf.length - bytes)).toString("utf8");
    },
  };
}

// ---------------------------------------------------------------------------
// TASK 7 — Tail parse (RED)
// ---------------------------------------------------------------------------

describe("sessions (task 7: parseSignifierTail)", () => {
  it("finds a valid signifier (enveloped in data)", () => {
    const tail = [
      headerLine("abc123", "/proj"),
      JSON.stringify({ type: "message", content: "hi" }),
      sigLine("# Handoff — auth refactor\n\nDid things.", "auth refactor", "Did things."),
    ].join("\n");
    const sig = parseSignifierTail(tail, { fromStart: true });
    assert.deepEqual(sig, {
      doc: "# Handoff — auth refactor\n\nDid things.",
      topic: "auth refactor",
      summary: "Did things.",
      createdAt: "2026-09-22T14:03:00.000Z",
      from: undefined,
    });
  });

  it("drops a truncated leading line by default (mid-line tail start)", () => {
    // Tail buffer starts mid-line: the first fragment is garbage, then a header
    // line (dropped as the partial line) and a complete signifier after it.
    const full = [
      headerLine("abc123", "/proj"),
      sigLine("doc-a", "topic-a"),
    ].join("\n");
    const cut = full.slice(10); // starts mid-line inside the header line
    assert.ok(!cut.startsWith("{"));
    const sig = parseSignifierTail(cut);
    assert.equal(sig?.doc, "doc-a");
  });

  it("keeps the first line when fromStart is set", () => {
    const tail = sigLine("doc-first", "topic-first");
    assert.equal(parseSignifierTail(tail, { fromStart: true })?.doc, "doc-first");
  });

  it("by default drops a first line that is itself a complete signifier", () => {
    // Documents the discard rule: a tail that IS the whole file must be
    // parsed with { fromStart: true } (scanSessions does this for small files).
    const tail = sigLine("doc-first", "topic-first");
    assert.equal(parseSignifierTail(tail), undefined);
  });

  it("takes the LAST signifier within the window", () => {
    const tail = [
      headerLine("abc123", "/proj"),
      sigLine("doc-old", "topic-old"),
      JSON.stringify({ type: "message", content: "x" }),
      sigLine("doc-new", "topic-new"),
    ].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true })?.doc, "doc-new");
  });

  it("does NOT find a signifier older than 20 lines", () => {
    const filler = Array.from({ length: 20 }, (_, i) =>
      JSON.stringify({ type: "message", content: `filler-${i}` }),
    );
    const tail = [headerLine("abc", "/proj"), sigLine("doc-old", "t"), ...filler].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true }), undefined);
  });

  it("finds a signifier exactly at the 20-line boundary", () => {
    const filler = Array.from({ length: 19 }, (_, i) =>
      JSON.stringify({ type: "message", content: `filler-${i}` }),
    );
    const tail = [headerLine("abc", "/proj"), sigLine("doc-edge", "t"), ...filler].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true })?.doc, "doc-edge");
  });

  it("ignores malformed JSON lines", () => {
    const tail = [
      headerLine("abc", "/proj"),
      "{not json",
      "[1,2,",
      "plain text",
      sigLine("doc-ok", "t"),
      "trailing garbage{{{",
    ].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true })?.doc, "doc-ok");
  });

  it("returns undefined when the payload is missing doc", () => {
    const tail = [
      headerLine("abc", "/proj"),
      JSON.stringify({ type: "custom", customType: "handoff", data: { topic: "t" } }),
    ].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true }), undefined);
  });

  it("returns undefined when doc/topic have the wrong type", () => {
    const bad1 = [
      headerLine("abc", "/proj"),
      JSON.stringify({ type: "custom", customType: "handoff", data: { doc: 42, topic: "t" } }),
    ].join("\n");
    const bad2 = [
      headerLine("abc", "/proj"),
      JSON.stringify({
        type: "custom",
        customType: "handoff",
        data: { doc: "d", topic: "t", summary: ["not", "a", "string"] },
      }),
    ].join("\n");
    assert.equal(parseSignifierTail(bad1, { fromStart: true }), undefined);
    assert.equal(parseSignifierTail(bad2, { fromStart: true }), undefined);
  });

  it("defaults optional summary/createdAt to empty strings", () => {
    const tail = [
      headerLine("abc", "/proj"),
      JSON.stringify({ type: "custom", customType: "handoff", data: { doc: "d", topic: "t" } }),
    ].join("\n");
    assert.deepEqual(parseSignifierTail(tail, { fromStart: true }), {
      doc: "d",
      topic: "t",
      summary: "",
      createdAt: "",
      from: undefined,
    });
  });

  it("passes through a valid from field", () => {
    const tail = [
      headerLine("abc", "/proj"),
      JSON.stringify({
        type: "custom",
        customType: "handoff",
        data: { doc: "d", topic: "t", summary: "s", createdAt: "c", from: "src-id" },
      }),
    ].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true })?.from, "src-id");
  });

  it("returns undefined for empty/whitespace input", () => {
    assert.equal(parseSignifierTail(""), undefined);
    assert.equal(parseSignifierTail("   \n  \n"), undefined);
  });

  it("returns undefined when no handoff entry exists", () => {
    const tail = [headerLine("abc", "/proj"), JSON.stringify({ type: "message", content: "x" })].join("\n");
    assert.equal(parseSignifierTail(tail, { fromStart: true }), undefined);
  });
});

// ---------------------------------------------------------------------------
// TASK 8 — Enumeration (RED)
// ---------------------------------------------------------------------------

describe("sessions (task 8: scanSessions)", () => {
  const ROOT = "/sessions";
  const DIR_A = "/sessions/--home-u-proj--";
  const DIR_B = "/sessions/--home-u-other--";

  function sessionFile(id: string, cwd: string, opts: { signifier?: boolean; extraLines?: string[] } = {}): string {
    const lines = [headerLine(id, cwd), ...(opts.extraLines ?? [])];
    if (opts.signifier !== false) lines.push(sigLine(`doc-${id}`, `topic-${id}`, `summary-${id}`));
    return lines.join("\n") + "\n";
  }

  function setup() {
    const files: Record<string, string> = {
      [`${DIR_A}/aaa.jsonl`]: sessionFile("aaa", "/home/u/proj"),
      [`${DIR_A}/bbb.jsonl`]: sessionFile("bbb", "/home/u/proj", { signifier: false }),
      [`${DIR_A}/notes.txt`]: "not a session",
      [`${DIR_A}/companion/`]: "", // placeholder replaced below (a subdir, not a file)
      [`${DIR_B}/ccc.jsonl`]: sessionFile("ccc", "/home/u/other"),
      [`${ROOT}/top.jsonl`]: sessionFile("top", "/home/u/proj"), // not in a cwd dir: must be skipped
    };
    // Companion subdirectory alongside .jsonl files: model as nested files so
    // readdir sees "companion" as a dir entry inside DIR_A.
    delete files[`${DIR_A}/companion/`];
    files[`${DIR_A}/companion/inner.jsonl`] = sessionFile("inner", "/home/u/proj");
    (files as Record<string, string>)[`${DIR_A}/bad.jsonl`] = "{not a header\n{}\n";
    const mtimes: Record<string, number> = {
      [`${DIR_A}/aaa.jsonl`]: 3000,
      [`${DIR_A}/bbb.jsonl`]: 2000,
      [`${DIR_B}/ccc.jsonl`]: 1000,
      [`${ROOT}/top.jsonl`]: 9999,
      [`${DIR_A}/companion/inner.jsonl`]: 8888,
      [`${DIR_A}/bad.jsonl`]: 7777,
    };
    return { fs: makeFakeFs(files, mtimes) };
  }

  it("scans two encoded-cwd dirs, direct .jsonl children only", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, fs });
    const ids = rows.map((r) => r.id).sort();
    assert.deepEqual(ids, ["aaa", "bbb", "ccc"]);
  });

  it("skips companion subdirectories, non-jsonl files, and top-level files", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, fs });
    const paths = rows.map((r) => r.path);
    assert.ok(!paths.some((p) => p.includes("companion")), `companion leaked: ${paths}`);
    assert.ok(!paths.some((p) => p.endsWith(".txt")), `non-jsonl leaked: ${paths}`);
    assert.ok(!paths.some((p) => p.endsWith("top.jsonl")), `top-level file leaked: ${paths}`);
  });

  it("reads header cwd from line 1 and marks ready vs derive", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, fs });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.equal(byId["aaa"]!.cwd, "/home/u/proj");
    assert.equal(byId["aaa"]!.mark, "ready");
    assert.equal(byId["aaa"]!.topic, "topic-aaa");
    assert.equal(byId["aaa"]!.summary, "summary-aaa");
    assert.equal(byId["aaa"]!.signifier?.doc, "doc-aaa");
    assert.equal(byId["bbb"]!.mark, "derive");
    assert.equal(byId["bbb"]!.signifier, undefined);
  });

  it("uses only the first line as the header", () => {
    const files: Record<string, string> = {
      [`${DIR_A}/s.jsonl`]: [headerLine("real-id", "/real/cwd"), headerLine("fake-id", "/fake/cwd")].join("\n"),
    };
    const rows = scanSessions({ root: ROOT, fs: makeFakeFs(files) });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, "real-id");
    assert.equal(rows[0]!.cwd, "/real/cwd");
  });

  it("excludes the current session path", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, current: `${DIR_A}/aaa.jsonl`, fs });
    assert.deepEqual(rows.map((r) => r.id).sort(), ["bbb", "ccc"]);
  });

  it("sorts mtime desc", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, fs });
    assert.deepEqual(rows.map((r) => r.id), ["aaa", "bbb", "ccc"]);
  });

  it("applies limit after sorting", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, limit: 2, fs });
    assert.deepEqual(rows.map((r) => r.id), ["aaa", "bbb"]);
  });

  it("skips files with an unparseable header or missing id", () => {
    const { fs } = setup();
    const rows = scanSessions({ root: ROOT, fs });
    assert.ok(!rows.some((r) => r.path.endsWith("bad.jsonl")));
    const files2: Record<string, string> = {
      [`${DIR_A}/noid.jsonl`]: JSON.stringify({ type: "session", cwd: "/x" }),
    };
    assert.deepEqual(scanSessions({ root: ROOT, fs: makeFakeFs(files2) }), []);
  });
});

// ---------------------------------------------------------------------------
// TASK 10 — Measured budget (RED: fails until scanSessions exists + is fast)
// ---------------------------------------------------------------------------

describe("sessions (task 10: measured budget over 500 real files)", () => {
  let dir = "";
  const N = 500;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-handoff-budget-"));
    const dirs = [join(dir, "--home-u-proj--"), join(dir, "--home-u-other--")];
    for (const d of dirs) mkdirSync(d, { recursive: true });
    for (let i = 0; i < N; i++) {
      const d = dirs[i % 2]!;
      const id = `sess-${String(i).padStart(4, "0")}`;
      const lines = [headerLine(id, "/home/u/proj")];
      if (i % 2 === 0) lines.push(sigLine(`doc-${id}`, `topic-${id}`, `summary-${id}`));
      writeFileSync(join(d, `${id}.jsonl`), lines.join("\n") + "\n");
    }
  });

  after(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("warm scan of 500 files completes in < 50 ms", () => {
    const fs = nodeScanFs();
    const first = scanSessions({ root: dir, fs });
    assert.equal(first.length, N);
    const t0 = performance.now();
    const rows = scanSessions({ root: dir, fs });
    const elapsed = performance.now() - t0;
    console.log(`warm scan: ${elapsed.toFixed(2)} ms for ${rows.length} files`);
    assert.equal(rows.length, N);
    assert.ok(elapsed < 50, `warm scan took ${elapsed.toFixed(2)} ms, budget is 50 ms`);
  });
});
