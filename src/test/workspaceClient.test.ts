import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WorkspaceApiError,
  checkWorkspaceApiHealth,
  getWorkspaceSession,
} from "@/lib/workspace/client";

describe("workspace client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns structured health data from the health endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      configured: true,
      fallbackModel: "gemini-2.5-flash",
      model: "gemini-3.1-flash-lite-preview",
      ok: true,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    }));

    await expect(checkWorkspaceApiHealth()).resolves.toEqual({
      configured: true,
      fallbackModel: "gemini-2.5-flash",
      model: "gemini-3.1-flash-lite-preview",
      ok: true,
    });
  });

  it("throws a descriptive error when a workspace endpoint returns HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<!doctype html><html></html>", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 200,
    }));

    await expect(getWorkspaceSession()).rejects.toMatchObject({
      message: expect.stringContaining("Unexpected HTML response from /api/auth/session."),
      name: "WorkspaceApiError",
      statusCode: 200,
    } satisfies Partial<WorkspaceApiError>);
  });

  it("surfaces a clear message when the health endpoint returns frontend HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<!doctype html><html></html>", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 404,
    }));

    await expect(checkWorkspaceApiHealth()).rejects.toMatchObject({
      message: expect.stringContaining("returned HTML instead of JSON"),
      name: "WorkspaceApiError",
      statusCode: 404,
    } satisfies Partial<WorkspaceApiError>);
  });
});
