#!/bin/bash

# Bash script to clean Git history of secret files
# WARNING: This rewrites Git history. Use with caution!
# Make sure you have a backup before running this.

set -e

echo "⚠️  WARNING: This script will rewrite Git history!"
echo "Make sure you have a backup and all team members are aware."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "🧹 Cleaning Git history of secret files..."

# Files to remove from Git history
FILES_TO_REMOVE=(
    "env.production"
    "k8s/secret.yaml"
    "sealed-secret.yaml"
    "k8s/production/secrets.yaml"
)

# Check if git-filter-repo is available (recommended)
if command -v git-filter-repo &> /dev/null; then
    echo "Using git-filter-repo (recommended)..."
    
    for file in "${FILES_TO_REMOVE[@]}"; do
        if [ -f "$file" ]; then
            echo "Removing $file from Git history..."
            git filter-repo --path "$file" --invert-paths --force
        fi
    done
else
    echo "git-filter-repo not found. Using git filter-branch..."
    echo "⚠️  Note: git filter-branch is slower and may have issues."
    echo "Consider installing git-filter-repo: pip install git-filter-repo"
    echo ""
    
    # Use git filter-branch
    echo "Running git filter-branch (this may take a while)..."
    git filter-branch --force --index-filter \
        'git rm --cached --ignore-unmatch env.production k8s/secret.yaml sealed-secret.yaml k8s/production/secrets.yaml' \
        --prune-empty --tag-name-filter cat -- --all
fi

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "📝 Next steps:"
echo "1. Review the changes: git log --all"
echo "2. Force push to remote (if needed): git push --force --all"
echo "3. Inform all team members to re-clone the repository"
echo "4. Update secrets in your secret management system"
echo ""
echo "⚠️  IMPORTANT: After force push, all team members must:"
echo "   - Re-clone the repository, OR"
echo "   - Run: git fetch origin && git reset --hard origin/main"
