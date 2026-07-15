import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresMemoryAdapter } from "../../src/adapters/postgresql.mjs";

test("requires pool and userId", () => {
  assert.throws(() => createPostgresMemoryAdapter({}), TypeError);
  assert.throws(() => createPostgresMemoryAdapter({ pool: {} }), TypeError);
});

test("load retrieves and parses memories", async () => {
  const mockRows = [
    { content: JSON.stringify({ id: "mem1", type: "activity_memory", label: "Memory 1" }), embedding: "[0.1,0.2]" },
    { content: JSON.stringify({ id: "mem2", type: "activity_memory", label: "Memory 2" }), embedding: [0.3,0.4] }
  ];
  
  const queries = [];
  const mockClient = {
    query: async (text, values) => {
      queries.push({ text, values });
      return { rows: mockRows };
    },
    release: () => {}
  };
  
  const mockPool = {
    connect: async () => mockClient
  };

  const adapter = createPostgresMemoryAdapter({ pool: mockPool, userId: "user-123" });
  const result = await adapter.load();
  
  assert.equal(result.memories.length, 2);
  assert.equal(result.memories[0].id, "mem1");
  assert.deepEqual(result.memories[0].embedding, [0.1, 0.2]);
  assert.deepEqual(result.memories[1].embedding, [0.3, 0.4]);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /SELECT content, embedding FROM memact_memory_entries/);
  assert.deepEqual(queries[0].values, ["user-123"]);
});

test("save performs upserts and deletes missing memories", async () => {
  const queries = [];
  const mockClient = {
    query: async (text, values) => {
      queries.push({ text, values });
    },
    release: () => {}
  };
  
  const mockPool = {
    connect: async () => mockClient
  };

  const adapter = createPostgresMemoryAdapter({ pool: mockPool, userId: "user-123" });
  
  await adapter.save({
    schema_version: "memact.memory.v0",
    memories: [
      { id: "mem1", type: "activity_memory", label: "Memory 1", category: "work", embedding: [0.5,0.6] },
      { id: "mem2", type: "activity_memory", label: "Memory 2", sensitivity: "sensitive", strength: 0.9 }
    ]
  });
  
  assert.equal(queries.length, 5); // BEGIN, DELETE, INSERT, INSERT, COMMIT
  
  // Verify DELETE
  assert.match(queries[1].text, /DELETE FROM memact_memory_entries/);
  assert.deepEqual(queries[1].values, ["user-123", ["mem1", "mem2"]]);
  
  // Verify INSERT mem1
  assert.match(queries[2].text, /INSERT INTO memact_memory_entries/);
  assert.equal(queries[2].values[0], "mem1"); // id
  assert.equal(queries[2].values[1], "user-123"); // userId
  assert.equal(queries[2].values[2], "work"); // category
  assert.equal(queries[2].values[4], "public"); // visibility
  assert.equal(queries[2].values[5], false); // is_starred
  assert.equal(queries[2].values[6], "[0.5,0.6]"); // embedding
  
  // Verify INSERT mem2
  assert.match(queries[3].text, /INSERT INTO memact_memory_entries/);
  assert.equal(queries[3].values[0], "mem2"); // id
  assert.equal(queries[3].values[4], "private"); // visibility
  assert.equal(queries[3].values[5], true); // is_starred
  assert.equal(queries[3].values[6], null); // embedding null
});

test("save handles empty memories array", async () => {
  const queries = [];
  const mockClient = {
    query: async (text, values) => {
      queries.push({ text, values });
    },
    release: () => {}
  };
  
  const mockPool = {
    connect: async () => mockClient
  };

  const adapter = createPostgresMemoryAdapter({ pool: mockPool, userId: "user-123" });
  
  await adapter.save({
    schema_version: "memact.memory.v0",
    memories: []
  });
  
  assert.equal(queries.length, 3); // BEGIN, DELETE, COMMIT
  assert.match(queries[1].text, /DELETE FROM memact_memory_entries WHERE user_id = \$1$/);
  assert.deepEqual(queries[1].values, ["user-123"]);
});

test("save rolls back transaction on error", async () => {
  const queries = [];
  const mockClient = {
    query: async (text, values) => {
      queries.push({ text, values });
      if (text.includes("INSERT")) throw new Error("DB Error");
    },
    release: () => {}
  };
  
  const mockPool = {
    connect: async () => mockClient
  };

  const adapter = createPostgresMemoryAdapter({ pool: mockPool, userId: "user-123" });
  
  await assert.rejects(async () => {
    await adapter.save({
      schema_version: "memact.memory.v0",
      memories: [{ id: "mem1", type: "activity_memory", label: "Memory 1" }]
    });
  }, /DB Error/);
  
  assert.ok(queries.some(q => q.text === "ROLLBACK"));
});
