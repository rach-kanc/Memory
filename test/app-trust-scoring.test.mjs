import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OUTCOMES,
  recordObservationOutcome,
  getAppOutcomes,
  getAppTrustCoefficient,
  applyTrustToScore,
  resetAppOutcomes,
} from "../src/app-trust-scoring.mjs";

function setup() {
  resetAppOutcomes();
}

test("records accepted outcomes", () => {
  setup();
  recordObservationOutcome("app-fitness", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-fitness", OUTCOMES.ACCEPTED);
  const { accepted, rejected } = getAppOutcomes("app-fitness");
  assert.equal(accepted, 2);
  assert.equal(rejected, 0);
});

test("records rejected outcomes", () => {
  setup();
  recordObservationOutcome("app-news", OUTCOMES.REJECTED);
  const { accepted, rejected } = getAppOutcomes("app-news");
  assert.equal(accepted, 0);
  assert.equal(rejected, 1);
});

test("ignores unknown outcome values", () => {
  setup();
  recordObservationOutcome("app-music", "maybe");
  const { total } = getAppOutcomes("app-music");
  assert.equal(total, 0);
});

test("ignores empty or non-string appId", () => {
  setup();
  recordObservationOutcome("", OUTCOMES.ACCEPTED);
  recordObservationOutcome(null, OUTCOMES.ACCEPTED);
  recordObservationOutcome(undefined, OUTCOMES.ACCEPTED);
  assert.equal(getAppOutcomes("").total, 0);
});

test("tracks outcomes independently per app", () => {
  setup();
  recordObservationOutcome("app-a", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-b", OUTCOMES.REJECTED);
  assert.equal(getAppOutcomes("app-a").accepted, 1);
  assert.equal(getAppOutcomes("app-b").rejected, 1);
  assert.equal(getAppOutcomes("app-a").rejected, 0);
});

test("returns total as accepted + rejected", () => {
  setup();
  recordObservationOutcome("app-shop", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-shop", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-shop", OUTCOMES.REJECTED);
  const { total } = getAppOutcomes("app-shop");
  assert.equal(total, 3);
});

test("returns zero counts for unknown app", () => {
  setup();
  const { accepted, rejected, total } = getAppOutcomes("unknown-app");
  assert.equal(accepted, 0);
  assert.equal(rejected, 0);
  assert.equal(total, 0);
});

test("returns cold-start coefficient for apps with fewer than 5 outcomes", () => {
  setup();
  recordObservationOutcome("app-new", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-new", OUTCOMES.ACCEPTED);
  const trust = getAppTrustCoefficient("app-new");
  assert.equal(trust, 0.8);
});

test("returns cold-start coefficient for apps with no outcomes", () => {
  setup();
  assert.equal(getAppTrustCoefficient("brand-new-app"), 0.8);
});

test("returns 1.0 for app with all accepted outcomes and enough data", () => {
  setup();
  for (let i = 0; i < 5; i++) recordObservationOutcome("app-perfect", OUTCOMES.ACCEPTED);
  assert.equal(getAppTrustCoefficient("app-perfect"), 1);
});

test("returns MIN_TRUST_FLOOR for app with all rejected outcomes", () => {
  setup();
  for (let i = 0; i < 5; i++) recordObservationOutcome("app-bad", OUTCOMES.REJECTED);
  assert.equal(getAppTrustCoefficient("app-bad"), 0.2);
});

test("coefficient reflects correct acceptance ratio", () => {
  setup();
  for (let i = 0; i < 4; i++) recordObservationOutcome("app-mixed", OUTCOMES.ACCEPTED);
  for (let i = 0; i < 6; i++) recordObservationOutcome("app-mixed", OUTCOMES.REJECTED);
  assert.equal(getAppTrustCoefficient("app-mixed"), 0.4);
});

test("coefficient is a number between 0 and 1", () => {
  setup();
  for (let i = 0; i < 5; i++) recordObservationOutcome("app-check", OUTCOMES.ACCEPTED);
  for (let i = 0; i < 2; i++) recordObservationOutcome("app-check", OUTCOMES.REJECTED);
  const trust = getAppTrustCoefficient("app-check");
  assert.ok(trust >= 0 && trust <= 1, `expected trust in [0,1], got ${trust}`);
});

test("scales base score by trust coefficient", () => {
  setup();
  for (let i = 0; i < 5; i++) recordObservationOutcome("app-scale", OUTCOMES.ACCEPTED);
  assert.equal(applyTrustToScore(0.72, "app-scale"), 0.72);
});

test("cold-start app scales score by 0.8", () => {
  setup();
  assert.equal(applyTrustToScore(0.5, "app-cold"), 0.4);
});

test("heavily rejected app reduces score to minimum floor", () => {
  setup();
  for (let i = 0; i < 10; i++) recordObservationOutcome("app-spam", OUTCOMES.REJECTED);
  const adjusted = applyTrustToScore(0.72, "app-spam");
  assert.equal(adjusted, Number((0.72 * 0.2).toFixed(4)));
});

test("result is clamped to [0, 1]", () => {
  setup();
  const result = applyTrustToScore(1.0, "app-unknown");
  assert.ok(result >= 0 && result <= 1);
});

test("handles non-finite base score gracefully", () => {
  setup();
  assert.equal(applyTrustToScore(NaN, "app-x"), 0);
  assert.equal(applyTrustToScore(Infinity, "app-x"), 0);
});

test("resets outcomes for a specific app", () => {
  setup();
  recordObservationOutcome("app-reset", OUTCOMES.ACCEPTED);
  resetAppOutcomes("app-reset");
  assert.equal(getAppOutcomes("app-reset").total, 0);
});

test("reset of one app does not affect another", () => {
  setup();
  recordObservationOutcome("app-keep", OUTCOMES.ACCEPTED);
  recordObservationOutcome("app-drop", OUTCOMES.REJECTED);
  resetAppOutcomes("app-drop");
  assert.equal(getAppOutcomes("app-keep").accepted, 1);
  assert.equal(getAppOutcomes("app-drop").total, 0);
});

test("resetAppOutcomes with no arg clears all", () => {
  setup();
  recordObservationOutcome("a1", OUTCOMES.ACCEPTED);
  recordObservationOutcome("a2", OUTCOMES.REJECTED);
  resetAppOutcomes();
  assert.equal(getAppOutcomes("a1").total, 0);
  assert.equal(getAppOutcomes("a2").total, 0);
});