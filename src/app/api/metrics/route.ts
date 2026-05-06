import { NextResponse } from 'next/server';
import { getBrand } from '@/lib/mongodb-store';

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

    // Log the full response for debugging
    console.log('Shopify API response:', JSON.stringify(data, null, 2));

    // Check for GraphQL errors first
    if (data.errors && data.errors.length > 0) {
      console.error('GraphQL errors:', data.errors);
      const errorMsg = data.errors[0]?.message || 'Unknown error';
      let friendlyError = errorMsg;

      // Provide helpful error messages
      if (errorMsg.includes("doesn't exist on type 'Mutation'")) {
        friendlyError = 'ShopifyQL is not available with this token. Please check: (1) Token has "read_analytics" permission (2) Store plan includes Analytics API access (3) Try regenerating the access token with proper scopes.';
      }

      return NextResponse.json({
        error: friendlyError
      }, { status: 400 });
    }

    const result = data?.data?.queryShopifyql;

    if (!result) {
      console.error('No queryShopifyql in response:', data);
      return NextResponse.json({ error: 'ShopifyQL query not supported or invalid. Check that the Shopify store has access to the Analytics API.' }, { status: 400 });
    }

    if (result.parseErrors?.length > 0) {
      console.error('ShopifyQL parse errors:', result.parseErrors);
      return NextResponse.json({ error: `Query syntax error: ${result.parseErrors[0].message}` }, { status: 400 });
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
