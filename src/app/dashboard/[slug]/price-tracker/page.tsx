import { getBrand } from '@/lib/mongodb-store';
import { PriceTrackerManager } from '@/components/PriceTrackerManager';
import type { TrackedStore } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PriceTrackerPage({ params }: PageProps) {
  const { slug } = await params;

  const brand = await getBrand(slug);
  if (!brand) return <div className="page-body">Brand not found</div>;

  const initialStores: TrackedStore[] =
    (brand as Record<string, unknown> & { trackedStores?: TrackedStore[] }).trackedStores ?? [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Competitor Price Tracker</h2>
            <p>Track competitor Shopify catalogs — price moves, new launches, and stock-outs</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <PriceTrackerManager slug={slug} initialStores={initialStores} />
      </div>
    </>
  );
}
