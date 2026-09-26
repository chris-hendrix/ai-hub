import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickHandoffEntries, toConversationText } from "../src/transcript.ts";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Plain fixtures (no pi runtime needed)
// ---------------------------------------------------------------------------

function msg(id: string, text: string, parentId: string | null = null): SessionEntry {
  return {
    type: "message",
    id,
    parentId,
    timestamp: "2026-09-26T00:00:00.000Z",
    message: { role: "user", content: text, timestamp: 1 },
  };
}

function compaction(id: string, firstKeptEntryId: string): SessionEntry {
  return {
    type: "compaction",
    id,
    parentId: null,
    timestamp: "2026-09-26T00:01:00.000Z",
    summary: "compacted summary of earlier work",
    firstKeptEntryId,
    tokensBefore: 1000,
  };
}

function ids(entries: SessionEntry[]): string[] {
  return entries.map((e) => e.id);
}

describe("pickHandoffEntries", () => {
  it("returns an empty branch as-is", () => {
    assert.deepEqual(pickHandoffEntries([]), []);
  });

  it("returns the branch as-is when there is no compaction", () => {
    const branch = [msg("m1", "hello"), msg("m2", "world", "m1"), msg("m3", "again", "m2")];
    const picked = pickHandoffEntries(branch);
    assert.deepEqual(ids(picked), ["m1", "m2", "m3"]);
  });

  it("keeps the compaction summary plus the kept window, not the whole branch", () => {
    const branch = [
      msg("m1", "old stuff that was summarized"),
      msg("m2", "kept one", "m1"),
      msg("m3", "kept two", "m2"),
      compaction("c1", "m2"),
      msg("m4", "after compaction", "c1"),
      msg("m5", "latest", "m4"),
    ];
    const picked = pickHandoffEntries(branch);
    // Must NOT be the whole branch: m1 was summarized away.
    assert.deepEqual(ids(picked), ["c1", "m2", "m3", "m4", "m5"]);
    assert.ok(picked.length < branch.length);
  });

  it("keeps only the compaction and later entries when firstKeptEntryId is unknown", () => {
    const branch = [msg("m1", "old"), compaction("c1", "missing-id"), msg("m2", "new", "c1")];
    assert.deepEqual(ids(pickHandoffEntries(branch)), ["c1", "m2"]);
  });

  it("uses the LAST compaction when several exist", () => {
    const branch = [
      msg("m1", "one"),
      compaction("c1", "m1"),
      msg("m2", "two", "c1"),
      compaction("c2", "m2"),
      msg("m3", "three", "c2"),
    ];
    assert.deepEqual(ids(pickHandoffEntries(branch)), ["c2", "m2", "m3"]);
  });
});

describe("toConversationText", () => {
  it("serializes message entries to text containing their content", () => {
    const text = toConversationText([msg("m1", "hello handoff"), msg("m2", "second line", "m1")]);
    assert.equal(typeof text, "string");
    assert.ok(text.includes("hello handoff"));
    assert.ok(text.includes("second line"));
  });

  it("includes the compaction summary for compaction entries", () => {
    const text = toConversationText([compaction("c1", "m1")]);
    assert.equal(typeof text, "string");
    assert.ok(text.includes("compacted summary of earlier work"));
  });

  it("returns a string for an empty branch", () => {
    assert.equal(typeof toConversationText([]), "string");
  });
});
