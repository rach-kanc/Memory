-- Migration V2: Add pgvector support for semantic matching and vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column with default dimension 1536 (OpenAI / standard)
ALTER TABLE memact_memory_entries 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for fast similarity search using cosine distance
CREATE INDEX IF NOT EXISTS idx_memact_memory_entries_embedding 
ON memact_memory_entries USING hnsw (embedding vector_cosine_ops);
