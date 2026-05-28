import { getBrand } from '@/lib/mongodb-store';
import { TechSpyManager } from '@/components/TechSpyManager';
import type { TrackedWebsite } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TechSpyPage({ params }: PageProps) {
  const { slug } = await params;

  const brand = await getBrand(slug);
  if (!brand) return <div className="page-body">Brand not found</div>;

  const initialWebsites: TrackedWebsite[] =
    (brand as Record<string, unknown> & { trackedWebsites?: TrackedWebsite[] }).trackedWebsites ?? [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Tech Stack Detector</h2>
            <p>Discover what technologies, Shopify apps, and ad pixels your competitors are running</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <TechSpyManager slug={slug} initialWebsites={initialWebsites} />
      </div>
    </>
  );
}
