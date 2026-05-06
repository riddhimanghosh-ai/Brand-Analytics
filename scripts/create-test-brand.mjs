#!/usr/bin/env node

/**
 * Create Test Brand Script
 *
 * Creates a sample brand in the local filesystem for testing all 5 new features
 * Usage: node scripts/create-test-brand.mjs
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data/brands');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✅ Created data directory: ${dataDir}`);
}

// Create test brand object
const testBrand = {
  id: randomUUID(),
  name: 'Test Store',
  slug: 'test-store',
  logoUrl: null,

  // Shopify (REQUIRED for many features)
  shopifyStoreUrl: 'test-store.myshopify.com',
  shopifyAccessToken: 'shpat_test_token_12345',

  // Google Analytics 4
  ga4PropertyId: '123456789',
  ga4ServiceAccountJson: null,

  // Meta Ads
  metaAppId: null,
  metaAppSecret: null,
  metaAccessToken: null,
  metaAdAccountId: null,

  // Google Ads
  googleAdsDevToken: null,
  googleAdsClientId: null,
  googleAdsClientSecret: null,
  googleAdsRefreshToken: null,
  googleAdsCustomerId: null,

  // Gemini AI (for chat & forecast insights)
  geminiApiKey: null,

  // TikTok (new connection)
  tiktokAccessToken: null,
  tiktokAdvertiserId: null,

  // Klaviyo (new connection)
  klaviyoApiKey: null,

  // Pinterest (new connection)
  pinterestAccessToken: null,
  pinterestAdAccountId: null,

  // Custom Dashboard (new feature - empty layout to start)
  customDashboard: {
    widgets: [],
    layout: []
  },

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Write brand file
const brandFile = path.join(dataDir, `${testBrand.slug}.json`);

try {
  fs.writeFileSync(brandFile, JSON.stringify(testBrand, null, 2));
  console.log(`\n✅ Test brand created successfully!\n`);
  console.log(`📁 File: ${brandFile}`);
  console.log(`🏷️  Brand: "${testBrand.name}"`);
  console.log(`📍 Slug: ${testBrand.slug}`);
  console.log(`🆔 ID: ${testBrand.id}`);

  console.log(`\n🚀 Next steps:`);
  console.log(`1. Start the dev server: npm run dev`);
  console.log(`2. Open browser: http://localhost:3000`);
  console.log(`3. You should see "Test Store" in the brands list`);
  console.log(`4. Click on it to access all 5 new features:`);
  console.log(`   - /dashboard/test-store/custom (Custom Dashboard)`);
  console.log(`   - /dashboard/test-store/chat (AI Chat)`);
  console.log(`   - /dashboard/test-store/forecast (Forecast Tool)`);
  console.log(`   - /dashboard/test-store/social (Social Comments)`);
  console.log(`   - /dashboard/test-store/settings (New Connections)`);

  console.log(`\n💡 Note: Shopify integration will show mock data since credentials are fake.`);
  console.log(`   To test with real data, update shopifyStoreUrl and shopifyAccessToken in:`);
  console.log(`   ${brandFile}\n`);

} catch (error) {
  console.error('❌ Error creating test brand:', error.message);
  process.exit(1);
}
