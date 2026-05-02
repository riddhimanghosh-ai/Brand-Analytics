# Google Sheets Database Migration - Complete ✅

## What Changed?

Your dashboard now uses **Google Sheets as a database** instead of storing brand data in local `/data/` files.

### Before
```
Local JSON files → /data/brands/demo.json
- Plain text credentials
- Only accessible on this machine
- Manual backup needed
```

### After
```
Google Sheet (encrypted) → Google Apps Script API
- AES-256 encrypted credentials
- Accessible from any machine
- Automatic cloud backup
- Multi-user support
```

---

## What You Get

✅ **Security**
- Credentials encrypted at rest
- Never stored in git
- Never sent to Amplify unencrypted
- Server-side decryption only

✅ **Accessibility**
- Access from any device
- Works with Amplify without ngrok tunnel
- Can share sheet with team members
- Easy backups

✅ **Simplicity**
- No local file management
- No ngrok tunnel needed
- Single source of truth
- Professional data management

---

## Files Changed

### Created
- `src/lib/google-sheets-store.ts` - TypeScript module for Google Sheets integration
- `docs/GOOGLE_SHEETS_SETUP.md` - Complete setup guide with Apps Script code

### Modified
- `src/app/api/brands/route.ts` - Updated to use google-sheets-store
- `src/app/api/brands/[id]/route.ts` - Updated to use google-sheets-store
- `src/app/dashboard/[slug]/layout.tsx` - Updated to use google-sheets-store
- `.env.example` - Added GOOGLE_SHEETS_API_URL and ENCRYPTION_KEY
- `README.md` - Updated architecture documentation

### Deprecated (Still Available as Fallback)
- `src/lib/github-store.ts` - Local filesystem store (not used anymore)

---

## Setup Instructions

### Step 1: Create Google Sheet + Apps Script (15 minutes)

Follow: **`docs/GOOGLE_SHEETS_SETUP.md`**

This guide includes:
1. ✅ How to create a Google Sheet
2. ✅ Complete Apps Script code (copy-paste)
3. ✅ How to deploy as a web app
4. ✅ How to get your API URLs

### Step 2: Set Environment Variables (2 minutes)

After completing Google Sheets setup, you'll have:
- `GOOGLE_SHEETS_API_URL` - Apps Script deployment URL
- `ENCRYPTION_KEY` - Secret key for encryption (generate a random one)

Update `.env.local`:
```env
GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{YOUR_SCRIPT_ID}/usercallback
ENCRYPTION_KEY=your-randomly-generated-32-character-key
```

### Step 3: Test Locally (5 minutes)

```bash
# Start dev server
npm run dev

# Test the API
curl http://localhost:3000/api/brands

# Should return JSON with brands (currently empty until migrated)
```

### Step 4: Migrate Existing Data (5 minutes)

**Option A: Manual Migration** (Recommended for first time)

For each brand in `/data/brands/`:
1. Open your Google Sheet
2. Manually add the brand data:
   - Column A (id): Same UUID as before
   - Column B (name): Brand name
   - Column C (slug): Brand slug
   - Column D (logoUrl): Logo URL or empty
   - Column E (credentials): Encrypted by Apps Script (don't edit manually)
   - Column F (createdAt): ISO timestamp
   - Column G (updatedAt): ISO timestamp

Use the dashboard form to create brands properly, which will:
- Encrypt credentials automatically
- Format data correctly
- Write to Google Sheet

**Option B: Automated Migration** (Coming soon)

We can create a script to automatically migrate from `/data/` to Google Sheets.

### Step 5: Deploy to Amplify (2 minutes)

1. Go to **AWS Amplify Console** → Your App
2. **Settings** → **Environment Variables**
3. Add two variables:
   ```
   GOOGLE_SHEETS_API_URL = https://script.google.com/macros/d/{YOUR_SCRIPT_ID}/usercallback
   ENCRYPTION_KEY = your-encryption-key
   ```
4. **Save** and **Redeploy**

That's it! No ngrok tunnel needed. ✅

---

## How It Works

### Creating a Brand (Now)

```
User fills form on dashboard
        ↓
Click "Create Brand"
        ↓
Next.js API: /api/brands (POST)
        ↓
Calls: createBrand({ name, shopifyAccessToken, ... })
        ↓
google-sheets-store.ts encrypts credentials
        ↓
Sends to Google Apps Script API
        ↓
Apps Script encrypts and stores in Google Sheet
        ↓
Returns decrypted brand to dashboard
        ↓
Dashboard displays success
```

### Viewing Brands (Now)

```
User loads dashboard
        ↓
Next.js API: /api/brands (GET)
        ↓
Calls: getBrands()
        ↓
Fetches from Google Apps Script API
        ↓
Apps Script reads from Google Sheet
        ↓
Decrypts credentials
        ↓
Returns brand data to API
        ↓
Dashboard displays brands with KPIs
```

---

## Important Security Notes

⚠️ **Never Commit These to Git:**
```
GOOGLE_SHEETS_API_URL
ENCRYPTION_KEY
```

✅ **Keep Safe:**
- Your Google Sheet (don't share publicly)
- Your encryption key (generate new one if compromised)
- Your Apps Script code (sensitive API URLs inside)

✅ **Good Practices:**
- Use a strong, randomly-generated ENCRYPTION_KEY
- Keep Google Sheet private (only share with team members)
- Use Amplify environment variables for credentials (not in .env.local)
- Regularly backup your Google Sheet

---

## Testing

### Test Locally

```bash
# Start dev server
npm run dev

# List all brands (should be empty initially)
curl http://localhost:3000/api/brands

# Create a test brand using the dashboard form
# Go to http://localhost:3000 → Add Brand

# Verify it appears in API
curl http://localhost:3000/api/brands
```

### Test Encryption

1. Create a brand via dashboard form
2. Go to your Google Sheet
3. Look at column E (credentials)
4. Should see: `C0K0V0m4Lj2xH8nP9qR5tW7yZ3aBcDeF...` (encrypted gibberish)
5. NOT: `{"shopifyAccessToken": "shpat_..."}` (readable JSON)

✅ Encryption is working!

### Test Amplify

1. Set environment variables in Amplify
2. Redeploy
3. Visit your Amplify dashboard URL
4. Should load brands and KPIs
5. No ngrok tunnel needed! 🎉

---

## Troubleshooting

### "GOOGLE_SHEETS_API_URL not set"

**Cause**: Environment variable missing

**Fix**:
```bash
# Check .env.local
cat .env.local | grep GOOGLE_SHEETS_API_URL

# Should output:
# GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/...

# If missing, add it
```

### "Failed to fetch brands"

**Cause**: Apps Script URL is wrong or Apps Script failed

**Fix**:
1. Test the URL directly:
   ```bash
   curl "https://script.google.com/macros/d/{SCRIPT_ID}/usercallback?action=list"
   ```
2. Should return: `{"success":true,"data":[],...}`
3. If not, check Apps Script code in Google Sheets
4. Make sure you deployed as "Web app" (not library)

### "Decryption failed"

**Cause**: ENCRYPTION_KEY doesn't match what was used to encrypt

**Fix**:
1. Check that ENCRYPTION_KEY is the same everywhere
2. If you changed it, data is unrecoverable (use backup)
3. Generate new key and re-encrypt all brands

### Brands Not Appearing

**Cause**: Data is in `/data/` but not migrated to Google Sheet

**Fix**:
1. Use dashboard form to recreate brands
2. Or manually enter into Google Sheet
3. Future brands will use Google Sheet automatically

---

## Next Steps

1. ✅ **Read setup guide**: `docs/GOOGLE_SHEETS_SETUP.md`
2. ⏳ **Create Google Sheet + Apps Script** (manual)
3. ⏳ **Set environment variables**
4. ⏳ **Create brands via dashboard form** (they'll auto-encrypt and save)
5. ⏳ **Test in Amplify** (no ngrok needed!)
6. ⏳ **Delete `/data/brands/` folder** when confident

---

## Differences from Old System

| Feature | Old (`/data/` files) | New (Google Sheets) |
|---------|----------------------|-------------------|
| **Location** | Local filesystem | Google Cloud |
| **Encryption** | None | AES-256 at rest |
| **Access** | This machine only | Any device |
| **Backup** | Manual | Auto (Google) |
| **Multi-user** | No | Yes |
| **Amplify Deploy** | Needs ngrok tunnel | Direct access |
| **Cost** | Free (local) | Free (Google free tier) |
| **Privacy** | High (no cloud) | High (encrypted) |

---

## Files You Can Delete (After Verification)

Once you've verified all brands are in Google Sheets:

```bash
# Backup first!
cp -r data/brands data/brands.backup

# Then delete
rm -rf data/brands
rm src/lib/github-store.ts # Optional - keep as reference
```

---

## Questions?

1. **Setup**: Read `docs/GOOGLE_SHEETS_SETUP.md`
2. **Architecture**: Check `README.md`
3. **Troubleshooting**: See section above
4. **Code**: Check `src/lib/google-sheets-store.ts`

Everything is documented and ready to go!

---

**Status**: ✅ Implementation complete, ready for setup

**Next**: Follow `docs/GOOGLE_SHEETS_SETUP.md` to create your Google Sheet
