import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { pickSession } from "../src/picker.ts";
import type { SessionRow } from "../src/sessions.ts";

// ---------------------------------------------------------------------------
// Picker wiring (Task 16 automatable half): item mapping, Enter/Esc, empty state.
// Drives the real SelectList through the captured ctx.ui.custom factory with
// minimal fakes; theme fns are identity so rendered text is assertable.
// ---------------------------------------------------------------------------

type CapturedComponent = {
  render(width: number): string[];
  handleInput(data: string): void;
};
type CapturedFactory = (
  tui: unknown,
  theme: unknown,
  kb: unknown,
  done: (result: SessionRow | null) => void,
) => CapturedComponent;

function setup(rows: SessionRow[]): {
  ctx: ExtensionCommandContext;
  run: () => { pending: Promise<SessionRow | null>; component: CapturedComponent };
} {
  let captured: CapturedFactory | undefined;
  let doneFn!: (result: SessionRow | null) => void;
  const ctx = {
    ui: {
      custom: (factory: CapturedFactory): Promise<SessionRow | null> => {
        captured = factory;
        return new Promise<SessionRow | null>((resolve) => {
          doneFn = resolve;
        });
      },
    },
  } as unknown as ExtensionCommandContext;

  const fakeTui = { requestRender: () => {} };
  const fakeTheme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
  const fakeKb = {
    matches: (data: string, name: string) => name === "tui.select.cancel" && data === "\x1b",
  };
  return {
    ctx,
    run: () => {
      const pending = pickSession(ctx, rows, "/proj");
      assert.ok(captured !== undefined, "factory was not captured");
      const component = captured!(fakeTui, fakeTheme, fakeKb, doneFn);
      return { pending, component };
    },
  };
}

function readyRow(id: string, topic: string): SessionRow {
  return {
    path: `/sessions/--x--/${id}.jsonl`,
    id,
    cwd: "/proj",
    mtimeMs: Date.parse("2026-09-22T14:03:00.000Z"),
    bytes: 100,
    mark: "ready",
    topic,
    summary: `${topic} summary`,
    signifier: { doc: `# Handoff — ${topic}`, topic, summary: `${topic} summary`, createdAt: "" },
  };
}

describe("picker (task 16 wiring)", () => {
  it("renders header, item labels, and hint; Enter picks the selected row", async () => {
    const rows = [readyRow("aaa", "auth refactor"), readyRow("bbb", "token cache")];
    const { run } = setup(rows);
    const { pending, component } = run();
    const text = component.render(100).join("\n");
    assert.ok(text.includes("Pick up a handoff"), `missing header:\n${text}`);
    assert.ok(text.includes("auth refactor"), `missing first topic:\n${text}`);
    assert.ok(text.includes("token cache"), `missing second topic:\n${text}`);
    assert.ok(text.includes("enter pick up"), `missing hint:\n${text}`);
    component.handleInput("\r"); // Enter
    assert.deepEqual(await pending, rows[0]);
  });

  it("picker does not sort: first row stays selected", async () => {
    const rows = [readyRow("zzz", "zeta"), readyRow("aaa", "alpha")];
    const { run } = setup(rows);
    const { pending, component } = run();
    component.handleInput("\r");
    const picked = await pending;
    assert.equal(picked?.id, "zzz");
  });

  it("Escape cancels with null", async () => {
    const rows = [readyRow("aaa", "auth refactor")];
    const { run } = setup(rows);
    const { pending, component } = run();
    component.handleInput("\x1b"); // Esc
    assert.equal(await pending, null);
  });

  it("empty state renders the dim notice and Esc still dismisses", async () => {
    const { run } = setup([]);
    const { pending, component } = run();
    const text = component.render(100).join("\n");
    assert.ok(text.includes("no sessions for this workspace yet"), `missing empty notice:\n${text}`);
    component.handleInput("\x1b");
    assert.equal(await pending, null);
  });
});
