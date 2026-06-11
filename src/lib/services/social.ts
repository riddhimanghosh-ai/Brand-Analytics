/**
 * Social inbox service for organic Facebook and Instagram content.
 * Ad-linked comment ingestion lives in meta.ts and reuses the same item shape.
 */

const META_FALLBACK_ACCESS_TOKEN = process.env.META_FALLBACK_ACCESS_TOKEN?.trim() || '';

export type SocialPlatform = 'facebook' | 'instagram';
export type SocialSourceType =
  | 'ad_comment'
  | 'page_comment'
  | 'ig_comment'
  | 'page_tag'
  | 'ig_mention';

export interface SocialInboxItem {
  id: string;
  platform: SocialPlatform;
  sourceType: SocialSourceType;
  contentObjectId: string;
  postPreview: string;
  message: string;
  authorName: string;
  authorPlatformId: string;
  createdAt: string;
  parentCommentId?: string | null;
  adId?: string | null;
  adName?: string | null;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
}

interface MetaConfig {
  accessToken: string;
  adAccountId?: string | null;
  /** If set, use these IG account IDs directly instead of discovering via me/accounts.
   *  Prevents picking up wrong test/demo pages that share the same OAuth token. */
  instagramAccountIds?: string[] | null;
}

interface ManagedPage {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string };
}

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const tokens = [token, META_FALLBACK_ACCESS_TOKEN]
    .filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

  const isRateLimited = (json: { error?: { message?: string; code?: number; error_subcode?: number } }, status: number) => {
    const code = json.error?.code;
    const subcode = json.error?.error_subcode;
    const message = json.error?.message || '';
    return (
      status === 429 ||
      code === 4 ||
      code === 17 ||
      code === 32 ||
      code === 613 ||
      subcode === 2446079 ||
      /rate|limit|too many calls/i.test(message)
    );
  };

  let lastError: Error | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const currentToken = tokens[i];
    const url = new URL(`https://graph.facebook.com/v21.0/${path}`);
    url.searchParams.set('access_token', currentToken);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString());
    const json = await res.json();
    if (!res.ok || json?.error) {
      lastError = new Error(json?.error?.message || `Meta API error ${res.status}`);
      const canRetryWithFallback =
        i === 0 &&
        tokens.length > 1 &&
        currentToken !== META_FALLBACK_ACCESS_TOKEN &&
        isRateLimited(json, res.status);

      if (canRetryWithFallback) {
        console.warn(`[social] Primary token rate-limited on ${path}; retrying with META_FALLBACK_ACCESS_TOKEN.`);
        continue;
      }

      throw lastError;
    }

    if (i > 0 && currentToken === META_FALLBACK_ACCESS_TOKEN) {
      console.warn(`[social] Using META_FALLBACK_ACCESS_TOKEN for ${path}.`);
    }

    return json;
  }

  throw lastError || new Error('Meta API request failed');
}

function preview(text: string | undefined, fallback: string) {
  const value = (text || '').trim();
  if (!value) return fallback;
  return value.length > 60 ? `${value.slice(0, 60)}...` : value;
}

async function getManagedPages(accessToken: string): Promise<ManagedPage[]> {
  try {
    const pagesData = await metaGet('me/accounts', accessToken, {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      limit: '20',
    });
    const pages = (pagesData.data || []) as ManagedPage[];
    if (pages.length === 0) {
      throw new Error('PAGE_ACCESS_REQUIRED');
    }
    return pages;
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'PAGE_ACCESS_REQUIRED') throw error;
    throw new Error('PAGE_ACCESS_REQUIRED');
  }
}

export async function getFacebookPageInbox(config: MetaConfig): Promise<SocialInboxItem[]> {
  const pages = await getManagedPages(config.accessToken);
  const items: SocialInboxItem[] = [];

  for (const page of pages.slice(0, 5)) {
    const pageToken = page.access_token || config.accessToken;

    try {
      const feedData = await metaGet(`${page.id}/feed`, pageToken, {
        fields: 'id,message,comments.limit(50){message,from,created_time,id,parent}',
        limit: '20',
      });

      for (const post of feedData.data || []) {
        for (const comment of post.comments?.data || []) {
          items.push({
            id: comment.id,
            platform: 'facebook',
            sourceType: 'page_comment',
            contentObjectId: post.id,
            postPreview: preview(post.message, '[Facebook post]'),
            message: comment.message || '',
            authorName: comment.from?.name || 'Facebook user',
            authorPlatformId: comment.from?.id || '',
            createdAt: comment.created_time,
            parentCommentId: comment.parent?.id || null,
          });
        }
      }
    } catch {
      // Ignore inaccessible or empty pages.
    }

    try {
      const taggedData = await metaGet(`${page.id}/tagged`, pageToken, {
        fields: 'id,message,created_time,from',
        limit: '20',
      });

      for (const post of taggedData.data || []) {
        items.push({
          id: `page_tag_${post.id}`,
          platform: 'facebook',
          sourceType: 'page_tag',
          contentObjectId: post.id,
          postPreview: preview(post.message, '[Tagged Facebook post]'),
          message: post.message || '',
          authorName: post.from?.name || 'Facebook user',
          authorPlatformId: post.from?.id || '',
          createdAt: post.created_time,
        });
      }
    } catch {
      // Ignore unsupported tagged edge access.
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getInstagramInbox(config: MetaConfig): Promise<SocialInboxItem[]> {
  const items: SocialInboxItem[] = [];

  // Resolve which IG account IDs to query.
  // Priority: explicit override (e.g. stored metaInstagramAccountIds from brand config)
  // → avoids picking up wrong test/demo pages connected to the same OAuth token.
  let igAccountIds: string[];

  if (config.instagramAccountIds && config.instagramAccountIds.length > 0) {
    igAccountIds = config.instagramAccountIds;
  } else {
    // Discover via me/accounts — may return wrong accounts if test pages are connected
    const pages = await getManagedPages(config.accessToken);
    igAccountIds = pages
      .map((p) => p.instagram_business_account?.id)
      .filter((id): id is string => Boolean(id));
  }

  for (const igId of igAccountIds) {
    try {
      const mediaData = await metaGet(`${igId}/media`, config.accessToken, {
        fields: 'id,caption,timestamp,comments.limit(50){id,text,username,timestamp,replies{id,text,username,timestamp}}',
        limit: '20',
      });

      for (const media of mediaData.data || []) {
        for (const comment of media.comments?.data || []) {
          items.push({
            id: comment.id,
            platform: 'instagram',
            sourceType: 'ig_comment',
            contentObjectId: media.id,
            postPreview: preview(media.caption, '[Instagram post]'),
            message: comment.text || '',
            authorName: comment.username ? `@${comment.username}` : '@instagram-user',
            authorPlatformId: comment.username || '',
            createdAt: comment.timestamp,
            parentCommentId: null,
          });

          for (const reply of comment.replies?.data || []) {
            items.push({
              id: reply.id,
              platform: 'instagram',
              sourceType: 'ig_comment',
              contentObjectId: media.id,
              postPreview: preview(media.caption, '[Instagram post]'),
              message: reply.text || '',
              authorName: reply.username ? `@${reply.username}` : '@instagram-user',
              authorPlatformId: reply.username || '',
              createdAt: reply.timestamp,
              parentCommentId: comment.id,
            });
          }
        }
      }
    } catch {
      // Ignore inaccessible media edges.
    }

    try {
      const mentionsData = await metaGet(`${igId}/tags`, config.accessToken, {
        fields: 'id,caption,timestamp,media_type',
        limit: '20',
      });

      for (const media of mentionsData.data || []) {
        items.push({
          id: `ig_mention_${media.id}`,
          platform: 'instagram',
          sourceType: 'ig_mention',
          contentObjectId: media.id,
          postPreview: preview(media.caption, '[Instagram mention]'),
          message: media.caption || '',
          authorName: 'Tagged mention',
          authorPlatformId: '',
          createdAt: media.timestamp,
        });
      }
    } catch {
      // Ignore unsupported mention/tag access.
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

interface SentimentVerdict {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}

function sentimentPrompt(batch: SocialInboxItem[]): string {
  return `Analyze the sentiment of each customer comment below (they may be in English, Hindi, or Hinglish). Respond ONLY with a JSON array of objects: [{"id":"...","sentiment":"positive|neutral|negative","score":0.0-1.0}]. Score is confidence 0-1. Sarcasm and mockery count as negative.\n\nComments:\n${batch.map((item) => `{"id":"${item.id}","text":${JSON.stringify(item.message)}}`).join('\n')}`;
}

function parseVerdicts(text: string): SentimentVerdict[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try { return JSON.parse(jsonMatch[0]); } catch { return []; }
}

async function claudeSentimentBatch(batch: SocialInboxItem[], apiKey: string): Promise<SentimentVerdict[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: sentimentPrompt(batch) }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || 'Claude sentiment error');
  const text = (data?.content ?? []).map((b: { text?: string }) => b.text ?? '').join('');
  return parseVerdicts(text);
}

async function geminiSentimentBatch(batch: SocialInboxItem[], apiKey: string): Promise<SentimentVerdict[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: sentimentPrompt(batch) }] }] }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseVerdicts(text);
}

export async function analyzeSentiment(
  items: SocialInboxItem[],
  keys: { anthropicKey?: string; geminiKey?: string } | string
): Promise<SocialInboxItem[]> {
  // Back-compat: a plain string is treated as a Gemini key
  const { anthropicKey, geminiKey } = typeof keys === 'string'
    ? { anthropicKey: undefined, geminiKey: keys }
    : keys;
  if ((!anthropicKey && !geminiKey) || items.length === 0) return items;

  const batchSize = 25;
  const result = [...items];
  const byId = new Map(result.map((item, i) => [item.id, i]));

  const batches: SocialInboxItem[][] = [];
  for (let i = 0; i < result.length; i += batchSize) {
    batches.push(result.slice(i, i + batchSize));
  }

  await Promise.all(batches.map(async (batch) => {
    let verdicts: SentimentVerdict[] = [];
    if (anthropicKey) {
      try { verdicts = await claudeSentimentBatch(batch, anthropicKey); }
      catch (e) { console.warn('[social] Claude sentiment failed:', (e as Error).message); }
    }
    if (verdicts.length === 0 && geminiKey) {
      try { verdicts = await geminiSentimentBatch(batch, geminiKey); }
      catch (e) { console.warn('[social] Gemini sentiment failed:', (e as Error).message); }
    }
    for (const v of verdicts) {
      const index = byId.get(v.id);
      if (index === undefined) continue;
      result[index].sentiment = v.sentiment;
      result[index].sentimentScore = v.score;
    }
  }));

  return result;
}
