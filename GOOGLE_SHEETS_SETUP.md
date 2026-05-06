# Google Sheets + Apps Script Setup Guide

## Overview

This guide shows how to set up the Google Sheets backend for the Analytics Dashboard. The backend stores brand data with encrypted credentials.

---

## Step 1: Create a Google Sheet

1. Go to **[sheets.google.com](https://sheets.google.com)**
2. Click **"+ New"** → **"Spreadsheet"**
3. Name it: **"Analytics Dashboard Database"**
4. Click **"Create"**

### Get Your Sheet ID

The URL will look like:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0
```

**Copy the `YOUR_SHEET_ID` part** - you'll need this later.

---

## Step 2: Create Google Apps Script

### Open Apps Script Editor

1. In your Google Sheet, go to **Tools** → **Script editor**
2. This opens Google Apps Script in a new tab

### Copy Code Into Apps Script

1. **Delete all existing code** in the editor (if any)
2. **Copy all code** from `APPSCRIPT_CODE.gs` (the file created)
3. **Paste it** into the Apps Script editor
4. Replace the values at the top:

```javascript
// CONFIGURATION - CHANGE THESE
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';  // ← Replace with your Sheet ID
const SHEET_NAME = 'brands';
const ENCRYPTION_KEY = 'your-secret-encryption-key-32-chars-min'; // ← Change this
```

**Example:**
```javascript
const SHEET_ID = '1a2b3c4d5e6f7g8h9i0j'; // Your actual Sheet ID
const SHEET_NAME = 'brands';
const ENCRYPTION_KEY = 'my-super-secret-encryption-key-123456';
```

5. Click **"Save"** (Ctrl+S / Cmd+S)

---

## Step 3: Deploy as Web App

### Create Deployment

1. Click **"Deploy"** → **"New deployment"**
2. Click the **gear icon** next to "Select type"
3. Choose **"Web app"**
4. Fill in the form:

| Field | Value |
|-------|-------|
| **Execute as** | Select your email/account |
| **Who has access** | "Anyone" |

5. Click **"Deploy"**

### Copy Your Deployment URL

A dialog will appear showing your deployment URL:
```
https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercallback
```

**Copy this entire URL** - you'll need it for the `.env.local` file.

---

## Step 4: Update `.env.local`

Update your `.env.local` file with:

```
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercallback
GOOGLE_SHEETS_API_SECRET=your-secret-encryption-key-32-chars-min
ENCRYPTION_KEY=your-secret-encryption-key-32-chars-min
```

**Make sure to use the SAME encryption key in both:**
- Apps Script file (ENCRYPTION_KEY)
- .env.local (GOOGLE_SHEETS_API_SECRET and ENCRYPTION_KEY)

---

## Step 5: Test the Connection

### Test from Terminal

```bash
# Replace YOUR_DEPLOYMENT_URL with your actual deployment URL
curl "https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercallback?method=GET"
```

**Expected response:**
```json
[]
```
(Empty array - no brands yet)

### Test in Your App

1. Restart dev server: `npm run dev`
2. Open http://localhost:3000
3. Try to create a new brand at `/brands/new`
4. Brand should be saved to Google Sheets (check your sheet!)

---

## Step 6: Verify Data in Google Sheets

After creating a brand via the app:

1. Go back to your Google Sheet
2. You should see a new row with the brand data
3. Sensitive fields (tokens, keys) are encrypted in the `__credentials` column

---

## Sheet Structure

Your Google Sheet will have these columns:

| Column | Description |
|--------|-------------|
| A | `id` (UUID) |
| B | `name` (Brand name) |
| C | `slug` (URL-safe slug) |
| D | `logoUrl` |
| E | `shopifyStoreUrl` |
| F | `ga4PropertyId` |
| G | `metaAppId` |
| H | `googleAdsDevToken` |
| I | `geminiApiKey` |
| J | `tiktokAccessToken` |
| K | `tiktokAdvertiserId` |
| L | `klaviyoApiKey` |
| M | `pinterestAccessToken` |
| N | `pinterestAdAccountId` |
| O | `customDashboard` (JSON) |
| P | `__credentials` (encrypted) |
| Q | `createdAt` |
| R | `updatedAt` |

---

## API Endpoints

Once deployed, your Apps Script provides these endpoints:

### Get All Brands
```
GET https://script.google.com/macros/d/YOUR_ID/usercallback?method=GET
```

Response:
```json
[
  {
    "id": "uuid",
    "name": "Test Store",
    "slug": "test-store",
    "shopifyAccessToken": "shpat_...",
    ...
  }
]
```

### Get Single Brand
```
GET https://script.google.com/macros/d/YOUR_ID/usercallback?method=GET&slug=test-store
```

### Create Brand
```
POST https://script.google.com/macros/d/YOUR_ID/usercallback?method=POST

{
  "name": "My Brand",
  "slug": "my-brand",
  "shopifyStoreUrl": "my-store.myshopify.com",
  "shopifyAccessToken": "shpat_..."
}
```

### Update Brand
```
POST https://script.google.com/macros/d/YOUR_ID/usercallback?method=PUT&slug=my-brand

{
  "shopifyAccessToken": "shpat_new_token"
}
```

### Delete Brand
```
POST https://script.google.com/macros/d/YOUR_ID/usercallback?method=DELETE&slug=my-brand
```

---

## Troubleshooting

### Problem: "Deployment URL not working"
**Solution**: 
- Check that you selected "Anyone" when deploying
- Verify the full URL is correct
- Redeploy if needed: Delete old deployment, create new one

### Problem: "Spreadsheet not found error"
**Solution**:
- Double-check your SHEET_ID is correct
- Make sure the Google Sheet exists and you have access to it
- Go to the sheet URL and copy the ID from the URL

### Problem: "403 Forbidden error"
**Solution**:
- Make sure the deployment was set to "Anyone" (not just you)
- Check the SHEET_ID - it must match your actual sheet

### Problem: "Credentials not being saved"
**Solution**:
- Check that ENCRYPTION_KEY in Apps Script matches ENCRYPTION_KEY in .env.local
- Restart the dev server after updating .env.local
- Check browser console (F12) for error messages

### Problem: "Can't access Google Sheet from Apps Script"
**Solution**:
- In Apps Script, click **Project Settings** (gear icon)
- Verify the Sheet ID in the script matches your actual sheet
- Grant necessary permissions when prompted

---

## Security Notes

✅ **What's Encrypted**:
- shopifyAccessToken
- ga4ServiceAccountJson
- metaAppSecret
- metaAccessToken
- googleAdsDevToken / Secret / RefreshToken
- geminiApiKey
- tiktokAccessToken
- klaviyoApiKey
- pinterestAccessToken

✅ **Stored in Plain Text** (non-sensitive):
- name, slug, logoUrl
- shopifyStoreUrl, ga4PropertyId, metaAppId, googleAdsCustomerId
- tiktokAdvertiserId, pinterestAdAccountId
- customDashboard (JSON layout)

✅ **Never Sent to Browser**:
- API responses mask sensitive fields (maskBrand function)
- Only server-side API can decrypt and use credentials

---

## Testing the Apps Script

If you want to test directly in Apps Script:

1. In the Apps Script editor, click **"Run"** button
2. Select `testScript` function
3. Check the **Execution log** (bottom of screen)
4. Should show: Created brand → All brands → One brand

---

## Next Steps

1. ✅ Create Google Sheet
2. ✅ Create Apps Script deployment
3. ✅ Update `.env.local` with deployment URL
4. ✅ Restart `npm run dev`
5. ✅ Test creating a brand via the UI
6. ✅ Verify data appears in Google Sheet

Once complete, your app will:
- Store all brand data in Google Sheets (encrypted)
- Use Apps Script as the backend API
- Keep no credentials in git or local files
- Support collaborative access (you can share the sheet)

---

**Last Updated**: May 6, 2026
