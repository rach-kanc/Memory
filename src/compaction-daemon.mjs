// Reclaims disk space from local memory stores by permanently removing
// soft-deleted memories (forgotten/superseded/deleted) instead of relying
// on a database engine's built-in vacuum/compaction mechanism.

// States that are safe to permanently remove during compaction.
export const RECLAIMABLE_MEMORY_STATES = Object.freeze([
  "forgotten",
  "superseded",
  "deleted",
]);

function memoryState(memory = {}) {
  return memory.state || memory.status || "active";
}

/**
 * Scans a memory store and permanently removes memories sitting in a
 * reclaimable state, along with any relations/actions that would dangle
 * once those memories are gone.
 * @param {Object} memoryStore - The store to compact
 * @param {Object} [options]
 * @param {string[]} [options.states] - Override which states are reclaimed
 * @returns {{ memoryStore: Object, reclaimed: number }}
 */
export function compactMemoryStore(memoryStore = {}, { states = RECLAIMABLE_MEMORY_STATES } = {}) {
  const reclaimable = new Set(states);
  const allMemories = Array.isArray(memoryStore.memories) ? memoryStore.memories : [];

  const keptMemories = allMemories.filter((memory) => !reclaimable.has(memoryState(memory)));
  const removedIds = new Set(
    allMemories
      .filter((memory) => reclaimable.has(memoryState(memory)))
      .map((memory) => memory.id)
  );

  const relations = (memoryStore.relations || []).filter(
    (relation) => !removedIds.has(relation.from) && !removedIds.has(relation.to)
  );
  const actions = (memoryStore.actions || []).filter(
    (action) => !removedIds.has(action.memory_id)
  );

  return {
    memoryStore: {
      ...memoryStore,
      memories: keptMemories,
      relations,
      actions,
    },
    reclaimed: removedIds.size,
  };
}
/**
 * Runs compaction on a repeating interval against a memory repository
 * (anything with load()/save(), e.g. from storage.mjs). This is the
 * actual "daemon" — call .stop() to shut it down cleanly.
 * @param {Object} repository - Object with async load() and save(memoryStore)
 * @param {Object} [options]
 * @param {number} [options.intervalMs] - How often to run compaction (default: 1 hour)
 * @param {string[]} [options.states] - Which states to reclaim
 * @param {(stats: { reclaimed: number }) => void} [options.onCompact] - Callback after each run
 * @returns {{ stop: () => void, runOnce: () => Promise<{ reclaimed: number }> }}
 */
export function runCompactionDaemon(repository, { intervalMs = 60 * 60 * 1000, states, onCompact } = {}) {
  if (!repository || typeof repository.load !== "function" || typeof repository.save !== "function") {
    throw new TypeError("Compaction daemon requires a repository with load() and save(memoryStore).");
  }

  async function runOnce() {
    const currentStore = await repository.load();
    const { memoryStore, reclaimed } = compactMemoryStore(currentStore, { states });
    if (reclaimed > 0) {
      await repository.save(memoryStore);
    }
    if (typeof onCompact === "function") onCompact({ reclaimed });
    return { reclaimed };
  }

  const timer = setInterval(() => {
    runOnce().catch((error) => console.error("Compaction daemon run failed:", error));
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
    runOnce,
  };
}