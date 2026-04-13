/**
 * GitHub-based data store for brand configurations
 * Stores brand data as JSON files in GitHub repository
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'antigravity-shopify/analytics-dashboard';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const DATA_FOLDER = 'data/brands';

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
  createdAt: string;
  updatedAt: string;
}

function validateToken() {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }
}

async function makeGitHubRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  validateToken();

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `GitHub API error: ${response.status} - ${errorData}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function getBrands(): Promise<BrandData[]> {
  try {
    const response = await makeGitHubRequest('GET', DATA_FOLDER);

    if (!response || !Array.isArray(response)) {
      return [];
    }

    const files = (response as Array<{ name: string; type: string }>).filter(
      (f) => f.type === 'file' && f.name.endsWith('.json')
    );

    const brands: BrandData[] = [];

    for (const file of files) {
      try {
        const brandResponse = await makeGitHubRequest(
          'GET',
          `${DATA_FOLDER}/${file.name}`
        );

        if (brandResponse && typeof brandResponse === 'object' && 'content' in brandResponse) {
          const content = Buffer.from(
            (brandResponse as { content: string }).content,
            'base64'
          ).toString('utf-8');
          const brand = JSON.parse(content);
          brands.push(brand);
        }
      } catch (error) {
        console.error(`Failed to read brand file ${file.name}:`, error);
      }
    }

    return brands.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to fetch brands from GitHub:', error);
    return [];
  }
}

async function getBrand(slug: string): Promise<BrandData | null> {
  try {
    const response = await makeGitHubRequest(
      'GET',
      `${DATA_FOLDER}/${slug}.json`
    );

    if (!response || typeof response !== 'object' || !('content' in response)) {
      return null;
    }

    const content = Buffer.from(
      (response as { content: string }).content,
      'base64'
    ).toString('utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (String(error).includes('404')) {
      return null;
    }
    console.error(`Failed to fetch brand ${slug}:`, error);
    throw error;
  }
}

async function createBrand(brandData: Omit<BrandData, 'createdAt' | 'updatedAt'>): Promise<BrandData> {
  validateToken();

  const now = new Date().toISOString();
  const brand: BrandData = {
    ...brandData,
    createdAt: now,
    updatedAt: now,
  };

  const content = Buffer.from(JSON.stringify(brand, null, 2)).toString(
    'base64'
  );

  const commitMessage = `Create brand: ${brand.name}`;

  try {
    await makeGitHubRequest('PUT', `${DATA_FOLDER}/${brand.slug}.json`, {
      message: commitMessage,
      content,
      branch: GITHUB_BRANCH,
    });

    return brand;
  } catch (error) {
    console.error('Failed to create brand:', error);
    throw error;
  }
}

async function updateBrand(
  slug: string,
  updates: Partial<BrandData>
): Promise<BrandData> {
  validateToken();

  const existing = await getBrand(slug);
  if (!existing) {
    throw new Error(`Brand not found: ${slug}`);
  }

  const updated: BrandData = {
    ...existing,
    ...updates,
    id: existing.id,
    slug: existing.slug,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const content = Buffer.from(JSON.stringify(updated, null, 2)).toString(
    'base64'
  );

  const commitMessage = `Update brand: ${updated.name}`;

  try {
    const fileResponse = await makeGitHubRequest('GET', `${DATA_FOLDER}/${slug}.json`);
    const sha = fileResponse && typeof fileResponse === 'object' && 'sha' in fileResponse
      ? (fileResponse as { sha: string }).sha
      : '';

    await makeGitHubRequest('PUT', `${DATA_FOLDER}/${slug}.json`, {
      message: commitMessage,
      content,
      branch: GITHUB_BRANCH,
      sha,
    });

    return updated;
  } catch (error) {
    console.error('Failed to update brand:', error);
    throw error;
  }
}

async function deleteBrand(slug: string): Promise<void> {
  validateToken();

  const brand = await getBrand(slug);
  if (!brand) {
    throw new Error(`Brand not found: ${slug}`);
  }

  try {
    const fileResponse = await makeGitHubRequest('GET', `${DATA_FOLDER}/${slug}.json`);
    const sha = fileResponse && typeof fileResponse === 'object' && 'sha' in fileResponse
      ? (fileResponse as { sha: string }).sha
      : '';

    await makeGitHubRequest('DELETE', `${DATA_FOLDER}/${slug}.json`, {
      message: `Delete brand: ${brand.name}`,
      branch: GITHUB_BRANCH,
      sha,
    });
  } catch (error) {
    console.error('Failed to delete brand:', error);
    throw error;
  }
}

export { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
export type { BrandData };
