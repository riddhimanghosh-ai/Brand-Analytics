import { getBrand } from '@/lib/mongodb-store';
import { CampaignWatch } from '@/components/CampaignWatch';
import type { TrackedStore } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CampaignWatchPage({ params }: PageProps) {
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
            <h2>📰 Campaign Watch</h2>
            <p>New competitor landing pages and collections appear in their sitemap before the ads run</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <CampaignWatch slug={slug} initialStores={initialStores} />
      </div>
    </>
  );
}
