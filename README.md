# Memact Memory

Memory stores useful user memory.

It stores schema packets, feature outputs, semantic evidence, source links,
corrections, and forgetting actions. Storage is local-first today, with a path
for user-owned personal cloud storage later.

## Owns

- Durable memory records.
- Schema memories.
- Feature output memories.
- Inference memories.
- Corrections and forgetting records.
- Retrieval for app/user features.

## Does Not Own

- Capture.
- Semantic inference.
- Schema formation.
- Studio feature implementation.
- API key verification.

## Current Code

The v0 engine supports:

- `rememberSchemaPacket(packet)`
- `rememberFeatureOutput(output)`
- `rememberInferenceRecord(record)`
- `retrieveContext(query, options)`
- `retrieveSchemaPackets(filter)`
- `buildContextForFeature(featureId, options)`
- `createCorrection(memoryId, correction)`
- `forgetMemory(memoryId, reason)`

Summary retrieval returns compact records by default. Raw graph-style retrieval
is a separate permission boundary and should not be treated as the default app
response.

## Development

```powershell
npm install
npm run check
```
