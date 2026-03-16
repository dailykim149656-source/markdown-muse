import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTexJobStore, resetTexJobStoreForTests } from "../../server/modules/tex/jobStore";

const ORIGINAL_ENV = {
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  K_SERVICE: process.env.K_SERVICE,
  K_REVISION: process.env.K_REVISION,
  TEX_JOB_STATE_PATH: process.env.TEX_JOB_STATE_PATH,
  WORKSPACE_REPOSITORY_BACKEND: process.env.WORKSPACE_REPOSITORY_BACKEND,
};

beforeEach(() => {
  vi.useFakeTimers();
  process.env.GOOGLE_CLOUD_PROJECT = "";
  process.env.K_SERVICE = "";
  process.env.K_REVISION = "";
  process.env.WORKSPACE_REPOSITORY_BACKEND = "file";
  process.env.TEX_JOB_STATE_PATH = `.data/test-tex-jobs-${Date.now()}.json`;
  resetTexJobStoreForTests();
});

afterEach(() => {
  vi.useRealTimers();
  process.env.GOOGLE_CLOUD_PROJECT = ORIGINAL_ENV.GOOGLE_CLOUD_PROJECT;
  process.env.K_SERVICE = ORIGINAL_ENV.K_SERVICE;
  process.env.K_REVISION = ORIGINAL_ENV.K_REVISION;
  process.env.TEX_JOB_STATE_PATH = ORIGINAL_ENV.TEX_JOB_STATE_PATH;
  process.env.WORKSPACE_REPOSITORY_BACKEND = ORIGINAL_ENV.WORKSPACE_REPOSITORY_BACKEND;
  resetTexJobStoreForTests();
});

describe("tex job store", () => {
  it("creates, claims, and completes preview jobs", async () => {
    const store = getTexJobStore();
    const created = await store.createJob({
      contentHash: "hash-1",
      documentName: "Draft",
      latex: "\\section{One}",
      mode: "preview",
      sourceType: "raw-latex",
    });

    expect(created.status).toBe("queued");

    const claimed = await store.claimJob(created.jobId);
    expect(claimed?.status).toBe("running");

    const completed = await store.completeJob(created.jobId, "succeeded", {
      compileMs: 123,
      expiresAt: Date.now() + 900_000,
      logSummary: "ok",
      previewUrl: "https://example.com/preview.pdf",
    });

    expect(completed?.status).toBe("succeeded");
    expect(completed?.previewUrl).toBe("https://example.com/preview.pdf");
  });
});
