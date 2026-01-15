# Git History Cleanup Guide

## ⚠️ CRITICAL: Secret Files Were Committed to Git

Secret files containing sensitive information were previously committed to Git. These files have been removed from Git tracking, but they still exist in Git history.

## What Was Done

✅ Secret files removed from Git tracking:
- `k8s/secret.yaml` (contained base64 encoded secrets)
- `k8s/production/secrets.yaml` (contained secrets)
- `sealed-secret.yaml` (contained secrets)

✅ `.gitignore` updated to prevent future commits

✅ Template files created for reference:
- `k8s/secret.yaml.template`
- `env.production.template`

## ⚠️ IMPORTANT: Clean Git History

The secret files still exist in Git history. You MUST clean the history to completely remove them.

### Option 1: Using git-filter-repo (Recommended)

1. **Install git-filter-repo:**
   ```bash
   pip install git-filter-repo
   ```

2. **Run cleanup script:**
   ```bash
   # Linux/Mac
   ./scripts/clean-git-history.sh
   
   # Windows PowerShell
   .\scripts\clean-git-history.ps1
   ```

### Option 2: Manual Cleanup

```bash
# Remove files from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch k8s/secret.yaml k8s/production/secrets.yaml sealed-secret.yaml" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## After Cleaning History

### 1. Force Push (if using remote repository)

```bash
# ⚠️ WARNING: This rewrites remote history
git push --force --all
git push --force --tags
```

### 2. Inform Team Members

**CRITICAL:** All team members must:

**Option A: Re-clone the repository**
```bash
cd ..
rm -rf tofas-fen-webapp
git clone <repository-url> tofas-fen-webapp
```

**Option B: Reset their local repository**
```bash
git fetch origin
git reset --hard origin/main
```

### 3. Rotate All Exposed Secrets

Since secrets were in Git history, you MUST:

1. **Generate new secrets:**
   ```bash
   node scripts/generate-secrets.js
   ```

2. **Update all environments:**
   - Production servers
   - CI/CD pipelines
   - Kubernetes secrets
   - Environment variables

3. **Update affected services:**
   - MongoDB passwords
   - JWT secrets
   - API keys
   - Email passwords

## Verification

After cleanup, verify secrets are removed:

```bash
# Check Git history
git log --all --full-history -- k8s/secret.yaml
git log --all --full-history -- k8s/production/secrets.yaml
git log --all --full-history -- sealed-secret.yaml

# Should return no results
```

## Prevention

To prevent this in the future:

1. ✅ Always check `.gitignore` before committing
2. ✅ Use `git status` to review files before commit
3. ✅ Use template files (`.template`) for reference
4. ✅ Never commit files with "secret" in the name
5. ✅ Use pre-commit hooks to check for secrets

## Need Help?

If you need assistance:
- Review `docs/SECURITY.md` for security best practices
- Check `.gitignore` for ignored file patterns
- Use template files as reference
