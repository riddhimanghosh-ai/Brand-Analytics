// Diagnostic: walk through Meta Graph API for a brand and print what's there
// Usage: node scripts/debug-meta-comments.mjs <slug>
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// Manually parse .env.local
try {
  const env = readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no env file */ }

const slug = process.argv[2] || 'wb';
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const brand = await client.db('analytics-dashboard').collection('brands').findOne({ slug });
await client.close();

if (!brand?.metaAccessToken) { console.error(`No metaAccessToken for ${slug}`); process.exit(1); }
const TOKEN = brand.metaAccessToken;
const V = 'v21.0';

async function g(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  url.searchParams.set('access_token', TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) return { __error: j.error };
  return j;
}

console.log(`\nBrand: ${slug} (${brand.name})`);
console.log(`Ad Account: ${brand.metaAdAccountId}\n`);

console.log('1. /me ...');
const me = await g('me', { fields: 'id,name' });
console.log('  ', me);

console.log('\n2. /me/permissions ...');
const perms = await g('me/permissions');
const granted = (perms.data || []).filter(p => p.status === 'granted').map(p => p.permission);
console.log('  granted:', granted.join(', '));

console.log('\n3. /me/accounts (pages) ...');
const pages = await g('me/accounts', { fields: 'id,name,access_token,tasks,instagram_business_account' });
if (pages.__error) { console.log('  ERROR:', pages.__error.message); process.exit(0); }
const pageList = pages.data || [];
console.log(`  Found ${pageList.length} pages:`);
pageList.forEach(p => console.log(`    - ${p.name} (id=${p.id}) tasks=${(p.tasks||[]).join(',')} IG=${p.instagram_business_account?.id || 'none'}`));

for (const page of pageList.slice(0, 3)) {
  const pageToken = page.access_token || TOKEN;
  console.log(`\n4. Page "${page.name}" — /feed (last 10 posts) ...`);

  async function p(path, params = {}) {
    const url = new URL(`https://graph.facebook.com/${V}/${path}`);
    url.searchParams.set('access_token', pageToken);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const r = await fetch(url);
    return r.json();
  }

  const feed = await p(`${page.id}/feed`, { fields: 'id,message,created_time,comments.summary(true){id}', limit: '10' });
  if (feed.error) { console.log('  feed ERROR:', feed.error.message); continue; }
  const posts = feed.data || [];
  console.log(`  ${posts.length} posts returned`);
  posts.forEach(p => {
    const total = p.comments?.summary?.total_count ?? '?';
    const snippet = (p.message || '[no message]').slice(0, 70).replace(/\n/g, ' ');
    console.log(`    [${p.created_time?.slice(0,10)}] ${total} cmnts · ${snippet}`);
  });

  // Try /posts and /published_posts as well
  console.log(`\n5. Page "${page.name}" — /posts ...`);
  const posts2 = await p(`${page.id}/posts`, { fields: 'id,created_time,comments.summary(true)', limit: '10' });
  console.log(`  count: ${(posts2.data || []).length} ${posts2.error ? '· ERROR ' + posts2.error.message : ''}`);

  console.log(`\n6. Page "${page.name}" — /published_posts ...`);
  const posts3 = await p(`${page.id}/published_posts`, { fields: 'id,created_time,comments.summary(true)', limit: '10' });
  console.log(`  count: ${(posts3.data || []).length} ${posts3.error ? '· ERROR ' + posts3.error.message : ''}`);

  // If any post has comments, fetch sample
  const withCmnts = posts.find(p => p.comments?.summary?.total_count > 0);
  if (withCmnts) {
    console.log(`\n7. Sample comments on post ${withCmnts.id} ...`);
    const c = await p(`${withCmnts.id}/comments`, { fields: 'message,from,created_time', limit: '5' });
    (c.data || []).forEach(x => console.log(`    "${x.message?.slice(0, 80)}" — ${x.from?.name || 'unknown'}`));
  } else if (posts.length > 0) {
    console.log('\n7. No posts have comments. Probing first post directly anyway...');
    const c = await p(`${posts[0].id}/comments`, { fields: 'message,from,created_time', limit: '5' });
    console.log('  ', c.error ? `ERROR: ${c.error.message}` : `${(c.data || []).length} comments`);
  }

  // Tagged posts
  console.log(`\n8. Page "${page.name}" — /tagged ...`);
  const tagged = await p(`${page.id}/tagged`, { fields: 'id,message,created_time', limit: '5' });
  console.log(`  count: ${(tagged.data || []).length} ${tagged.error ? '· ERROR ' + tagged.error.message : ''}`);
}

// Comments from ad creatives
console.log(`\n9. /act_X/ads → comments on creative posts ...`);
const ads = await g(`${brand.metaAdAccountId}/ads`, { fields: 'id,name,creative{effective_object_story_id,object_story_id}', limit: '10' });
if (ads.__error) { console.log('  ERROR:', ads.__error.message); }
else {
  const adRows = ads.data || [];
  console.log(`  ${adRows.length} ads`);
  let hit = 0;
  for (const ad of adRows.slice(0, 5)) {
    const post = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
    if (!post) continue;
    const c = await g(`${post}/comments`, { fields: 'message,from,created_time', limit: '5' });
    const n = c.data?.length ?? 0;
    if (n > 0) hit++;
    console.log(`    Ad "${ad.name?.slice(0,40)}" → post ${post} → ${n} cmnts ${c.__error ? '· ERROR: ' + c.__error.message : ''}`);
    if (n > 0) c.data.slice(0, 2).forEach(x => console.log(`        "${x.message?.slice(0, 80)}" — ${x.from?.name || 'anon'}`));
  }
  console.log(`  ${hit}/${Math.min(5, adRows.length)} sampled ads had comments via creative-post fallback`);
}
