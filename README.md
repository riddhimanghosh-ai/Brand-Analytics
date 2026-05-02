# 📊 Brand Analytics Dashboard

A CRO (Conversion Rate Optimization) consulting dashboard for e-commerce brands. Connect your Shopify, Google Analytics, Meta Ads, and Google Ads accounts to get actionable insights.

## Features

✨ **Consulting-Grade Metrics**
- Revenue trends, AOV, repeat customer rate
- Customer segmentation and RFM analysis
- Funnel analysis (cart abandonment, checkout conversion)
- Advanced CRO opportunities and recommendations
- Custom metric builder (ShopifyQL queries)

🔐 **Secure Local-First Architecture**
- Credentials stored locally (`/data/`) - NOT in GitHub
- Optional GitHub sync for data backup
- Amplify dashboard fetches from local API via ngrok tunnel
- Zero credential exposure to cloud

📈 **Multi-Platform Support**
- Shopify analytics (orders, revenue, products, customers)
- Google Analytics 4 (traffic, sessions, conversion funnels)
- Meta Ads (campaign performance, ROAS)
- Google Ads (search & display campaigns)
- Gemini AI for consulting recommendations

## Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000
```

### 2. Add Your First Brand

1. Go to http://localhost:3000
2. Click "Add New Brand"
3. Fill in brand name
4. (Optional) Connect platforms:
   - **Shopify**: Store URL + Admin API token
   - **Google Analytics 4**: Property ID + Service Account JSON
   - **Meta Ads**: App ID, App Secret, Access Token, Ad Account ID
   - **Google Ads**: Developer Token, Client ID, Secret, Refresh Token, Customer ID
   - **Gemini**: API Key for AI insights

### 3. View Analytics

- Access `/dashboard/{brand-slug}` to see overview
- Deep dive into Shopify, Google Analytics, Ads, or CRO pages
- Get AI-powered consulting recommendations via chat

## Deployment

### For Local-Only Use

Just run `npm run dev` and access via http://localhost:3000

### For Cloud + Local (Amplify with ngrok tunnel)

See **[AMPLIFY_SETUP.md](./AMPLIFY_SETUP.md)** for complete setup instructions.

Quick start:
```bash
./start-with-tunnel.sh
```

This script will:
1. Start your local Next.js server
2. Launch ngrok tunnel to expose it publicly
3. Display the public URL for Amplify configuration

Then set the ngrok URL as `NEXT_PUBLIC_API_URL` environment variable in Amplify.

## Architecture

**Local Development:**
```
Browser → localhost:3000 → /data/brands/ (local credentials)
```

**Cloud Deployment (Amplify + ngrok):**
```
Browser → Amplify Dashboard → ngrok tunnel → localhost:3000 → /data/brands/
```

Credentials never leave your machine. Amplify only sees the public ngrok URL.

## Project Structure

```
src/
├── app/
│   ├── dashboard/[slug]/     # Brand dashboard pages
│   │   ├── page.tsx          # Overview with KPIs
│   │   ├── shopify/          # Shopify analytics
│   │   ├── analytics/        # Google Analytics
│   │   ├── ads/              # Meta & Google Ads
│   │   ├── cro/              # CRO deep-dive
│   │   ├── metrics/          # Custom metrics builder
│   │   └── settings/         # Connection setup guides
│   ├── api/
│   │   ├── shopify/route.ts  # Shopify API proxy
│   │   ├── analytics/route.ts # GA4 API proxy
│   │   ├── ads/route.ts      # Ads API proxy
│   │   └── brands/           # Brand CRUD operations
│   └── brands/new/           # Multi-step brand creation form
├── lib/
│   ├── services/             # API service modules
│   │   ├── shopify.ts
│   │   ├── ga4.ts
│   │   └── ads.ts
│   └── github-store.ts       # Local filesystem + GitHub sync
└── components/               # Reusable React components
```

## Environment Variables

```bash
# GitHub (optional - for automatic sync)
GITHUB_TOKEN=your_token
GITHUB_REPO=your_username/repo
GITHUB_BRANCH=main

# AI
GEMINI_API_KEY=your_gemini_key

# Cloud Deployment (Amplify only)
NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io
```

See `.env.example` for details.

## Data Storage

### Local (`/data/brands/`)
- One JSON file per brand: `demo.json`, `client-1.json`, etc.
- Contains all credentials (Shopify tokens, GA4 JSON keys, etc.)
- **In .gitignore - never committed to GitHub**
- Encrypted at rest on your machine

### Optional GitHub Sync
- Set `GITHUB_TOKEN` to automatically sync brand data to private repo
- Secrets are synced (use a private GitHub repo!)
- Can be pulled down on another machine with same token

## Security Notes

✅ **What's Secure**
- Credentials stored locally only
- GitHub never sees `/data/` folder
- Amplify never handles credentials
- API calls go through your machine's ngrok tunnel
- No third-party analytics collection

⚠️ **Keep in Mind**
- ngrok tunnel URL is public (anyone with URL can call your API)
- Don't share ngrok URL publicly
- Restart ngrok periodically to get new URLs
- Consider ngrok Pro for production use

## Troubleshooting

### "Brand not found" on Amplify
→ See [AMPLIFY_SETUP.md](./AMPLIFY_SETUP.md) → Troubleshooting section

### Shopify API returns error
→ Check `/dashboard/{slug}/settings` → Shopify section for detailed error

### Graphs not loading
→ Check browser console (F12) for errors
→ Verify local API is running: `curl http://localhost:3000/api/brands`

## Contributing

This is a private CRO consulting dashboard. Contributions welcome!

## Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **Data Fetching**: Server-side (for local) + API fallback (for cloud)
- **Charts**: Recharts
- **APIs**: Shopify GraphQL, Google Analytics Data API, Meta Marketing API, Google Ads API
- **AI**: Google Gemini
- **Storage**: Local filesystem + optional GitHub sync

## License

Private - for internal use only.
