import { Buffer } from "node:buffer";
import { CloudTasksClient } from "@google-cloud/tasks";

let cachedTasksClient: CloudTasksClient | null = null;

const getTasksClient = () => {
  if (!cachedTasksClient) {
    cachedTasksClient = new CloudTasksClient();
  }

  return cachedTasksClient;
};

const getCloudProject = () => process.env.GOOGLE_CLOUD_PROJECT?.trim() || "";
const getTexTaskQueue = () => process.env.TEX_TASK_QUEUE?.trim() || "";
const getTexTaskLocation = () => process.env.TEX_TASK_LOCATION?.trim() || "";
const getTexJobWorkerUrl = () => process.env.TEX_JOB_WORKER_URL?.trim().replace(/\/$/, "") || "";
const getTexAuthToken = () => process.env.TEX_SERVICE_AUTH_TOKEN?.trim() || "";

const canUseCloudTasks = () =>
  Boolean(getCloudProject() && getTexTaskQueue() && getTexTaskLocation() && getTexJobWorkerUrl());

export const enqueueTexJob = async ({
  jobId,
  processLocally,
}: {
  jobId: string;
  processLocally?: () => Promise<void>;
}) => {
  if (!canUseCloudTasks()) {
    if (!processLocally) {
      return;
    }

    queueMicrotask(() => {
      void processLocally().catch((error) => {
        console.error(`[TeX Job Queue] Local background processing failed jobId=${jobId}`, error);
      });
    });
    return;
  }

  const taskClient = getTasksClient();
  const parent = taskClient.queuePath(getCloudProject(), getTexTaskLocation(), getTexTaskQueue());
  const payload = Buffer.from(JSON.stringify({ jobId })).toString("base64");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authToken = getTexAuthToken();

  if (authToken) {
    headers["X-Docsy-Tex-Token"] = authToken;
  }

  await taskClient.createTask({
    parent,
    task: {
      dispatchDeadline: { seconds: 900 },
      httpRequest: {
        body: payload,
        headers,
        httpMethod: "POST",
        url: `${getTexJobWorkerUrl()}/tasks/tex-jobs`,
      },
    },
  });
};
