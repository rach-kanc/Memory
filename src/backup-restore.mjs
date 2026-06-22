import { reindexMemoryStore, MEMORY_SCHEMA_VERSION } from "./engine.mjs";
import { stripDerivedBackupFields, validateMemoryBackupShape } from "./memory-schemas.mjs";

export { MEMORY_ENTITY_TYPES, VISIBLE_SCOPE_TYPES, stripDerivedBackupFields, validateMemoryBackupShape } from "./memory-schemas.mjs";

export class MemoryBackupValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "MemoryBackupValidationError";
    this.errors = errors;
  }
}

export function serializeMemoryBackup(memoryStore = {}) {
  return stripDerivedBackupFields({
    schema_version: memoryStore.schema_version || MEMORY_SCHEMA_VERSION,
    generated_at: memoryStore.generated_at,
    source: memoryStore.source || {},
    thresholds: memoryStore.thresholds || {},
    memories: Array.isArray(memoryStore.memories) ? memoryStore.memories : [],
    relations: Array.isArray(memoryStore.relations) ? memoryStore.relations : [],
    actions: Array.isArray(memoryStore.actions) ? memoryStore.actions : [],
    graph_snapshots: Array.isArray(memoryStore.graph_snapshots) ? memoryStore.graph_snapshots : [],
  });
}

export function restoreMemoryFromBackup(backup = {}) {
  const result = validateMemoryBackupShape(stripDerivedBackupFields(backup));
  if (!result.ok) {
    throw new MemoryBackupValidationError("Memory backup failed structural verification", result.errors);
  }
  return reindexMemoryStore(result.value);
}

export function parseMemoryBackupJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new MemoryBackupValidationError("Invalid JSON backup", [{
      path: "",
      message: error.message,
    }]);
  }
  return restoreMemoryFromBackup(parsed);
}
