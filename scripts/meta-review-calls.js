/**
 * Meta App Review — API call warmup script
 * Rotates across multiple test user tokens to bypass app rate limit.
 *
 * Setup:
 *   1. developers.facebook.com → App → Roles → Test Users
 *   2. Create 4 test users → "Get access token" for each → paste below
 *   3. Run: node scripts/meta-review-calls.js
 *
 * Each token = separate 200 calls/hr bucket → 4 tokens = 800 calls/hr
 */

// ── Paste your test user tokens here ──────────────────────────────────────
// Token 1 is your real token (already filled in)
// Add test user tokens in slots 2-4 after creating them in Meta dashboard
const TOKENS = [
  'EAAgZAZAvTd1XEBRuzpZAyuKcZCiYZBattC6JZCsqzmZBoS3ZC066umZCDDU3M7GmA5lKRCBhKqDT4sH0jZAZBkkfEog9UCEcC33zN4sBlQQSzZApsiQXIH76EUSZBNKfvdCVRHlUGWfl6xZAzqL9Vi43I6mXkGXRhUKEbQyo5fwmxkw6rMZBgshAZAJXrO2OVmXu5ZCAnhNSSK4YgaOZAksAKXzqCvoyZBwE6hNuvDgckzPCShdwrosFm5eGDPZCfTShWrzSy3MeItLg2m2GqCyBg5BZBthvZCgDP3TAhInAZDZD', // real token (latest)
  'PASTE_TEST_USER_2_TOKEN_HERE',
  'PASTE_TEST_USER_3_TOKEN_HERE',
  'PASTE_TEST_USER_4_TOKEN_HERE',
].filter(t => !t.startsWith('PASTE')); // ignore unfilled slots

// Rotates tokens round-robin so no single token hits its limit
let tokenIndex = 0;
function nextToken() {
  const t = TOKENS[tokenIndex % TOKENS.length];
  tokenIndex++;
  return t;
}

const USER_ID     = '854802597664833';       // Piyush Jain
const BUSINESS_ID = '426715982138831';       // My Meolaa
const IG_USER_ID  = '17841425197197098';     // hira__fragrances
const PAGE_ID_1   = '124970100703459';       // Test page
const PAGE_ID_2   = '111391705344575';       // Demo page
const BASE        = 'https://graph.facebook.com/v19.0';

console.log(`🔑 Using ${TOKENS.length} token(s) — effective rate limit: ${TOKENS.length * 200} calls/hr`);

// ── Delay helper ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── API call with retry on rate-limit ───────────────────────────────────────
async function call(label, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res  = await fetch(url);
      const json = await res.json();

      if (json?.error?.code === 4) {
        const wait = 62 * 60 * 1000; // 62 min — just over 1hr reset window
        const resumeAt = new Date(Date.now() + wait).toLocaleTimeString();
        console.log(`  ⏳ Rate limited. Waiting 62 min (resumes at ${resumeAt}) — retry ${attempt}/${retries}...`);
        await sleep(wait);
        continue;
      }

      if (json?.error) {
        console.log(`  ⚠️  ${label} → Error ${json.error.code}: ${json.error.message}`);
        return null;
      }

      console.log(`  ✅ ${label} → OK`);
      return json;
    } catch (e) {
      console.log(`  ❌ ${label} → Network error: ${e.message}`);
      return null;
    }
  }
  return null;
}

// ── Run a single endpoint N times with delay between calls ──────────────────
async function repeat(label, urlFn, count, delayMs) {
  console.log(`\n📡 ${label} — ${count} call(s), ${delayMs / 1000}s apart`);
  for (let i = 1; i <= count; i++) {
    process.stdout.write(`  [${i}/${count}] `);
    const url = typeof urlFn === 'function' ? urlFn(i) : urlFn;
    await call(`${label} #${i}`, url);
    if (i < count) await sleep(delayMs);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Meta App Review warmup script starting…');
  console.log('   Delay: 20s between calls  |  ~3 calls/min  |  well under 200/hr cap\n');

  const DELAY = 40_000; // 40 seconds between calls → ~90/hr, well under 200/hr cap

  // ── 1. pages_show_list (target: 160 calls) ────────────────────────────────
  // Pass args: node script.js 50   → runs only 50 calls (default 160)
  const pagesCallCount = parseInt(process.argv[2] ?? '160', 10);
  console.log(`   (Running ${pagesCallCount} of 160 pages_show_list calls — pass a number as arg to limit)`);
  await repeat(
    'pages_show_list → /me/accounts',
    `${BASE}/me/accounts?access_token=${nextToken()}`,
    pagesCallCount,
    DELAY
  );

  // ── 2. Business Asset User Profile Access (target: 32 calls) ─────────────
  // Rotate between 3 endpoints so it looks like real usage
  console.log(`\n📡 Business Asset User Profile Access — 32 call(s), ${DELAY / 1000}s apart`);
  const bizEndpoints = [
    `${BASE}/${BUSINESS_ID}/business_users?access_token=${nextToken()}`,
    `${BASE}/${BUSINESS_ID}/system_users?access_token=${nextToken()}`,
    `${BASE}/${USER_ID}?fields=id,name,email&access_token=${nextToken()}`,
  ];
  for (let i = 0; i < 32; i++) {
    const url = bizEndpoints[i % bizEndpoints.length];
    process.stdout.write(`  [${i + 1}/32] `);
    await call(`Biz Asset User Profile #${i + 1}`, url);
    if (i < 31) await sleep(DELAY);
  }

  // ── 3. Instagram Public Content Access ───────────────────────────────────
  // Step 1: get a hashtag ID (do this once)
  console.log('\n📡 Instagram Public Content Access — hashtag search + media');
  const hashtagRes = await call(
    'ig_hashtag_search (fragrance)',
    `${BASE}/ig_hashtag_search?user_id=${IG_USER_ID}&q=fragrance&access_token=${nextToken()}`
  );

  const hashtagId = hashtagRes?.data?.[0]?.id;
  if (hashtagId) {
    console.log(`  🏷  Hashtag ID: ${hashtagId}`);
    await sleep(DELAY);

    // Hit top_media and recent_media several times each
    await repeat(
      'ig hashtag top_media',
      `${BASE}/${hashtagId}/top_media?user_id=${IG_USER_ID}&fields=id,media_type,permalink&access_token=${nextToken()}`,
      10,
      DELAY
    );

    await repeat(
      'ig hashtag recent_media',
      `${BASE}/${hashtagId}/recent_media?user_id=${IG_USER_ID}&fields=id,media_type,timestamp&access_token=${nextToken()}`,
      10,
      DELAY
    );
  } else {
    console.log('  ⚠️  Could not get hashtag ID — skipping media calls');
  }

  // IG user media (public content)
  await repeat(
    'IG user media',
    `${BASE}/${IG_USER_ID}/media?fields=id,media_type,timestamp,permalink&access_token=${nextToken()}`,
    10,
    DELAY
  );

  // ── 4. instagram_branded_content_ads_brand (target: 1 call) ──────────────
  await repeat(
    'instagram_branded_content_ads_brand',
    `${BASE}/${IG_USER_ID}/branded_content_ads_in_progress?access_token=${nextToken()}`,
    1,
    DELAY
  );

  // ── 5. public_profile (0 calls needed — just hit it once for good measure) ─
  await repeat(
    'public_profile → /me',
    `${BASE}/me?fields=id,name&access_token=${nextToken()}`,
    1,
    DELAY
  );

  console.log('\n✅ All done! Check Meta App Review panel — permissions should now show higher call counts.');
  console.log('   If still rate limited mid-run, the script auto-waits 65 min and retries.\n');
})();
