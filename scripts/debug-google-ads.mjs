// Diagnostic for Google Ads 403 — surfaces what the token can/can't access.
// Usage: node scripts/debug-google-ads.mjs <slug>
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const slug = process.argv[2] || 'hira';
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const brand = await c.db('analytics-dashboard').collection('brands').findOne({ slug });
await c.close();

const devToken = brand.googleAdsDevToken || process.env.GOOGLE_ADS_DEV_TOKEN;
const clientId = brand.googleAdsClientId || process.env.GOOGLE_CLIENT_ID;
const clientSecret = brand.googleAdsClientSecret || process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = brand.googleAdsRefreshToken;
const customerId = brand.googleAdsCustomerId;
const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

console.log('=== CONFIG ===');
console.log(`  devToken:        ${devToken ? devToken.slice(0,6) + '…' + devToken.slice(-4) : 'MISSING'}`);
console.log(`  clientId:        ${clientId ? '✓ set' : 'MISSING'}`);
console.log(`  clientSecret:    ${clientSecret ? '✓ set' : 'MISSING'}`);
console.log(`  refreshToken:    ${refreshToken ? '✓ set' : 'MISSING'}`);
console.log(`  customerId:      ${customerId || 'MISSING'}`);
console.log(`  loginCustomerId: ${loginCustomerId || '(not set)'}`);
console.log();

// 1) Exchange refresh token
console.log('=== STEP 1: refresh OAuth access token ===');
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
});
const tokenJson = await tokenRes.json();
if (!tokenJson.access_token) {
  console.log('  ❌ refresh failed:', tokenJson);
  process.exit(1);
}
console.log('  ✓ got access_token (expires in', tokenJson.expires_in, 's)');
console.log();
const accessToken = tokenJson.access_token;

// 2) List accessible customers — reveals which CIDs THIS user can see
console.log('=== STEP 2: customers:listAccessibleCustomers ===');
const listRes = await fetch('https://googleads.googleapis.com/v21/customers:listAccessibleCustomers', {
  headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken },
});
const listJson = await listRes.json();
if (!listRes.ok) {
  console.log('  ❌', listRes.status, JSON.stringify(listJson, null, 2));
} else {
  console.log('  Resource names accessible to this OAuth user:');
  for (const name of listJson.resourceNames || []) console.log('    ', name);
  if (!(listJson.resourceNames || []).length) console.log('    (empty — user has NO accessible customers)');
}
console.log();

// 3) For each accessible customer, fetch its descriptive name + manager status
console.log('=== STEP 3: introspect each accessible customer ===');
for (const rn of listJson.resourceNames || []) {
  const cid = rn.replace('customers/', '');
  const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken, 'Content-Type': 'application/json' };
  const q = 'SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account, customer.currency_code, customer.time_zone FROM customer';
  const r = await fetch(`https://googleads.googleapis.com/v21/customers/${cid}/googleAds:search`, {
    method: 'POST', headers, body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  if (!r.ok) { console.log(`  ${cid}: ERROR`, j.error?.message?.slice(0,120) || 'unknown'); continue; }
  const c = j.results?.[0]?.customer || {};
  console.log(`  ${cid}: "${c.descriptiveName}" manager=${c.manager} test=${c.testAccount} ${c.currencyCode} ${c.timeZone}`);
}
console.log();

// 4) For MCC managers, list their managed customers
console.log('=== STEP 4: list managed clients of each MCC ===');
for (const rn of listJson.resourceNames || []) {
  const cid = rn.replace('customers/', '');
  const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken, 'Content-Type': 'application/json' };
  const q = `SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.id, customer_client.level, customer_client.manager FROM customer_client WHERE customer_client.level <= 1`;
  const r = await fetch(`https://googleads.googleapis.com/v21/customers/${cid}/googleAds:search`, {
    method: 'POST', headers, body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  if (!r.ok) continue; // skip if not an MCC
  if (!j.results?.length) continue;
  console.log(`  MCC ${cid} manages:`);
  for (const row of j.results) {
    const c = row.customerClient;
    console.log(`    ${c.id} "${c.descriptiveName}" manager=${c.manager} level=${c.level}`);
  }
}
console.log();

// 5) Try the actual customer query with and without login-customer-id
console.log('=== STEP 5: query brand customer with login-customer-id variations ===');
const tryQuery = async (loginCid) => {
  const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': devToken, 'Content-Type': 'application/json' };
  if (loginCid) headers['login-customer-id'] = loginCid;
  const r = await fetch(`https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`, {
    method: 'POST', headers, body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name FROM customer' }),
  });
  const j = await r.json();
  return { ok: r.ok, status: r.status, body: j };
};

const noHdr = await tryQuery(null);
console.log(`  No login-customer-id     →  ${noHdr.status}  ${noHdr.ok ? '✓ ' + (noHdr.body.results?.[0]?.customer?.descriptiveName || '') : noHdr.body.error?.message?.slice(0,120)}`);

for (const rn of listJson.resourceNames || []) {
  const candidate = rn.replace('customers/', '');
  if (candidate === customerId) continue;
  const t = await tryQuery(candidate);
  console.log(`  login-customer-id=${candidate}  →  ${t.status}  ${t.ok ? '✓ ' + (t.body.results?.[0]?.customer?.descriptiveName || '') : t.body.error?.message?.slice(0,120)}`);
}
