# Secrets Rotation & Cleanup Plan

This document describes an automated, auditable process to rotate exposed secrets and to remove them from Git history.

IMPORTANT: The repository has already had obvious secrets redacted into placeholders. The steps below *do not* commit real secrets to the repo. They require you or an operator with required access to run the scripts locally (they take secrets from environment variables or prompt interactively) and to push changes to remote and to your clusters/secret stores.

High level steps
1. Generate new strong secrets and store them in a secure secret manager (GitHub Secrets / Vault / AWS Secrets Manager / Azure Key Vault).
2. Create temporary replacements for the old secret values and run `git filter-repo` to purge them from history locally.
3. Expire reflog, garbage-collect and force-push the cleaned history to the remote (coordinate with team).
4. Update Kubernetes secrets / Docker registry credentials / third-party services with the new secrets.
5. Verify application behavior in staging before production rollout.

Files included in this repo to help automation
- `scripts/generate_secrets.ps1` - PowerShell script to generate cryptographically strong secrets (writes `.new_secrets.env` locally).
- `scripts/clean_git_history.ps1` - PowerShell helper that builds a replacement list from environment variables (so secrets are not stored in repo) and runs `git filter-repo`.
- `scripts/update_k8s_secrets.sh` - Bash script to update Kubernetes secrets from environment variables (reads `.new_secrets.env`).

Notes and prerequisites
- You must have `git-filter-repo` installed (pip) or `bfg` available. The provided cleanup script prefers `git-filter-repo`.
- Running history rewrite is destructive: coordinate with your team; after rewrites everyone must reclone because of rewritten history.
- The helper scripts do not push changes automatically unless you pass the `--force-push` flag to the cleanup script.

Quick example (recommended flow)
1. Generate secrets locally (run from repo root):
   PowerShell:
   ```powershell
   .\scripts\generate_secrets.ps1
   ```

2. Verify `.new_secrets.env` (keeps secrets only locally). Then run cleanup (this will show actions and by default NOT push):
   ```powershell
   .\scripts\clean_git_history.ps1
   # to force push after review:
   .\scripts\clean_git_history.ps1 --force-push
   ```

3. Update k8s secrets (example):
   ```bash
   ./scripts/update_k8s_secrets.sh
   ```

If you'd like I can prepare the exact `replacements` list for `git-filter-repo` from the secrets that were redacted earlier, but for safety the script expects the old secrets to be supplied as environment variables so they never get committed into the repo.

If you want me to run any *non-destructive* checks here (like a dry-run of git-filter-repo that prints what would be replaced), tell me and I'll run them.
