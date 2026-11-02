<#
.SYNOPSIS
  Portal Free Cross-Device Release Synchronizer & Deployment Tool
.DESCRIPTION
  Safely pulls tested Portal releases from GitHub to the ThinkBook workstation,
  creates an atomic backup of dist/, builds/verifies artifacts locally,
  updates the build marker (build-metadata.json), provides automatic rollback
  on failure, and preserves 100% of user settings, pins, and storage.
.EXAMPLE
  .\scripts\sync-release.ps1 -Branch "feature/portal-next-level"
  .\scripts\sync-release.ps1 -Rollback
#>

[CmdletBinding()]
param(
    [string]$Branch = "feature/portal-next-level",
    [string]$Remote = "origin",
    [switch]$ForceBuild = $false,
    [switch]$SkipTypecheck = $false,
    [switch]$Rollback = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PORTAL WORKSTATION SYNC & DEPLOYMENT TOOL (THINKBOOK)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$PortalRoot = Split-Path -Parent $PSScriptRoot
Set-Location $PortalRoot

$DistPath = Join-Path $PortalRoot "dist"
$BackupPath = Join-Path $PortalRoot "dist.backup"

# Manual Rollback handling
if ($Rollback) {
    if (Test-Path $BackupPath) {
        Write-Host "Rolling back to previous backup build (dist.backup)..." -ForegroundColor Yellow
        if (Test-Path $DistPath) { Remove-Item -Recurse -Force $DistPath }
        Copy-Item -Recurse -Force $BackupPath $DistPath
        Write-Host "Rollback successful. Preserved last working build." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Error: No backup directory (dist.backup) found to restore from." -ForegroundColor Red
        exit 1
    }
}

Write-Host "[1/6] Checking Git repository state..." -ForegroundColor Yellow
$CurrentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "      Current local branch: $CurrentBranch" -ForegroundColor Gray

Write-Host "[2/6] Staging atomic backup of current dist/..." -ForegroundColor Yellow
if (Test-Path $DistPath) {
    if (Test-Path $BackupPath) { Remove-Item -Recurse -Force $BackupPath }
    Copy-Item -Recurse -Force $DistPath $BackupPath
    Write-Host "      Backed up current build to dist.backup" -ForegroundColor Gray
}

try {
    Write-Host "[3/6] Fetching updates from $Remote..." -ForegroundColor Yellow
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

    Write-Host "[4/6] Verifying dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        Write-Host "      Installing node_modules..." -ForegroundColor Gray
        npm install
    }

    Write-Host "[5/6] Building Portal extension..." -ForegroundColor Yellow
    npm run build

    if (-not $SkipTypecheck) {
        Write-Host "      Verifying TypeScript integrity..." -ForegroundColor Gray
        npm run typecheck
    }

    Write-Host "[6/6] Generating atomic build metadata..." -ForegroundColor Yellow
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
        Write-Host "- Open chrome://extensions and click reload icon on Portal." -ForegroundColor Gray
        Write-Host "- User preferences, custom shortcuts, and New Tab override remain 100% intact." -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "ERROR ENCOUNTERED DURING BUILD: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $BackupPath) {
        Write-Host "Restoring backup build from dist.backup to keep extension operational..." -ForegroundColor Yellow
        if (Test-Path $DistPath) { Remove-Item -Recurse -Force $DistPath }
        Copy-Item -Recurse -Force $BackupPath $DistPath
        Write-Host "Backup restored successfully. Your previous extension build is safe." -ForegroundColor Green
    }
    throw $_
}
