type HandleListenErrorOptions = {
  error: NodeJS.ErrnoException;
  port: number;
  serviceName: string;
};

const buildHealthUrl = (port: number) => `http://127.0.0.1:${port}/health`;

const isExistingAiServerHealthy = async (port: number) => {
  try {
    const response = await fetch(buildHealthUrl(port));

    if (!response.ok) {
      return false;
    }

    const payload = await response.json() as { configured?: unknown; ok?: unknown } | null;

    return payload?.ok === true && typeof payload.configured === "boolean";
  } catch {
    return false;
  }
};

export const handleListenError = async ({
  error,
  port,
  serviceName,
}: HandleListenErrorOptions) => {
  if (error.code === "EADDRINUSE") {
    const healthUrl = buildHealthUrl(port);

    if (await isExistingAiServerHealthy(port)) {
      console.warn(`[${serviceName}] Port ${port} is already in use by an existing AI server instance.`);
      console.warn(`[${serviceName}] Existing server is healthy at ${healthUrl}`);
      return 0;
    }

    console.error(`[${serviceName}] Port ${port} is already in use by another process.`);
    console.error(
      `[${serviceName}] This project expects the AI server on port ${port}. If you move it, update the frontend API URL, Vite proxy, and OAuth redirect settings together.`,
    );
    return 1;
  }

  console.error(`[${serviceName}] Failed to start listener on port ${port}.`, error);
  return 1;
};
