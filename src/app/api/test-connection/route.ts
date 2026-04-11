import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.type === 'shopify') {
      const url = `https://${body.storeUrl}/admin/api/2024-10/graphql.json`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': body.accessToken,
        },
        body: JSON.stringify({ query: '{ shop { name } }' }),
      });

      if (!res.ok) {
        return NextResponse.json({ success: false, error: `HTTP ${res.status}` });
      }

      const data = await res.json();
      if (data.errors) {
        return NextResponse.json({ success: false, error: data.errors[0]?.message });
      }

      return NextResponse.json({ success: true, shopName: data.data?.shop?.name });
    }

    return NextResponse.json({ error: 'Unknown connection type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message });
  }
}
