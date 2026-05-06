# Brand Analytics Platform - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** May 6, 2026  
**Platform:** Multi-Platform E-Commerce Analytics Dashboard  
**Built with:** Next.js 15, React, TypeScript, MongoDB Atlas, Gemini AI

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Authentication & Security](#authentication--security)
4. [Database Architecture](#database-architecture)
5. [Core Features](#core-features)
6. [Forecasting Algorithm - Deep Dive](#forecasting-algorithm---deep-dive)
7. [API Reference](#api-reference)
8. [Data Models](#data-models)
9. [Integration Points](#integration-points)
10. [Deployment & Configuration](#deployment--configuration)
11. [User Guide](#user-guide)
12. [Planned Features](#planned-features)

---

## System Overview

### Purpose
Brand Analytics is a comprehensive multi-platform e-commerce analytics dashboard that aggregates data from Shopify, Google Analytics 4, Meta Ads, Google Ads, TikTok Ads, Klaviyo, and other platforms into a single unified interface. It enables e-commerce brands to:

- **Monitor Performance** across all marketing channels in real-time
- **Make Data-Driven Decisions** with AI-powered consulting
- **Forecast Revenue** using predictive analytics
- **Optimize Conversions** with CRO tools and metrics
- **Manage Multiple Brands** with a multi-tenant architecture

### Key Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| **Multi-Brand Management** | ✅ Live | Switch between brands seamlessly |
| **Shopify Analytics** | ✅ Live | Orders, revenue, customers, products, funnels |
| **Google Analytics 4** | ✅ Live | Sessions, users, traffic sources, conversions |
| **Meta Ads Dashboard** | ✅ Live | Facebook/Instagram spend, ROAS, CTR, CPM |
| **Google Ads Manager** | ✅ Live | Campaign performance, bidding strategies |
| **TikTok Ads** | ✅ Live | Campaign metrics, spend, conversions, ROAS |
| **Klaviyo Email** | ✅ Live | Campaign performance, subscriber engagement |
| **CRO Optimization** | ✅ Live | Cart abandonment, LTV, RFM segments |
| **Forecasting** | 🔄 Planned | Revenue prediction with confidence bands |
| **AI Consultant** | 🔄 Planned | Chat with AI for brand insights |
| **Custom Dashboard** | 🔄 Planned | Drag-and-drop widget customization |
| **Social Comments** | 🔄 Planned | Facebook/Instagram comment monitoring |

---

## Architecture & Tech Stack

### Frontend Stack
```
Next.js 15 (App Router)
├── React 19
├── TypeScript
├── Recharts (data visualization)
├── CSS-in-JS (inline styles with CSS variables)
└── Client & Server Components
```

### Backend Stack
```
Next.js API Routes
├── Route Handlers (GET, POST, PUT, DELETE)
├── Server-Side Data Fetching
├── Environment-based Configuration
└── Middleware for Auth
```

### Database
```
MongoDB Atlas
├── Cloud-hosted NoSQL database
├── Connection pooling for serverless
├── Single "brands" collection
└── Indexed by slug for fast queries
```

### AI & ML
```
Google Gemini API
├── Streaming text generation
├── Brand context awareness
├── Real-time metric analysis
└── Conversational consulting
```

### Deployment
```
AWS Amplify
├── Serverless hosting
├── Automatic deployments from GitHub
├── Environment variables management
├── Built-in CI/CD
└── Global CDN
```

### External APIs
```
Shopify Admin API v2024-01
Google Analytics Data API v1
Meta Graph API v18.0
Google Ads API v15
TikTok Ads API v1.3
Klaviyo API v2024-02-15
```

---

## Authentication & Security

### Login System

#### Credentials
- **Username:** Riddhiman
- **Password:** BrandAnalytics1234
- **Access Level:** Full admin access to all brands and features

#### Session Management

**Session Cookie Details:**
```typescript
{
  name: 'ba_session',
  value: 'brand-analytics-session-v1',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
}
```

#### Authentication Flow

1. **User** navigates to `/login`
2. **Login Page** displays hero section with features and login form
3. **User** enters username and password
4. **POST /api/auth** validates credentials
5. **If Valid** - Set session cookie and redirect to `/`
6. **If Invalid** - Show error message
7. **Middleware** checks `ba_session` cookie on all protected routes
8. **If Missing** - Redirect to `/login`

#### Protected Routes

All routes except `/login` and `/api/auth` require valid session:
```
✅ Protected: /dashboard/*, /brands/*, /settings/*
❌ Public: /login
❌ Public: /api/auth (POST only)
```

### Data Security

- **Credentials in Database:** Sensitive tokens stored in MongoDB, never exposed to frontend
- **API Masking:** `src/lib/mask-brand.ts` removes credentials before sending to client
- **Environment Variables:** API keys and secrets stored in Amplify, not in codebase
- **HTTPS Only:** All external API calls use HTTPS

---

## Database Architecture

### MongoDB Setup

**Connection String Format:**
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<appName>
```

**Current Configuration:**
```
Database: analytics-dashboard
Collection: brands
Connection Pool: Optimized for serverless/Lambda
Timeouts: 5000ms (server selection, connection, socket)
```

### BrandData Schema

```typescript
interface BrandData {
  // Identity
  id: string;                           // UUID
  name: string;                         // Brand name
  slug: string;                         // URL-safe identifier (indexed)
  logoUrl?: string | null;              // Brand logo
  
  // Shopify
  shopifyStoreUrl?: string | null;      // store.myshopify.com
  shopifyAccessToken?: string | null;   // Admin API token
  
  // Google Analytics 4
  ga4PropertyId?: string | null;        // GA4 property ID
  ga4ServiceAccountJson?: string | null; // Service account JSON
  
  // Meta (Facebook/Instagram)
  metaAppId?: string | null;            // Meta app ID
  metaAppSecret?: string | null;        // Meta app secret
  metaAccessToken?: string | null;      // User access token
  metaAdAccountId?: string | null;      // Ad account ID (act_XXXXXX)
  
  // Google Ads
  googleAdsDevToken?: string | null;    // Developer token
  googleAdsClientId?: string | null;    // OAuth client ID
  googleAdsClientSecret?: string | null; // OAuth client secret
  googleAdsRefreshToken?: string | null; // Refresh token
  googleAdsCustomerId?: string | null;  // Customer ID (XXX-XXX-XXXX)
  
  // TikTok Ads
  tiktokAccessToken?: string | null;    // Access token
  tiktokAdvertiserId?: string | null;   // Advertiser ID
  
  // Klaviyo
  klaviyoApiKey?: string | null;        // Private API key
  
  // Pinterest (future)
  pinterestAccessToken?: string | null; // Access token
  pinterestAdAccountId?: string | null; // Ad account ID
  
  // AI
  geminiApiKey?: string | null;         // Google Gemini API key
  
  // Custom Features
  customDashboard?: string | null;      // Serialized widget layout
  savedMetrics?: Array<{                // Custom ShopifyQL queries
    name: string;
    query: string;
    chartType: string;
  }>;
  
  // Metadata
  createdAt: string;                    // ISO timestamp
  updatedAt: string;                    // ISO timestamp
}
```

### Database Operations

**Create Brand:**
```typescript
await createBrand({
  name: 'Acme Store',
  slug: 'acme-store',
  shopifyStoreUrl: 'acme.myshopify.com',
  shopifyAccessToken: 'shpat_...'
});
```

**Fetch Brand:**
```typescript
const brand = await getBrand('acme-store');
```

**Update Brand:**
```typescript
await updateBrand('acme-store', {
  shopifyAccessToken: 'new_token',
  updatedAt: new Date().toISOString()
});
```

**List All Brands:**
```typescript
const brands = await getBrands();
```

**Delete Brand:**
```typescript
await deleteBrand('acme-store');
```

### Indexes

```javascript
db.brands.createIndex({ slug: 1 })  // Unique lookups
```

---

## Core Features

### 1. Overview Dashboard
**Route:** `/dashboard/[slug]`  
**Component:** Client-side React component

**Displays:**
- Quick stats cards (Total Revenue, Orders, Customers, AOV)
- Revenue trend chart (30-day timeseries)
- Top products table
- Traffic sources breakdown
- Key metrics summary
- Health score (composite metric)

**Data Source:** Aggregated from Shopify, GA4, Meta Ads

---

### 2. Shopify Analytics
**Route:** `/dashboard/[slug]/shopify`  
**Status:** ✅ Live

**KPI Cards:**
- Total Revenue (₹ formatted)
- Total Orders
- Average Order Value (AOV)
- Customer Count
- Repeat Customer Rate
- Gross Margin

**Secondary Metrics:**
- New vs Returning Customers
- Product Return Rate
- Refund Rate
- Conversion Rate

**Tables & Visualizations:**
- Top 20 Products by Revenue
- Revenue by Product Type
- Top Customers by LTV
- Refunds by Reason

**API Endpoint:**
```
GET /api/shopify?slug=acme-store&range=30d
```

**Response:**
```json
{
  "totalRevenue": 145000,
  "totalOrders": 250,
  "totalCustomers": 180,
  "aov": 580,
  "topProducts": [
    {
      "title": "Premium Widget",
      "revenue": 45000,
      "orders": 75,
      "avgPrice": 600
    }
  ],
  "error": null
}
```

---

### 3. Google Analytics 4
**Route:** `/dashboard/[slug]/analytics`  
**Status:** ✅ Live

**KPI Cards:**
- Total Sessions
- Unique Users
- Bounce Rate (%)
- Avg Session Duration (seconds)
- Goal Conversion Rate (%)
- Pages/Session

**Secondary Metrics:**
- Traffic by Device (mobile/desktop/tablet)
- Traffic by Source (organic/direct/referral/paid)
- Landing Pages Performance
- Conversion Funnel

**Visualizations:**
- Sessions trend chart (timeseries)
- Device breakdown pie chart
- Source/Medium table
- Page performance table

**API Endpoint:**
```
GET /api/analytics?slug=acme-store&range=30d
```

**Service Account Setup:**
- Service account must have "Viewer" role in GA4
- Property ID extracted from GA4 Admin
- Service account JSON contains credentials

---

### 4. Meta Ads (Facebook/Instagram)
**Route:** `/dashboard/[slug]/ads` (Tab: Meta)  
**Status:** ✅ Live

**KPI Cards:**
- Ad Spend (₹)
- Impressions
- Clicks
- Click-Through Rate (CTR %)
- Cost Per Click (CPC)
- Return on Ad Spend (ROAS)

**Campaign Breakdown:**
- Campaign name, spend, clicks, conversions, ROAS
- Sortable by performance metrics
- Filter by date range

**API Endpoint:**
```
GET /api/ads?slug=acme-store&platform=meta&range=30d
```

**Requires:**
- Meta App ID & Secret (OAuth)
- Access Token (with ads_read, ads_management scopes)
- Ad Account ID (format: act_XXXXXXXXXX)

---

### 5. Google Ads Manager
**Route:** `/dashboard/[slug]/ads` (Tab: Google)  
**Status:** ✅ Live

**KPI Cards:**
- Total Spend (₹)
- Clicks
- Impressions
- Click-Through Rate (CTR %)
- Cost Per Click (CPC)
- Conversion Rate (%)
- Cost Per Conversion
- Return on Ad Spend (ROAS)

**Campaign Performance:**
- Campaign name, status, spend, impressions, clicks
- Conversion metrics
- Quality score (1-10)

**API Endpoint:**
```
GET /api/ads?slug=acme-store&platform=google&range=30d
```

**Requires:**
- Developer Token
- OAuth Client ID & Secret
- Refresh Token (from OAuth flow)
- Customer ID (format: XXX-XXX-XXXX)

---

### 6. TikTok Ads
**Route:** `/dashboard/[slug]/tiktok`  
**Status:** ✅ Live

**KPI Cards:**
- Total Spend (₹)
- Conversions
- Return on Ad Spend (ROAS)
- Cost Per Mille (CPM)

**Secondary Metrics:**
- Impressions (formatted as K for thousands)
- Clicks
- Click-Through Rate (CTR %)
- Cost Per Click (CPC)

**Campaign Table:**
- Campaign Name
- Spend (₹ formatted)
- Clicks
- Conversions
- ROAS (x multiplier)

**API Endpoint:**
```
GET /api/tiktok?slug=acme-store&range=30d
```

**Data Source:** TikTok Ads API v1.3
- Report Type: BASIC
- Dimensions: advertiser_id, campaign_id, campaign_name
- Metrics: spend, impressions, clicks, conversions, reach, video_play_actions

**Requires:**
- Access Token
- Advertiser ID

---

### 7. Klaviyo Email Marketing
**Route:** `/dashboard/[slug]/klaviyo`  
**Status:** ✅ Live

**KPI Cards:**
- Total Revenue (₹)
- Campaigns Sent (count)
- Active Subscribers (total profiles)
- Active Flows (automations)

**Email Engagement Metrics:**
- Open Rate (%)
- Click Rate (%)
- Bounce Rate (%)
- Unsubscribe Rate (%)

**Campaign Performance Table:**
- Campaign Name
- Recipients Sent
- Open Rate (%)
- Click Rate (%)
- Revenue Generated (₹)
- Campaign Status

**API Endpoint:**
```
GET /api/klaviyo?slug=acme-store
```

**Data Source:** Klaviyo API v2024-02-15
- Profiles endpoint for subscriber count
- Campaigns endpoint for sent campaigns
- Flows endpoint for active automation workflows
- Metrics endpoint for engagement rates

**Requires:**
- Private API Key (from Klaviyo Account)

---

### 8. CRO Optimization
**Route:** `/dashboard/[slug]/cro`  
**Status:** ✅ Live

**Core Metrics:**
- Cart Abandonment Rate (%)
- Checkout Conversion Rate (%)
- Customer Lifetime Value (LTV) (₹)
- Revenue Per Session (₹)
- Product Return Rate (%)
- Add-to-Cart Rate (%)

**Segmentation Analysis:**
- Revenue per customer cohort
- Repeat purchase frequency
- Customer LTV by acquisition source

**RFM Segmentation:**
- **Recency:** Days since last purchase
- **Frequency:** Purchase count in period
- **Monetary:** Total lifetime spend

**Segments Generated:**
- 🌟 Champions (recent, frequent, high-value)
- 👑 Loyal Customers (frequent repeat buyers)
- ⚠️ At Risk (haven't purchased recently)
- 💔 Lost Customers (inactive, high-value)

**Benchmarks:** Industry standards for each metric

---

### 9. Social Comments (Planned)
**Route:** `/dashboard/[slug]/social`  
**Status:** 🔄 Planned

**Features:**
- Monitor Facebook & Instagram comments on brand posts
- Real-time comment aggregation
- Automatic sentiment analysis via Gemini AI
- Comment filtering by sentiment (positive/neutral/negative)
- Engagement metrics dashboard

**Sentiment Classification:**
```json
{
  "comment": "Love this product!",
  "sentiment": "positive",
  "score": 0.92,
  "platform": "facebook",
  "author": "John Smith",
  "timestamp": "2024-05-06T10:30:00Z"
}
```

**API Endpoint (Planned):**
```
GET /api/social?slug=acme-store&sentiment=all&range=30d
```

---

### 10. Custom Metrics Builder
**Route:** `/dashboard/[slug]/metrics`  
**Status:** 🔄 Planned

**Features:**
- Write custom ShopifyQL queries
- Execute queries against Shopify
- Choose visualization type (line, bar, area, table)
- Save queries for future use
- Pre-built metric templates

**ShopifyQL Example:**
```sql
FROM sales SHOW gross_sales, orders, customers
GROUPED BY product_title
SINCE startOfDay(-30d) UNTIL today
ORDER BY gross_sales DESC
LIMIT 20
```

**Chart Types:**
- Line Chart (timeseries)
- Bar Chart (categorical)
- Area Chart (stacked)
- Pie Chart (distribution)
- Table (raw data)

---

### 11. Forecasting Tool (Planned)
**Route:** `/dashboard/[slug]/forecast`  
**Status:** 🔄 Planned

See [Forecasting Algorithm - Deep Dive](#forecasting-algorithm---deep-dive) section below.

---

### 12. AI Consultant (Planned)
**Route:** `/dashboard/[slug]/chat`  
**Status:** 🔄 Planned
**Also available:** Floater icon on every page

**Features:**
- Real-time chat interface
- Access to all brand data & metrics
- AI-powered insights using Google Gemini
- Streaming text responses
- Context-aware questions & answers
- Prompt suggestions by category

**Prompt Categories:**
- 📦 Shopify (orders, products, revenue)
- 📊 Analytics (traffic, sessions, behavior)
- 💰 Ads (spend, ROAS, campaign performance)
- 🎯 CRO (conversion optimization, funnels)
- 📈 Forecast (revenue predictions, trends)

**Example Interaction:**
```
User: "Which product had the highest ROAS last week?"
AI: [Fetches product data from Shopify]
     [Fetches ad performance data from Meta/Google]
     "Your Premium Widget generated ₹2.50 ROAS last week..."
```

---

### 13. Custom Dashboard (Planned)
**Route:** `/dashboard/[slug]/custom`  
**Status:** 🔄 Planned

**Features:**
- Drag-and-drop widget grid
- Widget picker modal
- Save layout to database
- Responsive grid layout (uses react-grid-layout)
- Widget types: KPI, Chart, Table, AI Insight

**Widget Catalog:**
- Shopify: Revenue, Orders, Customers, AOV
- GA4: Sessions, Users, Bounce Rate
- Meta Ads: Spend, ROAS, CPM
- Google Ads: Spend, Conversions, CPC
- TikTok: Spend, Conversions, ROAS
- Klaviyo: Open Rate, Click Rate, Revenue

**Widget Persistence:**
```json
{
  "customDashboard": [
    {
      "id": "widget_1",
      "source": "shopify",
      "metric": "revenue",
      "label": "Total Revenue",
      "chartType": "number",
      "x": 0,
      "y": 0,
      "w": 2,
      "h": 1
    }
  ]
}
```

---

## Forecasting Algorithm - Deep Dive

### Overview

The forecasting tool predicts future revenue and order trends using a lightweight, interpretable statistical model. It combines historical trend analysis with seasonality patterns for accurate 30/60/90-day projections.

### Algorithm Components

#### 1. Data Collection Phase

**Input Data:**
- Last 90 days of daily Shopify revenue
- Last 90 days of daily order count
- Timestamp for each data point

**Data Validation:**
```typescript
// Remove outliers and ensure completeness
const validData = rawData.filter(d => {
  return d.revenue > 0 && d.orders > 0 && d.date;
});

if (validData.length < 30) {
  throw new Error('Insufficient data for forecasting');
}
```

#### 2. Baseline Smoothing (7-Day Moving Average)

**Purpose:** Remove short-term volatility and identify underlying trend

**Calculation:**
```typescript
function movingAverage(data: number[], windowSize: number): number[] {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b) / window.length;
    result.push(avg);
  }
  return result;
}

const smoothedRevenue = movingAverage(rawRevenue, 7);
const smoothedOrders = movingAverage(rawOrders, 7);
```

**Example:**
```
Raw:      [100, 120, 95, 110, 105, 125, 130, ...]
MA(7):    [100, 110, 108.5, 110.8, 112.1, 115.3, 118.6, ...]
```

#### 3. Trend Analysis (Linear Regression)

**Purpose:** Identify direction and slope of long-term trend

**Method:** Least Squares Linear Regression
```
y = mx + b

where:
  m = trend slope (revenue change per day)
  b = y-intercept
  x = day number
  y = smoothed revenue value
```

**Calculation:**
```typescript
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

const { slope, intercept } = linearRegression(days, smoothedRevenue);
```

**Example:**
```
Last 90 days: Slope = ₹425/day (growing by ₹425 per day)
Intercept = ₹95,000 (baseline)
Trend: y = 425x + 95000
```

#### 4. Seasonality Factors

**Purpose:** Account for recurring day-of-week patterns

**Method:** Calculate average performance for each day of week

```typescript
function calculateSeasonality(
  dates: Date[],
  values: number[],
  smoothedValues: number[]
): Record<number, number> {
  const seasonality: Record<number, number[]> = {};
  
  // Group by day of week (0 = Sunday, 6 = Saturday)
  for (let i = 0; i < dates.length; i++) {
    const dow = dates[i].getDay();
    if (!seasonality[dow]) seasonality[dow] = [];
    seasonality[dow].push(smoothedValues[i]);
  }

  // Calculate average for each day
  const factors: Record<number, number> = {};
  const overallAvg = smoothedValues.reduce((a, b) => a + b) / smoothedValues.length;
  
  for (const [dow, values] of Object.entries(seasonality)) {
    const dayAvg = values.reduce((a, b) => a + b) / values.length;
    factors[Number(dow)] = dayAvg / overallAvg; // 0.95 = 5% below average, 1.10 = 10% above
  }

  return factors;
}
```

**Example:**
```
Monday:    1.12 (12% above average)
Tuesday:   1.08 (8% above average)
Wednesday: 0.95 (5% below average)
Thursday:  1.05 (5% above average)
Friday:    1.15 (15% above average) ← Shopping spike
Saturday:  0.98 (2% below average)
Sunday:    0.85 (15% below average) ← Weekend dip
```

#### 5. Prediction Generation

**For Each Future Day:**

```typescript
function generateForecast(
  lastDate: Date,
  trendSlope: number,
  trendIntercept: number,
  seasonalityFactors: Record<number, number>,
  forecastDays: number
): ForecastPoint[] {
  const predictions: ForecastPoint[] = [];
  
  for (let i = 1; i <= forecastDays; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    // Linear trend component
    const daysSinceStart = i + 90; // 90 days of historical data
    const trendValue = trendSlope * daysSinceStart + trendIntercept;
    
    // Apply seasonality
    const dow = futureDate.getDay();
    const seasonalityFactor = seasonalityFactors[dow] || 1.0;
    
    // Base prediction
    const predicted = trendValue * seasonalityFactor;
    
    // Confidence band (widens further out)
    const stdDev = calculateHistoricalStdDev();
    const confidenceMargin = stdDev * (1 + i / forecastDays); // Wider band for distant future
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predicted: Math.max(0, predicted), // No negative predictions
      lower: Math.max(0, predicted - confidenceMargin),
      upper: predicted + confidenceMargin
    });
  }

  return predictions;
}
```

**Example Output (30-day forecast starting May 7):**
```json
{
  "forecast": [
    {
      "date": "2026-05-07",
      "predicted": 125400,
      "lower": 115200,
      "upper": 135600
    },
    {
      "date": "2026-05-08",
      "predicted": 128900,
      "lower": 117800,
      "upper": 140000
    },
    ...
  ]
}
```

### 6. Confidence Bands Explanation

**What They Mean:**
- **Predicted Line:** Best estimate of revenue
- **Shaded Area (Lower-Upper):** 68% confidence interval
  - There's a 68% chance the actual value falls in this range
  - Similar to 1 standard deviation in statistics

**Why They Widen:**
- **Near-term (7 days):** Narrow bands = high confidence
- **Mid-term (30 days):** Medium bands = moderate confidence
- **Long-term (90 days):** Wide bands = lower confidence

**Formula:**
```
Confidence Margin = σ * (1 + days_ahead / total_forecast_days)
```

Example:
- Day 5: Margin = ₹5,000 × 1.17 = ₹5,850
- Day 15: Margin = ₹5,000 × 1.50 = ₹7,500
- Day 30: Margin = ₹5,000 × 2.00 = ₹10,000

### 7. Visualization

**Chart Type:** Line Chart with ReferenceArea
```jsx
<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  
  {/* Historical data - solid line */}
  <Line
    dataKey="actualRevenue"
    stroke="#3b82f6"
    name="Actual Revenue"
    isAnimationActive={true}
  />
  
  {/* Forecast - dashed line */}
  <Line
    dataKey="predicted"
    stroke="#8b5cf6"
    strokeDasharray="5 5"
    name="Predicted Revenue"
  />
  
  {/* Confidence band - shaded area */}
  <ReferenceArea
    x1={lastHistoricalDate}
    x2={endForecastDate}
    fill="rgba(139, 92, 246, 0.1)"
    name="Confidence Band"
  />
  
  <Tooltip />
  <Legend />
</LineChart>
```

### 8. API Endpoint

**Request:**
```
GET /api/forecast?slug=acme-store&horizon=30d

Parameters:
  slug: string (brand slug)
  horizon: '30d' | '60d' | '90d' (forecast length)
```

**Response:**
```json
{
  "status": "success",
  "historicalRange": {
    "startDate": "2026-02-06",
    "endDate": "2026-05-06",
    "dataPoints": 90
  },
  "trend": {
    "slope": 425.50,
    "direction": "upward",
    "message": "Revenue growing at ₹425.50 per day"
  },
  "seasonality": {
    "monday": 1.12,
    "tuesday": 1.08,
    "wednesday": 0.95,
    "thursday": 1.05,
    "friday": 1.15,
    "saturday": 0.98,
    "sunday": 0.85
  },
  "forecast": [
    {
      "date": "2026-05-07",
      "predicted": 125400,
      "lower": 115200,
      "upper": 135600,
      "dow": "Wednesday"
    },
    // ... 29 more days
  ],
  "summary": {
    "averagePredicted": 128500,
    "totalPredicted": 3855000,
    "trend": "upward",
    "volatility": "moderate",
    "recommendation": "Inventory should support ₹135K daily peak"
  }
}
```

### 9. Advantages & Limitations

**✅ Advantages:**
- **Lightweight:** No heavy ML libraries or GPU required
- **Fast:** Real-time predictions on serverless backend
- **Interpretable:** Easy to explain to non-technical users
- **No External Calls:** Pure server-side computation
- **Adaptive:** Seasonality factors update as new data arrives

**❌ Limitations:**
- **Linear Trend:** Assumes constant growth/decline (real trends often curve)
- **No External Factors:** Ignores marketing campaigns, holidays, external events
- **Limited History:** Less accurate with < 30 days data
- **Anomalies:** Major outliers can skew trend line
- **Weekly Seasonality Only:** Ignores monthly/seasonal patterns

**When It Works Best:**
- Established brands with stable growth
- 3-12 month forecast horizons
- Products with consistent demand

**When It Struggles:**
- New products with < 3 months data
- Highly volatile/seasonal items
- Right after major marketing campaigns
- Rapid growth scaling (exponential trends)

---

## API Reference

### Authentication
All API endpoints require valid session cookie `ba_session`.

### Endpoints

#### Brand Management

**GET /api/brands**
```
List all brands
Response: { brands: BrandData[] }
```

**GET /api/brands?slug=acme-store**
```
Get single brand by slug
Response: BrandData (credentials masked)
```

**POST /api/brands**
```
Create new brand
Body: { name, slug, shopifyStoreUrl, ... }
Response: { success: true, brand: BrandData }
```

**PUT /api/brands/[slug]**
```
Update brand
Body: Partial BrandData update
Response: { success: true, brand: BrandData }
```

**DELETE /api/brands/[slug]**
```
Delete brand
Response: { success: true }
```

#### Analytics Data

**GET /api/shopify?slug=acme-store&range=30d**
```
Shopify metrics
Response: { totalRevenue, orders, products, ... }
```

**GET /api/analytics?slug=acme-store&range=30d**
```
Google Analytics 4 metrics
Response: { sessions, users, bounceRate, ... }
```

**GET /api/ads?slug=acme-store&platform=meta&range=30d**
```
Meta Ads metrics
Response: { spend, impressions, clicks, campaigns, ... }
```

**GET /api/tiktok?slug=acme-store&range=30d**
```
TikTok Ads metrics
Response: { kpis: { spend, conversions, ... }, campaigns: [] }
```

**GET /api/klaviyo?slug=acme-store**
```
Klaviyo metrics
Response: { kpis: { totalRevenue, openRate, ... }, campaigns: [] }
```

#### Forecasting (Planned)

**GET /api/forecast?slug=acme-store&horizon=30d**
```
Revenue forecast
Response: { forecast: [], trend, seasonality, summary }
```

#### AI Chat (Planned)

**POST /api/chat**
```
Chat with Gemini AI
Body: { slug, message, history: [] }
Response: (streaming) text/event-stream
```

#### Authentication

**POST /api/auth**
```
Login
Body: { username, password }
Response: { success: true } (sets cookie)

Logout
Body: { action: 'logout' }
Response: { success: true } (clears cookie)
```

---

## Data Models

### Response Models

#### KPI Card Data
```typescript
interface KPICard {
  label: string;        // "Total Revenue"
  value: string | number;
  color: string;        // Hex color
  trend?: number;       // % change
  benchmark?: number;   // Industry average
}
```

#### Campaign Data
```typescript
interface Campaign {
  id: string;
  name: string;
  status: string;       // "ACTIVE" | "PAUSED" | "ENDED"
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpc: number;
  ctr: number;
  [key: string]: any;
}
```

#### Forecast Point
```typescript
interface ForecastPoint {
  date: string;         // ISO date
  predicted: number;    // Base prediction
  lower: number;        // Confidence band lower
  upper: number;        // Confidence band upper
  dow?: string;         // Day of week
}
```

#### Chat Message
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    metricsQueried?: string[];
  };
}
```

---

## Integration Points

### External API Calls

#### Shopify
```typescript
// Query structure
const query = `{
  shop {
    name
  }
  orders(first: 100) {
    edges {
      node {
        id
        totalPrice
        lineItems { ... }
      }
    }
  }
}`;

// Called via: /api/shopify
// Frequency: Real-time on dashboard load
// Timeout: 30 seconds
```

#### Google Analytics 4
```typescript
// Query: Run report with dimensions & metrics
POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
{
  "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
  "dimensions": [{"name": "date"}],
  "metrics": [{"name": "sessions"}, {"name": "users"}]
}

// Called via: /api/analytics
// Frequency: Real-time on dashboard load
// Timeout: 30 seconds
```

#### Meta Graph API
```typescript
// Endpoint: GET /{page-id}/insights
GET https://graph.instagram.com/v18.0/{ad_account_id}/insights
?fields=spend,impressions,clicks,actions
&date_preset=last_30d
&access_token={token}

// Called via: /api/ads
// Frequency: Real-time on dashboard load
// Timeout: 30 seconds
```

#### TikTok Business API
```typescript
// Endpoint: /report/integrated/get/
GET https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/
?advertiser_id={id}
&report_type=BASIC
&dimensions=["campaign_id"]
&metrics=["spend", "conversions"]

// Called via: /api/tiktok
// Frequency: Real-time on dashboard load
// Timeout: 30 seconds
```

#### Klaviyo API
```typescript
// Endpoints:
GET https://a.klaviyo.com/api/profiles
GET https://a.klaviyo.com/api/campaigns
GET https://a.klaviyo.com/api/flows

// Headers: Authorization: Klaviyo-API-Key {key}
// Called via: /api/klaviyo
// Frequency: Real-time on dashboard load
// Timeout: 30 seconds
```

#### Google Gemini AI
```typescript
// Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent
{
  "contents": [{
    "parts": [{
      "text": "Based on this Shopify data {...}, what products should I focus on?"
    }]
  }]
}

// Called via: /api/chat
// Frequency: On-demand when user sends message
// Timeout: 60 seconds (streaming)
// Rate limit: 100 requests/minute
```

---

## Deployment & Configuration

### Environment Variables

**.env.local (Development)**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics-dashboard?appName=...
NEXT_PUBLIC_API_URL=http://localhost:3000
GEMINI_API_KEY=AIza...
GITHUB_TOKEN=ghp_...
GITHUB_REPO=riddhimanghosh-ai/Brand-Analytics
GITHUB_BRANCH=main
```

**Amplify Environment Variables (Production)**
```
MONGODB_URI=mongodb+srv://[encrypted]
ENCRYPTION_KEY=[encrypted]
GEMINI_API_KEY=[encrypted]
GITHUB_TOKEN=[encrypted]
GITHUB_REPO=riddhimanghosh-ai/Brand-Analytics
GITHUB_BRANCH=main
```

### Amplify Configuration

**amplify.yml**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### MongoDB Atlas Setup

**Network Access:**
- Allow connections from: 0.0.0.0/0 (or Amplify IP ranges)
- Protocol: MongoDB+SRV

**Database Users:**
- Username: Riddhiman
- Password: [secure password]
- Database: analytics-dashboard
- Collections: brands (with slug index)

### GitHub Configuration

**Branch Deployment:**
- Main branch → Production (Amplify)
- Auto-deploy on push

**Required Secrets:**
- MONGODB_URI
- GEMINI_API_KEY
- GITHUB_TOKEN (for commits)

---

## User Guide

### Getting Started

#### 1. Login
1. Navigate to https://main.d1rrlzi8cyg90j.amplifyapp.com/
2. Username: `Riddhiman`
3. Password: `BrandAnalytics1234`
4. Click "Sign In"

#### 2. Create First Brand
1. Click "Create New Brand"
2. Enter brand name (e.g., "Acme Store")
3. Enter Shopify store URL
4. Paste Shopify Admin API access token
5. Click "Connect"

#### 3. Connect Platforms
1. Go to Settings → Connections
2. Follow setup guides for each platform
3. Test connection
4. Save credentials

#### 4. View Analytics
1. Select brand from dropdown
2. Choose analytics page (Shopify, GA4, Ads, etc.)
3. View real-time metrics and charts
4. Adjust date range with dropdown

### Navigation Structure

```
Home (All Brands)
└── Select Brand
    ├── Dashboard / Overview
    │   ├── 📊 Overview (summary)
    │   ├── 🛒 Shopify (ecommerce metrics)
    │   ├── 📈 Google Analytics (traffic)
    │   ├── 🎯 Ads Manager (Meta + Google)
    │   ├── 🎵 TikTok Ads (TikTok campaigns)
    │   ├── 📧 Email Marketing (Klaviyo)
    │   ├── 🎯 CRO Optimization (conversions)
    │   ├── 📐 Custom Metrics (ShopifyQL)
    │   ├── 📉 Forecast (revenue prediction) [Planned]
    │   ├── 💬 Social Comments (engagement) [Planned]
    │   ├── 🎛️ My Dashboard (custom layout) [Planned]
    │   └── 🤖 AI Consultant (chat) [Planned]
    │
    └── Settings
        ├── ⚙️ Connections (setup guides)
        └── ↩️ All Brands (back to home)
```

### Tips & Best Practices

**For Accurate Forecasts:**
- Ensure you have at least 30 days of historical data
- Forecasts are most accurate within 30 days
- Review confidence bands - wider = less certain

**For CRO Optimization:**
- Compare metrics to benchmarks
- Focus on products with declining ROAS
- Use RFM segmentation to identify at-risk customers

**For AI Consulting:**
- Ask specific questions about your metrics
- Provide context (season, campaigns, changes)
- Chat history helps AI provide better insights

**For Custom Metrics:**
- Test queries on small date ranges first
- Save useful queries for future reference
- Use templates as starting points

---

## Planned Features

### Immediate (Next 2 weeks)

1. **Forecasting Tool** - Revenue prediction with ML
2. **AI Consultant** - Chat interface with brand insights
3. **Social Comments** - Comment monitoring & sentiment
4. **Custom Dashboard** - Drag-and-drop widgets

### Near-term (Month 2-3)

1. **Inventory Forecasting** - Predict stock needs
2. **Cohort Analysis** - Track customer behavior groups
3. **Attribution Modeling** - Multi-touch attribution
4. **Scheduled Reports** - Daily/weekly email reports

### Medium-term (Month 4-6)

1. **Slack Integration** - Daily metrics summaries
2. **Mobile App** - React Native companion
3. **Advanced AI** - Anomaly detection alerts
4. **API Access** - Developer API for custom apps

### Long-term (6+ months)

1. **Marketplace** - Third-party integrations
2. **Team Collaboration** - Multi-user accounts
3. **Custom Reports** - White-label dashboards
4. **Machine Learning** - Predictive recommendations

---

## Troubleshooting

### MongoDB Connection Issues
```
Error: "MONGODB_URI environment variable is not set"
Fix: Add MONGODB_URI to Amplify environment variables
```

### Brand Data Not Loading
```
Error: "Brand not found"
Fix: Verify slug is correct, check MongoDB connection
```

### API Timeouts
```
Error: "Failed to fetch [platform] data"
Fix: Check API credentials, verify rate limits not exceeded
```

### Gemini API Errors
```
Error: "API_KEY_INVALID"
Fix: Verify GEMINI_API_KEY in Amplify env vars
```

---

## Support & Contact

**Issues:** Report bugs via GitHub Issues  
**Questions:** Contact bhavya.joshi@devxlabs.ai  
**Documentation:** See this file  

---

**Document Version:** 1.0.0  
**Last Updated:** May 6, 2026  
**Status:** ✅ Complete & Production Ready
