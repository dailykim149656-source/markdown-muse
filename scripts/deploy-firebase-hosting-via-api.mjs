import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

const getArgValue = (flag, defaultValue = "") => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return defaultValue;
  }

  return args[index + 1];
};

const projectId = getArgValue("--project");
const siteId = getArgValue("--site", projectId);
const buildDir = path.resolve(getArgValue("--dir", "dist"));

if (!projectId) {
  throw new Error("Missing required --project value.");
}

const getAccessToken = () => {
  const command = process.platform === "win32"
    ? ["cmd.exe", ["/c", "gcloud.cmd", "auth", "print-access-token"]]
    : ["gcloud", ["auth", "print-access-token"]];

  return execFileSync(command[0], command[1], {
    encoding: "utf8",
  }).trim();
};

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }

  return response.json();
};

const uploadBinary = async (url, buffer) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
};

const listFiles = async (rootDir, currentDir = rootDir) => {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(rootDir, absolutePath));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
};

const normalizeHostingConfig = async () => {
  const firebaseConfig = JSON.parse(await readFile(path.resolve("firebase.json"), "utf8"));
  const hostingConfig = firebaseConfig.hosting || {};

  return {
    headers: (hostingConfig.headers || []).map((header) => ({
      glob: header.source,
      headers: Object.fromEntries((header.headers || []).map((value) => [value.key, value.value])),
    })),
    rewrites: (hostingConfig.rewrites || []).map((rewrite) => ({
      ...(rewrite.destination ? { path: rewrite.destination } : {}),
      ...(rewrite.run ? { run: rewrite.run } : {}),
      glob: rewrite.source,
    })),
  };
};

const main = async () => {
  const files = await listFiles(buildDir);
  const fileHashes = new Map();
  const compressedFilesByHash = new Map();

  for (const absolutePath of files) {
    const relativePath = `/${path.relative(buildDir, absolutePath).replaceAll(path.sep, "/")}`;
    const content = await readFile(absolutePath);
    const compressed = gzipSync(content);
    const hash = createHash("sha256").update(compressed).digest("hex");

    fileHashes.set(relativePath, hash);
    compressedFilesByHash.set(hash, compressed);
  }

  const config = await normalizeHostingConfig();
  const version = await requestJson(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`, {
    body: JSON.stringify({ config }),
    method: "POST",
  });
  const versionName = version.name;

  const populateResult = await requestJson(`https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`, {
    body: JSON.stringify({
      files: Object.fromEntries(fileHashes.entries()),
    }),
    method: "POST",
  });

  const uploadRequiredHashes = populateResult.uploadRequiredHashes || [];
  const uploadBaseUrl = populateResult.uploadUrl;

  for (const hash of uploadRequiredHashes) {
    const compressedFile = compressedFilesByHash.get(hash);

    if (!compressedFile) {
      throw new Error(`Missing compressed file for hash ${hash}.`);
    }

    await uploadBinary(`${uploadBaseUrl}/${hash}`, compressedFile);
  }

  await requestJson(`https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`, {
    body: JSON.stringify({ status: "FINALIZED" }),
    method: "PATCH",
  });

  const release = await requestJson(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?versionName=${encodeURIComponent(versionName)}`,
    {
      method: "POST",
    },
  );

  console.log(JSON.stringify({
    release: release.name,
    siteId,
    version: versionName,
  }, null, 2));
};

await main();
