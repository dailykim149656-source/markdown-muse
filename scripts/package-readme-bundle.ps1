[CmdletBinding()]
param(
  [string]$EntryPath = "README.md",

  [string]$OutputDir = "output/readme-bundles"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$markdownLinkRegex = [regex]'(?<prefix>!?\[[^\]]*\]\()(?<target>[^)\s]+)(?<suffix>\))'

function Resolve-InputPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $Path))
}

function Test-IsWithinRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $normalizedPath = [System.IO.Path]::GetFullPath($Path).TrimEnd("\", "/")
  $normalizedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd("\", "/")

  return $normalizedPath.Equals($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase) `
    -or $normalizedPath.StartsWith("${normalizedRoot}\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FromPath,

    [Parameter(Mandatory = $true)]
    [string]$ToPath
  )

  $fromUri = New-Object System.Uri($FromPath)
  $toUri = New-Object System.Uri($ToPath)

  return [System.Uri]::UnescapeDataString($fromUri.MakeRelativeUri($toUri).ToString())
}

function Get-RepoRelativePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $rootUri = New-Object System.Uri(($RepoRoot.TrimEnd("\") + "\"))
  $pathUri = New-Object System.Uri($Path)

  return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()) -replace "/", "\"
}

function Convert-ToMarkdownPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return $Path -replace "\\", "/"
}

function Get-ContentLines {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  foreach ($match in [regex]::Matches($Content, ".*(?:`r`n|`n|$)")) {
    if ($match.Value.Length -gt 0) {
      $match.Value
    }
  }
}

function Get-FenceCharacter {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Line
  )

  $trimmed = $Line.TrimStart()

  if ($trimmed -match '^(?<marker>`{3,}|~{3,})') {
    return ([string]$Matches["marker"]).Substring(0, 1)
  }

  return $null
}

function Get-MarkdownTargets {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $targets = New-Object System.Collections.Generic.List[string]
  $inFence = $false
  $fenceCharacter = $null

  foreach ($line in Get-ContentLines -Content $Content) {
    $lineFence = Get-FenceCharacter -Line $line

    if (-not $inFence -and $lineFence) {
      $inFence = $true
      $fenceCharacter = $lineFence
      continue
    }

    if ($inFence) {
      if ($lineFence -and $lineFence -eq $fenceCharacter) {
        $inFence = $false
        $fenceCharacter = $null
      }

      continue
    }

    foreach ($match in $markdownLinkRegex.Matches($line)) {
      $targets.Add($match.Groups["target"].Value) | Out-Null
    }
  }

  return $targets
}

function Resolve-LinkTarget {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceFile,

    [Parameter(Mandatory = $true)]
    [string]$Target,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $trimmedTarget = $Target.Trim()

  if (-not $trimmedTarget) {
    return [pscustomobject]@{
      Fragment = ""
      IsRepoAbsolute = $false
      Kind = "empty"
      OriginalTarget = $Target
      PathPart = ""
      ResolvedPath = $null
    }
  }

  if ($trimmedTarget.StartsWith("#")) {
    return [pscustomobject]@{
      Fragment = $trimmedTarget
      IsRepoAbsolute = $false
      Kind = "anchor"
      OriginalTarget = $Target
      PathPart = ""
      ResolvedPath = $null
    }
  }

  $hashIndex = $trimmedTarget.IndexOf("#")
  $pathPart = if ($hashIndex -ge 0) { $trimmedTarget.Substring(0, $hashIndex) } else { $trimmedTarget }
  $fragment = if ($hashIndex -ge 0) { $trimmedTarget.Substring($hashIndex) } else { "" }

  if ($pathPart -match '^(?i:https?|mailto|tel|data|javascript):') {
    return [pscustomobject]@{
      Fragment = $fragment
      IsRepoAbsolute = $false
      Kind = "external"
      OriginalTarget = $Target
      PathPart = $pathPart
      ResolvedPath = $null
    }
  }

  $isRepoAbsolute = $false
  $candidatePath = $null

  if ($pathPart -match '^/?[A-Za-z]:[\\/].*') {
    $isRepoAbsolute = $true
    $candidatePath = [System.IO.Path]::GetFullPath($pathPart.TrimStart("/"))
  } elseif ($pathPart.StartsWith("/")) {
    return [pscustomobject]@{
      Fragment = $fragment
      IsRepoAbsolute = $false
      Kind = "out_of_repo"
      OriginalTarget = $Target
      PathPart = $pathPart
      ResolvedPath = $null
    }
  } else {
    $candidatePath = [System.IO.Path]::GetFullPath((Join-Path (Split-Path $SourceFile -Parent) $pathPart))
  }

  if (-not (Test-IsWithinRoot -Path $candidatePath -Root $RepoRoot)) {
    return [pscustomobject]@{
      Fragment = $fragment
      IsRepoAbsolute = $isRepoAbsolute
      Kind = "out_of_repo"
      OriginalTarget = $Target
      PathPart = $pathPart
      ResolvedPath = $candidatePath
    }
  }

  if (-not (Test-Path -LiteralPath $candidatePath)) {
    return [pscustomobject]@{
      Fragment = $fragment
      IsRepoAbsolute = $isRepoAbsolute
      Kind = "missing"
      OriginalTarget = $Target
      PathPart = $pathPart
      ResolvedPath = $candidatePath
    }
  }

  if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
    return [pscustomobject]@{
      Fragment = $fragment
      IsRepoAbsolute = $isRepoAbsolute
      Kind = "non_file"
      OriginalTarget = $Target
      PathPart = $pathPart
      ResolvedPath = $candidatePath
    }
  }

  return [pscustomobject]@{
    Fragment = $fragment
    IsRepoAbsolute = $isRepoAbsolute
    Kind = "internal"
    OriginalTarget = $Target
    PathPart = $pathPart
    ResolvedPath = $candidatePath
  }
}

function Rewrite-MarkdownContent {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Content,

    [Parameter(Mandatory = $true)]
    [string]$SourceFile,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$BundleRoot,

    [Parameter(Mandatory = $true)]
    [System.Collections.Generic.HashSet[string]]$IncludedFiles,

    [AllowEmptyCollection()]
    [Parameter(Mandatory = $true)]
    [System.Collections.ArrayList]$RewrittenLinks
  )

  $sourceRepoRelative = Get-RepoRelativePath -Path $SourceFile -RepoRoot $RepoRoot
  $sourceBundlePath = Join-Path $BundleRoot $sourceRepoRelative
  $builder = New-Object System.Text.StringBuilder
  $inFence = $false
  $fenceCharacter = $null

  foreach ($line in Get-ContentLines -Content $Content) {
    $lineFence = Get-FenceCharacter -Line $line

    if (-not $inFence -and $lineFence) {
      $inFence = $true
      $fenceCharacter = $lineFence
      [void]$builder.Append($line)
      continue
    }

    if ($inFence) {
      [void]$builder.Append($line)

      if ($lineFence -and $lineFence -eq $fenceCharacter) {
        $inFence = $false
        $fenceCharacter = $null
      }

      continue
    }

    $rewrittenLine = $markdownLinkRegex.Replace($line, [System.Text.RegularExpressions.MatchEvaluator]{
      param($match)

      $target = $match.Groups["target"].Value
      $resolution = Resolve-LinkTarget -SourceFile $SourceFile -Target $target -RepoRoot $RepoRoot

      if ($resolution.Kind -ne "internal" -or -not $resolution.IsRepoAbsolute) {
        return $match.Value
      }

      if (-not $IncludedFiles.Contains($resolution.ResolvedPath)) {
        return $match.Value
      }

      $targetRepoRelative = Get-RepoRelativePath -Path $resolution.ResolvedPath -RepoRoot $RepoRoot
      $targetBundlePath = Join-Path $BundleRoot $targetRepoRelative
      $relativeTarget = Get-RelativePath -FromPath ((Split-Path $sourceBundlePath -Parent).TrimEnd("\") + "\") -ToPath $targetBundlePath
      $rewrittenTarget = (Convert-ToMarkdownPath -Path $relativeTarget) + $resolution.Fragment

      $RewrittenLinks.Add([pscustomobject]@{
        rewrittenTarget = $rewrittenTarget
        sourceFile = Convert-ToMarkdownPath -Path $sourceRepoRelative
        targetFile = Convert-ToMarkdownPath -Path $targetRepoRelative
        originalTarget = $target
      }) | Out-Null

      return $match.Groups["prefix"].Value + $rewrittenTarget + $match.Groups["suffix"].Value
    })

    [void]$builder.Append($rewrittenLine)
  }

  return $builder.ToString()
}

$repoRoot = (Resolve-Path ".").Path
$entryAbsolute = Resolve-InputPath -Path $EntryPath -RepoRoot $repoRoot

if (-not (Test-Path -LiteralPath $entryAbsolute -PathType Leaf)) {
  throw "Entry file not found: $EntryPath"
}

if (-not (Test-IsWithinRoot -Path $entryAbsolute -Root $repoRoot)) {
  throw "Entry file must be inside the repository root."
}

$outputAbsolute = Resolve-InputPath -Path $OutputDir -RepoRoot $repoRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleName = "readme-docs-bundle-$timestamp"
$stagingRoot = Join-Path $outputAbsolute ".staging-$timestamp"
$bundleRoot = Join-Path $stagingRoot $bundleName
$zipPath = Join-Path $outputAbsolute "$bundleName.zip"

New-Item -ItemType Directory -Force -Path $outputAbsolute | Out-Null
New-Item -ItemType Directory -Force -Path $bundleRoot | Out-Null

$includedFiles = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$scannedMarkdown = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$scanQueue = New-Object System.Collections.Queue
$missingLinks = New-Object System.Collections.ArrayList
$skippedLinks = New-Object System.Collections.ArrayList
$rewrittenLinks = New-Object System.Collections.ArrayList

$scanQueue.Enqueue($entryAbsolute)

while ($scanQueue.Count -gt 0) {
  $currentFile = [string]$scanQueue.Dequeue()

  if (-not $scannedMarkdown.Add($currentFile)) {
    continue
  }

  $includedFiles.Add($currentFile) | Out-Null
  $content = [System.IO.File]::ReadAllText($currentFile)

  foreach ($target in Get-MarkdownTargets -Content $content) {
    $resolution = Resolve-LinkTarget -SourceFile $currentFile -Target $target -RepoRoot $repoRoot
    $sourceRepoRelative = Convert-ToMarkdownPath -Path (Get-RepoRelativePath -Path $currentFile -RepoRoot $repoRoot)

    switch ($resolution.Kind) {
      "internal" {
        $includedFiles.Add($resolution.ResolvedPath) | Out-Null

        if ([System.IO.Path]::GetExtension($resolution.ResolvedPath).Equals(".md", [System.StringComparison]::OrdinalIgnoreCase)) {
          $scanQueue.Enqueue($resolution.ResolvedPath)
        }
      }
      "missing" {
        $missingLinks.Add([pscustomobject]@{
          sourceFile = $sourceRepoRelative
          target = $target
          resolvedPath = Convert-ToMarkdownPath -Path (Get-RepoRelativePath -Path $resolution.ResolvedPath -RepoRoot $repoRoot)
        }) | Out-Null
      }
      "external" {
        $skippedLinks.Add([pscustomobject]@{
          reason = "external"
          sourceFile = $sourceRepoRelative
          target = $target
        }) | Out-Null
      }
      "out_of_repo" {
        $skippedLinks.Add([pscustomobject]@{
          reason = "out_of_repo"
          sourceFile = $sourceRepoRelative
          target = $target
        }) | Out-Null
      }
      "non_file" {
        $skippedLinks.Add([pscustomobject]@{
          reason = "non_file"
          sourceFile = $sourceRepoRelative
          target = $target
        }) | Out-Null
      }
    }
  }
}

$sortedIncludedFiles = @($includedFiles) | Sort-Object

foreach ($absolutePath in $sortedIncludedFiles) {
  $repoRelative = Get-RepoRelativePath -Path $absolutePath -RepoRoot $repoRoot
  $destinationPath = Join-Path $bundleRoot $repoRelative
  $destinationDirectory = Split-Path $destinationPath -Parent

  if ($destinationDirectory) {
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  }

  if ([System.IO.Path]::GetExtension($absolutePath).Equals(".md", [System.StringComparison]::OrdinalIgnoreCase)) {
    $content = [System.IO.File]::ReadAllText($absolutePath)
    $rewritten = Rewrite-MarkdownContent `
      -Content $content `
      -SourceFile $absolutePath `
      -RepoRoot $repoRoot `
      -BundleRoot $bundleRoot `
      -IncludedFiles $includedFiles `
      -RewrittenLinks $rewrittenLinks

    [System.IO.File]::WriteAllText($destinationPath, $rewritten, $utf8NoBom)
    continue
  }

  Copy-Item -LiteralPath $absolutePath -Destination $destinationPath -Force
}

$manifest = [ordered]@{
  bundleName = $bundleName
  generatedAt = (Get-Date).ToString("o")
  entryFile = Convert-ToMarkdownPath -Path (Get-RepoRelativePath -Path $entryAbsolute -RepoRoot $repoRoot)
  includedFiles = @($sortedIncludedFiles | ForEach-Object {
      Convert-ToMarkdownPath -Path (Get-RepoRelativePath -Path $_ -RepoRoot $repoRoot)
    })
  rewrittenLinks = @($rewrittenLinks)
  missingLinks = @($missingLinks)
  skippedLinks = @($skippedLinks)
}

$manifestPath = Join-Path $bundleRoot "bundle-manifest.json"
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 6), $utf8NoBom)

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $bundleRoot -DestinationPath $zipPath -CompressionLevel Optimal -Force
Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Host "Created README bundle ZIP."
Write-Host "  Entry: $(Convert-ToMarkdownPath -Path (Get-RepoRelativePath -Path $entryAbsolute -RepoRoot $repoRoot))"
Write-Host "  Included files: $($sortedIncludedFiles.Count)"
Write-Host "  Rewritten links: $($rewrittenLinks.Count)"
Write-Host "  Missing links: $($missingLinks.Count)"
Write-Host "  Skipped links: $($skippedLinks.Count)"
Write-Host "  ZIP: $zipPath"
