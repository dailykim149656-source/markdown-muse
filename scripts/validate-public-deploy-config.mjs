import {
  readPublicDeploymentConfig,
  readPublicDeploymentValidationOptions,
  validatePublicDeploymentConfig,
} from "../server/modules/config/publicDeploymentConfig.js";

const config = readPublicDeploymentConfig(process.env);
const validationOptions = readPublicDeploymentValidationOptions(process.env);
const validation = validatePublicDeploymentConfig(config, validationOptions);
const formatOptionalBoolean = (value, rawValue) => {
  if (value === true || value === false) {
    return value ? "true" : "false";
  }

  return rawValue || "(unset)";
};

console.log("[public-deploy] OAuth publishing status:", config.publishingStatus);
console.log("[public-deploy] Allowed origins:", config.allowedOrigins.join(", ") || "(none)");
console.log("[public-deploy] Browser API base URL:", config.browserApiBaseUrl || "(unset)");
console.log("[public-deploy] Frontend origin:", config.frontendOrigin || "(unset)");
console.log("[public-deploy] Redirect origin:", config.redirectOrigin || "(unset)");
console.log("[public-deploy] Redirect URI:", config.redirectUri || "(unset)");
console.log(
  "[public-deploy] Expected hosted frontend origin:",
  validationOptions.expectedHostedFrontendOrigin || "(unset)",
);
console.log("[public-deploy] Workspace repository backend:", config.workspaceRepositoryBackend || "(auto)");
console.log("[public-deploy] Scope profile:", config.scopeProfile);
console.log("[public-deploy] Scope risk:", validation.scopeRisk);
if (config.hasTexPolicy) {
  console.log("[public-deploy] TeX raw documents:", formatOptionalBoolean(config.texAllowRawDocument, config.texAllowRawDocumentRaw));
  console.log("[public-deploy] TeX package policy:", formatOptionalBoolean(config.texAllowAllPackages, config.texAllowAllPackagesRaw));
  console.log("[public-deploy] TeX restricted commands:", formatOptionalBoolean(config.texAllowRestrictedCommands, config.texAllowRestrictedCommandsRaw));
  console.log("[public-deploy] TeX allowed packages:", config.texAllowedPackages.join(", ") || "(unset)");
}

for (const note of validation.notes) {
  console.log(`[public-deploy] note: ${note}`);
}

for (const warning of validation.warnings) {
  console.warn(`[public-deploy] warning: ${warning}`);
}

if (validation.errors.length > 0) {
  for (const error of validation.errors) {
    console.error(`[public-deploy] error: ${error}`);
  }

  process.exit(1);
}

console.log("[public-deploy] configuration looks valid.");
