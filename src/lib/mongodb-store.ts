import { MongoClient, Db, Collection } from 'mongodb';
import { randomUUID } from 'crypto';

let cachedDb: Db;
let cachedClient: MongoClient;

async function connectDb() {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db('analytics-dashboard');

  // Create indexes
  const collection = cachedDb.collection('brands');
  await collection.createIndex({ slug: 1 });

  return cachedDb;
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = await getBrandsCollection();
    const result = await collection.insertOne(brandData);

    return {
      ...brandData,
      _id: result.insertedId,
    };
  } catch (error) {
    console.error('Error creating brand:', error);
    throw error;
  }
}

export async function updateBrand(slug: string, data: any) {
  try {
    const collection = await getBrandsCollection();
    const result = await collection.findOneAndUpdate(
      { slug },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) return null;
    const { _id, ...rest } = result.value as any;
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
