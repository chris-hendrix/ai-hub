import { describe, it } from "node:test";
import assert from "node:assert/strict";
import piHandoff from "../src/index.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Call = { name: string; options: unknown };

function fakePi(): { pi: ExtensionAPI; commands: Call[]; messageRenderers: Call[]; entryRenderers: Call[] } {
  const commands: Call[] = [];
  const messageRenderers: Call[] = [];
  const entryRenderers: Call[] = [];
  const pi = {
    registerCommand: (name: string, options: unknown) => {
      commands.push({ name, options });
    },
    registerMessageRenderer: (customType: string, renderer: unknown) => {
      messageRenderers.push({ name: customType, options: renderer });
    },
    registerEntryRenderer: (customType: string, renderer: unknown) => {
      entryRenderers.push({ name: customType, options: renderer });
    },
  };
  return { pi: pi as unknown as ExtensionAPI, commands, messageRenderers, entryRenderers };
}

describe("pi-handoff wiring (phases 3-5)", () => {
  it("registers exactly 2 commands + 2 renderers without throwing", () => {
    const { pi, commands, messageRenderers, entryRenderers } = fakePi();
    assert.doesNotThrow(() => piHandoff(pi));
    // Be explicit: 4 registrations total.
    assert.equal(commands.length, 2);
    assert.equal(messageRenderers.length, 1);
    assert.equal(entryRenderers.length, 1);
    assert.deepEqual(commands.map((c) => c.name), ["handoff", "pickup"]);
    assert.equal(messageRenderers[0]!.name, "handoff");
    assert.equal(entryRenderers[0]!.name, "handoff");
  });

  it("renderers are pure functions invocable with minimal fakes", () => {
    const { pi, messageRenderers, entryRenderers } = fakePi();
    piHandoff(pi);
    const messageRenderer = messageRenderers[0]!.options as (...args: unknown[]) => unknown;
    const entryRenderer = entryRenderers[0]!.options as (...args: unknown[]) => unknown;
    assert.equal(typeof messageRenderer, "function");
    assert.equal(typeof entryRenderer, "function");

    const theme = { fg: (_color: string, text: string) => text };
    const message = {
      role: "custom",
      customType: "handoff",
      content: "# Handoff — auth refactor\n\nDid things.",
      display: true,
      details: {
        topic: "auth refactor",
        summary: "Did things.",
        sourceSession: "abc123",
        createdAt: "2026-09-26T00:00:00.000Z",
      },
      timestamp: Date.now(),
    };
    const entry = {
      type: "custom",
      customType: "handoff",
      id: "e1",
      parentId: null,
      timestamp: "2026-09-26T00:00:00.000Z",
      data: { doc: "# Handoff — x", topic: "auth refactor", summary: "s", createdAt: "t" },
    };

    // Collapsed + expanded message renders, plus the entry render, must not throw.
    try {
      messageRenderer(message, { expanded: false, outputPad: 0 }, theme);
      messageRenderer(message, { expanded: true, outputPad: 0 }, theme);
      entryRenderer(entry, { expanded: false }, theme);
    } catch (err) {
      assert.fail(`renderer threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
});
