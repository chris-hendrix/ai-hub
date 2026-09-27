import type { SessionRow } from "./sessions.ts";

// ---------------------------------------------------------------------------
// Topic / summary extraction (pure; also used when WRITING the signifier)
// ---------------------------------------------------------------------------

export const TOPIC_FALLBACK = "session handoff";

/**
 * The H1 text of the doc. A leading `handoff` word (case-insensitive) plus
 * a following `—`/`–`/`-`/`:` separator is stripped; anything else is kept
 * verbatim. Only level-1 headings (`# `) count. Falls back to
 * "session handoff".
 */
export function extractTopic(doc: string): string {
  for (const raw of doc.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("##")) continue; // not an H1
    const m = /^#\s+(.*)$/.exec(line);
    if (!m) continue;
    const stripped = m[1]!.trim().replace(/^handoff\b(\s*[—–\-:])?\s*/i, "").trim();
    return stripped === "" ? TOPIC_FALLBACK : stripped;
  }
  return TOPIC_FALLBACK;
}

const SUMMARY_MAX = 120;
/** Floor for word-boundary cuts: never leave a stub shorter than this. */
const SUMMARY_MIN_STUB = 40;

/**
 * First non-heading, non-blank line. Truncated to ~120 chars on a word
 * boundary with a trailing "…" when truncated; hard-cut at 120 when the
 * line has no usable space. "" when there is no body line.
 */
export function extractSummary(doc: string): string {
  for (const raw of doc.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.length <= SUMMARY_MAX) return line;
    const cut = line.slice(0, SUMMARY_MAX);
    const sp = cut.lastIndexOf(" ");
    const head = sp >= SUMMARY_MIN_STUB ? cut.slice(0, sp) : cut;
    return head + "…";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Row formatting (pure; `now` is passed in — never call Date.now() here)
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "MM-DD HH:mm" in the user's LOCAL timezone (wall-clock, as the picker should show).
 * Tests pin the timezone by setting process.env.TZ = "UTC" before any Date use. */
export function formatStamp(mtimeMs: number): string {
  const d = new Date(mtimeMs);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Last path segment of the cwd ("basename-ish"); "" when cwd is empty. */
export function cwdBasename(cwd: string): string {
  const segs = cwd.split(/[\\/]+/).filter((s) => s !== "");
  return segs.length > 0 ? segs[segs.length - 1]! : "";
}

/**
 * - ready:  label `⧉ <MM-DD HH:mm> · <topic>`, description `<summary>`
 * - derive: label `＋ <MM-DD HH:mm> · <basename-ish>`, description
 *   `<size> · <cwd>`
 *
 * DEVIATION (authorized by task): derive rows show size + cwd, NOT a
 * message count — counting messages would require a full file read and
 * break the scan performance contract.
 *
 * `now` is accepted for API stability (future relative-time display) and
 * is currently unused; the stamp always comes from `row.mtimeMs`.
 */
export function formatRow(
  row: SessionRow,
  _now: number,
): { label: string; description: string } {
  const stamp = formatStamp(row.mtimeMs);
  if (row.mark === "ready") {
    return {
      label: `⧉ ${stamp} · ${row.topic ?? TOPIC_FALLBACK}`,
      description: row.summary ?? "",
    };
  }
  return {
    label: `＋ ${stamp} · ${cwdBasename(row.cwd) || row.id}`,
    description: `${formatBytes(row.bytes)} · ${row.cwd}`,
  };
}

/**
 * Rows whose `cwd` matches first, then mtime desc. Stable; does not mutate.
 */
export function orderRows(rows: SessionRow[], cwd: string): SessionRow[] {
  return [...rows].sort((a, b) => {
    const ap = a.cwd === cwd ? 0 : 1;
    const bp = b.cwd === cwd ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return b.mtimeMs - a.mtimeMs;
  });
}
