const DEFAULT_TIMEOUT_MS = 20_000;

const readArguments = (argv) => {
  const parsed = {
    label: "AI runtime smoke",
    origin: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if ((argument === "--origin" || argument === "--base-url") && nextValue) {
      parsed.origin = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument === "--label" && nextValue) {
      parsed.label = nextValue.trim();
      index += 1;
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${argument}`);
  }

  if (!parsed.origin) {
    throw new Error("Pass --origin https://your-host to run the AI runtime smoke check.");
  }

  parsed.origin = parsed.origin.replace(/\/$/, "");
  return parsed;
};

const isJsonContentType = (response) => (response.headers.get("content-type") || "").includes("application/json");

const readJson = async (response, contextLabel) => {
  const rawText = await response.text();

  if (!isJsonContentType(response)) {
    throw new Error(`${contextLabel} returned non-JSON content-type "${response.headers.get("content-type") || "unknown"}": ${rawText.slice(0, 300)}`);
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(`${contextLabel} returned invalid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }
};

const requestJson = async ({ baseUrl, body, method, path }) => {
  const response = await fetch(new URL(path, `${baseUrl}/`), {
    body,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    method,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  const payload = await readJson(response, `${method} ${path}`);

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with status ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
};

const buildAgentTurnPayload = () => ({
  activeDocument: {
    documentId: "smoke-doc",
    existingHeadings: [{
      level: 1,
      nodeId: "heading-smoke",
      text: "Smoke",
    }],
    fileName: "smoke.md",
    markdown: "# Smoke\n\nConfirm the AI runtime responds with structured output.",
    mode: "markdown",
  },
  driveReferenceFileIds: [],
  localReferences: [],
  messages: [{
    createdAt: Date.now(),
    id: "smoke-user-1",
    role: "user",
    text: "Give me a short status reply for this smoke test.",
  }],
  targetDefault: "active_document",
  threadId: "smoke-thread",
});

const assertHealthPayload = (payload) => {
  if (!payload || payload.ok !== true || typeof payload.configured !== "boolean") {
    throw new Error(`/api/ai/health returned an unexpected payload: ${JSON.stringify(payload)}`);
  }
};

const assertAuthSessionPayload = (payload) => {
  if (!payload || payload.connected !== false || payload.provider !== null || payload.user !== null) {
    throw new Error(`/api/auth/session expected { connected: false, provider: null, user: null } without cookies. Received: ${JSON.stringify(payload)}`);
  }
};

const assertAgentTurnPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error(`/api/ai/agent/turn returned an empty payload.`);
  }

  if (typeof payload.assistantMessage?.text !== "string" || payload.assistantMessage.text.trim().length === 0) {
    throw new Error(`/api/ai/agent/turn did not include assistantMessage.text. Received: ${JSON.stringify(payload)}`);
  }

  if (typeof payload.effect?.type !== "string" || payload.effect.type.trim().length === 0) {
    throw new Error(`/api/ai/agent/turn did not include effect.type. Received: ${JSON.stringify(payload)}`);
  }
};

const main = async () => {
  const { label, origin } = readArguments(process.argv.slice(2));

  console.log(`[ai-runtime-smoke] label=${label} origin=${origin}`);

  const health = await requestJson({
    baseUrl: origin,
    method: "GET",
    path: "/api/ai/health",
  });
  assertHealthPayload(health);
  console.log(`[ai-runtime-smoke] health ok configured=${health.configured}`);

  const session = await requestJson({
    baseUrl: origin,
    method: "GET",
    path: "/api/auth/session",
  });
  assertAuthSessionPayload(session);
  console.log("[ai-runtime-smoke] auth/session ok connected=false");

  const agentTurn = await requestJson({
    baseUrl: origin,
    body: JSON.stringify(buildAgentTurnPayload()),
    method: "POST",
    path: "/api/ai/agent/turn",
  });
  assertAgentTurnPayload(agentTurn);
  console.log(`[ai-runtime-smoke] agent/turn ok effect=${agentTurn.effect.type}`);
};

main().catch((error) => {
  console.error(`[ai-runtime-smoke] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
