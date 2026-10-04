import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generate, type CompleteRequest, type Runner } from "../src/generate.ts";

// Fake runner: records every call, returns a canned result.
function fakeRunner(result: string | null): Runner & { calls: { req: CompleteRequest; signal?: AbortSignal }[] } {
  const calls: { req: CompleteRequest; signal?: AbortSignal }[] = [];
  return {
    calls,
    complete(req: CompleteRequest, signal?: AbortSignal): Promise<string | null> {
      calls.push({ req, signal });
      return Promise.resolve(result);
    },
  };
}

describe("generate", () => {
  it("calls the runner exactly once with the request unchanged and returns its result", async () => {
    const runner = fakeRunner("the handoff doc");
    const req: CompleteRequest = { instruction: "write a handoff", conversation: "history" };
    const out = await generate(req, runner);
    assert.equal(runner.calls.length, 1);
    assert.deepEqual(runner.calls[0]!.req, { instruction: "write a handoff", conversation: "history" });
    assert.equal(out, "the handoff doc");
  });

  it("passes no facts key when facts are absent", async () => {
    const runner = fakeRunner("doc");
    const req: CompleteRequest = { instruction: "i", conversation: "c" };
    await generate(req, runner);
    assert.equal(runner.calls.length, 1);
    assert.ok(!("facts" in runner.calls[0]!.req), "facts key must be absent, not undefined-valued");
  });

  it("passes facts through when supplied", async () => {
    const runner = fakeRunner("doc");
    await generate({ instruction: "i", conversation: "c", facts: "branch: main" }, runner);
    assert.equal(runner.calls.length, 1);
    assert.deepEqual(runner.calls[0]!.req, { instruction: "i", conversation: "c", facts: "branch: main" });
  });

  it("propagates a null result (abort/cancel)", async () => {
    const runner = fakeRunner(null);
    const out = await generate({ instruction: "i", conversation: "c" }, runner);
    assert.equal(out, null);
  });

  it("forwards an abort signal to the runner", async () => {
    const runner = fakeRunner("doc");
    const controller = new AbortController();
    await generate({ instruction: "i", conversation: "c" }, runner, controller.signal);
    assert.equal(runner.calls[0]!.signal, controller.signal);
  });
});
