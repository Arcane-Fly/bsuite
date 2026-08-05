/**
 * Rounding tests. Pins the exact values that made real award rates a cent light.
 *
 * PORTED from R80.4 src/awards/round.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS: R80.4
 * runs this as a bare `node --test` script with a hand-rolled `t(name, fn)` ->
 * pass/fail counter -> process.exit() harness. Here `t` forwards to vitest's
 * `it`, and the counters/exit are removed — every assertion body is byte-for-
 * byte identical to upstream.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { round2, round4 } from "../../r804/round.js";

const t = (n: string, f: () => void) => it(n, f);

t("the value that started this: 29.45 x 50% is 14.73, not 14.72", () => {
  assert.equal((29.45 * 0.5).toFixed(2), "14.72", "toFixed really does get this wrong");
  assert.equal(round2(29.45 * 0.5), 14.73);
});

t("the other B&C rate that came out light: 29.45 x 55%", () => {
  assert.equal(round2(29.45 * 0.55), 16.20);
});

t("exact half-cents round UP", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(14.725), 14.73);
});

t("the nudge cannot move a value that was not on the boundary", () => {
  assert.equal(round2(1.004), 1.00);
  assert.equal(round2(1.0049), 1.00);
  assert.equal(round2(29.45), 29.45);
  assert.equal(round2(0.01), 0.01);
});

t("negatives are not silently inflated", () => {
  assert.equal(round2(-1.005), -1);
  assert.equal(round2(-14.72), -14.72);
});

t("null and undefined pass through, they are not turned into 0", () => {
  assert.equal(round2(null), null);
  assert.equal(round2(undefined), undefined);
  assert.equal(round4(null), null);
});

t("non-finite passes through rather than becoming a plausible number", () => {
  assert.ok(Number.isNaN(round2(NaN)));
  assert.equal(round2(Infinity), Infinity);
});

t("round4 keeps per-hour precision a cent would destroy", () => {
  assert.equal(round4(10000 / 6042), 1.6551);
  assert.equal(round4(5928 / 6042), 0.9811);
  // The combined figure the browser showed: 2.6362 -> $2.64 at display time.
  assert.equal(round2(round4(10000 / 6042) + round4(5928 / 6042)), 2.64);
});

t("zero stays zero", () => {
  assert.equal(round2(0), 0);
  assert.equal(round4(0), 0);
});
