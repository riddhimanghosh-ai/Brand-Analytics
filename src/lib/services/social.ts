/**
 * Social Media Comments Service
 * Fetches comments from Meta (Facebook/Instagram) via Graph API
 */

export interface SocialComment {
  id: string;
  platform: 'Facebook' | 'Instagram';
  postPreview: string;
  postId: string;
  comment: string;
  author: string;
  authorId: string;
  date: string;
  source: 'post_comment' | 'tagged' | 'mention';
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
}

interface MetaConfig {
  accessToken: string;
  adAccountId?: string | null;
}

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/v19.0/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Meta API error ${res.status}`);
  }
  return res.json();
}

export async function getPageComments(config: MetaConfig): Promise<SocialComment[]> {
  const { accessToken } = config;
  const comments: SocialComment[] = [];

  try {
    // Get pages managed by this token — requires pages_show_list permission
    const pagesData: { data?: { id: string; name: string; access_token: string }[] } =
      await metaGet('me/accounts', accessToken, { fields: 'id,name,access_token' }).catch(() => {
        throw new Error('PAGE_ACCESS_REQUIRED');
      });
    const pages: { id: string; name: string; access_token: string }[] = pagesData.data || [];

    if (pages.length === 0) {
      // Token may be a system user token (ads only) — no pages linked.
      throw new Error('PAGE_ACCESS_REQUIRED');
    }

    for (const page of pages.slice(0, 2)) { // Limit to first 2 pages
      const pageToken = page.access_token || accessToken;

      // Fetch recent posts with comments
      try {
        const feedData = await metaGet(`${page.id}/feed`, pageToken, {
          fields: 'id,message,created_time,comments{message,from,created_time,id}',
          limit: '20',
        });

        for (const post of (feedData.data || [])) {
          const postPreview = (post.message || '').slice(0, 60) + ((post.message || '').length > 60 ? '...' : '');
          for (const c of (post.comments?.data || [])) {
            comments.push({
              id: c.id,
              platform: 'Facebook',
              postPreview: postPreview || '[No caption]',
              postId: post.id,
              comment: c.message || '',
              author: c.from?.name || 'Unknown',
              authorId: c.from?.id || '',
              date: c.created_time,
              source: 'post_comment',
            });
          }
        }
      } catch { /* skip this page if no access */ }

      // Tagged posts
      try {
        const taggedData = await metaGet(`${page.id}/tagged`, pageToken, {
          fields: 'id,message,created_time,from',
          limit: '20',
        });

        for (const post of (taggedData.data || [])) {
          comments.push({
            id: `tagged_${post.id}`,
            platform: 'Facebook',
            postPreview: (post.message || '').slice(0, 60) || '[Tagged post]',
            postId: post.id,
            comment: post.message || '',
            author: post.from?.name || 'Unknown',
            authorId: post.from?.id || '',
            date: post.created_time,
            source: 'tagged',
          });
        }
      } catch { /* skip */ }
    }

    // Try Instagram if connected via same token
    try {
      const igData = await metaGet('me/accounts', accessToken, { fields: 'instagram_business_account{id,name}' });
      for (const page of (igData.data || [])) {
        if (!page.instagram_business_account) continue;
        const igId = page.instagram_business_account.id;

        const mediaData = await metaGet(`${igId}/media`, accessToken, {
          fields: 'id,caption,timestamp,comments{text,username,timestamp,id}',
          limit: '20',
        });

        for (const post of (mediaData.data || [])) {
          const preview = (post.caption || '').slice(0, 60) + ((post.caption || '').length > 60 ? '...' : '');
          for (const c of (post.comments?.data || [])) {
            comments.push({
              id: c.id,
              platform: 'Instagram',
              postPreview: preview || '[No caption]',
              postId: post.id,
              comment: c.text || '',
              author: `@${c.username || 'unknown'}`,
              authorId: c.username || '',
              date: c.timestamp,
              source: 'post_comment',
            });
          }
        }

        // Instagram mentions
        try {
          const mentionsData = await metaGet(`${igId}/tags`, accessToken, {
            fields: 'id,caption,timestamp,media_type',
            limit: '20',
          });
          for (const post of (mentionsData.data || [])) {
            comments.push({
              id: `ig_mention_${post.id}`,
              platform: 'Instagram',
              postPreview: (post.caption || '').slice(0, 60) || '[Mention]',
              postId: post.id,
              comment: post.caption || '',
              author: 'Tagged mention',
              authorId: '',
              date: post.timestamp,
              source: 'mention',
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* Instagram not connected */ }

  } catch (err) {
    console.error('Social comments fetch error:', err);
    throw err;
  }

  return comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function analyzeSentiment(
  comments: SocialComment[],
  geminiApiKey: string
): Promise<SocialComment[]> {
  if (!geminiApiKey || comments.length === 0) return comments;

  const BATCH = 15;
  const result = [...comments];

  for (let i = 0; i < result.length; i += BATCH) {
    const batch = result.slice(i, i + BATCH);
    const prompt = `Analyze the sentiment of each comment below. Respond ONLY with a JSON array of objects: [{\"id\":\"...\",\"sentiment\":\"positive|neutral|negative\",\"score\":0.0-1.0}]. Score is confidence 0-1.\n\nComments:\n${batch.map(c => `{"id":"${c.id}","text":${JSON.stringify(c.comment)}}`).join('\n')}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const sentiments: { id: string; sentiment: 'positive' | 'neutral' | 'negative'; score: number }[] = JSON.parse(jsonMatch[0]);
        for (const s of sentiments) {
          const idx = result.findIndex(c => c.id === s.id);
          if (idx !== -1) {
            result[idx].sentiment = s.sentiment;
            result[idx].sentimentScore = s.score;
          }
        }
      }
    } catch { /* skip batch if sentiment fails */ }
  }

  return result;
}
