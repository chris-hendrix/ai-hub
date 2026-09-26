import { readdirSync, statSync, openSync, readSync, closeSync, fstatSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Authoritative handoff signifier payload (see plan: "Signifier schema"). */
export type HandoffSignifier = {
  doc: string;
  topic: string;
  summary: string;
  createdAt: string;
  from?: string;
};

export type SessionRow = {
  path: string;
  id: string;
  cwd: string;
  mtimeMs: number;
  bytes: number;
  mark: "ready" | "derive";
  topic?: string;
  summary?: string;
  signifier?: HandoffSignifier;
};

/**
 * Minimal fs facade so scanSessions is testable without disk.
 * Contract: readdir throws for non-directories (mirrors node:fs).
 */
export type ScanFs = {
  readdir(path: string): string[];
  stat(path: string): { mtimeMs: number; size: number };
  readHead(path: string, bytes: number): string; // first N bytes
  readTail(path: string, bytes: number): string; // last N bytes
};

// ---------------------------------------------------------------------------
// Performance contract (authoritative): the scan must NEVER read a whole
// session file. Per file: one stat, one read of the first line (<=8 KB),
// one read of the last 64 KB. Do not use SessionManager.list/open here.
// ---------------------------------------------------------------------------

const HEAD_BYTES = 8 * 1024;
const TAIL_BYTES = 64 * 1024;
/** Tail parse scans back at most this many trailing lines/entries. */
const SCAN_WINDOW_LINES = 20;

// ---------------------------------------------------------------------------
// Tail parse
// ---------------------------------------------------------------------------

/**
 * Parse an already-read tail buffer for the most recent handoff signifier.
 *
 * Boundary rule: a tail slice USUALLY starts mid-line (a partial leading
 * line), so by default everything before the first "\n" is discarded as
 * untrustworthy. Pass `{ fromStart: true }` only when the buffer is known
 * to begin at position 0 of the file (scanSessions does this automatically
 * when `stat.size <= 64 KB`, i.e. the tail IS the whole file).
 *
 * Within the last 20 lines, the LAST line with `customType === "handoff"`
 * wins; unparseable lines are ignored. The payload lives in `data`
 * (`pi.appendEntry("handoff", sig)` envelope); a bare `{doc, topic, ...}`
 * line is also accepted. `doc`/`topic` are required strings; `summary` /
 * `createdAt` default to "" when absent (but must be strings if present);
 * `from` passes through when it is a string. Anything else -> undefined.
 */
export function parseSignifierTail(
  tail: string,
  opts?: { fromStart?: boolean },
): HandoffSignifier | undefined {
  if (typeof tail !== "string" || tail.trim() === "") return undefined;

  let text = tail;
  if (opts?.fromStart !== true) {
    const nl = text.indexOf("\n");
    if (nl === -1) return undefined; // a single partial line: nothing trustworthy
    text = text.slice(nl + 1);
  }

  const lines = text.split("\n");
  const window = lines.slice(-SCAN_WINDOW_LINES);
  for (let i = window.length - 1; i >= 0; i--) {
    const line = window[i]!.trim();
    if (line === "") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue; // malformed JSON lines are ignored
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const rec = parsed as Record<string, unknown>;
    if (rec["customType"] !== "handoff") continue;
    const data = rec["data"];
    const payload =
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : rec;
    const doc = payload["doc"];
    const topic = payload["topic"];
    if (typeof doc !== "string" || typeof topic !== "string") return undefined;
    const summary = payload["summary"];
    const createdAt = payload["createdAt"];
    const from = payload["from"];
    if (summary !== undefined && typeof summary !== "string") return undefined;
    if (createdAt !== undefined && typeof createdAt !== "string") return undefined;
    if (from !== undefined && typeof from !== "string") return undefined;
    return {
      doc,
      topic,
      summary: summary ?? "",
      createdAt: createdAt ?? "",
      from: typeof from === "string" ? from : undefined,
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Enumeration
// ---------------------------------------------------------------------------

function parseHeader(head: string): { id: string; cwd: string } | undefined {
  const firstLine = head.split("\n", 1)[0] ?? "";
  if (firstLine.trim() === "") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(firstLine);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const rec = parsed as Record<string, unknown>;
  if (typeof rec["id"] !== "string" || rec["id"] === "") return undefined;
  const cwd = rec["cwd"];
  return { id: rec["id"] as string, cwd: typeof cwd === "string" ? cwd : "" };
}

/**
 * Enumerate sessions without ever reading a whole file.
 *
 * - `root` is the sessions root holding `--<encoded-cwd>--` directories.
 * - Only DIRECT child directories of root, and within each only DIRECT
 *   `*.jsonl` children. Never recurses; companion artifact dirs, non-.jsonl
 *   files, and top-level files are skipped. Per-file failures are skipped.
 * - Per file: one stat + first line (header `{id, cwd}`) + last 64 KB
 *   (signifier). Rows with an unparseable header or missing id are skipped.
 * - `mark` is "ready" iff a valid signifier was found in the tail window;
 *   the full signifier (including `doc`) is kept on the row so reuse needs
 *   no second read. Rows whose path equals `current` are excluded.
 * - Sorted mtimeMs desc, then `limit` applied.
 */
export function scanSessions(args: {
  root: string;
  current?: string;
  limit?: number;
  fs: ScanFs;
}): SessionRow[] {
  const { root, current, limit, fs } = args;
  let top: string[];
  try {
    top = fs.readdir(root);
  } catch {
    return [];
  }
  const rows: SessionRow[] = [];
  for (const child of top) {
    const dirPath = join(root, child);
    let entries: string[];
    try {
      entries = fs.readdir(dirPath);
    } catch {
      continue; // not a directory (e.g. a top-level file): skip
    }
    for (const name of entries) {
      if (!name.endsWith(".jsonl")) continue;
      const filePath = join(dirPath, name);
      if (current !== undefined && filePath === current) continue;
      try {
        const st = fs.stat(filePath);
        const header = parseHeader(fs.readHead(filePath, HEAD_BYTES));
        if (header === undefined) continue;
        const tail = fs.readTail(filePath, TAIL_BYTES);
        const signifier = parseSignifierTail(tail, { fromStart: st.size <= TAIL_BYTES });
        if (signifier !== undefined) {
          rows.push({
            path: filePath,
            id: header.id,
            cwd: header.cwd,
            mtimeMs: st.mtimeMs,
            bytes: st.size,
            mark: "ready",
            topic: signifier.topic,
            summary: signifier.summary,
            signifier,
          });
        } else {
          rows.push({
            path: filePath,
            id: header.id,
            cwd: header.cwd,
            mtimeMs: st.mtimeMs,
            bytes: st.size,
            mark: "derive",
          });
        }
      } catch {
        continue; // unreadable file (or a dir named *.jsonl): skip
      }
    }
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

// ---------------------------------------------------------------------------
// Real fs facade (bounded reads only — never the whole file)
// ---------------------------------------------------------------------------

function readAt(fd: number, start: number, length: number): string {
  if (length <= 0) return "";
  const buf = Buffer.alloc(length);
  const n = readSync(fd, buf, 0, length, start);
  return buf.subarray(0, n).toString("utf8");
}

/** Production ScanFs built on node:fs with bounded positional reads. */
export function nodeScanFs(): ScanFs {
  return {
    readdir(path: string): string[] {
      return readdirSync(path);
    },
    stat(path: string): { mtimeMs: number; size: number } {
      const s = statSync(path);
      return { mtimeMs: s.mtimeMs, size: s.size };
    },
    readHead(path: string, bytes: number): string {
      const fd = openSync(path, "r");
      try {
        return readAt(fd, 0, bytes);
      } finally {
        closeSync(fd);
      }
    },
    readTail(path: string, bytes: number): string {
      const fd = openSync(path, "r");
      try {
        const size = fstatSync(fd).size;
        const start = Math.max(0, size - bytes);
        return readAt(fd, start, Math.min(bytes, size));
      } finally {
        closeSync(fd);
      }
    },
  };
}
