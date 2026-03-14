import {
  readPublicDeploymentConfig,
  validatePublicDeploymentConfig,
} from "../server/modules/config/publicDeploymentConfig.js";

const config = readPublicDeploymentConfig(process.env);
const validation = validatePublicDeploymentConfig(config);

console.log("[public-deploy] OAuth publishing status:", config.publishingStatus);
console.log("[public-deploy] Allowed origins:", config.allowedOrigins.join(", ") || "(none)");
console.log("[public-deploy] Frontend origin:", config.frontendOrigin || "(unset)");
console.log("[public-deploy] Redirect URI:", config.redirectUri || "(unset)");
console.log("[public-deploy] Scope profile:", config.scopeProfile);
console.log("[public-deploy] Scope risk:", validation.scopeRisk);

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
