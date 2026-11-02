<#
.SYNOPSIS
  Portal Free Cross-Device Release Synchronizer & Deployment Tool
.DESCRIPTION
  Safely pulls tested Portal releases from GitHub to the ThinkBook workstation,
  builds/verifies artifacts locally, updates the build marker (build-metadata.json),
  and provides safe extension reload without blowing away user settings, pins, or storage.
.EXAMPLE
  .\scripts\sync-release.ps1 -Branch "release"
  .\scripts\sync-release.ps1 -Branch "feature/portal-next-level"
#>

[CmdletBinding()]
param(
    [string]$Branch = "feature/portal-next-level",
    [string]$Remote = "origin",
    [switch]$ForceBuild = $false,
    [switch]$SkipTypecheck = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PORTAL WORKSTATION SYNC & DEPLOYMENT TOOL (THINKBOOK)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$PortalRoot = Split-Path -Parent $PSScriptRoot
Set-Location $PortalRoot

Write-Host "[1/5] Checking Git repository state..." -ForegroundColor Yellow
$CurrentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "      Current local branch: $CurrentBranch" -ForegroundColor Gray

Write-Host "[2/5] Fetching updates from $Remote..." -ForegroundColor Yellow
git fetch $Remote

$LocalCommit = git rev-parse HEAD
$RemoteCommit = git rev-parse "$Remote/$Branch" 2>$null

if ($LocalCommit -eq $RemoteCommit -and -not $ForceBuild) {
    Write-Host "      Already up to date with $Remote/$Branch ($LocalCommit.Substring(0,7))." -ForegroundColor Green
} else {
    Write-Host "      Pulling latest release from $Remote/$Branch..." -ForegroundColor Yellow
    if ($CurrentBranch -ne $Branch) {
        git checkout $Branch
    }
    git pull $Remote $Branch
    $NewCommit = git rev-parse HEAD
    Write-Host "      Updated to commit: $($NewCommit.Substring(0,7))" -ForegroundColor Green
}

Write-Host "[3/5] Verifying dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "      Installing node_modules..." -ForegroundColor Gray
    npm install
}

Write-Host "[4/5] Building Portal extension..." -ForegroundColor Yellow
npm run build

if (-not $SkipTypecheck) {
    Write-Host "      Verifying TypeScript integrity..." -ForegroundColor Gray
    npm run typecheck
}

Write-Host "[5/5] Generating atomic build metadata..." -ForegroundColor Yellow
npx tsx scripts/generate-metadata.ts

$MetadataPath = Join-Path $PortalRoot "dist\build-metadata.json"
if (Test-Path $MetadataPath) {
    $Meta = Get-Content $MetadataPath | ConvertFrom-Json
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  PORTAL DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    Write-Host "  Version:       v$($Meta.version)" -ForegroundColor White
    Write-Host "  Commit:        $($Meta.commit.Substring(0,7))" -ForegroundColor White
    Write-Host "  Timestamp:     $($Meta.buildTime)" -ForegroundColor White
    Write-Host "  Deploy Target: ThinkBook Workstation" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTE ON EXTENSION RELOAD:" -ForegroundColor Cyan
    Write-Host "- Unpacked extensions preserve chrome.storage.local across reloads." -ForegroundColor Gray
    Write-Host "- Open chrome://extensions and click reload icon on Portal, or press Enter in any New Tab." -ForegroundColor Gray
    Write-Host "- User preferences, custom shortcuts, and New Tab override remain 100% intact." -ForegroundColor Gray
} else {
    Write-Host "Warning: build-metadata.json not found." -ForegroundColor Red
}
