# PowerShell script to clean Git history of secret files
# WARNING: This rewrites Git history. Use with caution!
# Make sure you have a backup before running this.

Write-Host "⚠️  WARNING: This script will rewrite Git history!" -ForegroundColor Yellow
Write-Host "Make sure you have a backup and all team members are aware." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

Write-Host "`n🧹 Cleaning Git history of secret files..." -ForegroundColor Cyan

# Files to remove from Git history
$filesToRemove = @(
    "env.production",
    "k8s/secret.yaml",
    "sealed-secret.yaml",
    "k8s/production/secrets.yaml"
)

# Check if git-filter-repo is available (recommended)
if (Get-Command git-filter-repo -ErrorAction SilentlyContinue) {
    Write-Host "Using git-filter-repo (recommended)..." -ForegroundColor Green
    
    foreach ($file in $filesToRemove) {
        if (Test-Path $file) {
            Write-Host "Removing $file from Git history..." -ForegroundColor Yellow
            git filter-repo --path $file --invert-paths --force
        }
    }
} else {
    Write-Host "git-filter-repo not found. Using git filter-branch..." -ForegroundColor Yellow
    Write-Host "⚠️  Note: git filter-branch is slower and may have issues." -ForegroundColor Yellow
    Write-Host "Consider installing git-filter-repo: pip install git-filter-repo" -ForegroundColor Yellow
    Write-Host ""
    
    # Create a script for git filter-branch
    $filterScript = @"
#!/bin/sh
git rm --cached --ignore-unmatch env.production
git rm --cached --ignore-unmatch k8s/secret.yaml
git rm --cached --ignore-unmatch sealed-secret.yaml
git rm --cached --ignore-unmatch k8s/production/secrets.yaml
"@
    
    $filterScript | Out-File -FilePath ".git-filter-branch-temp.sh" -Encoding utf8
    
    Write-Host "Running git filter-branch (this may take a while)..." -ForegroundColor Yellow
    git filter-branch --force --index-filter ".git-filter-branch-temp.sh" --prune-empty --tag-name-filter cat -- --all
    
    # Clean up
    Remove-Item ".git-filter-branch-temp.sh" -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Git history cleaned!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes: git log --all"
Write-Host "2. Force push to remote (if needed): git push --force --all"
Write-Host "3. Inform all team members to re-clone the repository"
Write-Host "4. Update secrets in your secret management system"
Write-Host ""
Write-Host "⚠️  IMPORTANT: After force push, all team members must:" -ForegroundColor Yellow
Write-Host "   - Re-clone the repository, OR"
Write-Host "   - Run: git fetch origin && git reset --hard origin/main"
