# 📊 Brand Analytics Dashboard

A CRO (Conversion Rate Optimization) consulting dashboard for e-commerce brands. Connect your Shopify, Google Analytics, Meta Ads, and Google Ads accounts to get actionable insights.

## Features

✨ **Consulting-Grade Metrics**
- Revenue trends, AOV, repeat customer rate
- Customer segmentation and RFM analysis
- Funnel analysis (cart abandonment, checkout conversion)
- Advanced CRO opportunities and recommendations
- Custom metric builder (ShopifyQL queries)

🔐 **Secure Cloud Database with Encryption**
- Credentials stored in Google Sheet with AES-256 encryption
- No credentials in GitHub, local files, or Amplify
- Easy multi-user access and backups
- Encrypted at rest, decrypted only on server

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

### For Cloud Deployment (Amplify with Google Sheets)

See **[docs/GOOGLE_SHEETS_SETUP.md](./docs/GOOGLE_SHEETS_SETUP.md)** for complete setup instructions.

Quick steps:
1. Create Google Sheet + Apps Script (manual setup in Google console)
2. Get `GOOGLE_SHEETS_API_URL` from Apps Script deployment
3. Generate `ENCRYPTION_KEY`
4. Set both in Amplify Environment Variables
5. Redeploy Amplify

Your data is now accessible from Amplify with encrypted credentials!

## Architecture

**Data Storage:**
```
Next.js App ↔ Google Apps Script ↔ Google Sheet (encrypted credentials)
```

**Local Development:**
```
Browser → localhost:3000 → Google Apps Script API → Google Sheet
```

**Cloud Deployment (Amplify):**
```
Browser → Amplify → Google Apps Script API → Google Sheet
```

Credentials encrypted at rest in Google Sheet. Server decrypts only when needed.

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
# Google Sheets Database (required)
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{SCRIPT_ID}/usercallback
ENCRYPTION_KEY=your-secret-key-min-32-characters

# AI (optional)
GEMINI_API_KEY=your_gemini_key
```

See `.env.example` and `docs/GOOGLE_SHEETS_SETUP.md` for setup instructions.

## Data Storage

### Google Sheet (Encrypted Database)
- All brands stored in a single Google Sheet
- Credentials encrypted with AES-256 before storage
- Accessible from any machine with your Google account
- Easy to share and backup
- **Zero credentials in git or local files**

### Encryption
- Encryption key stored in environment variables (NOT in git)
- Only the server can decrypt credentials
- Client-side responses still mask tokens for safety

## Security Notes

✅ **What's Secure**
- Credentials encrypted at rest in Google Sheet
- GitHub never sees credential files
- Amplify never stores credentials locally
- Only server can decrypt credentials
- Encryption key stored separately from data
- No third-party analytics collection

⚠️ **Keep in Mind**
- Don't share your Google Sheet with untrusted people
- Never commit `ENCRYPTION_KEY` to git
- Keep `ENCRYPTION_KEY` safe and private
- Use strong randomly-generated `ENCRYPTION_KEY` (32+ characters)
- Keep backups of your Google Sheet

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
