import { restoreMemoryFromBackup, serializeMemoryBackup } from "../backup-restore.mjs";

export function createPostgresMemoryAdapter({ pool, userId, description = "PostgreSQL Adapter" } = {}) {
  if (!pool) {
    throw new TypeError("Postgres memory adapter requires a 'pool' instance.");
  }
  if (!userId) {
    throw new TypeError("Postgres memory adapter requires a 'userId'.");
  }

  return {
    kind: "postgresql",
    description,
    async load() {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT content, embedding FROM memact_memory_entries WHERE user_id = $1',
          [userId]
        );
        const memories = rows.map(row => {
          const memory = JSON.parse(row.content);
          if (row.embedding) {
            if (Array.isArray(row.embedding)) {
              memory.embedding = row.embedding;
            } else if (typeof row.embedding === 'string') {
              try {
                memory.embedding = JSON.parse(row.embedding);
              } catch {
                memory.embedding = row.embedding.replace(/[\[\]]/g, '').split(',').map(Number);
              }
            }
          }
          return memory;
        });
        
        // For V1, we rely on the in-memory array of memories.
        return restoreMemoryFromBackup({
          schema_version: "memact.memory.v0",
          memories: memories,
        });
      } catch (error) {
        throw error;
      } finally {
        client.release();
      }
    },
    async save(memoryStore) {
      const backup = serializeMemoryBackup(memoryStore || {});
      const memories = backup.memories || [];
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const memoryIds = memories.map(m => m.id);
        
        // Remove memories that are no longer in the store
        if (memoryIds.length > 0) {
          await client.query(
            'DELETE FROM memact_memory_entries WHERE user_id = $1 AND id <> ALL($2::varchar[])',
            [userId, memoryIds]
          );
        } else {
          await client.query(
            'DELETE FROM memact_memory_entries WHERE user_id = $1',
            [userId]
          );
        }

        // Upsert the remaining memories
        for (const memory of memories) {
          const id = memory.id;
          const category = memory.category || 'general';
          const content = JSON.stringify(memory);
          const visibility = memory.sensitivity === 'sensitive' ? 'private' : 'public';
          const isStarred = (memory.strength || 0) >= 0.8;
          const embedding = Array.isArray(memory.embedding) ? `[${memory.embedding.join(',')}]` : null;
          
          await client.query(`
            INSERT INTO memact_memory_entries (id, user_id, category, content, visibility, is_starred, embedding, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              category = EXCLUDED.category,
              content = EXCLUDED.content,
              visibility = EXCLUDED.visibility,
              is_starred = EXCLUDED.is_starred,
              embedding = EXCLUDED.embedding,
              updated_at = NOW()
          `, [id, userId, category, content, visibility, isStarred, embedding]);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
