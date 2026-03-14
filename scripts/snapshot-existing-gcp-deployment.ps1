[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "asia-northeast3",

  [string]$AiServiceName = "docsy",

  [string]$TexServiceName = "docsy-tex",

  [string]$OutputDir = "output/gcp-snapshot"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI is required."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshotDir = Join-Path $OutputDir $timestamp
New-Item -ItemType Directory -Force -Path $snapshotDir | Out-Null

Write-Host "Writing deployment snapshot to $snapshotDir"

gcloud config set project $ProjectId | Out-Null

gcloud run services describe $AiServiceName `
  --region $Region `
  --format export | Set-Content -Path (Join-Path $snapshotDir "cloud-run-ai-service.yaml")

gcloud run services describe $TexServiceName `
  --region $Region `
  --format export | Set-Content -Path (Join-Path $snapshotDir "cloud-run-tex-service.yaml")

gcloud secrets list `
  --format json | Set-Content -Path (Join-Path $snapshotDir "secret-manager-secrets.json")

try {
  firebase hosting:sites:list --json | Set-Content -Path (Join-Path $snapshotDir "firebase-hosting-sites.json")
} catch {
  Set-Content -Path (Join-Path $snapshotDir "firebase-hosting-sites.txt") -Value "firebase CLI auth unavailable or hosting site listing failed."
}

$summary = @"
ProjectId: $ProjectId
Region: $Region
AiServiceName: $AiServiceName
TexServiceName: $TexServiceName
SnapshotDir: $snapshotDir

Manual follow-ups:
- Verify current frontend origin in Firebase Hosting custom domain settings.
- Verify current OAuth redirect URI in Google Cloud Console.
- Verify current Secret Manager secret versions for google-client-secret and tex-service-auth-token.
"@

Set-Content -Path (Join-Path $snapshotDir "README.txt") -Value $summary

Write-Host "Snapshot completed."
