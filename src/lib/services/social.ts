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
  const pages = await getManagedPages(config.accessToken);
  const items: SocialInboxItem[] = [];

  for (const page of pages.slice(0, 5)) {
    const igId = page.instagram_business_account?.id;
    if (!igId) continue;

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

export async function analyzeSentiment(
  items: SocialInboxItem[],
  geminiApiKey: string
): Promise<SocialInboxItem[]> {
  if (!geminiApiKey || items.length === 0) return items;

  const batchSize = 15;
  const result = [...items];

  for (let i = 0; i < result.length; i += batchSize) {
    const batch = result.slice(i, i + batchSize);
    const prompt = `Analyze the sentiment of each comment below. Respond ONLY with a JSON array of objects: [{"id":"...","sentiment":"positive|neutral|negative","score":0.0-1.0}]. Score is confidence 0-1.\n\nComments:\n${batch.map((item) => `{"id":"${item.id}","text":${JSON.stringify(item.message)}}`).join('\n')}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const sentiments: Array<{
        id: string;
        sentiment: 'positive' | 'neutral' | 'negative';
        score: number;
      }> = JSON.parse(jsonMatch[0]);

      for (const sentiment of sentiments) {
        const index = result.findIndex((item) => item.id === sentiment.id);
        if (index === -1) continue;
        result[index].sentiment = sentiment.sentiment;
        result[index].sentimentScore = sentiment.score;
      }
    } catch {
      // Leave batch without sentiment if Gemini fails.
    }
  }

  return result;
}
