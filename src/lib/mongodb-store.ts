import { MongoClient, Db, Collection } from 'mongodb';
import { randomUUID } from 'crypto';

export interface BrandData {
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
  tiktokAccessToken?: string | null;
  tiktokAdvertiserId?: string | null;
  klaviyoApiKey?: string | null;
  pinterestAccessToken?: string | null;
  pinterestAdAccountId?: string | null;
  customDashboard?: string | null;
  savedMetrics?: { name: string; query: string; chartType: string }[];
  createdAt: string;
  updatedAt: string;
}

// Use globalThis so the connection survives HMR in dev and Lambda warm starts in production
const g = globalThis as typeof globalThis & { _mongoDb?: Db; _mongoClient?: MongoClient };

async function connectDb() {
  if (g._mongoDb) return g._mongoDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set. Please add it in Amplify → Environment variables.');
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  await client.connect();
  g._mongoClient = client;
  g._mongoDb = client.db('analytics-dashboard');

  // Create indexes
  const collection = g._mongoDb.collection('brands');
  await collection.createIndex({ slug: 1 });

  return g._mongoDb;
}

async function getBrandsCollection(): Promise<Collection> {
  const db = await connectDb();
  return db.collection('brands');
}

export async function getBrands() {
  try {
    const collection = await getBrandsCollection();
    const brands = await collection.find({}).toArray();
    return brands.map(({ _id, ...rest }: any) => rest);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function getBrand(slug: string) {
  try {
    const collection = await getBrandsCollection();
    const brand = await collection.findOne({ slug });
    if (!brand) return null;
    const { _id, ...rest } = brand as any;
    return rest;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}

export async function createBrand(data: any) {
  try {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const brandData = {
      id: data.id || randomUUID(),
      name: data.name,
      slug,
      logoUrl: data.logoUrl || null,
      shopifyStoreUrl: data.shopifyStoreUrl || null,
      shopifyAccessToken: data.shopifyAccessToken || null,
      ga4PropertyId: data.ga4PropertyId || null,
      ga4ServiceAccountJson: data.ga4ServiceAccountJson || null,
      metaAppId: data.metaAppId || null,
      metaAppSecret: data.metaAppSecret || null,
      metaAccessToken: data.metaAccessToken || null,
      metaAdAccountId: data.metaAdAccountId || null,
      googleAdsDevToken: data.googleAdsDevToken || null,
      googleAdsClientId: data.googleAdsClientId || null,
      googleAdsClientSecret: data.googleAdsClientSecret || null,
      googleAdsRefreshToken: data.googleAdsRefreshToken || null,
      googleAdsCustomerId: data.googleAdsCustomerId || null,
      geminiApiKey: data.geminiApiKey || null,
      tiktokAccessToken: data.tiktokAccessToken || null,
      tiktokAdvertiserId: data.tiktokAdvertiserId || null,
      klaviyoApiKey: data.klaviyoApiKey || null,
      pinterestAccessToken: data.pinterestAccessToken || null,
      pinterestAdAccountId: data.pinterestAdAccountId || null,
      customDashboard: data.customDashboard || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection = await getBrandsCollection();
    await collection.insertOne(brandData);

    return brandData;
  } catch (error) {
    console.error('Error creating brand:', error);
    throw error;
  }
}

export async function updateBrand(slug: string, data: any) {
  try {
    const collection = await getBrandsCollection();
    // Strip undefined and null values so we never accidentally overwrite
    // existing DB fields (e.g. shopifyAccessToken) with nothing.
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const result = await collection.findOneAndUpdate(
      { slug },
      {
        $set: {
          ...cleanData,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    // MongoDB driver v5+ returns the document directly (not { value: doc })
    if (!result) return null;
    const { _id, ...rest } = result as any;
    return rest;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
}

export async function deleteBrand(slug: string) {
  try {
    const collection = await getBrandsCollection();
    await collection.deleteOne({ slug });
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}
