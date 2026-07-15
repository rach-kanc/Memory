import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, createEmbeddingService } from "../src/embeddings.mjs";
import { retrieveMemories } from "../src/engine.mjs";

test("cosineSimilarity calculations", () => {
  // Identical vectors
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([0, 1], [0, 1]), 1);

  // Orthogonal vectors
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);

  // Opposite vectors
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);

  // Approximate similarity
  const sim = cosineSimilarity([1, 1], [1, 0]);
  assert.ok(Math.abs(sim - 0.7071) < 0.001);

  // Error/invalid cases
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity([1, 2], [1]), 0);
  assert.equal(cosineSimilarity(null, [1]), 0);
});

test("createEmbeddingService mock generation", async () => {
  const service = createEmbeddingService({ provider: "mock", dimension: 8 });
  const emb1 = await service.getEmbedding("Paul Graham");
  const emb2 = await service.getEmbedding("Paul Graham");
  const emb3 = await service.getEmbedding("Startup execution");

  assert.equal(emb1.length, 8);
  assert.deepEqual(emb1, emb2); // Deterministic
  assert.notDeepEqual(emb1, emb3); // Distinct texts produce distinct vectors

  // Verify vector normalization (magnitude equals 1)
  const magnitude = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0));
  assert.ok(Math.abs(magnitude - 1.0) < 0.0001);
});

test("hybrid retrieval with embeddings", () => {
  const store = {
    memories: [
      {
        id: "mem:1",
        label: "diet restrictions",
        summary: "I do not eat peanuts due to allergies.",
        embedding: [1, 0, 0, 0],
        strength: 0.8,
      },
      {
        id: "mem:2",
        label: "workout schedule",
        summary: "Leg day is on Wednesday.",
        embedding: [0, 1, 0, 0],
        strength: 0.8,
      },
    ],
  };

  // Pure lexical search
  const res1 = retrieveMemories("peanuts", store);
  assert.equal(res1[0].id, "mem:1");

  // Semantic retrieval utilizing vector search
  // A query embedding of [1, 0, 0, 0] should match peanuts perfectly
  const res2 = retrieveMemories("dietary issue", store, {
    queryEmbedding: [1, 0, 0, 0],
    alpha: 1.0, // pure semantic search
  });
  assert.equal(res2[0].id, "mem:1");
});
