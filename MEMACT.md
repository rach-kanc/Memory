# Memact Memory Notes

Memact means act-on-memory.

Memory stores accepted user context after Wiki review. It keeps the records,
source trails, edits, corrections, deleted/forgotten state, and app-safe
summaries needed for later retrieval.

The Memory engine supports CRUD and RAG-style retrieval:

- create, read, update, and delete memory records
- retrieve memories for a query
- build compact RAG context from allowed memories
- keep raw graph-style access behind a separate permission boundary

Memory does not check app access, shape category schemas, or decide what the
user accepts. Access, Schema, and Wiki handle those steps before Memory stores
what survives.
