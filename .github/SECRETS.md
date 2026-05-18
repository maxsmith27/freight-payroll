# GitHub Actions Secrets & Variables

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add these.

## Secrets (encrypted)

| Secret | Description | Where to get it |
|--------|-------------|-----------------|
| `RAILWAY_TOKEN` | Railway deployment token | railway.app → Account Settings → Tokens |
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | `vercel whoami` or project settings URL |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel project settings → General |
| `DATABASE_URL` | Production DB connection string | Supabase → Project Settings → Database → URI |
| `VITE_API_URL` | Production backend URL | e.g. `https://your-app.railway.app/api/v1` |

## Environment Protection

The `deploy-backend.yml` and `deploy-frontend.yml` workflows use `environment: production`.
Set up a **production** environment in Settings → Environments with required reviewers if you
want manual approval before any production deploy.

## Railway Setup

1. Install Railway CLI: `npm install -g @railway/cli`
2. Link your project: `railway link`
3. Create a service named `backend` in your Railway project
4. The `RAILWAY_TOKEN` must have permission to deploy to that service

## Vercel Setup

1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` once in `packages/frontend` to create/link the project
3. Get IDs: `vercel env ls` or project settings page
4. `VERCEL_ORG_ID` is your team slug; `VERCEL_PROJECT_ID` is the project ID from the URL
