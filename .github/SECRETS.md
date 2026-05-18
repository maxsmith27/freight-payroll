# GitHub Actions Secrets & Variables

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add these.

## Secrets (encrypted)

| Secret | Description | Where to get it |
|--------|-------------|-----------------|
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for the backend service | Render dashboard → your service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | `vercel whoami` or project settings URL |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel project settings → General |
| `DATABASE_URL` | Production DB connection string | Supabase → Project Settings → Database → URI |
| `VITE_API_URL` | Production backend URL | e.g. `https://your-app.onrender.com/api/v1` |

## Environment Protection

The `deploy-backend.yml` and `deploy-frontend.yml` workflows use `environment: production`.
Set up a **production** environment in Settings → Environments with required reviewers if you
want manual approval before any production deploy.

## Render Setup

1. Go to your Render backend service → **Settings** → scroll to **Deploy Hook**
2. Copy the URL and add it as the `RENDER_DEPLOY_HOOK_URL` secret above
3. Every push to `main` that touches backend files will trigger a redeploy automatically

## Vercel Setup

1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` once in `packages/frontend` to create/link the project
3. Get IDs: `vercel env ls` or project settings page
4. `VERCEL_ORG_ID` is your team slug; `VERCEL_PROJECT_ID` is the project ID from the URL
