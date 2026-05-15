import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';

export const maxDuration = 30;

// GET /api/shopify/debug?slug=hira
// Runs a raw ShopifyQL query and returns the raw response for debugging.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get('slug');

  const { denied } = await requireBrandAccess(slugParam);
  if (denied) return denied;
  const slug: string = slugParam!;

  const brand = await getBrand(slug);
  if (!brand?.shopifyAccessToken || !brand?.shopifyStoreUrl) {
    return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
  }

  const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken };
  const API_VERSION = '2024-10';
  const url = `https://${config.storeUrl}/admin/api/${API_VERSION}/graphql.json`;

  // Test ShopifyQL query — last 30 days
  const query = `{
    shopifyqlQuery(query: "FROM sales SINCE -30d UNTIL today SELECT sum(net_sales) AS revenue, sum(orders) AS orders, sum(gross_sales) AS gross_sales, sum(returns) AS returns") {
      tableData {
        rowData
        columns { name dataType }
      }
      parseErrors { code message }
    }
  }`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
  });

  const json = await res.json();
  return NextResponse.json({ status: res.status, data: json });
}
