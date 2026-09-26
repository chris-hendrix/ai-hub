import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, SelectList, Text, type SelectItem } from "@earendil-works/pi-tui";
import { formatRow } from "./format.ts";
import type { SessionRow } from "./sessions.ts";

// ---------------------------------------------------------------------------
// Picker dialog (Task 16)
// ---------------------------------------------------------------------------

/**
 * Searchable session picker. The caller passes `orderRows(...)` output —
 * the picker never sorts. Items carry `value: row.path` with
 * label/description from `formatRow(row, Date.now())`.
 */
export function pickSession(
  ctx: ExtensionCommandContext,
  rows: SessionRow[],
  cwd: string,
): Promise<SessionRow | null> {
  void cwd; // accepted for API stability; ordering is the caller's job
  return ctx.ui.custom<SessionRow | null>((tui, theme, kb, done) => {
    const container = new Container();
    container.addChild(new Text(theme.fg("accent", theme.bold("Pick up a handoff"))));

    let selectList: SelectList | undefined;
    if (rows.length === 0) {
      container.addChild(new Text(theme.fg("dim", "no sessions for this workspace yet")));
    } else {
      const byPath = new Map<string, SessionRow>();
      const items: SelectItem[] = rows.map((row) => {
        byPath.set(row.path, row);
        const { label, description } = formatRow(row, Date.now());
        return { value: row.path, label, description };
      });
      selectList = new SelectList(items, Math.min(items.length, 12), {
        selectedPrefix: (text) => theme.fg("accent", text),
        selectedText: (text) => theme.fg("accent", text),
        description: (text) => theme.fg("muted", text),
        scrollInfo: (text) => theme.fg("dim", text),
        noMatch: (text) => theme.fg("warning", text),
      });
      selectList.onSelect = (item) => done(byPath.get(item.value) ?? null);
      selectList.onCancel = () => done(null);
      container.addChild(selectList);
    }

    container.addChild(
      new Text(theme.fg("dim", "↑↓ navigate · enter pick up · esc cancel · type to search")),
    );
    container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        if (selectList !== undefined) {
          selectList.handleInput(data);
        } else if (kb.matches(data, "tui.select.cancel")) {
          // Empty state has no SelectList to forward to; handle Esc so the
          // dialog can always be dismissed.
          done(null);
        }
        tui.requestRender();
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Reuse (Task 18)
// ---------------------------------------------------------------------------

export type HandoffDoc = {
  doc: string;
  topic: string;
  summary: string;
  sourceSession: string;
};

export type ReuseResult = { ok: true; handoff: HandoffDoc } | { ok: false; error: string };

/**
 * Reuse a scanned signifier with ZERO model calls and NO I/O: the full doc
 * already lives on the row. Requires `mark === "ready"` AND a valid
 * signifier; anything else is an error (the caller falls through to derive).
 */
export function reuse(row: SessionRow): ReuseResult {
  if (row.mark !== "ready") {
    return { ok: false, error: `session ${row.id} has no handoff yet` };
  }
  const signifier = row.signifier;
  if (signifier === undefined) {
    return { ok: false, error: `session ${row.id} is marked ready but has no handoff payload` };
  }
  return {
    ok: true,
    handoff: {
      doc: signifier.doc,
      topic: signifier.topic,
      summary: signifier.summary,
      sourceSession: row.id,
    },
  };
}
