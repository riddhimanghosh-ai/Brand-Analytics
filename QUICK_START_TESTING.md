# Quick Start Testing Guide

## Status ✅
- **Test brand created**: `test-store` with slug `test-store`
- **Location**: `/data/brands/test-store.json`
- **Configuration**: Using local filesystem backend (Google Sheets API disabled)

---

## Start Dev Server

```bash
cd /Users/riddhiman/Documents/Antigravity\ Shopify/analytics-dashboard
npm run dev
```

The dev server will start on `http://localhost:3000`

---

## Test in Browser

### Step 1: View Brands List
Open: **http://localhost:3000**
- ✅ Should see "Test Store" in the brands list
- ✅ Logo should show placeholder "B"
- ✅ Connection status should be visible

### Step 2: Enter Dashboard
Click on **"Test Store"**
- ✅ Should see main dashboard overview
- ✅ Check sidebar for 5 new feature links (see Feature Navigation below)

---

## Feature Navigation

Once in the Test Store dashboard, you can navigate to:

| Feature | URL | What to Test |
|---------|-----|--------------|
| **Custom Dashboard** | `/dashboard/test-store/custom` | Add widgets, drag to reorder, save layout |
| **AI Chat** | `/dashboard/test-store/chat` | Type messages, see streaming responses |
| **Forecast Tool** | `/dashboard/test-store/forecast` | View 30/60/90 day revenue predictions |
| **Social Comments** | `/dashboard/test-store/social` | View sentiment-analyzed comments |
| **Settings** | `/dashboard/test-store/settings` | View TikTok & Klaviyo setup guides |

---

## Automated API Testing

Run the test script to verify all endpoints:

```bash
bash scripts/test-api.sh
```

This will test:
- ✅ GET /api/brands (fetch all brands)
- ✅ GET /api/brands?slug=test-store (fetch single brand)
- ✅ All 5 feature pages are accessible
- ✅ Endpoints are responding

---

## Scripts Available

### 1. Create Test Brand (already run)
```bash
node scripts/create-test-brand.mjs
```
Creates a test brand in `/data/brands/test-store.json`

### 2. Test API Endpoints
```bash
bash scripts/test-api.sh
```
Runs automated tests against all endpoints

---

## Manual Testing Checklist

### Custom Dashboard (`/dashboard/test-store/custom`)
- [ ] Page loads without errors
- [ ] Empty state shows "Build your custom dashboard"
- [ ] Click "+ Add your first widget" opens picker
- [ ] Can select different widgets (Shopify, GA4, Meta, Google Ads)
- [ ] Widget displays value (will show 0 with fake credentials)
- [ ] Can drag widget to reorder
- [ ] Can delete widget with "X" button
- [ ] "Save Layout" persists changes

### AI Chat (`/dashboard/test-store/chat`)
- [ ] Page loads with sidebar + chat area
- [ ] Sidebar shows 5 prompt categories
- [ ] Can type a message
- [ ] Can press Enter or click → to send
- [ ] Response streams in real-time (check if GEMINI_API_KEY is set)
- [ ] Messages persist in conversation
- [ ] "Clear chat" button works

### Forecast Tool (`/dashboard/test-store/forecast`)
- [ ] Page loads (requires Shopify connection)
- [ ] Shows KPI cards (Forecast Total, Daily Avg, etc.)
- [ ] Chart displays with dashed forecast line
- [ ] Horizon toggles (30/60/90 days) work
- [ ] Metric toggles (Revenue/Orders) work
- [ ] Gemini insight appears (if API key set)

### Social Comments (`/dashboard/test-store/social`)
- [ ] Page loads
- [ ] Shows stats cards for sentiment breakdown
- [ ] Comments table structure is correct
- [ ] Sentiment badges are color-coded
- [ ] Filters work (Platform, Sentiment)
- [ ] Search box filters comments

### Settings (`/dashboard/test-store/settings`)
- [ ] Page loads all sections
- [ ] New connections visible:
  - TikTok Ads setup guide
  - Klaviyo Email setup guide
- [ ] Pinterest section exists
- [ ] Test Connection buttons present
- [ ] Input fields for credentials

---

## Known Limitations

### With Test Credentials
- Shopify API calls will fail (fake token: `shpat_test_token_12345`)
- Custom Dashboard will show "—" or 0 for metrics
- Forecast will show placeholder data
- Social Comments will be empty
- Analytics will not fetch real data

### To Test with Real Data
Edit `/data/brands/test-store.json` and add:

1. **Real Shopify Credentials**:
   ```json
   "shopifyStoreUrl": "your-store.myshopify.com",
   "shopifyAccessToken": "shpat_..."
   ```

2. **Real Google Analytics 4**:
   ```json
   "ga4PropertyId": "123456789",
   "ga4ServiceAccountJson": "{\"type\": \"service_account\", ...}"
   ```

3. **Gemini API Key** (for AI features):
   ```json
   "geminiApiKey": "AIza..."
   ```

4. **Meta Ads** (for social comments):
   ```json
   "metaAccessToken": "EAAB...",
   "metaAdAccountId": "act_..."
   ```

---

## Troubleshooting

### Problem: "Can't open the brands page"
**Solution**: Restart the dev server (Ctrl+C, then `npm run dev`)

### Problem: "Custom Dashboard widgets show '—'"
**Solution**: This is expected with fake credentials. The widget paths should still work when you add real credentials.

### Problem: "Can't create a new brand via UI"
**Solution**: Use the test brand creation script instead:
```bash
node scripts/create-test-brand.mjs
```

### Problem: "Dev server won't start"
**Solution**: Check for port conflicts (3000 might be in use):
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Success Indicators ✅

You'll know everything is working when:

1. ✅ Brands list page loads and shows "Test Store"
2. ✅ Dashboard overview loads
3. ✅ All 5 new feature pages are accessible
4. ✅ Navigation links appear in sidebar
5. ✅ Pages don't show 404 or 500 errors
6. ✅ Browser console is clean (F12 → Console)

---

## Next Steps

1. **Start server**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. **Click "Test Store"** to enter dashboard
4. **Test each feature** using the checklist above
5. **Report issues** with:
   - Feature name
   - Expected vs actual behavior
   - Browser console errors (F12)
   - Network tab errors (F12 → Network)

---

**Last Updated**: May 6, 2026
**Status**: Ready for testing with local filesystem backend
