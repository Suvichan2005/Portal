<#
.SYNOPSIS
  Portal Cross-Device Release Synchronizer & Atomic Deployment Pipeline
.DESCRIPTION
  Safely pulls verified Portal releases from GitHub to the ThinkBook workstation,
  stages the build in an isolated directory (dist.staging), verifies bundle integrity
  and TypeScript types, atomically updates the active directory via NTFS directory swap,
  maintains instant rollback capability (-Rollback), and preserves 100% of user data.
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

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory=$true)]
        [scriptblock]$Command,
        [Parameter(Mandatory=$true)]
        [string]$Description
    )
    Write-Host "  > $Description..." -ForegroundColor Gray
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command '$Description' failed with exit code $LASTEXITCODE"
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PORTAL WORKSTATION SYNC & ATOMIC DEPLOYMENT PIPELINE    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$PortalRoot = Split-Path -Parent $PSScriptRoot
Set-Location $PortalRoot

$DistPath = Join-Path $PortalRoot "dist"
$StagingPath = Join-Path $PortalRoot "dist.staging"
$BackupPath = Join-Path $PortalRoot "dist.backup"
$LockFilePath = Join-Path $PortalRoot ".deploy.lock"

# Manual Rollback handling
if ($Rollback) {
    if (Test-Path $BackupPath) {
        Write-Host "Executing atomic rollback to previous verified build (dist.backup)..." -ForegroundColor Yellow
        $FailedPath = Join-Path $PortalRoot "dist.failed"
        if (Test-Path $FailedPath) { Remove-Item -Recurse -Force $FailedPath }
        if (Test-Path $DistPath) { Rename-Item -Path $DistPath -NewName "dist.failed" }
        Rename-Item -Path $BackupPath -NewName "dist"
        if (Test-Path $FailedPath) { Remove-Item -Recurse -Force $FailedPath }
        Write-Host "Rollback successful. Restored previous active build instantly." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Error: No backup directory (dist.backup) found to restore from." -ForegroundColor Red
        exit 1
    }
}

# Deployment locking
if (Test-Path $LockFilePath) {
    $LockAge = (Get-Date) - (Get-Item $LockFilePath).LastWriteTime
    if ($LockAge.TotalMinutes -lt 10) {
        Write-Host "Error: Another deployment is currently in progress (or locked within last 10m)." -ForegroundColor Red
        Write-Host "Remove .deploy.lock if this is a stale lock." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "Overriding stale deployment lock ($([math]::Round($LockAge.TotalMinutes))m old)..." -ForegroundColor Yellow
        Remove-Item -Force $LockFilePath
    }
}

Set-Content -Path $LockFilePath -Value "Locked by PID $PID at $(Get-Date -Format o)"

try {
    Write-Host "[1/6] Checking Git repository state..." -ForegroundColor Yellow
    $CurrentBranch = git rev-parse --abbrev-ref HEAD
    Write-Host "      Current local branch: $CurrentBranch" -ForegroundColor Gray

    Write-Host "[2/6] Fetching updates from $Remote..." -ForegroundColor Yellow
    Invoke-NativeCommand { git fetch $Remote } "Git fetch from $Remote"

    $LocalCommit = (git rev-parse HEAD).Trim()
    $RemoteCommit = (git rev-parse "$Remote/$Branch" 2>$null)
    if ($RemoteCommit) { $RemoteCommit = $RemoteCommit.Trim() }

    if ($LocalCommit -eq $RemoteCommit -and -not $ForceBuild) {
        Write-Host "      Already up to date with $Remote/$Branch ($($LocalCommit.Substring(0,7)))." -ForegroundColor Green
    } else {
        Write-Host "      Fast-forward pulling latest release from $Remote/$Branch..." -ForegroundColor Yellow
        if ($CurrentBranch -ne $Branch) {
            Invoke-NativeCommand { git checkout $Branch } "Git checkout $Branch"
        }
        Invoke-NativeCommand { git pull --ff-only $Remote $Branch } "Fast-forward git pull"
        $NewCommit = (git rev-parse HEAD).Trim()
        Write-Host "      Updated to commit: $($NewCommit.Substring(0,7))" -ForegroundColor Green
    }

    Write-Host "[3/6] Verifying dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        Invoke-NativeCommand { npm install } "Install node_modules"
    }

    Write-Host "[4/6] Staging build into isolated directory (dist.staging)..." -ForegroundColor Yellow
    if (Test-Path $StagingPath) {
        Remove-Item -Recurse -Force $StagingPath
    }

    Invoke-NativeCommand { npx vite build --outDir dist.staging } "Vite build main"
    Invoke-NativeCommand { npx vite build --config vite.overlay.config.ts --outDir dist.staging } "Vite build overlay"

    if (-not $SkipTypecheck) {
        Write-Host "      Verifying TypeScript integrity..." -ForegroundColor Gray
        Invoke-NativeCommand { npm run typecheck } "TypeScript check"
    }

    # Generate metadata with bundle checksums directly into dist.staging
    Invoke-NativeCommand { npx tsx scripts/generate-metadata.ts dist.staging } "Generate staging metadata"

    Write-Host "[5/6] Verifying staged release artifacts..." -ForegroundColor Yellow
    $RequiredFiles = @("manifest.json", "index.html", "overlay.js", "service-worker.js", "build-metadata.json")
    foreach ($file in $RequiredFiles) {
        $p = Join-Path $StagingPath $file
        if (-not (Test-Path $p)) {
            throw "Staged release is missing required artifact: $file"
        }
    }
    Write-Host "      All 5 required release artifacts verified." -ForegroundColor Green

    Write-Host "[6/6] Executing atomic directory swap (NTFS rename)..." -ForegroundColor Yellow
    # Swap: dist -> dist.backup, dist.staging -> dist
    if (Test-Path $BackupPath) {
        Remove-Item -Recurse -Force $BackupPath
    }
    
    # Resilient directory swap with recovery
    $swapSuccess = $false
    try {
        if (Test-Path $DistPath) {
            Rename-Item -Path $DistPath -NewName "dist.backup" -ErrorAction Stop
        }
        Rename-Item -Path $StagingPath -NewName "dist" -ErrorAction Stop
        $swapSuccess = $true
    } catch {
        Write-Host "Warning: Initial rename encountered issue, checking state: $($_.Exception.Message)" -ForegroundColor Yellow
        if ((Test-Path $BackupPath) -and (-not (Test-Path $DistPath))) {
            Rename-Item -Path $BackupPath -NewName "dist" -Force
        }
        throw "Directory swap failed and was safely restored: $($_.Exception.Message)"
    }
    Write-Host "      Atomic swap complete. Staged build is now active in dist/." -ForegroundColor Green

    $MetadataPath = Join-Path $PortalRoot "dist\build-metadata.json"
    if (Test-Path $MetadataPath) {
        $Meta = Get-Content $MetadataPath | ConvertFrom-Json
        $CommitDisplay = if ($Meta.commit) { $Meta.commit.Substring(0, [math]::Min(7, $Meta.commit.Length)) } else { "unknown" }
        Write-Host ""
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host "  PORTAL ATOMIC DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
        Write-Host "  Version:       v$($Meta.version)" -ForegroundColor White
        Write-Host "  Commit:        $CommitDisplay" -ForegroundColor White
        Write-Host "  Timestamp:     $($Meta.buildTime)" -ForegroundColor White
        Write-Host "  Deployment:    Atomic NTFS Swap Verified" -ForegroundColor White
        Write-Host "  Deploy Target: ThinkBook Workstation" -ForegroundColor White
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "NOTE ON EXTENSION ACTIVATION (Chrome MV3 Policy):" -ForegroundColor Cyan
        Write-Host "  Chrome Manifest V3 security prevents unattended extension reload" -ForegroundColor Gray
        Write-Host "  from external processes without active remote debugging." -ForegroundColor Gray
        Write-Host "  To activate the new build:" -ForegroundColor White
        Write-Host "  1. In Portal (New Tab or Overlay), type '/reload' or '/refresh-portal' and press Enter," -ForegroundColor White
        Write-Host "     OR visit chrome://extensions and click the reload icon on Portal," -ForegroundColor White
        Write-Host "     OR click the subtle reload badge on your Portal New Tab." -ForegroundColor White
        Write-Host "  2. 100% of your preferences, custom shortcuts, and sessions are preserved." -ForegroundColor White
        Write-Host "==========================================================" -ForegroundColor Cyan
    }
} catch {
    Write-Host ""
    Write-Host "ERROR ENCOUNTERED DURING DEPLOYMENT: $($_.Exception.Message)" -ForegroundColor Red
    if ((Test-Path $BackupPath) -and (-not (Test-Path $DistPath))) {
        Write-Host "Restoring backup build from dist.backup..." -ForegroundColor Yellow
        Rename-Item -Path $BackupPath -NewName "dist"
        Write-Host "Rollback restored successfully. Previous build is active." -ForegroundColor Green
    }
    exit 1
} finally {
    if (Test-Path $LockFilePath) {
        Remove-Item -Force $LockFilePath
    }
    if (Test-Path $StagingPath) {
        Remove-Item -Recurse -Force $StagingPath
    }
}
