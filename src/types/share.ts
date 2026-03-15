export type ShareCompression = "deflate-raw-base64url";

export type ShareLinkErrorCode =
  | "create_failed"
  | "expired"
  | "not_found"
  | "payload_too_large"
  | "server_unavailable";

export interface DocumentShareCreateRequest {
  payload: string;
}

export interface DocumentShareCreateResponse {
  expiresAt: number;
  link: string;
  shareId: string;
}

export interface DocumentShareResolveResponse {
  expiresAt: number;
  payload: string;
  shareId: string;
}

export interface ShareLinkInfo {
  available: boolean;
  errorCode: ShareLinkErrorCode | null;
  expiresAt: number | null;
  link: string | null;
  shareId: string | null;
}
