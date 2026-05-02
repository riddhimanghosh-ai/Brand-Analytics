/**
 * Brand data store — local filesystem primary, GitHub optional sync
 * Works with zero configuration. Set GITHUB_TOKEN to auto-sync to GitHub.
 */

import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'riddhimanghosh-ai/Brand-Analytics';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const DATA_FOLDER = 'data/brands';

// Local storage path — inside the project so it persists across dev restarts
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data', 'brands');

interface BrandData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  shopifyStoreUrl?: string | null;
  shopifyAccessToken?: string | null;
  ga4PropertyId?: string | null;
  ga4ServiceAccountJson?: string | null;
  metaAppId?: string | null;
  metaAppSecret?: string | null;
  metaAccessToken?: string | null;
  metaAdAccountId?: string | null;
  googleAdsDevToken?: string | null;
  googleAdsClientId?: string | null;
  googleAdsClientSecret?: string | null;
  googleAdsRefreshToken?: string | null;
  googleAdsCustomerId?: string | null;
  geminiApiKey?: string | null;
  savedMetrics?: { name: string; query: string; chartType: string }[];
  createdAt: string;
  updatedAt: string;
}

// ── Local filesystem helpers ────────────────────────────────────────────────

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

function localPath(slug: string) {
  return path.join(LOCAL_DATA_DIR, `${slug}.json`);
}

function readLocalBrand(slug: string): BrandData | null {
  const p = localPath(slug);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeLocalBrand(brand: BrandData) {
  ensureLocalDir();
  fs.writeFileSync(localPath(brand.slug), JSON.stringify(brand, null, 2), 'utf-8');
}

function deleteLocalBrand(slug: string) {
  const p = localPath(slug);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function listLocalBrands(): BrandData[] {
  ensureLocalDir();
  return fs
    .readdirSync(LOCAL_DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(LOCAL_DATA_DIR, f), 'utf-8')); }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── GitHub sync (optional) ──────────────────────────────────────────────────

async function syncToGitHub(slug: string, brand: BrandData | null, deleted = false) {
  if (!GITHUB_TOKEN) return;
  try {
    const filePath = `${DATA_FOLDER}/${slug}.json`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    };

    // Get existing SHA (needed for update/delete)
    let sha: string | undefined;
    try {
      const r = await fetch(url, { headers });
      if (r.ok) { const d = await r.json(); sha = d.sha; }
    } catch { /* file may not exist yet */ }

    if (deleted) {
      if (!sha) return;
      await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ message: `Delete brand: ${slug}`, sha, branch: GITHUB_BRANCH }),
      });
    } else if (brand) {
      const content = Buffer.from(JSON.stringify(brand, null, 2)).toString('base64');
      await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `${sha ? 'Update' : 'Create'} brand: ${brand.name}`,
          content,
          branch: GITHUB_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });
    }
  } catch (e) {
    console.warn('GitHub sync failed (non-fatal):', (e as Error).message);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

async function getBrands(): Promise<BrandData[]> {
  // Try local filesystem first
  try {
    const local = listLocalBrands();
    if (local.length > 0) return local;
  } catch (e) {
    console.warn(`Failed to list local brands: ${(e as Error).message}`);
  }

  // Fallback to API endpoint (for Amplify deployment with ngrok tunnel)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/brands`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn(`Failed to fetch brands from API: ${(e as Error).message}`);
    }
  }

  return [];
}

async function getBrand(slug: string): Promise<BrandData | null> {
  // Try local filesystem first
  const local = readLocalBrand(slug);
  if (local) return local;

  // Fallback to API endpoint (for Amplify deployment with ngrok tunnel)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/brands/${slug}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn(`Failed to fetch brand from API: ${(e as Error).message}`);
    }
  }

  return null;
}

async function createBrand(brandData: Omit<BrandData, 'createdAt' | 'updatedAt'>): Promise<BrandData> {
  const now = new Date().toISOString();
  const brand: BrandData = { ...brandData, createdAt: now, updatedAt: now };
  writeLocalBrand(brand);
  syncToGitHub(brand.slug, brand).catch(() => {});
  return brand;
}

async function updateBrand(slug: string, updates: Partial<BrandData>): Promise<BrandData> {
  const existing = readLocalBrand(slug);
  if (!existing) throw new Error(`Brand not found: ${slug}`);
  const updated: BrandData = {
    ...existing,
    ...updates,
    id: existing.id,
    slug: existing.slug,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeLocalBrand(updated);
  syncToGitHub(slug, updated).catch(() => {});
  return updated;
}

async function deleteBrand(slug: string): Promise<void> {
  deleteLocalBrand(slug);
  syncToGitHub(slug, null, true).catch(() => {});
}

export { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
export type { BrandData };
