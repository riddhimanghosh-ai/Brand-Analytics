import { getBrand } from '@/lib/mongodb-store';
import { LaunchDetector } from '@/components/LaunchDetector';
import type { TrackedStore } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LaunchesPage({ params }: PageProps) {
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
            <h2>✨ New Launch Detector</h2>
            <p>Know about competitor launches the day they happen — not weeks later from Instagram</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <LaunchDetector slug={slug} initialStores={initialStores} />
      </div>
    </>
  );
}
