-- Docsy PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scope TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_connections_user_id
  ON workspace_connections(user_id);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_docs', 'drive_file', 'local')),
  source_file_id TEXT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_user_id
  ON documents(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_documents_source_file_id
  ON documents(source_file_id);

CREATE TABLE IF NOT EXISTS document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_revision_id TEXT,
  raw_content TEXT,
  ast_json JSONB NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_snapshots_document_id
  ON document_snapshots(document_id);

CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('references', 'depends_on', 'shares_procedure')),
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
  detected_by TEXT NOT NULL CHECK (detected_by IN ('rule', 'ai', 'hybrid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_document_id, target_document_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_document_relationships_source_document_id
  ON document_relationships(source_document_id);

CREATE INDEX IF NOT EXISTS idx_document_relationships_target_document_id
  ON document_relationships(target_document_id);

CREATE TABLE IF NOT EXISTS analysis_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_issues_source_document_id
  ON analysis_issues(source_document_id);

CREATE INDEX IF NOT EXISTS idx_analysis_issues_status
  ON analysis_issues(status);

CREATE TABLE IF NOT EXISTS issue_related_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES analysis_issues(id) ON DELETE CASCADE,
  related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE (issue_id, related_document_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_related_documents_issue_id
  ON issue_related_documents(issue_id);

CREATE TABLE IF NOT EXISTS patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES analysis_issues(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  operations_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patches_issue_id
  ON patches(issue_id);

CREATE INDEX IF NOT EXISTS idx_patches_document_id
  ON patches(document_id);

CREATE INDEX IF NOT EXISTS idx_patches_status
  ON patches(status);

CREATE TABLE IF NOT EXISTS patch_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID NOT NULL REFERENCES patches(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('accept', 'reject')),
  review_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patch_reviews_patch_id
  ON patch_reviews(patch_id);

CREATE TABLE IF NOT EXISTS workspace_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID NOT NULL REFERENCES patches(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  external_comment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'resolved', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_comments_patch_id
  ON workspace_comments(patch_id);

CREATE TABLE IF NOT EXISTS sync_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES workspace_connections(id) ON DELETE CASCADE,
  last_change_token TEXT,
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_states_connection_id
  ON sync_states(connection_id);

CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES workspace_connections(id) ON DELETE CASCADE,
  external_file_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('updated', 'deleted', 'renamed')),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_connection_id
  ON sync_events(connection_id);

CREATE INDEX IF NOT EXISTS idx_sync_events_processed
  ON sync_events(processed);
