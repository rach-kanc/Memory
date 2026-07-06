import test from "node:test";
import assert from "node:assert";
import { compactMemoryStore, runCompactionDaemon, RECLAIMABLE_MEMORY_STATES } from "../src/compaction-daemon.mjs";

test("Disk Space Compaction Daemon for Local Context Databases", async (t) => {

  await t.test("should remove forgotten, superseded, and deleted memories", () => {
    const store = {
      memories: [
        { id: "m_01", state: "active" },
        { id: "m_02", state: "forgotten" },
        { id: "m_03", state: "superseded" },
        { id: "m_04", state: "deleted" },
        { id: "m_05", state: "accepted" },
      ],
      relations: [],
      actions: [],
    };

    const result = compactMemoryStore(store);

    assert.strictEqual(result.reclaimed, 3);
    assert.strictEqual(result.memoryStore.memories.length, 2);
    assert.ok(result.memoryStore.memories.every((m) => ["m_01", "m_05"].includes(m.id)));
  });

  await t.test("should prune relations and actions pointing at removed memories", () => {
    const store = {
      memories: [
        { id: "m_01", state: "active" },
        { id: "m_02", state: "forgotten" },
      ],
      relations: [
        { from: "m_01", to: "m_02" },
        { from: "m_01", to: "m_01" },
      ],
      actions: [
        { memory_id: "m_02", type: "forget_memory" },
        { memory_id: "m_01", type: "create_memory" },
      ],
    };

    const result = compactMemoryStore(store);

    assert.strictEqual(result.memoryStore.relations.length, 1);
    assert.strictEqual(result.memoryStore.actions.length, 1);
    assert.strictEqual(result.memoryStore.actions[0].memory_id, "m_01");
  });

  await t.test("should leave an already-clean store untouched", () => {
    const store = {
      memories: [{ id: "m_01", state: "active" }],
      relations: [],
      actions: [],
    };

    const result = compactMemoryStore(store);

    assert.strictEqual(result.reclaimed, 0);
    assert.strictEqual(result.memoryStore.memories.length, 1);
  });

  await t.test("should support a custom states list", () => {
    const store = {
      memories: [
        { id: "m_01", state: "active" },
        { id: "m_02", state: "archived" },
      ],
      relations: [],
      actions: [],
    };

    const result = compactMemoryStore(store, { states: ["archived"] });

    assert.strictEqual(result.reclaimed, 1);
    assert.strictEqual(result.memoryStore.memories[0].id, "m_01");
  });

  await t.test("should export the default reclaimable states list", () => {
    assert.deepStrictEqual(RECLAIMABLE_MEMORY_STATES, ["forgotten", "superseded", "deleted"]);
  });

  await t.test("runCompactionDaemon should compact on each interval tick and stop cleanly", async () => {
    let store = {
      memories: [
        { id: "m_01", state: "active" },
        { id: "m_02", state: "forgotten" },
      ],
      relations: [],
      actions: [],
    };

    const fakeRepository = {
      async load() {
        return store;
      },
      async save(updatedStore) {
        store = updatedStore;
      },
    };

    const events = [];
    const daemon = runCompactionDaemon(fakeRepository, {
      intervalMs: 10,
      onCompact: (stats) => events.push(stats),
    });

    // Run one pass manually instead of waiting on the timer
    const result = await daemon.runOnce();

    assert.strictEqual(result.reclaimed, 1);
    assert.strictEqual(store.memories.length, 1);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].reclaimed, 1);

    daemon.stop();
  });

  await t.test("runCompactionDaemon should reject a repository missing load/save", () => {
    assert.throws(() => runCompactionDaemon({}), TypeError);
  });

});