param(
  [string]$ProjectId = "urban-dds",
  [string]$ServiceName = "docsy",
  [string]$Region = "asia-northeast3",
  [string]$Origin = "https://docsy.cyou",
  [int]$FreshnessMinutes = 15,
  [string]$DiagnosticsToken = ""
)

$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "== $Title =="
}

$freshness = "{0}m" -f $FreshnessMinutes

Write-Section "Service"
$revision = gcloud run services describe $ServiceName `
  --project=$ProjectId `
  --region=$Region `
  --format="value(status.latestReadyRevisionName)"
Write-Host "latest_ready_revision: $revision"

Write-Section "Public Health"
try {
  $publicHealth = Invoke-RestMethod -Uri "$Origin/api/ai/health" -Method Get
  $publicHealth | ConvertTo-Json -Depth 5
} catch {
  Write-Host "public_health_error: $($_.Exception.Message)"
}

if ($DiagnosticsToken) {
  Write-Section "Internal Health"
  try {
    $headers = @{
      "X-Docsy-Diagnostics-Token" = $DiagnosticsToken
    }
    $internalHealth = Invoke-RestMethod -Uri "$Origin/api/internal/ai/health" -Method Get -Headers $headers
    $internalHealth | ConvertTo-Json -Depth 8
  } catch {
    Write-Host "internal_health_error: $($_.Exception.Message)"
  }
}

Write-Section "Recent Auth Logs"
$authPattern = '/api/auth/google/connect|/api/auth/google/callback|callback connected|callback failed|/api/auth/session|session lookup connected='
gcloud logging read "resource.type=""cloud_run_revision"" AND resource.labels.service_name=""$ServiceName""" `
  --project=$ProjectId `
  --limit=100 `
  --freshness=$freshness `
  --format='value(timestamp,resource.labels.revision_name,textPayload)' | Select-String $authPattern

Write-Section "Success Criterion"
Write-Host "A successful hosted login attempt must show this order in the latest revision:"
Write-Host "1. POST /api/auth/google/connect"
Write-Host "2. GET /api/auth/google/callback?..."
Write-Host "3. callback connected ..."
Write-Host "4. GET /api/auth/session"
Write-Host "5. session lookup connected=true ..."
