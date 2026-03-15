import { normalizeConfiguredGoogleOAuthRedirectUri } from "../server/modules/config/publicDeploymentConfig.js";

const rawValue = process.argv[2] ?? "";
const frontendOrigin = process.argv[3] ?? "";

process.stdout.write(normalizeConfiguredGoogleOAuthRedirectUri(rawValue, frontendOrigin));
