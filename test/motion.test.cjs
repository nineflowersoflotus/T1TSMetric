const { test } = require("node:test"), assert = require("node:assert/strict");
test("a click creates secondary oscillation after the body settles", async () => {
  const { createMotion, kickMotion, advanceMotion } = await import("../src/motion.mjs");
  const s = createMotion();
  kickMotion(s);
  let peak = 0, rebound = false;
  for (let i = 0; i < 360; i++) {
    advanceMotion(s, 1 / 120, 1.5, true, false);
    peak = Math.max(peak, Math.abs(s.bust.x));
    if (i > 35 && s.bust.x < -0.01) rebound = true;
  }
  assert(peak > 0.15);
  assert(rebound);
  assert(Math.abs(s.body.x) < 1e-4);
  assert(Math.abs(s.bust.x) < 0.02);
});
test("spring response remains bounded at different frame rates and repeated clicks", async () => {
  const { createMotion, kickMotion, advanceMotion } = await import("../src/motion.mjs");
  const peaks = [];
  for (const fps of [15, 30, 60, 120]) {
    const s2 = createMotion();
    kickMotion(s2);
    let peak = 0;
    for (let i = 0; i < fps * 3; i++) {
      advanceMotion(s2, 1 / fps, 1.5, true, false);
      peak = Math.max(peak, Math.abs(s2.bust.x));
      assert(Number.isFinite(s2.bust.x));
      assert(Math.abs(s2.bust.x) <= 0.4);
    }
    peaks.push(peak);
  }
  assert(Math.max(...peaks) - Math.min(...peaks) < 0.02);
  const s = createMotion();
  for (let i = 0; i < 1e3; i++) {
    kickMotion(s, 2.5);
    advanceMotion(s, 1 / 60, 2.5);
    assert(Math.abs(s.bust.x) <= 0.4);
    assert(Math.abs(s.body.x) <= 0.065);
  }
  advanceMotion(s, 0.1, 1.5, false);
  assert.equal(s.bust.x, 0);
});
