import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface GoogleWorkspaceTokens {
  accessToken?: string;
  expiryDate?: number;
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
  createdAt: number;
  documentId: string;
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

const DEFAULT_CLOUD_RUN_STATE_PATH = path.posix.join("/tmp", "docsy-workspace-state.json");
const DEFAULT_LOCAL_STATE_PATH = path.join(homedir(), ".docsy", "workspace-state.json");

const isCloudRunEnvironment = (env = process.env) =>
  Boolean(env.K_SERVICE || env.K_REVISION || env.CLOUD_RUN_JOB);

const isTestEnvironment = (env = process.env) =>
  env.NODE_ENV === "test" || env.VITEST === "true";

const isPathInsideDirectory = (candidatePath: string, directoryPath: string) => {
  const relativePath = path.relative(directoryPath, candidatePath);
  return relativePath === ""
    || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const getDefaultRepositoryFilePath = (env = process.env) =>
  isCloudRunEnvironment(env) ? DEFAULT_CLOUD_RUN_STATE_PATH : DEFAULT_LOCAL_STATE_PATH;

export const resolveWorkspaceRepositoryFilePath = (
  env = process.env,
  cwd = process.cwd(),
) =>
  path.resolve(
    cwd,
    env.WORKSPACE_STATE_PATH
      || env.WORKSPACE_DB_PATH
      || getDefaultRepositoryFilePath(env),
  );

export const assertSafeWorkspaceRepositoryPath = (
  repositoryPath: string,
  env = process.env,
  cwd = process.cwd(),
) => {
  if (isTestEnvironment(env)) {
    return;
  }

  if (isPathInsideDirectory(repositoryPath, cwd)) {
    throw new Error(
      `Workspace state must be stored outside the repository. Configure WORKSPACE_STATE_PATH to a home or temp location. Current path: ${repositoryPath}`,
    );
  }
};

const getRepositoryFilePath = () => {
  const repositoryPath = resolveWorkspaceRepositoryFilePath();
  assertSafeWorkspaceRepositoryPath(repositoryPath);
  return repositoryPath;
};

const sanitizeWorkspaceTokens = (tokens: Partial<GoogleWorkspaceTokens> | null | undefined): GoogleWorkspaceTokens => ({
  expiryDate: typeof tokens?.expiryDate === "number" ? tokens.expiryDate : undefined,
  refreshToken: typeof tokens?.refreshToken === "string" ? tokens.refreshToken : undefined,
  scope: typeof tokens?.scope === "string" ? tokens.scope : undefined,
  tokenType: typeof tokens?.tokenType === "string" ? tokens.tokenType : undefined,
});

const sanitizeWorkspaceConnectionRecord = (
  record: Partial<WorkspaceConnectionRecord> | null | undefined,
): WorkspaceConnectionRecord | null => {
  if (!record?.connectionId || record.provider !== "google_drive") {
    return null;
  }

  return {
    changePageToken: typeof record.changePageToken === "string" ? record.changePageToken : undefined,
    connectedAt: typeof record.connectedAt === "number" ? record.connectedAt : Date.now(),
    connectionId: record.connectionId,
    lastChangeScanAt: typeof record.lastChangeScanAt === "number" ? record.lastChangeScanAt : undefined,
    provider: "google_drive",
    tokens: sanitizeWorkspaceTokens(record.tokens),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
    user: {
      email: typeof record.user?.email === "string" ? record.user.email : undefined,
      name: typeof record.user?.name === "string" ? record.user.name : undefined,
      picture: typeof record.user?.picture === "string" ? record.user.picture : undefined,
      sub: typeof record.user?.sub === "string" ? record.user.sub : undefined,
    },
  };
};

const sanitizeImportedDocumentRecord = (
  record: Partial<WorkspaceImportedDocumentRecord> | null | undefined,
): WorkspaceImportedDocumentRecord | null => {
  if (!record?.connectionId || !record.documentId || !record.fileId || !record.fileName || !record.mimeType) {
    return null;
  }

  return {
    connectionId: record.connectionId,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
    documentId: record.documentId,
    driveModifiedTime: typeof record.driveModifiedTime === "string" ? record.driveModifiedTime : undefined,
    fileId: record.fileId,
    fileName: record.fileName,
    lastRescannedAt: typeof record.lastRescannedAt === "number" ? record.lastRescannedAt : undefined,
    latestRemoteModifiedTime: typeof record.latestRemoteModifiedTime === "string" ? record.latestRemoteModifiedTime : undefined,
    latestRemoteRevisionId: typeof record.latestRemoteRevisionId === "string" ? record.latestRemoteRevisionId : undefined,
    mimeType: record.mimeType,
    remoteChangeDetectedAt: typeof record.remoteChangeDetectedAt === "number" ? record.remoteChangeDetectedAt : undefined,
    revisionId: typeof record.revisionId === "string" ? record.revisionId : undefined,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
  };
};

const readRepositoryState = async (): Promise<WorkspaceRepositoryState> => {
  const repositoryPath = getRepositoryFilePath();

  try {
    const raw = await readFile(repositoryPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkspaceRepositoryState>;

    return {
      authStates: parsed.authStates || {},
      connections: Object.fromEntries(
        Object.entries(parsed.connections || {})
          .map(([connectionId, record]) => [connectionId, sanitizeWorkspaceConnectionRecord(record)])
          .filter((entry): entry is [string, WorkspaceConnectionRecord] => Boolean(entry[1])),
      ),
      importedDocuments: Object.fromEntries(
        Object.entries(parsed.importedDocuments || {})
          .map(([documentId, record]) => [documentId, sanitizeImportedDocumentRecord(record)])
          .filter((entry): entry is [string, WorkspaceImportedDocumentRecord] => Boolean(entry[1])),
      ),
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
      try {
        const state = await readRepositoryState();
        let changed = false;

        for (const [stateId, authState] of Object.entries(state.authStates)) {
          if (authState.expiresAt <= now) {
            delete state.authStates[stateId];
            changed = true;
          }
        }

        for (const [sessionId, session] of Object.entries(state.sessions)) {
          if (session.expiresAt <= now) {
            delete state.sessions[sessionId];
            changed = true;
          }
        }

        if (changed) {
          await writeRepositoryState(state);
        }
      } catch (error) {
        // In read-only environments like Cloud Run with local filesystem,
        // we might not be able to write state. We ignore this during background pruning.
        console.warn("Failed to prune expired repository state:", error instanceof Error ? error.message : String(error));
      }
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
      const sanitizedRecord = sanitizeWorkspaceConnectionRecord(record);

      if (!sanitizedRecord) {
        throw new Error(`Workspace connection record is invalid for connectionId=${record.connectionId}`);
      }

      state.connections[record.connectionId] = sanitizedRecord;
      await writeRepositoryState(state);
    });
  }

  async getConnection(connectionId: string) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      return state.connections[connectionId] || null;
    });
  }

  async createSession(connectionId: string, absoluteTtlMs: number, idleTtlMs: number) {
    return this.enqueue(async () => {
      const now = Date.now();
      const session: WorkspaceSessionRecord = {
        connectionId,
        createdAt: now,
        expiresAt: now + Math.min(absoluteTtlMs, idleTtlMs),
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

  async touchSession(sessionId: string, absoluteTtlMs: number, idleTtlMs: number) {
    return this.enqueue(async () => {
      const state = await readRepositoryState();
      const session = state.sessions[sessionId];

      if (!session) {
        return null;
      }

      const now = Date.now();
      const absoluteExpiryAt = session.createdAt + absoluteTtlMs;
      const idleExpiryAt = now + idleTtlMs;
      const nextExpiryAt = Math.min(absoluteExpiryAt, idleExpiryAt);
      const updatedSession: WorkspaceSessionRecord = {
        ...session,
        expiresAt: nextExpiryAt,
        updatedAt: now,
      };

      state.sessions[sessionId] = updatedSession;
      await writeRepositoryState(state);

      return {
        connection: state.connections[updatedSession.connectionId] || null,
        session: updatedSession,
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
      const sanitizedRecord = sanitizeImportedDocumentRecord(record);

      if (!sanitizedRecord) {
        throw new Error(`Imported workspace document record is invalid for documentId=${record.documentId}`);
      }

      state.importedDocuments[record.documentId] = sanitizedRecord;
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
