# Testing Guide - New Features (v0.2.0)

## Overview
This guide covers testing of 5 major new features added to the analytics dashboard:

1. **Custom Dashboard** - Drag-and-drop metric widgets from all platforms
2. **AI Chat Page** - Full-page dedicated AI consultant interface
3. **Forecast Tool** - ML-powered revenue/order predictions (30/60/90 days)
4. **Social Comments** - Facebook/Instagram comments with sentiment analysis
5. **New Connections** - TikTok Ads & Klaviyo email marketing

---

## Prerequisites
- All 5 new pages are created and routes compiled successfully
- Build passes: `npm run build` (verified ✅)
- Dev server running: `npm run dev`

---

## Known Fixes Applied

### ✅ Fix 1: Custom Dashboard Widget Data Paths (FIXED)
**Issue**: Widget catalog had incorrect data paths for API responses
**Fixed paths**:
- Shopify: `revenue` → `totalRevenue`, `orders` → `totalOrders`, `aov` → `averageOrderValue`, `uniqueCustomers` → `totalCustomers`
- GA4: `totalUsers` → `users`
- Meta/Google Ads: `kpis.spend` → `spend`, `kpis.roas` → `roas`

**How to test**:
1. Navigate to `/dashboard/[slug]/custom`
2. Click "+ Add Widget"
3. Add a Shopify Revenue widget
4. Verify it loads a number (e.g., "₹45.2K") and doesn't show "—" or error

---

## Feature Testing Checklist

### Feature 1: Custom Dashboard (`/dashboard/[slug]/custom`)
- [ ] Page loads without errors
- [ ] Empty state shows "Build your custom dashboard"
- [ ] Click "+ Add your first widget" opens picker
- [ ] Search bar in picker filters by metric/source
- [ ] Can select Shopify, GA4, Meta, Google Ads widgets
- [ ] Widget displays with label, source badge, and value
- [ ] Drag widget to reorder (changes position)
- [ ] Click "X" button on widget removes it
- [ ] Click "Save Layout" persists dashboard to Google Sheets
- [ ] Refresh page: saved widgets reappear in same positions
- [ ] Values update when metrics change

**Expected outcome**: Widgets display real data and layout persists across sessions

---

### Feature 2: AI Chat Page (`/dashboard/[slug]/chat`)
- [ ] Page loads with sidebar + main chat area
- [ ] Left sidebar shows 5 prompt categories (Shopify, Analytics, Ads, CRO, Growth)
- [ ] Click category tab switches prompts shown
- [ ] Click a suggested prompt sends message
- [ ] Type message and press Enter sends it
- [ ] Click → button sends message
- [ ] Assistant response streams in real-time (appears word by word)
- [ ] Message appears in chat bubble (user = right/blue, assistant = left/dark)
- [ ] Typing indicator shows while assistant is responding
- [ ] Can continue conversation (context preserved)
- [ ] "Clear chat" button clears message history
- [ ] Message count shows at bottom ("N messages in this session")

**Expected outcome**: Streaming chat works with context awareness from brand data

**Note**: If GEMINI_API_KEY not set:
- Chat should still load but return error message
- Settings page should show warning about missing key

---

### Feature 3: Forecast (`/dashboard/[slug]/forecast`)
- [ ] Page loads with Shopify connection required
- [ ] Shows 4 KPI cards (Forecast Total, Daily Avg, Growth %, Trend)
- [ ] Chart displays with:
  - Solid line for historical data (last 90 days)
  - Dashed line for forecast
  - Shaded confidence band around forecast
  - Vertical line marking "Today"
- [ ] Horizon toggles (30d, 60d, 90d) update forecast
- [ ] Metric toggles (Revenue, Orders) switch chart data
- [ ] Gemini insight shows 2-3 sentence analysis (if API key set)
- [ ] All numbers formatted correctly (₹, %, x, K/M suffixes)

**Expected outcome**: Forecast chart renders with data and insight loads

---

### Feature 4: Social Comments (`/dashboard/[slug]/social`)
- [ ] Page loads with Meta Ads connection required (error if missing)
- [ ] Shows stats cards: Total, Positive, Neutral, Negative, Facebook, Instagram
- [ ] Sentiment breakdown bar shows colored segments
- [ ] Comments table loads with columns: Platform, Post, Comment, Author, Sentiment, Type, Date
- [ ] Sentiment badges are color-coded (green=positive, gray=neutral, red=negative)
- [ ] Refresh button fetches fresh comments
- [ ] Filter by Platform (All/Facebook/Instagram) works
- [ ] Filter by Sentiment (All/Positive/Neutral/Negative) works
- [ ] Search box filters by comment text or author
- [ ] Comments sorted by date (newest first)

**Expected outcome**: Comments load with sentiment badges

**Note**: Requires Meta Graph API token with page access

---

### Feature 5: New Connections (TikTok & Klaviyo in Settings)
**Location**: `/dashboard/[slug]/settings`

#### TikTok Ads Setup Guide
- [ ] Settings page shows TikTok section
- [ ] Steps displayed:
  1. Go to ads.tiktok.com → "Create app"
  2. Select business account
  3. Enable "Marketing API"
  4. Copy Access Token + Advertiser ID
- [ ] Input fields for: Access Token, Advertiser ID
- [ ] "Test Connection" button verifies credentials
- [ ] On success: "✅ Connected" badge appears
- [ ] Status shown in sidebar: "X/7 platforms connected" updates

#### Klaviyo Email Setup Guide
- [ ] Settings page shows Klaviyo section
- [ ] Steps displayed:
  1. Go to settings.klaviyo.com
  2. → API Keys → "Create Private API Key"
  3. Select "Read-Only" scope
  4. Copy key (starts with `pk_`)
- [ ] Input field for: API Key
- [ ] "Test Connection" button verifies credentials
- [ ] On success: "✅ Connected" badge appears

**Expected outcome**: New platforms can be configured and tested

---

## API Routes Verification

All new API endpoints should return 200 with proper data:

```bash
# Test endpoints with curl (replace {slug} with actual brand slug)

# Forecast
curl "http://localhost:3000/api/forecast?slug={slug}&horizon=30"

# Social Comments
curl "http://localhost:3000/api/social?slug={slug}"

# TikTok
curl "http://localhost:3000/api/tiktok?slug={slug}"

# Klaviyo
curl "http://localhost:3000/api/klaviyo?slug={slug}"

# Chat (requires POST with messages)
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"slug":"{slug}","messages":[{"role":"user","content":"Tell me about my store"}]}'
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Custom dashboard widgets show "—" | Data paths incorrect | ✅ FIXED in commit |
| Custom dashboard data not saving | customDashboard field not persisting | Check PUT /api/brands/[id] |
| Chat page blank | GEMINI_API_KEY not set | Set in .env or per-brand settings |
| Forecast page shows error | Shopify not connected | Connect Shopify in settings |
| Social comments empty | Meta token doesn't have page access | Regenerate token with right permissions |
| TikTok/Klaviyo test fails | Wrong credentials or permissions | Verify tokens in settings page |

---

## Integration Checklist

- [x] All 5 feature pages created in `/dashboard/[slug]/`
- [x] All 4 new API routes created in `/api/`
- [x] Service modules created (social.ts, tiktok.ts, klaviyo.ts)
- [x] Navigation links added to sidebar layout
- [x] BrandData type includes new fields (tiktok*, klaviyo*, pinterest*, customDashboard)
- [x] MaskBrand properly strips new credential fields
- [x] API endpoints (brands/[id]) handle new fields in PUT
- [x] Settings page has setup guides for new connections
- [x] ChatPanel updated to link to dedicated chat page
- [x] Widget data paths corrected for API responses
- [x] Build passes: `npm run build` ✅
- [x] No TypeScript errors

---

## Next Steps for User Testing

1. **Start dev server**: `npm run dev`
2. **Open dashboard**: Navigate to brand dashboard
3. **Follow Feature Testing Checklist** above
4. **Report issues** with:
   - Feature name
   - Page URL
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser console errors (F12 → Console)

---

## Build & Deploy

```bash
# Build (should complete without errors)
npm run build

# Deploy to Amplify
git add .
git commit -m "Release v0.2.0 - 5 new features"
git push origin main
```

---

**Last Updated**: May 6, 2026
**Status**: ✅ Ready for testing
