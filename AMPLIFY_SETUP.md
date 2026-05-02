# Amplify Deployment with Local API Tunneling

## Architecture

Your dashboard has two components:

1. **Local Server** (Your Machine)
   - Runs Next.js with access to credential files in `/data/brands/`
   - Exposes API via ngrok tunnel (public HTTPS URL)
   - Example: `https://abc1234xyz.ngrok.io`

2. **Amplify Dashboard** (Cloud)
   - Fetches brand data from the local API via ngrok tunnel
   - Never stores credentials
   - Credentials stay encrypted on your machine only

## Setup Steps

### Step 1: Start Your Local Server

Run the Next.js development server locally:

```bash
npm run dev
# Server runs at http://localhost:3000
```

Verify the local API works by testing:
```bash
curl http://localhost:3000/api/brands
# Should return your brands list
```

### Step 2: Expose Local Server with ngrok

Install ngrok if you haven't already:
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

Authenticate ngrok (one-time):
```bash
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
# Get auth token from https://dashboard.ngrok.com/
```

Start ngrok tunnel for your local server:
```bash
ngrok http 3000
# You'll see output like:
# Forwarding: https://abc1234xyz.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** — this is your `NEXT_PUBLIC_API_URL`

### Step 3: Deploy Amplify with Environment Variable

#### Option A: Amplify Console

1. Go to **Amplify Console** → Your App → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://abc1234xyz.ngrok.io` (from Step 2)
3. Save and redeploy

#### Option B: Amplify CLI + amplify.yml

In your repo, create `.github/workflows/amplify-env.yml`:

```yaml
name: Set Amplify Env Vars
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set Amplify Environment Variables
        run: |
          aws amplify update-app \
            --app-id YOUR_APP_ID \
            --region us-east-1 \
            --environment-variables 'NEXT_PUBLIC_API_URL=https://abc1234xyz.ngrok.io'
```

#### Option C: Via `.env` File (Local Testing)

For testing locally with the Amplify build:
```bash
# In your project root, create/update .env.local:
NEXT_PUBLIC_API_URL=https://abc1234xyz.ngrok.io
```

### Step 4: Test the Connection

1. Access your Amplify dashboard: `https://your-app.amplifyapp.com/dashboard/demo`
2. The page should:
   - Load the brand overview
   - Display KPI cards (Total Revenue, Orders, AOV, etc.)
   - Show connection status
   - Display graphs and insights

If data doesn't load:
- Check browser console for errors (F12 → Console tab)
- Verify ngrok tunnel is still running
- Check that local server is running (`npm run dev`)

### Step 5: Keep ngrok Tunnel Active

The ngrok tunnel expires after 2 hours of inactivity on free plan. For continuous operation:

#### Option A: Use ngrok Pro
- Subscribe to ngrok Pro for persistent tunnels
- Use `ngrok config add-authtoken YOUR_PRO_TOKEN`

#### Option B: Restart Tunnel on Disconnection
Create a script to auto-restart:

```bash
#!/bin/bash
# auto-ngrok.sh
while true; do
  ngrok http 3000 --authtoken YOUR_NGROK_AUTH_TOKEN
  echo "ngrok disconnected, restarting..."
  sleep 5
done
```

Run with:
```bash
chmod +x auto-ngrok.sh
./auto-ngrok.sh &
```

#### Option C: Use tmux Session
```bash
tmux new-session -d -s ngrok 'ngrok http 3000 --authtoken YOUR_NGROK_AUTH_TOKEN'
# Check status: tmux ls
# Stop: tmux kill-session -t ngrok
```

## How Data Flows

### When Amplify Renders `/dashboard/demo`

```
1. Browser requests: amplifyapp.com/dashboard/demo
2. Amplify server renders page, needs brand data
3. Calls: getBrand("demo")
4. getBrand() tries local file → FAILS (Amplify has no /data/)
5. getBrand() falls back to API:
   fetch("https://abc1234xyz.ngrok.io/api/brands/demo")
6. ngrok tunnel routes request to http://localhost:3000/api/brands/demo
7. Local server's API reads from /data/brands/demo.json
8. Returns brand data (with full credentials)
9. Local server sends data back to Amplify (via ngrok)
10. Amplify renders dashboard with data
11. Browser displays KPIs and graphs
```

### Security: Credentials Stay Local

- ✅ Amplify never stores credentials
- ✅ GitHub never sees credential files (`/data/` is in `.gitignore`)
- ✅ Only your local machine has access to credentials
- ✅ Data flows: Local → ngrok tunnel → Amplify → Browser
- ✅ Sensitive data (tokens, API keys) only in your `/data/` folder

## Troubleshooting

### "Brand not found" Error

**Cause**: Either local server isn't running or ngrok tunnel is down

**Fix**:
```bash
# Terminal 1: Start local server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000 --authtoken YOUR_TOKEN

# Verify ngrok URL hasn't changed
# Update NEXT_PUBLIC_API_URL in Amplify if needed
```

### Graphs Show Empty

**Cause**: API might be returning data but page rendering is failing

**Debug**:
```bash
# Test API directly
curl "https://abc1234xyz.ngrok.io/api/shopify?slug=demo&action=kpis"
# Should return JSON with revenue, orders, etc.
```

**Fix**:
1. Check local server logs for errors
2. Verify Shopify connection in `/dashboard/demo/settings`
3. Check browser console (F12 → Console) for JavaScript errors

### "Connection Refused"

**Cause**: ngrok tunnel URL is wrong or tunnel expired

**Fix**:
1. Restart ngrok and get new URL
2. Update `NEXT_PUBLIC_API_URL` in Amplify settings
3. Redeploy Amplify or clear browser cache

### After Restarting ngrok

**Every time you restart ngrok:**
1. Copy new tunnel URL (e.g., `https://xyz9876.ngrok.io`)
2. Update Amplify Environment Variable: `NEXT_PUBLIC_API_URL`
3. Redeploy Amplify OR clear browser cache
4. Test in browser

## Production Notes

### Persistent Tunnel for Production

For a production setup, consider:

1. **Move to ngrok Pro** for custom domain and reliability
2. **Or use CloudFlare Tunnel** (free alternative with persistence)
3. **Or host local API on AWS/DigitalOcean** (not "local" but same principle)

### Environment Variable Management

Keep track of your ngrok URL:

```bash
# Create .env.ngrok (add to .gitignore)
NGROK_URL=https://abc1234xyz.ngrok.io

# Update Amplify whenever this changes
```

## Summary Checklist

- [ ] Local Next.js server running (`npm run dev`)
- [ ] ngrok tunnel active pointing to `localhost:3000`
- [ ] `NEXT_PUBLIC_API_URL` set in Amplify Environment Variables
- [ ] Amplify app redeployed with the new environment variable
- [ ] Brand data visible in `/dashboard/demo`
- [ ] KPI cards, graphs, and insights displaying correctly
- [ ] `/data/brands/demo.json` exists locally with Shopify credentials
- [ ] Verified no secrets in GitHub repository

---

**Questions?** Check the local server logs (`npm run dev`) and browser console (F12) for detailed error messages.
