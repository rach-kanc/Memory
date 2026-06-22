# Memact Memory

The secure storage and search index of Memact. It houses all approved statements for a user's profile.

## Core Responsibilities
- **Secure Persistence**: Holds approved statements securely.
- **Index & Retrieval**: Fast indexing to retrieve only relevant approved statements when queried by authorized apps.

## Database Persistence (PostgreSQL)
For production environments, Memact Memory provides a PostgreSQL adapter aligned with the V1 Supabase architecture.

### Setup
1. Run the database migration script located at `database/migration_v1.sql` to create the required `memact_memory_entries` and `memact_app_permissions` tables.
2. Initialize the adapter in your server code:
```javascript
import pg from 'pg';
import { createMemoryRepository } from 'memact-memory/storage';
import { createPostgresMemoryAdapter } from 'memact-memory/adapters/postgresql';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const memoryStore = createMemoryRepository(
  createPostgresMemoryAdapter({ pool, userId: 'user-uuid-here' })
);
```
