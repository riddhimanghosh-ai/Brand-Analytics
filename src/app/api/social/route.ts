import { getBrand } from '@/lib/mongodb-store';
import { analyzeSentiment, getFacebookPageInbox, getInstagramInbox, type SocialInboxItem } from '@/lib/services/social';
import { getAdCommentAnalytics, getPermissions, getPageCoverage, getAdEngagement, probeReviewPermissions } from '@/lib/services/meta';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { demoSocialComments, demoSocialStats } from '@/lib/demo-data';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const withSentiment = searchParams.get('sentiment') !== 'false';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const range = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') || '30d');

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    if (slug === 'demo') {
      return NextResponse.json({ comments: demoSocialComments, stats: demoSocialStats });
    }

    if (!brand.metaAccessToken) {
      return NextResponse.json({
        error: 'Meta Ads not connected. Add your Meta Access Token in Settings.',
        permissions: null,
        source: null,
      }, { status: 400 });
    }

    const config = {
      accessToken: brand.metaAccessToken,
      adAccountId: brand.metaAdAccountId ?? null,
    };

    const permissions = await getPermissions(brand.metaAccessToken).catch(() => null);
    const coverage = brand.metaAdAccountId
      ? await getPageCoverage({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }).catch(() => null)
      : null;
    const engagement = brand.metaAdAccountId
      ? await getAdEngagement({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }, range).catch(() => null)
      : null;
    const probeReview = searchParams.get('probe') === '1';
    const probe = probeReview && brand.metaAdAccountId
      ? await probeReviewPermissions({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }).catch(() => null)
      : null;

    const warnings: string[] = [];
    const adAnalytics = brand.metaAdAccountId
      ? await getAdCommentAnalytics({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }, range).catch((error) => {
          warnings.push(`Ad comments unavailable: ${(error as Error).message}`);
          return null;
        })
      : null;

    let comments: SocialInboxItem[] = adAnalytics?.comments ?? [];
    let pageAccessError: string | null = null;

    try {
      comments = comments.concat(await getFacebookPageInbox(config));
    } catch (error) {
      if ((error as Error).message === 'PAGE_ACCESS_REQUIRED') {
        pageAccessError = 'Your Meta connection has ad-account access but not Page access. Re-authorize with pages_show_list + pages_read_engagement, and make sure this user is added to the Pages your ads run from.';
      } else {
        warnings.push(`Facebook Page inbox unavailable: ${(error as Error).message}`);
      }
    }

    try {
      comments = comments.concat(await getInstagramInbox(config));
    } catch (error) {
      if ((error as Error).message !== 'PAGE_ACCESS_REQUIRED') {
        warnings.push(`Instagram inbox unavailable: ${(error as Error).message}`);
      }
    }

    const deduped = new Map<string, SocialInboxItem>();
    for (const comment of comments) {
      const key = `${comment.id}:${comment.sourceType}`;
      if (!deduped.has(key)) deduped.set(key, comment);
    }
    comments = Array.from(deduped.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (withSentiment && comments.length > 0) {
      const geminiKey = brand.geminiApiKey || process.env.GEMINI_API_KEY || '';
      if (geminiKey) {
        comments = await analyzeSentiment(comments, geminiKey);
      }
    }

    const stats = {
      total: comments.length,
      positive: comments.filter(c => c.sentiment === 'positive').length,
      neutral:  comments.filter(c => c.sentiment === 'neutral').length,
      negative: comments.filter(c => c.sentiment === 'negative').length,
      facebook: comments.filter(c => c.platform === 'facebook').length,
      instagram: comments.filter(c => c.platform === 'instagram').length,
    };

    const access = {
      hasAdAccountAccess: Boolean(brand.metaAdAccountId),
      hasPageAccess: Boolean(permissions?.hasPageAccess),
      hasInstagramAccess: Boolean(permissions?.hasInstagramAccess),
      pageAccessError,
    };

    return NextResponse.json({
      comments,
      stats,
      permissions,
      coverage,
      engagement,
      adAnalytics,
      access,
      warnings: [...warnings, ...(adAnalytics?.warnings ?? [])],
      probe,
    });
  } catch (err) {
    console.error('Social route error:', err);
    return NextResponse.json({ error: 'Failed to fetch social comments', message: (err as Error).message }, { status: 500 });
  }
}
