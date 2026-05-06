/**
 * Google Apps Script for Analytics Dashboard
 *
 * This script provides a REST API backend for brand data with encryption
 * Deploy as: New deployment → Web app → Execute as "Me" → Anyone
 *
 * Endpoints:
 * - POST /brands (create)
 * - GET /brands (list all)
 * - GET /brands?slug=xxx (get one)
 * - PUT /brands?slug=xxx (update)
 * - DELETE /brands?slug=xxx (delete)
 */

// ============================================================================
// CONFIGURATION - CHANGE THESE
// ============================================================================

// Get your Sheet ID from the URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'brands';
const ENCRYPTION_KEY = 'your-secret-encryption-key-32-chars-min';

// ============================================================================
// MAIN HANDLER
// ============================================================================

function doPost(e) {
  try {
    const params = e.parameter;
    const method = params.method || 'POST';
    const slug = params.slug;
    const payload = e.postData.contents ? JSON.parse(e.postData.contents) : {};

    let response;

    if (method === 'POST') {
      response = createBrand(payload);
    } else if (method === 'PUT' && slug) {
      response = updateBrand(slug, payload);
    } else if (method === 'DELETE' && slug) {
      response = deleteBrand(slug);
    } else {
      response = { error: 'Invalid method' };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const params = e.parameter;
    const slug = params.slug;

    let response;

    if (slug) {
      response = getBrand(slug);
    } else {
      response = getAllBrands();
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// BRAND OPERATIONS
// ============================================================================

function getAllBrands() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const brands = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const brand = rowToBrand(rows[i]);
    if (brand) {
      brands.push(brand);
    }
  }

  return brands;
}

function getBrand(slug) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const brand = rowToBrand(rows[i]);
    if (brand && brand.slug === slug) {
      return brand;
    }
  }

  return null;
}

function createBrand(data) {
  const sheet = getSheet();
  const newId = Utilities.getUuid();

  const brandData = {
    id: newId,
    name: data.name || '',
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    logoUrl: data.logoUrl || null,
    shopifyStoreUrl: data.shopifyStoreUrl || null,
    shopifyAccessToken: data.shopifyAccessToken || null,
    ga4PropertyId: data.ga4PropertyId || null,
    ga4ServiceAccountJson: data.ga4ServiceAccountJson || null,
    metaAppId: data.metaAppId || null,
    metaAppSecret: data.metaAppSecret || null,
    metaAccessToken: data.metaAccessToken || null,
    metaAdAccountId: data.metaAdAccountId || null,
    googleAdsDevToken: data.googleAdsDevToken || null,
    googleAdsClientId: data.googleAdsClientId || null,
    googleAdsClientSecret: data.googleAdsClientSecret || null,
    googleAdsRefreshToken: data.googleAdsRefreshToken || null,
    googleAdsCustomerId: data.googleAdsCustomerId || null,
    geminiApiKey: data.geminiApiKey || null,
    tiktokAccessToken: data.tiktokAccessToken || null,
    tiktokAdvertiserId: data.tiktokAdvertiserId || null,
    klaviyoApiKey: data.klaviyoApiKey || null,
    pinterestAccessToken: data.pinterestAccessToken || null,
    pinterestAdAccountId: data.pinterestAdAccountId || null,
    customDashboard: data.customDashboard || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Encrypt sensitive fields
  const encrypted = encryptCredentials(brandData);

  // Add row to sheet
  const row = brandToRow(encrypted);
  sheet.appendRow(row);

  return brandData;
}

function updateBrand(slug, data) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const brand = rowToBrand(rows[i]);
    if (brand && brand.slug === slug) {
      // Merge existing data with updates
      const updated = {
        ...brand,
        ...data,
        id: brand.id, // Keep original ID
        slug: brand.slug, // Keep original slug
        createdAt: brand.createdAt, // Keep original creation date
        updatedAt: new Date().toISOString()
      };

      // Encrypt sensitive fields
      const encrypted = encryptCredentials(updated);
      const row = brandToRow(encrypted);

      // Update the row
      for (let j = 0; j < row.length; j++) {
        sheet.getRange(i + 1, j + 1).setValue(row[j]);
      }

      return updated;
    }
  }

  return { error: 'Brand not found' };
}

function deleteBrand(slug) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const brand = rowToBrand(rows[i]);
    if (brand && brand.slug === slug) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Brand deleted' };
    }
  }

  return { error: 'Brand not found' };
}

// ============================================================================
// ENCRYPTION & DECRYPTION
// ============================================================================

function encryptCredentials(brand) {
  // Create credentials object from sensitive fields
  const credentials = {
    shopifyAccessToken: brand.shopifyAccessToken,
    ga4ServiceAccountJson: brand.ga4ServiceAccountJson,
    metaAppSecret: brand.metaAppSecret,
    metaAccessToken: brand.metaAccessToken,
    googleAdsDevToken: brand.googleAdsDevToken,
    googleAdsClientSecret: brand.googleAdsClientSecret,
    googleAdsRefreshToken: brand.googleAdsRefreshToken,
    geminiApiKey: brand.geminiApiKey,
    tiktokAccessToken: brand.tiktokAccessToken,
    klaviyoApiKey: brand.klaviyoApiKey,
    pinterestAccessToken: brand.pinterestAccessToken
  };

  // Encrypt as Base64
  const credStr = JSON.stringify(credentials);
  const encrypted = Utilities.base64Encode(credStr);

  // Return brand with encrypted credentials
  return {
    ...brand,
    __credentials: encrypted,
    // Clear sensitive fields
    shopifyAccessToken: null,
    ga4ServiceAccountJson: null,
    metaAppSecret: null,
    metaAccessToken: null,
    googleAdsDevToken: null,
    googleAdsClientSecret: null,
    googleAdsRefreshToken: null,
    geminiApiKey: null,
    tiktokAccessToken: null,
    klaviyoApiKey: null,
    pinterestAccessToken: null
  };
}

function decryptCredentials(brand) {
  if (!brand.__credentials) {
    return brand;
  }

  try {
    const credStr = Utilities.base64Decode(brand.__credentials);
    const credentials = JSON.parse(credStr);

    // Restore sensitive fields
    return {
      ...brand,
      ...credentials,
      __credentials: undefined
    };
  } catch (e) {
    return brand;
  }
}

// ============================================================================
// ROW/BRAND CONVERSION
// ============================================================================

function rowToBrand(row) {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  const brand = {
    id: row[0],
    name: row[1],
    slug: row[2],
    logoUrl: row[3] || null,
    shopifyStoreUrl: row[4] || null,
    ga4PropertyId: row[5] || null,
    metaAppId: row[6] || null,
    googleAdsDevToken: row[7] || null,
    geminiApiKey: row[8] || null,
    tiktokAccessToken: row[9] || null,
    tiktokAdvertiserId: row[10] || null,
    klaviyoApiKey: row[11] || null,
    pinterestAccessToken: row[12] || null,
    pinterestAdAccountId: row[13] || null,
    customDashboard: row[14] ? JSON.parse(row[14]) : null,
    __credentials: row[15] || null,
    createdAt: row[16],
    updatedAt: row[17]
  };

  // Decrypt sensitive fields
  return decryptCredentials(brand);
}

function brandToRow(brand) {
  return [
    brand.id,
    brand.name,
    brand.slug,
    brand.logoUrl,
    brand.shopifyStoreUrl,
    brand.ga4PropertyId,
    brand.metaAppId,
    brand.googleAdsDevToken,
    brand.geminiApiKey,
    brand.tiktokAccessToken,
    brand.tiktokAdvertiserId,
    brand.klaviyoApiKey,
    brand.pinterestAccessToken,
    brand.pinterestAdAccountId,
    brand.customDashboard ? JSON.stringify(brand.customDashboard) : null,
    brand.__credentials,
    brand.createdAt,
    brand.updatedAt
  ];
}

// ============================================================================
// SHEET MANAGEMENT
// ============================================================================

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    createHeaders(sheet);
  }

  return sheet;
}

function createHeaders(sheet) {
  const headers = [
    'id',
    'name',
    'slug',
    'logoUrl',
    'shopifyStoreUrl',
    'ga4PropertyId',
    'metaAppId',
    'googleAdsDevToken',
    'geminiApiKey',
    'tiktokAccessToken',
    'tiktokAdvertiserId',
    'klaviyoApiKey',
    'pinterestAccessToken',
    'pinterestAdAccountId',
    'customDashboard',
    '__credentials',
    'createdAt',
    'updatedAt'
  ];

  sheet.appendRow(headers);
}

// ============================================================================
// UTILITY: Test/Debug Function
// ============================================================================

function testScript() {
  Logger.log('Testing Google Apps Script...');

  // Test creating a brand
  const testBrand = {
    name: 'Test Brand',
    slug: 'test-brand',
    shopifyStoreUrl: 'test.myshopify.com',
    shopifyAccessToken: 'shpat_test123'
  };

  const created = createBrand(testBrand);
  Logger.log('Created:', created);

  // Test retrieving all brands
  const all = getAllBrands();
  Logger.log('All brands:', all);

  // Test retrieving one brand
  const one = getBrand('test-brand');
  Logger.log('One brand:', one);
}
