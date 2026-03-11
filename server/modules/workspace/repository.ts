import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface GoogleWorkspaceTokens {
  accessToken: string;
  expiryDate?: number;
  idToken?: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
}

export interface WorkspaceUserProfile {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export interface WorkspaceConnectionRecord {
  changePageToken?: string;
  connectedAt: number;
  connectionId: string;
  lastChangeScanAt?: number;
  provider: "google_drive";
  tokens: GoogleWorkspaceTokens;
  updatedAt: number;
  user: WorkspaceUserProfile;
}

export interface WorkspaceSessionRecord {
  connectionId: string;
  createdAt: number;
  expiresAt: number;
  sessionId: string;
  updatedAt: number;
}

export interface WorkspaceImportedDocumentRecord {
  connectionId: string;
  content: string;
  createdAt: number;
  documentId: string;
  docsJson?: unknown;
  driveModifiedTime?: string;
  fileId: string;
  fileName: string;
  lastRescannedAt?: number;
  latestRemoteModifiedTime?: string;
  latestRemoteRevisionId?: string;
  mimeType: string;
  remoteChangeDetectedAt?: number;
  revisionId?: string;
  updatedAt: number;
}

export interface WorkspaceAuthStateRecord {
  createdAt: number;
  expiresAt: number;
  returnTo: string;
  state: string;
}

interface WorkspaceRepositoryState {
  authStates: Record<string, WorkspaceAuthStateRecord>;
  connections: Record<string, WorkspaceConnectionRecord>;
  importedDocuments: Record<string, WorkspaceImportedDocumentRecord>;
  sessions: Record<string, WorkspaceSessionRecord>;
  version: 1;
}

const DEFAULT_REPOSITORY_STATE: WorkspaceRepositoryState = {
  authStates: {},
  connections: {},
  importedDocuments: {},
  sessions: {},
  version: 1,
};

const getRepositoryFilePath = () =>
  path.resolve(
    process.cwd(),
    process.env.WORKSPACE_STATE_PATH
      || process.env.WORKSPACE_DB_PATH
      || ".data/docsy-workspace-state.json",
  );

const readRepositoryState = async (): Promise<WorkspaceRepositoryState> => {
  const repositoryPath = getRepositoryFilePath();

  try {
    const raw = await readFile(repositoryPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkspaceRepositoryState>;

    return {
      authStates: parsed.authStates || {},
      connections: parsed.connections || {},
      importedDocuments: parsed.importedDocuments || {},
      sessions: parsed.sessions || {},
      version: 1,
    };
  } catch {
    return structuredClone(DEFAULT_REPOSITORY_STATE);
  }
};

const writeRepositoryState = async (state: WorkspaceRepositoryState) => {
  const repositoryPath = getRepositoryFilePath();
  await mkdir(path.dirname(repositoryPath), { recursive: true });
  await writeFile(repositoryPath, JSON.stringify(state, null, 2), "utf8");
};

class FileWorkspaceRepository {
  private queue = Promise.resolve();

  private enqueue<T>(operation: () => Promise<T>) {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async pruneExpired(now = Date.now()) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();

      for (const [stateId, authState] of Object.entries(state.authStates)) {
        if (authState.expiresAt <= now) {
          delete state.authStates[stateId];
        }
      }

      for (const [sessionId, session] of Object.entries(state.sessions)) {
        if (session.expiresAt <= now) {
          delete state.sessions[sessionId];
        }
      }

      await writeRepositoryState(state);
    });
  }

  async saveAuthState(record: WorkspaceAuthStateRecord) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      state.authStates[record.state] = record;
      await writeRepositoryState(state);
    });
  }

  async consumeAuthState(stateId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      const record = state.authStates[stateId] || null;

      if (record) {
        delete state.authStates[stateId];
        await writeRepositoryState(state);
      }

      return record;
    });
  }

  async upsertConnection(record: WorkspaceConnectionRecord) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      state.connections[record.connectionId] = record;
      await writeRepositoryState(state);
    });
  }

  async getConnection(connectionId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      return state.connections[connectionId] || null;
    });
  }

  async createSession(connectionId: string, ttlMs: number) {
    return this.enqueue(async () => {
      const now = Date.now();
      const session: WorkspaceSessionRecord = {
        connectionId,
        createdAt: now,
        expiresAt: now + ttlMs,
        sessionId: randomUUID(),
        updatedAt: now,
      };
      const state = await readRepositoryState();
      state.sessions[session.sessionId] = session;
      await writeRepositoryState(state);
      return session;
    });
  }

  async getSession(sessionId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      const session = state.sessions[sessionId];

      if (!session) {
        return null;
      }

      return {
        connection: state.connections[session.connectionId] || null,
        session,
      };
    });
  }

  async deleteSession(sessionId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      delete state.sessions[sessionId];
      await writeRepositoryState(state);
    });
  }

  async upsertImportedDocument(record: WorkspaceImportedDocumentRecord) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      state.importedDocuments[record.documentId] = record;
      await writeRepositoryState(state);
    });
  }

  async getImportedDocument(documentId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      return state.importedDocuments[documentId] || null;
    });
  }

  async listImportedDocuments(connectionId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      return Object.values(state.importedDocuments)
        .filter((document) => document.connectionId === connectionId)
        .sort((left, right) => right.updatedAt - left.updatedAt || left.fileName.localeCompare(right.fileName));
    });
  }
}

let repositoryInstance: FileWorkspaceRepository | null = null;

export const getWorkspaceRepository = () => {
  if (!repositoryInstance) {
    repositoryInstance = new FileWorkspaceRepository();
  }

  return repositoryInstance;
};
