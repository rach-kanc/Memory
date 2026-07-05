import test from "node:test";
import assert from "node:assert";
import {
  buildCategoryIndex,
  getClaimsByCategory,
  clearCategoryIndex,
  upsertCategoryIndex,
  removeFromCategoryIndex,
} from "../src/claims.mjs";

test("Incremental Index Updates for Real-Time Context Sync", async (t) => {

  await t.test("should add a brand new claim without rebuilding the whole index", () => {
    clearCategoryIndex();
    buildCategoryIndex([
      { claim_id: "c_01", text: "Existing claim.", category: "health" },
    ]);

    upsertCategoryIndex({ claim_id: "c_02", text: "New claim written live.", category: "health" });

    const healthClaims = getClaimsByCategory("health");
    assert.strictEqual(healthClaims.length, 2);
    assert.ok(healthClaims.some((c) => c.claim_id === "c_02"));
  });

  await t.test("should move a claim to its new category instead of duplicating it", () => {
    clearCategoryIndex();
    buildCategoryIndex([
      { claim_id: "c_03", text: "Started in productivity.", category: "productivity" },
    ]);

    // Same claim_id, but category changed
    upsertCategoryIndex({ claim_id: "c_03", text: "Started in productivity.", category: "health" });

    assert.strictEqual(getClaimsByCategory("productivity").length, 0);
    assert.strictEqual(getClaimsByCategory("health").length, 1);
    assert.strictEqual(getClaimsByCategory("health")[0].claim_id, "c_03");
  });

  await t.test("should remove a claim from the index entirely", () => {
    clearCategoryIndex();
    buildCategoryIndex([
      { claim_id: "c_04", text: "Will be removed.", category: "finance" },
    ]);

    removeFromCategoryIndex("c_04");

    assert.strictEqual(getClaimsByCategory("finance").length, 0);
  });

  await t.test("should do nothing gracefully when removing a claim that was never indexed", () => {
    clearCategoryIndex();
    assert.doesNotThrow(() => removeFromCategoryIndex("does_not_exist"));
  });
});