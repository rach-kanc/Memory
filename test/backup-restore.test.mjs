import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MemoryBackupValidationError,
  parseMemoryBackupJson,
  restoreMemoryFromBackup,
} from "../src/backup-restore.mjs";
import { validateMemoryBackupShape } from "../src/memory-schemas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VALID_BACKUP = {
  schema_version: "memact.memory.v0",
  memories: [
    {
      id: "memory:activity:test",
      type: "activity_memory",
      label: "Test memory",
      summary: "A valid activity memory",
      strength: 0.5,
      state: "active",
      themes: ["test"],
    },
  ],
};

test("valid backup restores and reindexes derived fields", () => {
  const restored = restoreMemoryFromBackup(VALID_BACKUP);
  assert.equal(restored.schema_version, "memact.memory.v0");
  assert.equal(restored.memories.length, 1);
  assert.equal(restored.activity_memories.length, 1);
  assert.ok(restored.graph);
  assert.ok(restored.stats);
});

test("example reading backup restores successfully", async () => {
  const json = await readFile(join(__dirname, "../examples/article-reading-memory.json"), "utf8");
  const restored = parseMemoryBackupJson(json);
  assert.equal(restored.memories[0].type, "reading_preference_memory");
});

test("rejects invalid JSON with parsing error", () => {
  assert.throws(
    () => parseMemoryBackupJson("{not-json"),
    (error) => {
      assert.equal(error.name, "MemoryBackupValidationError");
      assert.match(error.message, /Invalid JSON backup/);
      return true;
    },
  );
});

test("rejects wrong schema version", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v99",
    memories: [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "schema_version"));
});

test("rejects unknown top-level spoofed fields", () => {
  const result = validateMemoryBackupShape({
    ...VALID_BACKUP,
    admin_override: true,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "admin_override"));
});

test("rejects derived store fields in backup", () => {
  const result = validateMemoryBackupShape({
    ...VALID_BACKUP,
    graph: { nodes: [], edges: [] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "graph"));
});

test("rejects unknown memory entity type", () => {
  assert.throws(
    () => restoreMemoryFromBackup({
      schema_version: "memact.memory.v0",
      memories: [{
        id: "memory:spoof",
        type: "admin_memory",
        label: "Spoofed",
      }],
    }),
    MemoryBackupValidationError,
  );
});

test("rejects spoofed fields on memory entities", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v0",
    memories: [{
      id: "memory:activity:test",
      type: "activity_memory",
      label: "Test memory",
      elevation_token: "root",
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "memories.0.elevation_token"));
});

test("rejects unsupported visible scope actor types", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v0",
    memories: [{
      id: "memory:field:test",
      type: "field_memory",
      label: "Diet preference",
      field_path: "diet.preference",
      allowed_actor_types: ["superadmin"],
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "memories.0.allowed_actor_types.0"));
});

test("rejects unsupported sensitivity scope", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v0",
    memories: [{
      id: "memory:field:test",
      type: "field_memory",
      label: "Secret",
      sensitivity: "classified",
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "memories.0.sensitivity"));
});

test("rejects corrupt relation types", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v0",
    memories: [],
    relations: [{
      id: "relation:test",
      from: "memory:a",
      to: "memory:b",
      type: "hijacks",
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "relations.0.type"));
});

test("rejects missing required memory fields", () => {
  const result = validateMemoryBackupShape({
    schema_version: "memact.memory.v0",
    memories: [{ type: "activity_memory" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "memories.0.id"));
  assert.ok(result.errors.some((error) => error.path === "memories.0.label"));
});

test("restore strips derived fields before verification", () => {
  const restored = restoreMemoryFromBackup({
    ...VALID_BACKUP,
    graph: { nodes: [{ id: "spoofed" }], edges: [] },
    stats: { memoryCount: 999 },
  });
  assert.equal(restored.stats.memoryCount, 1);
  assert.notEqual(restored.graph.nodes[0]?.id, "spoofed");
});

test("restoreMemoryFromBackup exposes validation errors", () => {
  try {
    restoreMemoryFromBackup({ schema_version: "memact.memory.v0", memories: "bad" });
    assert.fail("expected validation error");
  } catch (error) {
    assert.equal(error.name, "MemoryBackupValidationError");
    assert.ok(Array.isArray(error.errors));
    assert.ok(error.errors.length > 0);
  }
});
