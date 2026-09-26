import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PLACEHOLDER_INSTRUCTION } from "../src/prompt.ts";

describe("smoke", () => {
  it("imports a real module with an explicit .ts extension", () => {
    assert.equal(PLACEHOLDER_INSTRUCTION, "placeholder");
  });
});
