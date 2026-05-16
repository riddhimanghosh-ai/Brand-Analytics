// Check if Ads Insights gives us comment/reaction counts per ad
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const brand = await c.db('analytics-dashboard').collection('brands').findOne({ slug: 'hira' });
await c.close();

const TOKEN = brand.metaAccessToken;
const V = 'v21.0';

const url = new URL(`https://graph.facebook.com/${V}/${brand.metaAdAccountId}/insights`);
url.searchParams.set('access_token', TOKEN);
url.searchParams.set('date_preset', 'last_30d');
url.searchParams.set('level', 'ad');
url.searchParams.set('fields', 'ad_id,ad_name,actions,impressions,clicks,spend');
url.searchParams.set('limit', '20');
const j = await (await fetch(url)).json();

if (j.error) { console.log('ERROR:', j.error.message); process.exit(1); }

console.log(`Returned ${(j.data || []).length} ads. Showing engagement actions per ad:\n`);
for (const a of (j.data || []).slice(0, 15)) {
  const acts = a.actions || [];
  const get = t => parseInt(acts.find(x => x.action_type === t)?.value ?? '0');
  console.log(`  ${a.ad_name?.slice(0, 50).padEnd(52)} ` +
    `cmnts=${get('comment').toString().padStart(4)} ` +
    `reacts=${get('post_reaction').toString().padStart(5)} ` +
    `shares=${get('post').toString().padStart(4)} ` +
    `saves=${get('onsite_conversion.post_save').toString().padStart(3)}`);
}

// And total at account level
console.log('\nAll action types seen on first ad:');
console.log((j.data?.[0]?.actions || []).map(a => `  ${a.action_type}: ${a.value}`).join('\n'));
