# ⚡ Quick Start Guide

## What Changed?

Your dashboard now supports **two deployment modes**:

- **Local**: `http://localhost:3000` — credentials in `/data/`
- **Amplify**: Credentials stay on your machine, fetched via ngrok tunnel

Graphs should now display on Amplify! ✅

## Your Current Status

✅ Local server running  
✅ Brand "The Wandering Bean" created  
✅ Shopify connection configured  
⏳ Waiting for Amplify configuration

## 5-Minute Setup for Amplify

### 1️⃣ Install ngrok (if needed)

```bash
brew install ngrok
```

### 2️⃣ Authenticate ngrok (one-time)

Get your token from: https://dashboard.ngrok.com/

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 3️⃣ Start ngrok tunnel

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding                    https://abc1234xyz.ngrok.io -> http://localhost:3000
```

**👉 Copy this HTTPS URL**

### 4️⃣ Update Amplify

Go to **AWS Amplify Console** → Your App

**Settings** → **Environment Variables**

Click **Add environment variable**:
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://abc1234xyz.ngrok.io` (the URL from step 3)

Click **Save** and **Redeploy**

### 5️⃣ Test

Open your Amplify dashboard URL:
```
https://your-app.amplifyapp.com/dashboard/demo
```

You should see:
- 💰 Total Revenue
- 📦 Total Orders  
- 🛒 Average Order Value
- 👥 Unique Customers
- And other KPIs!

## That's It! 🎉

Your dashboard is now:
- ✅ Displaying graphs and data
- ✅ Keeping credentials local
- ✅ Securely connected to Amplify

## Keep It Running

The ngrok tunnel needs to stay active. Keep this command running:

```bash
ngrok http 3000
```

Or use the automated script:

```bash
./start-with-tunnel.sh
```

## When Ngrok Restarts

If you restart ngrok, you'll get a new URL. Then:

1. Update Amplify environment variable with new URL
2. Redeploy
3. Clear browser cache (Ctrl+Shift+Delete)

## Need Help?

- **Graphs still empty?** → Check `DEPLOYMENT_SUMMARY.md` → Troubleshooting
- **Setup questions?** → Read `AMPLIFY_SETUP.md` for detailed steps
- **API test?** → `curl http://localhost:3000/api/brands`

## File Locations

Everything you need is in this folder:

- 📖 `README.md` — Project overview
- 🚀 `AMPLIFY_SETUP.md` — Detailed Amplify guide  
- 📋 `DEPLOYMENT_SUMMARY.md` — What changed & troubleshooting
- 📝 `QUICKSTART.md` — This file
- 🔧 `start-with-tunnel.sh` — Automated setup

---

**Questions?** Check the docs above or look at the comments in `src/lib/github-store.ts`
