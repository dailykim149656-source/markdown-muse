[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$AllowedOrigin,

  [string]$Region = "asia-northeast3",
  [string]$ServiceName = "markdown-muse-ai",
  [string]$RepositoryName = "docsy",
  [string]$Model = "gemini-2.5-flash",
  [string]$SecretName = "gemini-api-key",
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$imageUri = "{0}-docker.pkg.dev/{1}/{2}/{3}:{4}" -f $Region, $ProjectId, $RepositoryName, $ServiceName, $Tag
$substitutions = @(
  "_IMAGE_URI=$imageUri"
  "_REGION=$Region"
  "_SERVICE_NAME=$ServiceName"
  "_GEMINI_MODEL=$Model"
  "_AI_ALLOWED_ORIGIN=$AllowedOrigin"
  "_GEMINI_API_KEY_SECRET=$SecretName"
) -join ","

gcloud config set project $ProjectId

gcloud builds submit `
  --config cloudbuild.ai.yaml `
  --substitutions $substitutions `
  .
