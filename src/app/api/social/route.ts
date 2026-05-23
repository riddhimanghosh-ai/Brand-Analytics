import { getBrand } from '@/lib/mongodb-store';
import { analyzeSentiment, getFacebookPageInbox, getInstagramInbox, type SocialInboxItem } from '@/lib/services/social';
import { getAdCommentAnalytics, getPermissions, getPageCoverage, getAdEngagement, probeReviewPermissions } from '@/lib/services/meta';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { demoSocialComments, demoSocialStats } from '@/lib/demo-data';

export const maxDuration = 60;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const withSentiment = searchParams.get('sentiment') === 'true';
    const includeDiagnostics = searchParams.get('diagnostics') === '1';
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
      // Use stored IG account IDs if available — avoids picking up wrong test/demo pages
      instagramAccountIds: (brand as any).metaInstagramAccountIds ?? null,
    };

    const permissions = includeDiagnostics
      ? await withTimeout(getPermissions(brand.metaAccessToken), 8_000, 'Meta permissions').catch(() => null)
      : null;
    const coverage = includeDiagnostics && brand.metaAdAccountId
      ? await withTimeout(
          getPageCoverage({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }),
          10_000,
          'Meta page coverage'
        ).catch(() => null)
      : null;
    const engagement = includeDiagnostics && brand.metaAdAccountId
      ? await withTimeout(
          getAdEngagement({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }, range),
          12_000,
          'Meta engagement'
        ).catch(() => null)
      : null;
    const probeReview = searchParams.get('probe') === '1';
    const probe = includeDiagnostics && probeReview && brand.metaAdAccountId
      ? await withTimeout(
          probeReviewPermissions({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }),
          12_000,
          'Meta review probe'
        ).catch(() => null)
      : null;

    const warnings: string[] = [];
    const commentSources = await Promise.allSettled([
      brand.metaAdAccountId
        ? withTimeout(
            getAdCommentAnalytics({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }, range),
            15_000,
            'Meta ad comments'
          )
        : Promise.resolve(null),
      withTimeout(getFacebookPageInbox(config), 12_000, 'Facebook Page inbox'),
      withTimeout(getInstagramInbox(config), 12_000, 'Instagram inbox'),
    ]);

    const adAnalyticsResult = commentSources[0];
    const adAnalytics =
      adAnalyticsResult.status === 'fulfilled'
        ? adAnalyticsResult.value
        : null;
    if (adAnalyticsResult.status === 'rejected' && brand.metaAdAccountId) {
      warnings.push(`Ad comments unavailable: ${adAnalyticsResult.reason instanceof Error ? adAnalyticsResult.reason.message : String(adAnalyticsResult.reason)}`);
    }

    let comments: SocialInboxItem[] = adAnalytics?.comments ?? [];
    let pageAccessError: string | null = null;
    const facebookResult = commentSources[1];
    if (facebookResult.status === 'fulfilled') {
      comments = comments.concat(facebookResult.value);
    } else {
      const message = facebookResult.reason instanceof Error ? facebookResult.reason.message : String(facebookResult.reason);
      if (message === 'PAGE_ACCESS_REQUIRED') {
        pageAccessError = 'Your Meta connection has ad-account access but not Page access. Re-authorize with pages_show_list + pages_read_engagement, and make sure this user is added to the Pages your ads run from.';
      } else {
        warnings.push(`Facebook Page inbox unavailable: ${message}`);
      }
    }

    const instagramResult = commentSources[2];
    if (instagramResult.status === 'fulfilled') {
      comments = comments.concat(instagramResult.value);
    } else {
      const message = instagramResult.reason instanceof Error ? instagramResult.reason.message : String(instagramResult.reason);
      if (message !== 'PAGE_ACCESS_REQUIRED') {
        warnings.push(`Instagram inbox unavailable: ${message}`);
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
