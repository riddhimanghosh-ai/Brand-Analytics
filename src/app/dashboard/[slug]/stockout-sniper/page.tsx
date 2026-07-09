import { getBrand } from '@/lib/mongodb-store';
import { StockoutSniper } from '@/components/StockoutSniper';
import type { TrackedStore } from '@/types';
import { demoTrackedStores } from '@/lib/demo-data';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StockoutSniperPage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === 'demo') {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>🎯 Stockout Sniper</h2>
              <p>When a competitor&apos;s bestseller runs dry, their demand has nowhere to go — except to you</p>
            </div>
          </div>
        </div>
        <div className="page-body">
          <StockoutSniper slug={slug} initialStores={demoTrackedStores as unknown as TrackedStore[]} />
        </div>
      </>
    );
  }

  const brand = await getBrand(slug);
  if (!brand) return <div className="page-body">Brand not found</div>;

  const initialStores: TrackedStore[] =
    (brand as Record<string, unknown> & { trackedStores?: TrackedStore[] }).trackedStores ?? [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>🎯 Stockout Sniper</h2>
            <p>When a competitor&apos;s bestseller runs dry, their demand has nowhere to go — except to you</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <StockoutSniper slug={slug} initialStores={initialStores} />
      </div>
    </>
  );
}
