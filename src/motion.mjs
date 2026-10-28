// Small damped spring system. Units: body displacement in metres, secondary
// rotations in radians. Fixed substeps make impulses independent of render FPS.

export function createMotion() {
  return { body: { x: 0, v: 0 }, bust: { x: 0, v: 0 }, sway: { x: 0, v: 0 }, time: 0, clicks: 0 };
}
export function kickMotion(state, strength = 1.5) {
  strength = Math.max(0.25, Math.min(2.5, strength));
  state.clicks++;
  state.body.v = Math.min(0.7, state.body.v + 0.2 * strength);
  state.bust.v = Math.min(4.5, state.bust.v + 2 * strength);
  state.sway.v = Math.max(-2, Math.min(2, state.sway.v + (state.clicks % 2 ? 1 : -1) * 0.75 * strength));
}
function step(s, k, d, force, dt, bound) {
  s.v += (-k * s.x - d * s.v + force) * dt;
  s.x += s.v * dt;
  if (Math.abs(s.x) > bound) {
    s.x = Math.sign(s.x) * bound;
    s.v *= -0.25;
  }
}
export function advanceMotion(state, delta, strength = 1.5, physics = true, idle = true) {
  const dt = Math.min(0.15, Math.max(0, delta));
  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    state.time += h;
    const acceleration = -120 * state.body.x - 12 * state.body.v;
    step(state.body, 120, 12, 0, h, 0.065);
    if (physics) {
      const drive = idle ? (Math.sin(state.time * 2.4) * 0.8 + Math.sin(state.time * 3.9) * 0.25) * strength : 0;
      step(state.bust, 65, 3.5, drive - acceleration * 0.8, h, 0.4);
      step(state.sway, 82, 5, idle ? Math.sin(state.time * 1.5) * 0.3 * strength : 0, h, 0.2);
    } else {
      state.bust.x = state.bust.v = state.sway.x = state.sway.v = 0;
    }
  }
  return state;
}
