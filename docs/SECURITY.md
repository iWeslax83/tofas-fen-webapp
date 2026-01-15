# Security Guide

## 🔐 Secret Management

### Important: Never Commit Secrets to Git

**CRITICAL SECURITY RULE:** Never commit files containing secrets, passwords, API keys, or sensitive information to Git.

### Files That Must NOT Be Committed

The following files are automatically ignored by `.gitignore`:

- `env.production` - Production environment variables with secrets
- `server/.env` - Server environment variables
- `client/.env` - Client environment variables
- `k8s/secret.yaml` - Kubernetes secrets
- `k8s/production/secrets.yaml` - Production Kubernetes secrets
- `sealed-secret.yaml` - Sealed secrets
- Any file matching `*.secret`, `*.secrets`, `*secret*.yaml`

### Template Files

Use template files for reference:

- `env.production.template` - Template for production environment variables
- `k8s/secret.yaml.template` - Template for Kubernetes secrets
- `server/env.example` - Example server environment variables

### Generating Secrets

Use the provided script to generate secure secrets:

```bash
node scripts/generate-secrets.js
```

This generates:
- `JWT_SECRET` (64 hex characters)
- `JWT_REFRESH_SECRET` (64 hex characters)
- `SESSION_SECRET` (64 hex characters)
- `MONGO_PASSWORD` (base64 encoded)
- `REDIS_PASSWORD` (optional, 32 hex characters)

### Setting Up Secrets

1. **Copy template files:**
   ```bash
   cp env.production.template env.production
   cp k8s/secret.yaml.template k8s/secret.yaml
   ```

2. **Generate secrets:**
   ```bash
   node scripts/generate-secrets.js
   ```

3. **Fill in the values:**
   - Copy generated secrets to `env.production`
   - For Kubernetes secrets, base64 encode values:
     ```bash
     echo -n "your-secret" | base64
     ```

4. **Verify .gitignore:**
   ```bash
   git status
   # Should NOT show env.production or secret.yaml
   ```

### If Secrets Were Accidentally Committed

If secrets were committed to Git, follow these steps:

1. **Remove from Git tracking (keeps local file):**
   ```bash
   git rm --cached env.production
   git rm --cached k8s/secret.yaml
   git commit -m "Remove secret files from Git"
   ```

2. **Clean Git history (removes from all commits):**
   ```bash
   # Linux/Mac
   ./scripts/clean-git-history.sh
   
   # Windows PowerShell
   .\scripts\clean-git-history.ps1
   ```

3. **Force push (if needed):**
   ```bash
   git push --force --all
   ```

4. **⚠️ IMPORTANT:** After cleaning history:
   - All team members must re-clone the repository, OR
   - Run: `git fetch origin && git reset --hard origin/main`
   - Rotate all exposed secrets immediately!

### Secret Storage Best Practices

1. **Local Development:**
   - Use `.env` files (already in `.gitignore`)
   - Never commit these files

2. **Production:**
   - Use environment variables
   - Use secret management services:
     - AWS Secrets Manager
     - HashiCorp Vault
     - Azure Key Vault
     - Google Secret Manager
   - Use Kubernetes Secrets (encrypted at rest)

3. **CI/CD:**
   - Store secrets in CI/CD platform's secret store
   - Never hardcode secrets in pipeline files

### Security Checklist

Before committing code:

- [ ] No `.env` files in commit
- [ ] No `secret.yaml` files with real secrets
- [ ] No hardcoded passwords or API keys
- [ ] No secrets in code comments
- [ ] `.gitignore` is up to date
- [ ] Template files are used for reference

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email: weslax83@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact

### Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Kubernetes Secrets Best Practices](https://kubernetes.io/docs/concepts/configuration/secret/)
