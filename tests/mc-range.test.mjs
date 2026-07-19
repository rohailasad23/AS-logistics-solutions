import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMcRange } from "../lib/mc-range.js";

test("normalizeMcRange keeps a valid ascending range", () => {
  assert.deepEqual(normalizeMcRange(10, 25), { start: 10, end: 25 });
});

test("normalizeMcRange swaps reversed values", () => {
  assert.deepEqual(normalizeMcRange(25, 10), { start: 10, end: 25 });
});

test("normalizeMcRange clamps invalid values to at least 1", () => {
  assert.deepEqual(normalizeMcRange("0", "-3"), { start: 1, end: 1 });
});
