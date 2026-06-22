-- Migration V1: Memact Memory PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: memact_memory_entries
-- Stores user-approved memory statements, aligning with V1 Supabase architecture.
CREATE TABLE IF NOT EXISTS memact_memory_entries (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('private', 'friends', 'public')),
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: memact_app_permissions
-- Stores app category access grants
CREATE TABLE IF NOT EXISTS memact_app_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    allowed_visibility VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memact_memory_entries_user_id ON memact_memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memact_memory_entries_category ON memact_memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_memact_app_permissions_user_id ON memact_app_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_memact_app_permissions_app_id ON memact_app_permissions(app_id);
