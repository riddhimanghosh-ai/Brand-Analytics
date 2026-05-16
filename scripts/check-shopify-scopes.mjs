// What scopes does the current Shopify access token actually have?
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

const store = brand.shopifyStoreUrl;
const token = brand.shopifyAccessToken;

console.log(`Brand: ${slug} → ${store}`);

// 1) Probe access_scopes (the canonical "what scopes does THIS token have")
const r = await fetch(`https://${store}/admin/oauth/access_scopes.json`, {
  headers: { 'X-Shopify-Access-Token': token },
});
const j = await r.json();
const have = (j.access_scopes || []).map(s => s.handle).sort();
console.log(`\nToken scopes (${have.length}):`);
have.forEach(s => console.log(`  ✓ ${s}`));

const required = ['read_analytics', 'read_reports', 'read_customer_events', 'read_orders', 'read_products', 'read_customers'];
const missing = required.filter(s => !have.includes(s));
console.log(`\nMissing scopes vs declared app config:`);
if (missing.length === 0) console.log('  (none — token has everything)');
else missing.forEach(s => console.log(`  ✗ ${s}`));

// 2) Introspect ShopifyqlTableData to find the correct sub-fields
console.log(`\nIntrospecting ShopifyqlTableData type...`);
const introspect = `{ __type(name: "ShopifyqlTableData") { fields { name type { name kind ofType { name kind } } } } }`;
const ir = await fetch(`https://${store}/admin/api/2025-10/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({ query: introspect }),
});
const ij = await ir.json();
console.log(JSON.stringify(ij.data, null, 2));

// 3) Run a real ShopifyQL query
console.log(`\nProbing FROM sales SHOW total_sales SINCE -30d ...`);
const q2 = `{ shopifyqlQuery(query: "FROM sales SHOW total_sales SINCE -30d") { parseErrors tableData { columns { name dataType displayName } } } }`;
const r2 = await fetch(`https://${store}/admin/api/2025-10/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({ query: q2 }),
});
const j2 = await r2.json();
console.log(JSON.stringify(j2, null, 2).slice(0, 1200));
