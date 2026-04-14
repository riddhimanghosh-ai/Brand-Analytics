import { NextResponse } from 'next/server';
import { getBrand } from '@/lib/github-store';

export async function POST(request: Request) {
  try {
    const { slug, query } = await request.json();

    if (!slug || !query) {
      return NextResponse.json({ error: 'Missing slug or query' }, { status: 400 });
    }

    const brand = await getBrand(slug);
    if (!brand?.shopifyStoreUrl || !brand?.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const storeUrl = brand.shopifyStoreUrl.replace(/^https?:\/\//, '');
    const url = `https://${storeUrl}/admin/api/2024-10/graphql.json`;

    const graphqlQuery = `
      mutation {
        queryShopifyql(query: ${JSON.stringify(query)}) {
          tableData {
            columns { name dataType }
            rowData
          }
          parseErrors { code message range { start { line column } end { line column } } }
        }
      }
    `;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': brand.shopifyAccessToken,
      },
      body: JSON.stringify({ query: graphqlQuery }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Shopify API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const result = data?.data?.queryShopifyql;

    if (!result) {
      return NextResponse.json({ error: 'No data returned from Shopify' }, { status: 500 });
    }

    if (result.parseErrors?.length > 0) {
      return NextResponse.json({ error: result.parseErrors[0].message }, { status: 400 });
    }

    return NextResponse.json({
      columns: result.tableData?.columns || [],
      rows: result.tableData?.rowData || [],
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
