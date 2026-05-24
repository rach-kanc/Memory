# Memact Memory

Memact means act-on-memory.

Memory stores the accepted user context that survives after Wiki review. Apps
can propose context, Access checks permission, Schema shapes it, Wiki lets the
user accept/edit/reject/delete it, and Memory stores what remains useful.

Storage is local-first today, with a path for user-owned personal cloud storage
later.

## Owns

- Durable memory records.
- Schema memories.
- Accepted Wiki entries.
- App-safe summaries.
- Corrections and forgetting records.
- Retrieval for apps and user views.
- CRUD operations for memory records.
- RAG-style retrieval context for allowed app reads.

## Does Not Own

- Capture.
- Schema formation.
- Wiki moderation UI.
- API key verification.
- Full-Wiki access for apps.

## Current Code

The v0 engine supports:

- `createMemory(memoryInput, memoryStore)`
- `readMemory(memoryId, memoryStore)`
- `updateMemory(memoryId, patch, memoryStore)`
- `deleteMemory(memoryId, memoryStore)`
- `retrieveMemories(query, memoryStore, options)`
- `buildRagContext(query, memoryStore, options)`
- `rememberSchemaPacket(packet)`
- `rememberFeatureOutput(output)` for compatibility with older feature output records
- `retrieveContext(query, memoryStore, options)`
- `retrieveSchemaPackets(filter)`
- `buildContextForFeature(featureId, options)`
- `createCorrection(memoryId, correction)`
- `forgetMemory(memoryId, reason)`

Summary retrieval returns compact records by default. RAG context is built from
allowed memories, relation trails, and supporting snippets. Raw graph-style
retrieval is a separate permission boundary and should not be treated as the
default app response.

## Development

```powershell
npm install
npm run check
```
