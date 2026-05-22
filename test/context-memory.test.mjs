import test from "node:test"
import assert from "node:assert/strict"
import { buildContextForFeature, forgetMemory, rememberFeatureOutput, rememberInferenceRecord, rememberSchemaPacket, retrieveContext } from "../src/engine.mjs"

test("schema packet remembered", () => {
  const result = rememberSchemaPacket({ id: "shopping_discount", confidence: 0.8, support: 3, label: "Shopping Discount" })
  assert.equal(result.action.accepted, true)
})

test("feature output remembered", () => {
  const result = rememberFeatureOutput({ feature_id: "user-context-wiki", output: { summary: "A" } })
  assert.equal(result.action.accepted, true)
})

test("inference record remembered and compact context retrieved", () => {
  const result = rememberInferenceRecord({
    id: "r1",
    packet_id: "p1",
    meaningful: true,
    meaningful_score: 0.8,
    source_label: "API docs",
    canonical_themes: ["api"],
    evidence: { text_excerpt: "API docs" }
  })
  const context = retrieveContext("api", result.memoryStore)
  assert.equal(context.contract, "memact.rag_context")
})

test("forgetMemory marks record forgotten", () => {
  const created = rememberFeatureOutput({ feature_id: "research-map", output: { summary: "A" } })
  const id = created.memory.id
  const forgotten = forgetMemory(id, created.memoryStore)
  assert.equal(forgotten.memoryStore.memories.find((memory) => memory.id === id).state, "forgotten")
})

test("buildContextForFeature returns schema and context", () => {
  const result = rememberSchemaPacket({ id: "research_docs", confidence: 0.8, support: 3, label: "Research Docs" })
  const context = buildContextForFeature("research-map", result.memoryStore)
  assert.equal(context.feature_id, "research-map")
})

test("reading schema packet becomes reading preference memory", () => {
  const result = rememberSchemaPacket({
    packet_id: "schema_reading_preferences_1",
    category: "reading",
    schema_type: "reading_preferences",
    confidence: 0.82,
    attributes: {
      preferred_topics: ["ai policy"],
      skipped_topics: ["celebrity"],
      average_scroll_depth: 88,
      finish_rate: 0.82,
      preferred_article_length: "long",
      preferred_summary_style: "deep_dive",
      repeat_topics: ["ai policy"]
    },
    sources: [{ id: "evt_1", title: "AI policy guide" }]
  })
  assert.equal(result.memory.type, "reading_preference_memory")
  const context = buildContextForFeature("adaptive-article-overview", result.memoryStore)
  assert.equal(context.reading_memory.preferred_summary_style, "deep_dive")
  assert.equal(context.reading_memory.preferred_topics[0], "ai policy")
})

test("adaptive article overview output is stored", () => {
  const result = rememberFeatureOutput({
    feature_id: "adaptive-article-overview",
    output: { summary_style: "key_points", overview: "Key points: A" },
    confidence: 0.7
  })
  assert.equal(result.memory.type, "feature_output_memory")
  assert.equal(result.memory.feature_id, "adaptive-article-overview")
})
