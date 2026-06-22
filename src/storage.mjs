import { readFile, writeFile } from "node:fs/promises";
import { restoreMemoryFromBackup, serializeMemoryBackup } from "./backup-restore.mjs";
import {
  createMemory,
  deleteMemory,
  linkIntentToEvidence,
  linkIntentToSchema,
  listMemories,
  readMemory,
  rememberIntent,
  retrieveIntents,
  updateMemory,
} from "./engine.mjs";

const EMPTY_STORE = {
  schema_version: "memact.memory.v0",
  memories: [],
  actions: [],
};

function normalizePath(value) {
  return String(value || "").trim();
}

export function createMemoryRepository(adapter) {
  if (!adapter || typeof adapter.load !== "function" || typeof adapter.save !== "function") {
    throw new TypeError("Memory repository requires an adapter with load() and save(store).");
  }

  return {
    async load() {
      return restoreMemoryFromBackup((await adapter.load()) || EMPTY_STORE);
    },
    async save(memoryStore) {
      await adapter.save(memoryStore || EMPTY_STORE);
      return memoryStore || EMPTY_STORE;
    },
    async create(memoryInput) {
      const current = await this.load();
      const result = createMemory(memoryInput, current);
      await this.save(result.memoryStore);
      return result;
    },
    async read(memoryId) {
      return readMemory(memoryId, await this.load());
    },
    async list(filters = {}) {
      return listMemories(await this.load(), filters);
    },
    async update(memoryId, patch = {}) {
      const current = await this.load();
      const result = updateMemory(memoryId, patch, current);
      await this.save(result.memoryStore);
      return result;
    },
    async delete(memoryId, options = {}) {
      const current = await this.load();
      const result = deleteMemory(memoryId, current, options);
      await this.save(result.memoryStore);
      return result;
    },
    async rememberIntent(intentResult) {
      const current = await this.load();
      const result = rememberIntent(intentResult, current);
      await this.save(result.memoryStore);
      return result;
    },
    async retrieveIntents(query, options = {}) {
      return retrieveIntents(query, await this.load(), options);
    },
    async linkIntentToSchema(intentId, schemaId) {
      const current = await this.load();
      const result = linkIntentToSchema(intentId, schemaId, current);
      await this.save(result.memoryStore);
      return result;
    },
    async linkIntentToEvidence(intentId, evidenceId) {
      const current = await this.load();
      const result = linkIntentToEvidence(intentId, evidenceId, current);
      await this.save(result.memoryStore);
      return result;
    },
  };
}

export function createJsonFileMemoryAdapter(filePath) {
  const path = normalizePath(filePath);
  if (!path) {
    throw new TypeError("JSON memory adapter requires a file path.");
  }

  return {
    kind: "json_file",
    async load() {
      try {
        const raw = JSON.parse(await readFile(path, "utf8"));
        return restoreMemoryFromBackup(raw);
      } catch (error) {
        if (error?.code === "ENOENT") {
          return restoreMemoryFromBackup(EMPTY_STORE);
        }
        throw error;
      }
    },
    async save(memoryStore) {
      const backup = serializeMemoryBackup(memoryStore || EMPTY_STORE);
      await writeFile(path, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
    },
  };
}

export function createRemoteMemoryAdapter({ load, save, provider = "remote", description = "" } = {}) {
  if (typeof load !== "function" || typeof save !== "function") {
    throw new TypeError("Remote memory adapter requires load() and save() functions.");
  }

  return {
    kind: provider,
    description,
    async load() {
      return (await load()) || EMPTY_STORE;
    },
    async save(memoryStore) {
      await save(serializeMemoryBackup(memoryStore || EMPTY_STORE));
    },
  };
}
