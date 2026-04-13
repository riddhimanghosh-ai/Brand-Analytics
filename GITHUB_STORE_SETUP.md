# GitHub Store Setup Guide

## Quick Start

### 1. Create GitHub Token
1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token with `repo` scope
3. Copy the token

### 2. Set Environment Variables

**For Vercel:**
1. Go to your Vercel project settings
2. Add environment variable: `GITHUB_TOKEN` = (your token)
3. Add environment variable: `GITHUB_REPO` = `antigravity-shopify/analytics-dashboard` (or your repo)
4. Add environment variable: `GITHUB_BRANCH` = `main` (or your branch)

**For Local Development:**
```bash
# .env file
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=antigravity-shopify/analytics-dashboard
GITHUB_BRANCH=main
GEMINI_API_KEY=your-key
```

### 3. Prepare GitHub Repository
Create the data folder structure:
```
repository-root/
├── data/
│   └── brands/
│       └── (brand JSON files will be stored here)
```

You can commit an empty `.gitkeep` file to ensure the folder exists:
```bash
git mkdir -p data/brands
touch data/brands/.gitkeep
git add data/brands/.gitkeep
git commit -m "Initialize brands data folder"
git push
```

## How It Works

### Create Brand
```bash
POST /api/brands
{
  "name": "My Store",
  "slug": "my-store",
  "shopifyStoreUrl": "...",
  "shopifyAccessToken": "...",
  ...
}
```
Creates: `data/brands/my-store.json`

### Read Brands
```bash
GET /api/brands
GET /api/brands/my-store
```
Reads from GitHub

### Update Brand
```bash
PUT /api/brands/my-store
{
  "name": "Updated Name",
  ...
}
```
Updates: `data/brands/my-store.json`

### Delete Brand
```bash
DELETE /api/brands/my-store
```
Deletes: `data/brands/my-store.json`

## GitHub API Rate Limits

- Authenticated requests: 5,000 per hour
- Typical usage: ~1 request per brand operation

For high-volume applications, consider:
- Caching responses
- Using GitHub App tokens instead of personal tokens
- Batch operations

## Troubleshooting

### "GITHUB_TOKEN environment variable is not set"
- Set `GITHUB_TOKEN` in your environment
- Check Vercel project settings
- Verify token is not revoked

### "Repository not found"
- Check `GITHUB_REPO` format: `owner/repo`
- Ensure token has `repo` scope
- Verify repository is accessible

### "Bad credentials"
- Token may be expired
- Token may not have `repo` scope
- Generate a new token with proper permissions

### "Reference not found"
- Branch specified in `GITHUB_BRANCH` doesn't exist
- Default is `main`, change if using different branch name

## Security Considerations

1. **Never commit tokens to Git** - Use environment variables
2. **Use fine-grained tokens** when available (GitHub recommendation)
3. **Rotate tokens regularly** - Set expiration dates
4. **Limit token scope** - Use `repo` scope only if needed
5. **Monitor token usage** - Check GitHub security logs

## Migration from Prisma

This setup replaces the previous PostgreSQL database:
- No database setup required
- Data stored in Git (version controlled)
- Easy to review changes in Git history
- Automatic backups via GitHub

## File Structure Example

```json
// data/brands/acme-corp.json
{
  "id": "unique-uuid",
  "name": "ACME Corporation",
  "slug": "acme-corp",
  "logoUrl": "https://example.com/logo.png",
  "shopifyStoreUrl": "acme.myshopify.com",
  "shopifyAccessToken": "shppa_****...",
  "ga4PropertyId": "123456789",
  "ga4ServiceAccountJson": "{...}",
  "metaAccessToken": "...",
  "metaAdAccountId": "...",
  "googleAdsDevToken": "...",
  "googleAdsClientId": "...",
  "googleAdsClientSecret": "...",
  "googleAdsRefreshToken": "...",
  "googleAdsCustomerId": "...",
  "geminiApiKey": "...",
  "createdAt": "2026-04-13T12:00:00.000Z",
  "updatedAt": "2026-04-13T12:00:00.000Z"
}
```

## Performance Tips

1. **Reduce API calls** - Cache getBrands() results when possible
2. **Batch operations** - Group related updates together
3. **Monitor quota** - Track API usage in GitHub settings
4. **Use appropriate timeouts** - Network latency varies

## Next Steps

1. Set up environment variables
2. Create `data/brands/` folder in your GitHub repo
3. Deploy to Vercel with GitHub token set
4. Test by creating a brand via the UI
5. Verify brand JSON appears in `data/brands/` folder
