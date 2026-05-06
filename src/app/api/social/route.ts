import { getBrand } from '@/lib/google-sheets-store';
import { getPageComments, analyzeSentiment } from '@/lib/services/social';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const withSentiment = searchParams.get('sentiment') !== 'false';

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const brand = await getBrand(slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    if (!brand.metaAccessToken) {
      return NextResponse.json({ error: 'Meta Ads not connected. Add your Meta Access Token in Settings.' }, { status: 400 });
    }

    const config = {
      accessToken: brand.metaAccessToken,
      adAccountId: brand.metaAdAccountId,
    };

    let comments = await getPageComments(config);

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

    return NextResponse.json({ comments, stats });
  } catch (err) {
    console.error('Social route error:', err);
    return NextResponse.json({ error: 'Failed to fetch social comments' }, { status: 500 });
  }
}
