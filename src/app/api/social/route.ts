import { getBrand } from '@/lib/mongodb-store';
import { getPageComments, getAdComments, analyzeSentiment, type SocialComment } from '@/lib/services/social';
import { getCommentsFromAds, getPermissions, getPageCoverage, getAdEngagement, probeReviewPermissions } from '@/lib/services/meta';
import { NextResponse } from 'next/server';
import { demoSocialComments, demoSocialStats } from '@/lib/demo-data';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const withSentiment = searchParams.get('sentiment') !== 'false';

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

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

    // Page-coverage diagnostic — explains "permissions ok but no comments"
    const coverage = brand.metaAdAccountId
      ? await getPageCoverage({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }).catch(() => null)
      : null;

    // Ad engagement counts — works with ads_read only, gives real numbers
    // even when comment-text is blocked (e.g. influencer Partnership Ads)
    const range = searchParams.get('range') || '30d';
    const engagement = brand.metaAdAccountId
      ? await getAdEngagement({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }, range).catch(() => null)
      : null;

    // App Review probe — fires API calls for pending permissions
    // (pages_manage_ads, instagram_branded_content_ads_brand) so Meta's
    // "0 of 1 API call(s)" counters tick upward. Silent in normal use.
    const probeReview = searchParams.get('probe') === '1';
    const probe = probeReview && brand.metaAdAccountId
      ? await probeReviewPermissions({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }).catch(() => null)
      : null;

    let comments: SocialComment[] = [];
    let source: 'pages' | 'ads' | 'none' = 'none';

    // Path 1: full page access — fetch Facebook + Instagram comments
    try {
      comments = await getPageComments(config);
      source = 'pages';
    } catch (e) {
      const msg = (e as Error).message;

      // Path 2: page access denied — fall back to ad-creative comments
      // (works with just ads_read on the user's promoted/dark posts)
      if (msg === 'PAGE_ACCESS_REQUIRED' && brand.metaAdAccountId) {
        try {
          const adCmnts = await getCommentsFromAds(
            { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId },
            '30d',
          );
          comments = adCmnts.map((c) => ({
            id: c.id,
            platform: 'Facebook' as const,
            postPreview: c.adName ? `Ad: ${c.adName.slice(0, 56)}` : '[Ad post]',
            postId: c.postId,
            comment: c.message,
            author: c.author,
            authorId: '',
            date: c.date,
            source: 'post_comment' as const,
          }));
          source = 'ads';
        } catch {
          // both paths failed — surface helpful guidance
          return NextResponse.json({
            error: 'page_access_required',
            message: 'Your Meta connection has ads access but not Page access. Re-authorize and grant pages_show_list + pages_read_engagement, or add a Facebook Page to your Meta Business account.',
            permissions,
            coverage,
            engagement,
            source: null,
          }, { status: 200 });
        }
      } else if (msg === 'PAGE_ACCESS_REQUIRED') {
        return NextResponse.json({
          error: 'page_access_required',
          message: 'Your Meta connection has ads access but not Page access. Re-authorize and grant pages_show_list + pages_read_engagement.',
          permissions,
          coverage,
          engagement,
          source: null,
        }, { status: 200 });
      } else {
        throw e;
      }
    }

    // If no comments from either page or ad-creative path, try ad-level comments as last resort
    if (comments.length === 0 && brand.metaAdAccountId) {
      try {
        comments = await getAdComments({ accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId });
        console.log(`[social] Got ${comments.length} ad-level comments as fallback`);
        if (comments.length > 0) source = 'ads';
      } catch (err) {
        console.warn('[social] getAdComments also failed:', (err as Error).message);
      }
    }

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
      facebook: comments.filter(c => c.platform === 'Facebook').length,
      instagram: comments.filter(c => c.platform === 'Instagram').length,
    };

    return NextResponse.json({ comments, stats, permissions, coverage, engagement, source, probe });
  } catch (err) {
    console.error('Social route error:', err);
    return NextResponse.json({ error: 'Failed to fetch social comments', message: (err as Error).message }, { status: 500 });
  }
}
