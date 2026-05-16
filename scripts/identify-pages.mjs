// Identify the FB pages whose IDs appear in our ad creatives.
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

const TOKEN = brand.metaAccessToken;
const V = 'v21.0';
const pageIds = ['104728819099017','538400792690141','715557834985188','117083790168305','218169768036830'];

for (const id of pageIds) {
  const r = await fetch(`https://graph.facebook.com/${V}/${id}?fields=name,link,fan_count,verification_status,about,connected_instagram_account&access_token=${TOKEN}`);
  const j = await r.json();
  console.log(`Page ${id}:`, j.error ? `ERROR ${j.error.message}` : `${j.name}${j.fan_count?` (${j.fan_count} fans)`:''}${j.link?` ${j.link}`:''}`);
}

// Also check the brand's own ad account ownership
console.log('\nAd account ownership:');
const aa = await fetch(`https://graph.facebook.com/${V}/${brand.metaAdAccountId}?fields=name,business,owner,users{name,role}&access_token=${TOKEN}`);
const aaj = await aa.json();
console.log(JSON.stringify(aaj, null, 2));

// Check business assigned pages
console.log('\nBusinesses on token:');
const biz = await fetch(`https://graph.facebook.com/${V}/me/businesses?access_token=${TOKEN}`);
console.log(JSON.stringify(await biz.json(), null, 2));
