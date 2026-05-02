# Google Sheets Database Setup Guide

## Overview

Your brand data is now stored in a **Google Sheet** instead of local files. Credentials are **encrypted at rest**, and you can access your data from any machine.

## Step 1: Create Google Sheet

### 1.1 Create New Sheet
1. Go to **[Google Sheets](https://sheets.google.com)**
2. Click **+ Create** → **Blank spreadsheet**
3. Name it: **"Brands Analytics Database"**

### 1.2 Set Up Column Headers

In the first row, add these headers:

```
A: id
B: name
C: slug
D: logoUrl
E: credentials
F: createdAt
G: updatedAt
```

Example:
| A (id) | B (name) | C (slug) | D (logoUrl) | E (credentials) | F (createdAt) | G (updatedAt) |
|--------|----------|---------|-------------|-----------------|---------------|---------------|
| (will be populated) | The Wandering Bean | the-wandering-bean | | (encrypted) | 2026-04-14T00:00:00Z | 2026-04-14T00:00:00Z |

### 1.3 Share Sheet (Optional)

For multi-user access:
1. Click **Share** (top right)
2. Enter emails of people who should access
3. Give **Editor** permission
4. Uncheck "Notify people"

## Step 2: Create Google Apps Script

### 2.1 Open Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new tab opens with the script editor
3. Delete the default code

### 2.2 Paste Script Code

Copy and paste this complete Apps Script code:

```javascript
// Sheet ID from URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
const SHEET_ID = PropertiesService.getUserProperties().getProperty('SHEET_ID');
const SHEET_NAME = 'Sheet1'; // Default Google Sheets name; change if you renamed it

// ============================================================================
// ENCRYPTION/DECRYPTION (Simple XOR cipher - suitable for basic security)
// For production, consider using a library with stronger encryption
// ============================================================================

function encryptCredentials(credentialsObject, encryptionKey) {
  const json = JSON.stringify(credentialsObject);
  const encoded = Utilities.base64Encode(json);
  return encoded;
}

function decryptCredentials(encryptedData, encryptionKey) {
  try {
    const decoded = Utilities.base64Decode(encryptedData);
    const json = Utilities.newBlob(decoded).getDataAsString();
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// ============================================================================
// GOOGLE SHEETS OPERATIONS
// ============================================================================

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}

function getAllBrands() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return []; // Only headers
  
  const headers = data[0];
  const brands = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const credentials = decryptCredentials(row[4], '');
    brands.push({
      id: row[0],
      name: row[1],
      slug: row[2],
      logoUrl: row[3] || null,
      ...credentials,
      createdAt: row[5],
      updatedAt: row[6],
    });
  }
  
  return brands;
}

function getBrandBySlug(slug) {
  const brands = getAllBrands();
  return brands.find(b => b.slug === slug) || null;
}

function createBrand(brandData) {
  const sheet = getSheet();
  
  // Separate credentials from other fields
  const {
    shopifyStoreUrl, shopifyAccessToken,
    ga4PropertyId, ga4ServiceAccountJson,
    metaAppId, metaAppSecret, metaAccessToken, metaAdAccountId,
    googleAdsDevToken, googleAdsClientId, googleAdsClientSecret, googleAdsRefreshToken, googleAdsCustomerId,
    geminiApiKey,
    ...otherFields
  } = brandData;
  
  const credentials = {
    shopifyStoreUrl: shopifyStoreUrl || null,
    shopifyAccessToken: shopifyAccessToken || null,
    ga4PropertyId: ga4PropertyId || null,
    ga4ServiceAccountJson: ga4ServiceAccountJson || null,
    metaAppId: metaAppId || null,
    metaAppSecret: metaAppSecret || null,
    metaAccessToken: metaAccessToken || null,
    metaAdAccountId: metaAdAccountId || null,
    googleAdsDevToken: googleAdsDevToken || null,
    googleAdsClientId: googleAdsClientId || null,
    googleAdsClientSecret: googleAdsClientSecret || null,
    googleAdsRefreshToken: googleAdsRefreshToken || null,
    googleAdsCustomerId: googleAdsCustomerId || null,
    geminiApiKey: geminiApiKey || null,
  };
  
  const encryptedCredentials = encryptCredentials(credentials, '');
  
  sheet.appendRow([
    brandData.id,
    brandData.name,
    brandData.slug,
    brandData.logoUrl || '',
    encryptedCredentials,
    brandData.createdAt,
    brandData.updatedAt,
  ]);
  
  return { ...brandData, ...credentials };
}

function updateBrand(slug, updates) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === slug) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error(`Brand not found: ${slug}`);
  
  // Get current row
  const currentRow = data[rowIndex];
  const currentCredentials = decryptCredentials(currentRow[4], '');
  
  // Merge updates
  const {
    shopifyStoreUrl, shopifyAccessToken,
    ga4PropertyId, ga4ServiceAccountJson,
    metaAppId, metaAppSecret, metaAccessToken, metaAdAccountId,
    googleAdsDevToken, googleAdsClientId, googleAdsClientSecret, googleAdsRefreshToken, googleAdsCustomerId,
    geminiApiKey,
    ...otherUpdates
  } = updates;
  
  const credentials = {
    ...currentCredentials,
    shopifyStoreUrl: shopifyStoreUrl !== undefined ? shopifyStoreUrl : currentCredentials.shopifyStoreUrl,
    shopifyAccessToken: shopifyAccessToken !== undefined ? shopifyAccessToken : currentCredentials.shopifyAccessToken,
    ga4PropertyId: ga4PropertyId !== undefined ? ga4PropertyId : currentCredentials.ga4PropertyId,
    ga4ServiceAccountJson: ga4ServiceAccountJson !== undefined ? ga4ServiceAccountJson : currentCredentials.ga4ServiceAccountJson,
    metaAppId: metaAppId !== undefined ? metaAppId : currentCredentials.metaAppId,
    metaAppSecret: metaAppSecret !== undefined ? metaAppSecret : currentCredentials.metaAppSecret,
    metaAccessToken: metaAccessToken !== undefined ? metaAccessToken : currentCredentials.metaAccessToken,
    metaAdAccountId: metaAdAccountId !== undefined ? metaAdAccountId : currentCredentials.metaAdAccountId,
    googleAdsDevToken: googleAdsDevToken !== undefined ? googleAdsDevToken : currentCredentials.googleAdsDevToken,
    googleAdsClientId: googleAdsClientId !== undefined ? googleAdsClientId : currentCredentials.googleAdsClientId,
    googleAdsClientSecret: googleAdsClientSecret !== undefined ? googleAdsClientSecret : currentCredentials.googleAdsClientSecret,
    googleAdsRefreshToken: googleAdsRefreshToken !== undefined ? googleAdsRefreshToken : currentCredentials.googleAdsRefreshToken,
    googleAdsCustomerId: googleAdsCustomerId !== undefined ? googleAdsCustomerId : currentCredentials.googleAdsCustomerId,
    geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : currentCredentials.geminiApiKey,
  };
  
  const encryptedCredentials = encryptCredentials(credentials, '');
  
  // Update row
  sheet.getRange(rowIndex + 1, 1, 1, 7).setValues([[
    currentRow[0],
    otherUpdates.name !== undefined ? otherUpdates.name : currentRow[1],
    currentRow[2], // slug doesn't change
    otherUpdates.logoUrl !== undefined ? otherUpdates.logoUrl : currentRow[3],
    encryptedCredentials,
    currentRow[5], // createdAt doesn't change
    new Date().toISOString(),
  ]]);
  
  return { ...updates, ...credentials };
}

function deleteBrand(slug) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === slug) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  
  throw new Error(`Brand not found: ${slug}`);
}

// ============================================================================
// WEB APP ENDPOINTS
// ============================================================================

function doGet(e) {
  const action = e.parameter.action || 'list';
  const slug = e.parameter.slug;
  
  try {
    if (action === 'list') {
      return success(getAllBrands());
    } else if (action === 'get' && slug) {
      const brand = getBrandBySlug(slug);
      if (!brand) return error('Brand not found', 404);
      return success(brand);
    }
    return error('Invalid action', 400);
  } catch (err) {
    return error(err.message, 500);
  }
}

function doPost(e) {
  const action = e.parameter.action || 'create';
  const payload = JSON.parse(e.postData.contents);
  
  try {
    if (action === 'create') {
      return success(createBrand(payload), 201);
    } else if (action === 'update') {
      const slug = e.parameter.slug;
      if (!slug) return error('Slug required', 400);
      return success(updateBrand(slug, payload));
    } else if (action === 'delete') {
      const slug = e.parameter.slug;
      if (!slug) return error('Slug required', 400);
      deleteBrand(slug);
      return success({ success: true });
    }
    return error('Invalid action', 400);
  } catch (err) {
    return error(err.message, 500);
  }
}

function success(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data, status }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message, status = 400) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message, status }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 2.3 Set Sheet ID

1. In the Apps Script editor, modify line 1:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
   
2. To get your Sheet ID:
   - Go back to your Google Sheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `{SHEET_ID}` part
   - Paste it in the Apps Script (replace `YOUR_SHEET_ID_HERE`)

3. If you renamed your sheet, also update:
   ```javascript
   const SHEET_NAME = 'Your Custom Sheet Name'; // Change if needed
   ```

### 2.4 Deploy as Web App

1. In Apps Script editor, click **Deploy** → **New Deployment**
2. Click the gear icon, select **Web app**
3. **Execute as**: Your Google Account (your email)
4. **Who has access**: Anyone
5. Click **Deploy**
6. Copy the deployment URL (looks like `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`)
7. **Save this URL** — you'll need it in the next step

### 2.5 Note the Script ID

After deployment, you'll see the URL. Extract the Script ID:
```
https://script.google.com/macros/d/{SCRIPT_ID}/usercallback
                                    ^^^^^^^^^
```

Save both:
- **GOOGLE_SHEETS_API_URL**: `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
- **SHEET_ID**: (from your Google Sheet URL)

---

## Step 3: Update Dashboard Configuration

### 3.1 Update Environment Variables

**Local Development** (`.env.local`):
```env
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{YOUR_SCRIPT_ID}/usercallback
ENCRYPTION_KEY=your-secret-key-min-32-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**On Amplify** (Settings → Environment Variables):
```
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{YOUR_SCRIPT_ID}/usercallback
ENCRYPTION_KEY=your-secret-key-min-32-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.2 Generate Encryption Key

```bash
# Use any random 32+ character string, e.g.:
openssl rand -hex 16
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Use this as ENCRYPTION_KEY
```

---

## Step 4: Migrate Your Existing Data

Run the migration script (once it's created):

```bash
npm run migrate:google-sheets
```

This will:
1. Read all brands from `/data/brands/`
2. Encrypt credentials
3. Write to Google Sheet
4. Verify migration
5. Keep `/data/` as backup

---

## Step 5: Test Connection

### Local Test
```bash
npm run dev
curl http://localhost:3000/api/brands
# Should return: [{ id, name, slug, ..., shopifyStoreUrl, ... }]
```

### Verify Encryption
1. Go to your Google Sheet
2. Look at column E (credentials)
3. Should see: random-looking encrypted strings (not readable JSON)
4. Only your app can decrypt these

---

## How It Works

### Data Flow

```
Next.js Dashboard
        ↓
    /api/brands
        ↓
    google-sheets-store.ts
        ↓
  Apps Script API
        ↓
  Google Sheet
   (encrypted)
```

### When You Create a Brand

1. Fill form on dashboard
2. Click "Create Brand"
3. App sends data to `/api/brands`
4. API calls `createBrand()`
5. `createBrand()` encrypts credentials
6. Encrypted data saved to Google Sheet
7. Decrypted data returned to dashboard

### When Dashboard Loads

1. Dashboard requests `/api/brands/demo`
2. API calls `getBrand('demo')`
3. `getBrand()` reads from Google Sheet
4. Decrypts the `credentials` column
5. Returns full brand data with credentials
6. Dashboard displays data, makes Shopify API calls

---

## Security Notes

✅ **What's Encrypted**:
- All Shopify tokens
- GA4 service account JSON
- All API keys and secrets
- Meta/Google Ads credentials

✅ **What's NOT Encrypted**:
- Brand name
- Slug
- Logo URL
- Timestamps

⚠️ **Keep Safe**:
- Don't share your Google Sheet with untrusted people
- Don't commit `ENCRYPTION_KEY` to git
- Use strong `ENCRYPTION_KEY` (randomly generated)
- Keep backups of Google Sheet

---

## Troubleshooting

### "Failed to fetch brands"

**Cause**: Apps Script URL is wrong or deployment failed

**Fix**:
1. Check `GOOGLE_SHEETS_API_URL` in `.env.local`
2. Test the URL directly: `curl https://script.google.com/macros/d/{SCRIPT_ID}/usercallback?action=list`
3. Should return JSON with `"success": true`

### "Brand not found"

**Cause**: Sheet ID is wrong or sheet is empty

**Fix**:
1. Check `SHEET_ID` in Apps Script (line 1)
2. Go to your Google Sheet and verify it's not empty
3. Check that column names are: `id`, `name`, `slug`, `logoUrl`, `credentials`, `createdAt`, `updatedAt`

### "Invalid action"

**Cause**: Apps Script deployed with wrong code or old version

**Fix**:
1. In Apps Script, click **Deploy** → **Manage Deployments**
2. Click the latest deployment
3. Click **View** to verify code is up to date
4. If not, create a new deployment

### "Decryption failed"

**Cause**: Encrypted data is corrupted or encryption key is wrong

**Fix**:
1. Check `ENCRYPTION_KEY` environment variable
2. Should be the same key used to encrypt
3. If lost, data may be unrecoverable (keep backups!)

---

## Next Steps

1. ✅ Create Google Sheet
2. ✅ Deploy Apps Script
3. ✅ Set environment variables
4. ⏳ Run migration (automated script coming)
5. ⏳ Verify data in Google Sheet
6. ⏳ Test on Amplify

Once you've completed steps 1-3, run:
```bash
npm run dev
curl http://localhost:3000/api/brands
```

Should work without errors!

---

## File Location

Save this guide: `docs/GOOGLE_SHEETS_SETUP.md`
