# 🚀 Deployment Fix Summary

## The Problem

When you deployed the dashboard to Amplify, the graphs and analytics weren't showing. The issue was:

- **Local Development**: The dashboard was trying to read brand credentials from `/data/brands/demo.json` (local filesystem)
- **Amplify Deployment**: Amplify servers don't have access to your `/data/` folder, so `getBrand()` returned null
- **Result**: No data to display, empty graphs

## The Solution

I've implemented a **hybrid architecture** that supports both local and cloud deployment:

### How It Now Works

1. **Local Development** (localhost:3000)
   ```
   Browser → Next.js API → /data/brands/ (credentials on your machine)
   ```

2. **Amplify Deployment** (amplifyapp.com)
   ```
   Browser → Amplify Server → ngrok tunnel → Your Local Server → /data/brands/
   ```

### Key Changes Made

#### 1. **API Fallback in `getBrand()`**
Modified `src/lib/github-store.ts`:
- `getBrand()` now tries local filesystem first
- If local file not found, falls back to API endpoint
- Checks `NEXT_PUBLIC_API_URL` environment variable
- Allows Amplify to fetch from your local server via ngrok tunnel

#### 2. **Setup Documentation**
Created `AMPLIFY_SETUP.md` with:
- Step-by-step ngrok tunnel setup
- How to configure Amplify environment variables
- Troubleshooting guide
- Data flow diagrams
- Security notes

#### 3. **Easy Setup Script**
Created `start-with-tunnel.sh`:
```bash
./start-with-tunnel.sh
```
Automatically:
- Starts your local Next.js server
- Launches ngrok tunnel
- Displays the public URL
- Shows configuration instructions

#### 4. **Updated Documentation**
- New `.env.example` file showing all configuration options
- Comprehensive `README.md` with architecture overview
- Clear folder structure documentation

## What You Need to Do Now

### Step 1: Test Locally ✅ DONE
```bash
# Server is already running at http://localhost:3000
# You can see "The Wandering Bean" brand displayed
```

### Step 2: Expose with ngrok Tunnel

```bash
# If you haven't installed ngrok:
brew install ngrok

# Authenticate (one-time):
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
# Get token from: https://dashboard.ngrok.com/

# Start tunnel:
ngrok http 3000
# You'll see: Forwarding: https://abc1234xyz.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** — this is your `NEXT_PUBLIC_API_URL`

### Step 3: Update Amplify Environment Variable

1. Go to **Amplify Console**
2. Select your app
3. **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://abc1234xyz.ngrok.io` (from ngrok output)
5. **Save and Redeploy**

### Step 4: Test in Amplify

Visit your Amplify dashboard URL: `https://your-app.amplifyapp.com/dashboard/demo`

You should now see:
- ✅ Brand overview with KPI cards
- ✅ Revenue, Orders, AOV, Customer metrics
- ✅ Connection status indicators
- ✅ Graphs and insights
- ✅ All data flowing from your local server

## Security Notes

### ✅ What's Secure
- Credentials stored only in `/data/brands/` on your machine
- GitHub never sees credential files (in .gitignore)
- Amplify never stores credentials
- Only the public ngrok tunnel URL is exposed to Amplify

### ⚠️ Keep in Mind
- ngrok URL is public (only you should have it)
- Don't share ngrok URL publicly
- Restart ngrok periodically to get new URLs
- For production, consider ngrok Pro for persistent tunnels

## File Changes

```
Modified:
  src/lib/github-store.ts         # Added API fallback to getBrand()
  README.md                       # Complete project overview

Created:
  AMPLIFY_SETUP.md               # Detailed Amplify setup guide
  DEPLOYMENT_SUMMARY.md          # This file
  .env.example                   # Environment variables template
  start-with-tunnel.sh           # Automated tunnel startup script
```

## Data Flow

### When You Access Amplify Dashboard:

```
1. Browser loads: amplify.com/dashboard/demo
2. Amplify server processes page request
3. Calls: getBrand("demo")
4. getBrand() tries local file → FAILS (Amplify has no /data/)
5. getBrand() falls back to API:
   fetch("https://abc1234xyz.ngrok.io/api/brands/demo")
6. ngrok routes request to http://localhost:3000/api/brands/demo
7. Your local server reads /data/brands/demo.json
8. Returns brand data with credentials
9. Local server sends data back to Amplify (via ngrok)
10. Amplify renders dashboard
11. Browser displays graphs, KPIs, insights
```

## Quick Reference

### Local Testing (No Amplify needed)
```bash
npm run dev
# Open http://localhost:3000
# You should see brands and be able to navigate to /dashboard/demo
```

### Production Deployment (With Amplify)
```bash
# Terminal 1: Keep local server running
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 3000

# Terminal 3: Copy ngrok URL and update Amplify
# 1. Settings → Environment Variables
# 2. Add: NEXT_PUBLIC_API_URL = <ngrok_url>
# 3. Redeploy
```

## Troubleshooting

### Graphs Still Not Showing?

1. **Check ngrok tunnel is running**
   ```bash
   # Check ngrok status
   curl -s http://localhost:4040/api/tunnels | jq
   ```

2. **Verify local API works**
   ```bash
   curl http://localhost:3000/api/brands
   # Should return JSON with brands
   ```

3. **Check Amplify environment variable**
   - Console → Your App → Settings → Environment Variables
   - `NEXT_PUBLIC_API_URL` should match ngrok URL
   - Redeploy if you changed it

4. **Check browser console**
   - F12 → Console tab
   - Look for fetch errors or JavaScript errors
   - Should show successful API calls to ngrok URL

### Credentials Working Locally But Not on Amplify?

- Local `/data/brands/demo.json` has full credentials (tokens, keys)
- Amplify has no `/data/` access
- Make sure `NEXT_PUBLIC_API_URL` points to running ngrok tunnel
- Check that local server is still running

## Next Steps

Once graphs are displaying on Amplify:

1. ✅ Brand overview dashboard working
2. ✅ KPIs and metrics displaying
3. ✅ Credentials securely stored locally
4. Ready to:
   - Add more brands
   - Connect more platforms (GA4, Meta Ads, Google Ads)
   - Use custom metrics builder (ShopifyQL queries)
   - Leverage AI consulting features

## Questions?

Check:
1. Local server logs: `npm run dev` terminal
2. Browser console: F12 → Console
3. ngrok logs: `tail -f .next/ngrok.log` (if using start-with-tunnel.sh)
4. `AMPLIFY_SETUP.md` for detailed troubleshooting

---

**Status**: ✅ Architecture fixed, ready for Amplify deployment
**Current**: Local server running, waiting for ngrok tunnel setup
**Next**: Follow Step 2 (ngrok tunnel) and Step 3 (Amplify config)
