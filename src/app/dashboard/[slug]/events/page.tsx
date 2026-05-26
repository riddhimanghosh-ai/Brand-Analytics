import { getBrand } from '@/lib/mongodb-store';
import { EventsManager } from '@/components/EventsManager';
import type { BrandEvent } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventsPage({ params }: PageProps) {
  const { slug } = await params;

  const brand = await getBrand(slug);
  if (!brand) return <div className="page-body">Brand not found</div>;

  const initialEvents: BrandEvent[] =
    (brand as Record<string, unknown> & { events?: BrandEvent[] }).events ?? [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Events &amp; Campaigns</h2>
            <p>Track your offers, promotions, and campaigns — correlate them with revenue spikes</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <EventsManager slug={slug} initialEvents={initialEvents} />
      </div>
    </>
  );
}
