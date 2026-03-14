export interface CookieOptions {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "Lax" | "None" | "Strict";
  secure?: boolean;
}

export const parseCookieHeader = (cookieHeader?: string | null) => {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = rawName?.trim();

    if (!name) {
      continue;
    }

    const value = rawValueParts.join("=").trim();
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }

  return cookies;
};

export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path || "/"}`);

  if (typeof options.maxAge === "number") {
    const maxAge = Math.max(0, Math.floor(options.maxAge));
    parts.push(`Max-Age=${maxAge}`);
    parts.push(`Expires=${new Date(Date.now() + (maxAge * 1000)).toUTCString()}`);
  }

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const serializeClearedCookie = (
  name: string,
  options: Pick<CookieOptions, "path" | "sameSite" | "secure"> = {},
) =>
  serializeCookie(name, "", {
    ...options,
    maxAge: 0,
  });
