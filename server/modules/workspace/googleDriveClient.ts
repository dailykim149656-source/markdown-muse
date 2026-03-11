import { HttpError } from "../http/http";

export interface WorkspaceDriveFile {
  fileId: string;
  iconLink?: string;
  mimeType: string;
  modifiedTime?: string;
  name: string;
  revisionId?: string;
  webViewLink?: string;
}

interface GoogleDriveFileResource {
  iconLink?: string;
  id?: string;
  mimeType?: string;
  modifiedTime?: string;
  name?: string;
  version?: string;
  webViewLink?: string;
}

interface GoogleDriveChangeResource {
  file?: GoogleDriveFileResource;
  fileId?: string;
  removed?: boolean;
}

interface ListGoogleDocsFilesOptions {
  pageSize?: number;
  pageToken?: string | null;
  query?: string | null;
}

const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const GOOGLE_DOCS_MIME_TYPE = "application/vnd.google-apps.document";

const readGoogleError = async (response: Response) => {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ignore parse failure
  }

  return `Google Drive request failed with status ${response.status}.`;
};

const normalizeDriveFile = (file: GoogleDriveFileResource): WorkspaceDriveFile | null => {
  if (!file.id || !file.name || !file.mimeType) {
    return null;
  }

  return {
    fileId: file.id,
    iconLink: file.iconLink,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    name: file.name,
    revisionId: file.version,
    webViewLink: file.webViewLink,
  };
};

const escapeDriveQueryLiteral = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");

export const getGoogleDriveFileMetadata = async (
  accessToken: string,
  fileId: string,
): Promise<WorkspaceDriveFile> => {
  const url = new URL(`${GOOGLE_DRIVE_API_URL}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,modifiedTime,iconLink,webViewLink,version");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as GoogleDriveFileResource;
  const file = normalizeDriveFile(payload);

  if (!file) {
    throw new HttpError(502, "Google Drive returned incomplete file metadata.");
  }

  return file;
};

export const listGoogleDocsFiles = async (
  accessToken: string,
  options: ListGoogleDocsFilesOptions = {},
) => {
  const url = new URL(`${GOOGLE_DRIVE_API_URL}/files`);
  const queryParts = [`mimeType='${GOOGLE_DOCS_MIME_TYPE}'`, "trashed=false"];

  if (options.query?.trim()) {
    queryParts.push(`name contains '${escapeDriveQueryLiteral(options.query.trim())}'`);
  }

  url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,modifiedTime,iconLink,webViewLink,version)");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", String(Math.max(1, Math.min(options.pageSize || 20, 50))));
  url.searchParams.set("q", queryParts.join(" and "));
  url.searchParams.set("supportsAllDrives", "true");

  if (options.pageToken) {
    url.searchParams.set("pageToken", options.pageToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    files?: GoogleDriveFileResource[];
    nextPageToken?: string;
  };

  return {
    files: (payload.files || [])
      .map(normalizeDriveFile)
      .filter((file): file is WorkspaceDriveFile => Boolean(file)),
    nextCursor: payload.nextPageToken || null,
  };
};

export const exportGoogleDocAsHtml = async (accessToken: string, fileId: string) => {
  const url = new URL(`${GOOGLE_DRIVE_API_URL}/files/${encodeURIComponent(fileId)}/export`);
  url.searchParams.set("mimeType", "text/html");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  return response.text();
};

export const getGoogleDriveStartPageToken = async (accessToken: string) => {
  const url = new URL(`${GOOGLE_DRIVE_API_URL}/changes/startPageToken`);
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    startPageToken?: string;
  };

  if (!payload.startPageToken) {
    throw new HttpError(502, "Google Drive did not return a start page token.");
  }

  return payload.startPageToken;
};

export const listGoogleDriveChanges = async (
  accessToken: string,
  pageToken: string,
) => {
  const url = new URL(`${GOOGLE_DRIVE_API_URL}/changes`);
  url.searchParams.set("fields", "changes(fileId,removed,file(id,name,mimeType,modifiedTime,version,trashed)),newStartPageToken,nextPageToken");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("pageToken", pageToken);
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    changes?: GoogleDriveChangeResource[];
    newStartPageToken?: string;
    nextPageToken?: string;
  };

  return {
    changes: (payload.changes || []).map((change) => ({
      file: change.file ? normalizeDriveFile(change.file) : null,
      fileId: change.fileId || change.file?.id || "",
      removed: Boolean(change.removed),
    })),
    newStartPageToken: payload.newStartPageToken || null,
    nextPageToken: payload.nextPageToken || null,
  };
};
