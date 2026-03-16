import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const parseArgs = (argv) => {
  const parsed = {
    apply: false,
    project: "",
    region: "",
    services: [],
  };

  for (const argument of argv) {
    if (argument === "--apply") {
      parsed.apply = true;
      continue;
    }

    const [flag, rawValue = ""] = argument.split("=", 2);
    const value = rawValue.trim();

    if (flag === "--project") {
      parsed.project = value;
      continue;
    }

    if (flag === "--region") {
      parsed.region = value;
      continue;
    }

    if (flag === "--services") {
      parsed.services = value.split(",").map((entry) => entry.trim()).filter(Boolean);
    }
  }

  if (!parsed.project || !parsed.region || parsed.services.length === 0) {
    throw new Error("Usage: node scripts/gcp/apply-cloud-run-monitoring.mjs --project=<project> --region=<region> --services=docsy,docsy-tex [--apply]");
  }

  return parsed;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const templateRoot = resolve(repoRoot, "ops", "gcp", "monitoring");
const outputRoot = resolve(repoRoot, "output", "gcp-monitoring");

const renderTemplate = async (templateFileName, replacements) => {
  const template = await readFile(resolve(templateRoot, templateFileName), "utf8");
  return Object.entries(replacements).reduce(
    (current, [key, value]) => current.replaceAll(`__${key}__`, value),
    template,
  );
};

const writeRenderedFile = async (relativePath, content) => {
  const targetPath = resolve(outputRoot, relativePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
  return targetPath;
};

const runCommand = async (command, args) => new Promise((resolvePromise, rejectPromise) => {
  const child = spawn(command, args, {
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code === 0) {
      resolvePromise();
      return;
    }

    rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code ?? -1}.`));
  });

  child.on("error", rejectPromise);
});

const buildOomLogFilter = ({ project, region, serviceName }) => [
  `resource.type="cloud_run_revision"`,
  `resource.labels.service_name="${serviceName}"`,
  `resource.labels.location="${region}"`,
  `resource.labels.project_id="${project}"`,
  `(`,
  `textPayload:"using too much memory"`,
  `OR textPayload:"memory limit"`,
  `OR textPayload:"OOMKilled"`,
  `OR textPayload:"terminated"`,
  `)`,
].join(" ");

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(outputRoot, { recursive: true });

  const dashboard = await renderTemplate("dashboard.cloud-run-memory.json", {
    REGION: args.region,
  });
  const dashboardPath = await writeRenderedFile("dashboard.cloud-run-memory.json", dashboard);

  const renderedPolicies = [];

  for (const serviceName of args.services) {
    const oomMetricName = `cloud_run_oom_events_${serviceName.replaceAll("-", "_")}`;
    const memoryPolicy = await renderTemplate("policy.memory-utilization.json", {
      REGION: args.region,
      SERVICE_NAME: serviceName,
    });
    const oomPolicy = await renderTemplate("policy.oom-events.json", {
      OOM_METRIC_NAME: oomMetricName,
      SERVICE_NAME: serviceName,
    });

    const memoryPolicyPath = await writeRenderedFile(`policy.memory-utilization.${serviceName}.json`, memoryPolicy);
    const oomPolicyPath = await writeRenderedFile(`policy.oom-events.${serviceName}.json`, oomPolicy);
    const oomMetricFilter = buildOomLogFilter({
      project: args.project,
      region: args.region,
      serviceName,
    });
    const oomMetricFilterPath = await writeRenderedFile(`metric.oom-events.${serviceName}.filter.txt`, oomMetricFilter);

    renderedPolicies.push({
      memoryPolicyPath,
      oomMetricFilter,
      oomMetricFilterPath,
      oomMetricName,
      oomPolicyPath,
      serviceName,
    });
  }

  console.info(`Rendered dashboard: ${dashboardPath}`);
  for (const policy of renderedPolicies) {
    console.info(`Rendered memory policy (${policy.serviceName}): ${policy.memoryPolicyPath}`);
    console.info(`Rendered OOM metric filter (${policy.serviceName}): ${policy.oomMetricFilterPath}`);
    console.info(`Rendered OOM policy (${policy.serviceName}): ${policy.oomPolicyPath}`);
  }

  if (!args.apply) {
    return;
  }

  await runCommand("gcloud", [
    "monitoring",
    "dashboards",
    "create",
    `--project=${args.project}`,
    `--config-from-file=${dashboardPath}`,
  ]);

  for (const policy of renderedPolicies) {
    await runCommand("gcloud", [
      "logging",
      "metrics",
      "create",
      policy.oomMetricName,
      `--project=${args.project}`,
      "--description=Cloud Run OOM or abnormal restart events",
      `--log-filter=${policy.oomMetricFilter}`,
    ]);

    await runCommand("gcloud", [
      "alpha",
      "monitoring",
      "policies",
      "create",
      `--project=${args.project}`,
      `--policy-from-file=${policy.memoryPolicyPath}`,
    ]);

    await runCommand("gcloud", [
      "alpha",
      "monitoring",
      "policies",
      "create",
      `--project=${args.project}`,
      `--policy-from-file=${policy.oomPolicyPath}`,
    ]);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
