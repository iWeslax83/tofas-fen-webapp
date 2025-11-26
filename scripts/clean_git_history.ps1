<#
clean_git_history.ps1

This script performs a *dry-run* replacement by default using git-filter-repo.
It expects the OLD secret values to be supplied via environment variables or read interactively so they are not stored in the repo.

Usage:
  - PowerShell (dry-run):
      ./scripts/clean_git_history.ps1
  - To actually run git-filter-repo (destructive) and optionally force-push:
      ./scripts/clean_git_history.ps1 --execute --force-push

Prereqs:
  - git-filter-repo (pip install git-filter-repo) OR BFG (alternative)
#>

param(
    [switch]$Execute = $false,
    [switch]$ForcePush = $false
)

function Ensure-Tool($name, $checkCmd) {
    try {
        iex $checkCmd | Out-Null
        return $true
    } catch {
        return $false
    }
}

$hasFilterRepo = Ensure-Tool -name 'git-filter-repo' -checkCmd { git filter-repo --help }
if (-not $hasFilterRepo) {
    Write-Host "git-filter-repo not found. Please install it (pip install git-filter-repo) or use BFG. Exiting." -ForegroundColor Yellow
    exit 1
}

# Read the list of OLD secrets to remove. For safety, do not write them to repo files.
$candidates = @(
    $env:OLD_MONGO_PASSWORD,
    $env:OLD_JWT_SECRET,
    $env:OLD_JWT_REFRESH_SECRET,
    $env:OLD_SMTP_PASS,
    $env:OLD_REDIS_PASSWORD,
    $env:OLD_SESSION_SECRET
)

# If none supplied, prompt user interactively (hidden input)
if ($candidates -notcontains $null -and $candidates -ne $null) {
    # proceed
} else {
    Write-Host "No old secrets provided as environment variables. You can set OLD_JWT_SECRET, OLD_SMTP_PASS, etc."
    $prompt = Read-Host "Do you want to input old secrets interactively now? (y/n)"
    if ($prompt -ne 'y') { Write-Host 'Aborting.'; exit 0 }
    $oldJwt = Read-Host -AsSecureString 'Old JWT secret (will be converted to plain for replacement; input carefully)'
    $oldJwtPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($oldJwt))
    $env:OLD_JWT_SECRET = $oldJwtPlain
    # add other secrets as needed interactively
}

$replacementsFile = Join-Path $env:TEMP "replacements.txt"
Write-Host "Preparing replacements file (temporary): $replacementsFile"
"# Replace old secrets with REDACTED_IN_REPO" | Out-File -FilePath $replacementsFile -Encoding utf8

foreach ($name in @('OLD_MONGO_PASSWORD','OLD_JWT_SECRET','OLD_JWT_REFRESH_SECRET','OLD_SMTP_PASS','OLD_REDIS_PASSWORD','OLD_SESSION_SECRET')) {
    $val = (Get-Item -Path Env:$name -ErrorAction SilentlyContinue).Value
    if ($val) {
        "{0}==>REDACTED_IN_REPO" -f $val | Out-File -FilePath $replacementsFile -Append -Encoding utf8
    }
}

Write-Host "Replacements file content (hidden):"
Get-Content $replacementsFile | Select-Object -First 20 | ForEach-Object { Write-Host "(line hidden for safety)" }

if (-not $Execute) {
    Write-Host "DRY RUN: Not executing git-filter-repo. To run the destructive operation, re-run with --execute." -ForegroundColor Yellow
    Write-Host "You can inspect $replacementsFile to confirm before executing."
    exit 0
}

Write-Host "Executing git-filter-repo with replacements file..."
git filter-repo --replace-text $replacementsFile

Write-Host "Cleaning reflogs and garbage..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

if ($ForcePush) {
    Write-Host "Force-pushing main to origin (coordinate with team)"
    git push origin --force --all
    git push origin --force --tags
} else {
    Write-Host "History rewritten locally. Review the branch, then force-push manually when ready."
}
