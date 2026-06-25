[CmdletBinding()]
param(
    [string] $InputDir = "",
    [string] $OutputDir = "",
    [string] $DefaultOwner = "Team Upload",
    [string] $ReportTitle = "Meeting Notes Upload Report"
)

$ErrorActionPreference = "Stop"
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

if (-not $InputDir) {
    $InputDir = Join-Path $ScriptRoot "input"
}

if (-not $OutputDir) {
    $OutputDir = Join-Path $ScriptRoot "output"
}

$SupportedExtensions = @{
    ".txt"      = @{ Source = "local_upload"; ArtifactType = "note" }
    ".md"       = @{ Source = "local_upload"; ArtifactType = "note" }
    ".markdown" = @{ Source = "local_upload"; ArtifactType = "note" }
    ".vtt"      = @{ Source = "teams_export"; ArtifactType = "meeting_transcript" }
    ".html"     = @{ Source = "onenote_export"; ArtifactType = "note" }
    ".htm"      = @{ Source = "onenote_export"; ArtifactType = "note" }
}

function Normalize-Whitespace {
    param([string] $Text)

    $lines = $Text -split "`r?`n" | ForEach-Object {
        ($_ -replace "[ `t]+", " ").Trim()
    }

    $compacted = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
        if ($line -or ($compacted.Count -gt 0 -and $compacted[$compacted.Count - 1])) {
            $compacted.Add($line)
        }
    }

    return (($compacted -join "`n").Trim())
}

function ConvertFrom-Vtt {
    param([string] $Text)

    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($Text -split "`r?`n")) {
        $clean = $line.Trim()
        if (-not $clean -or $clean -eq "WEBVTT") { continue }
        if ($clean -like "*-->*") { continue }
        if ($clean -match "^\d+$") { continue }
        if ($clean.StartsWith("NOTE") -or $clean.StartsWith("STYLE") -or $clean.StartsWith("REGION")) { continue }
        $lines.Add(($clean -replace "<[^>]+>", ""))
    }

    return Normalize-Whitespace ($lines -join "`n")
}

function ConvertFrom-Html {
    param([string] $Text)

    $withBreaks = $Text -replace "<(br|/p|/div|/li|/tr|/h[1-6])[^>]*>", "`n"
    $withoutTags = $withBreaks -replace "<[^>]+>", " "
    return Normalize-Whitespace ([System.Net.WebUtility]::HtmlDecode($withoutTags))
}

function Get-TitleCase {
    param([string] $Text)
    return (Get-Culture).TextInfo.ToTitleCase(($Text -replace "-", " ").ToLower())
}

function Get-FileMetadata {
    param(
        [System.IO.FileInfo] $File,
        [string] $FallbackOwner
    )

    $stem = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
    $occurredAt = $null
    $dateMatch = [regex]::Match($stem, "(20\d{2})[-_](\d{2})[-_](\d{2})")

    if ($dateMatch.Success) {
        $occurredAt = "{0}-{1}-{2}" -f $dateMatch.Groups[1].Value, $dateMatch.Groups[2].Value, $dateMatch.Groups[3].Value
        $stem = ($stem.Remove($dateMatch.Index, $dateMatch.Length)).Trim(" ", "_", "-")
    }

    $parts = @($stem -split "\s+-\s+|_" | Where-Object { $_.Trim() } | ForEach-Object { $_.Trim() })
    $owner = $FallbackOwner
    $titleParts = $parts

    if ($parts.Count -ge 2) {
        $owner = Get-TitleCase $parts[0]
        $titleParts = @($parts | Select-Object -Skip 1)
    }

    $title = (($titleParts -join " ") -replace "-", " ").Trim()
    if (-not $title) { $title = $File.BaseName }

    [pscustomobject]@{
        Title      = Get-TitleCase $title
        Owner      = $owner
        OccurredAt = $occurredAt
    }
}

function Get-Slug {
    param([string] $Text)

    $slug = ($Text -replace "[^a-zA-Z0-9]+", "-").Trim("-").ToLower()
    if ($slug) { return $slug }
    return "note"
}

function Get-ArtifactId {
    param(
        [string] $Path,
        [string] $Text
    )

    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("$Path`n$Text")
    $hash = $sha1.ComputeHash($bytes)
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "").Substring(0, 12)
}

function Get-RelativePath {
    param(
        [string] $Base,
        [string] $Target
    )

    $basePath = (Resolve-Path $Base).ProviderPath.TrimEnd("\") + "\"
    $targetPath = (Resolve-Path $Target).ProviderPath
    $baseUri = [Uri] $basePath
    $targetUri = [Uri] $targetPath
    return ([Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()) -replace "/", "\")
}

function Get-NoteText {
    param([System.IO.FileInfo] $File)

    $raw = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
    switch ($File.Extension.ToLowerInvariant()) {
        ".vtt" { return ConvertFrom-Vtt $raw }
        ".html" { return ConvertFrom-Html $raw }
        ".htm" { return ConvertFrom-Html $raw }
        default { return Normalize-Whitespace $raw }
    }
}

function Get-Preview {
    param(
        [string] $Text,
        [int] $Limit = 260
    )

    $oneLine = ($Text -replace "\s+", " ").Trim()
    if ($oneLine.Length -le $Limit) { return $oneLine }
    return ($oneLine.Substring(0, $Limit - 3).TrimEnd() + "...")
}

function Find-MatchingLines {
    param(
        [string] $Text,
        [string[]] $Keywords,
        [int] $Limit = 6
    )

    $matches = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($Text -split "`r?`n")) {
        $clean = $line.Trim(" ", "-", "*", "`t")
        if (-not $clean) { continue }

        $lowered = $clean.ToLower()
        foreach ($keyword in $Keywords) {
            if ($lowered.Contains($keyword)) {
                $matches.Add($clean)
                break
            }
        }

        if ($matches.Count -ge $Limit) { break }
    }

    return @($matches)
}

function ConvertTo-Bullets {
    param([string[]] $Lines)

    if (-not $Lines -or $Lines.Count -eq 0) {
        return @("- No explicit evidence found in uploaded files.")
    }

    return @($Lines | ForEach-Object { "- $_" })
}

if (-not (Test-Path $InputDir)) {
    New-Item -ItemType Directory -Path $InputDir | Out-Null
}

$normalizedDir = Join-Path $OutputDir "normalized"
$contentDir = Join-Path $normalizedDir "content"
New-Item -ItemType Directory -Force -Path $contentDir | Out-Null

$artifacts = New-Object System.Collections.Generic.List[object]
$capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
$files = Get-ChildItem -Path $InputDir -Recurse -File |
    Where-Object { -not $_.Name.StartsWith(".") -and $SupportedExtensions.ContainsKey($_.Extension.ToLowerInvariant()) } |
    Sort-Object FullName

foreach ($file in $files) {
    $text = Get-NoteText $file
    if (-not $text) { continue }

    $extensionConfig = $SupportedExtensions[$file.Extension.ToLowerInvariant()]
    $metadata = Get-FileMetadata -File $file -FallbackOwner $DefaultOwner
    $artifactId = Get-ArtifactId -Path $file.FullName -Text $text
    $contentFile = Join-Path $contentDir ("{0}-{1}.txt" -f (Get-Slug $metadata.Title), $artifactId)
    [System.IO.File]::WriteAllText($contentFile, $text, [System.Text.Encoding]::UTF8)

    $tags = New-Object System.Collections.Generic.List[string]
    $tags.Add("uploaded")
    if ($metadata.OccurredAt) { $tags.Add("dated") }
    if ($extensionConfig.ArtifactType -eq "meeting_transcript") { $tags.Add("meeting") }

    $artifacts.Add([pscustomobject]@{
        id              = $artifactId
        source          = $extensionConfig.Source
        artifact_type   = $extensionConfig.ArtifactType
        title           = $metadata.Title
        owner           = $metadata.Owner
        occurred_at     = $metadata.OccurredAt
        captured_at     = $capturedAt
        original_file   = Get-RelativePath -Base $ScriptRoot -Target $file.FullName
        content_file    = Get-RelativePath -Base $ScriptRoot -Target $contentFile
        content_preview = Get-Preview $text
        tags            = @($tags)
    })
}

$artifactsPath = Join-Path $normalizedDir "artifacts.jsonl"
$jsonLines = @($artifacts | ForEach-Object { $_ | ConvertTo-Json -Compress })
$jsonPayload = $jsonLines -join [Environment]::NewLine
if ($jsonPayload) {
    $jsonPayload += [Environment]::NewLine
}
[System.IO.File]::WriteAllText($artifactsPath, $jsonPayload, [System.Text.Encoding]::UTF8)

$accomplishments = New-Object System.Collections.Generic.List[string]
$decisions = New-Object System.Collections.Generic.List[string]
$nextSteps = New-Object System.Collections.Generic.List[string]
$blockers = New-Object System.Collections.Generic.List[string]

foreach ($artifact in $artifacts) {
    $content = [System.IO.File]::ReadAllText((Join-Path $ScriptRoot $artifact.content_file), [System.Text.Encoding]::UTF8)
    $accomplishments.AddRange([string[]] (Find-MatchingLines $content @("completed", "finished", "shipped", "built", "demo", "progress") 3))
    $decisions.AddRange([string[]] (Find-MatchingLines $content @("decision", "decided", "agreed", "approved") 3))
    $nextSteps.AddRange([string[]] (Find-MatchingLines $content @("next", "todo", "to do", "action", "follow up", "owner") 3))
    $blockers.AddRange([string[]] (Find-MatchingLines $content @("blocked", "blocker", "risk", "issue", "dependency") 3))
}

$reportLines = New-Object System.Collections.Generic.List[string]
$reportLines.Add("# $ReportTitle")
$reportLines.Add("")
$reportLines.Add(("Generated from {0} uploaded note file{1}." -f $artifacts.Count, $(if ($artifacts.Count -eq 1) { "" } else { "s" })))
$reportLines.Add("")
$reportLines.Add("## Accomplishments And Updates")
$reportLines.AddRange([string[]] (ConvertTo-Bullets @($accomplishments | Select-Object -First 8)))
$reportLines.Add("")
$reportLines.Add("## Decisions")
$reportLines.AddRange([string[]] (ConvertTo-Bullets @($decisions | Select-Object -First 8)))
$reportLines.Add("")
$reportLines.Add("## Action Items And Next Steps")
$reportLines.AddRange([string[]] (ConvertTo-Bullets @($nextSteps | Select-Object -First 8)))
$reportLines.Add("")
$reportLines.Add("## Blockers Or Risks")
$reportLines.AddRange([string[]] (ConvertTo-Bullets @($blockers | Select-Object -First 8)))
$reportLines.Add("")
$reportLines.Add("## Evidence Inventory")
$reportLines.Add("| Title | Owner | Source | Date |")
$reportLines.Add("| --- | --- | --- | --- |")

if ($artifacts.Count -eq 0) {
    $reportLines.Add("| No uploaded files found | n/a | n/a | n/a |")
} else {
    foreach ($artifact in $artifacts) {
        $date = if ($artifact.occurred_at) { $artifact.occurred_at } else { "n/a" }
        $reportLines.Add("| $($artifact.title) | $($artifact.owner) | $($artifact.source) | $date |")
    }
}

$reportPath = Join-Path $OutputDir "report.md"
$reportLines | Set-Content -Encoding UTF8 $reportPath

Write-Host "Collected $($artifacts.Count) uploaded note file(s)."
Write-Host "Normalized artifacts: $artifactsPath"
Write-Host "Generated report: $reportPath"

if ($artifacts.Count -eq 0) {
    Write-Host "Add .txt, .md, .vtt, .html, or .htm files to $InputDir and run again."
}
