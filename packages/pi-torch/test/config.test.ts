import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readHandoffConfig } from "../src/config.ts";

function memfs(files: Record<string, string>): (p: string) => string {
  return (p: string) => {
    if (!(p in files)) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    return files[p]!;
  };
}

describe("config (task 6: discovery)", () => {
  it("returns [project, global] with correct originDirs and values", () => {
    const sources = readHandoffConfig(
      "/work/proj",
      "/home/u/.pi/agent",
      memfs({
        "/work/proj/.pi/settings.json": JSON.stringify({
          handoff: { instructions: "project text" },
        }),
        "/home/u/.pi/agent/settings.json": JSON.stringify({
          handoff: { instructions: "global text" },
        }),
      }),
    );
    assert.equal(sources.length, 2);
    assert.equal(sources[0]!.originDir, "/work/proj/.pi");
    assert.deepEqual(sources[0]!.values, { instructions: "project text" });
    assert.equal(sources[1]!.originDir, "/home/u/.pi/agent");
    assert.deepEqual(sources[1]!.values, { instructions: "global text" });
  });

  it("unknown keys are ignored", () => {
    const sources = readHandoffConfig(
      "/work/proj",
      "/home/u/.pi/agent",
      memfs({
        "/work/proj/.pi/settings.json": JSON.stringify({
          handoff: { instructions: "kept", bogus: 1, instructionsFile: "x.md", extra: true },
          otherTopLevel: { instructions: "must not leak" },
        }),
        "/home/u/.pi/agent/settings.json": JSON.stringify({ theme: "dark" }),
      }),
    );
    assert.deepEqual(sources[0]!.values, { instructions: "kept", instructionsFile: "x.md" });
    assert.deepEqual(sources[1]!.values, {});
  });

  it("a missing settings file yields an empty-values source, not an error", () => {
    const sources = readHandoffConfig("/work/proj", "/home/u/.pi/agent", memfs({}));
    assert.deepEqual(sources, [
      { values: {}, originDir: "/work/proj/.pi" },
      { values: {}, originDir: "/home/u/.pi/agent" },
    ]);
  });

  it("an unparseable settings file yields an empty-values source, not an error", () => {
    const sources = readHandoffConfig(
      "/work/proj",
      "/home/u/.pi/agent",
      memfs({ "/work/proj/.pi/settings.json": "{not json:::" }),
    );
    assert.deepEqual(sources[0], { values: {}, originDir: "/work/proj/.pi" });
    assert.deepEqual(sources[1], { values: {}, originDir: "/home/u/.pi/agent" });
  });

  it("non-string values are ignored", () => {
    const sources = readHandoffConfig(
      "/work/proj",
      "/home/u/.pi/agent",
      memfs({
        "/work/proj/.pi/settings.json": JSON.stringify({
          handoff: { instructions: 42, instructionsFile: ["x.md"] },
        }),
        "/home/u/.pi/agent/settings.json": JSON.stringify({ handoff: "just a string" }),
      }),
    );
    assert.deepEqual(sources[0]!.values, {});
    assert.deepEqual(sources[1]!.values, {});
  });
});
