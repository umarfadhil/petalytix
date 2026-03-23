import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB || "petalytix";
const COLLECTION = "portfolio";

export type PortfolioLocaleText = {
  en: string;
  id: string;
};

export type PortfolioItem = {
  id: string;
  slug: string;
  title: PortfolioLocaleText;
  summary: PortfolioLocaleText;
  description: PortfolioLocaleText;
  year: string;
  location: string;
  tags: string[];
  primaryUrl?: string;
  coverImage?: string;
  images?: string[];
  attachment?: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioInput = Omit<
  PortfolioItem,
  "id" | "createdAt" | "updatedAt"
>;

type PortfolioRecord = Omit<PortfolioItem, "id" | "createdAt" | "updatedAt"> & {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<PortfolioRecord>(COLLECTION);
}

function toClient(record: PortfolioRecord): PortfolioItem {
  return {
    id: record._id.toString(),
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    description: record.description,
    year: record.year,
    location: record.location,
    tags: Array.isArray(record.tags) ? record.tags : [],
    primaryUrl: record.primaryUrl,
    coverImage: record.coverImage,
    images: Array.isArray(record.images) ? record.images : [],
    attachment: record.attachment,
    featured: record.featured,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const collection = await getCollection();
    const items = await collection
      .find({})
      .sort({ featured: -1, updatedAt: -1 })
      .toArray();
    return items.map(toClient);
  } catch {
    return [];
  }
}

export async function getPortfolioItemById(
  id: string
): Promise<PortfolioItem | null> {
  const collection = await getCollection();
  const record = await collection.findOne({ _id: new ObjectId(id) });
  if (!record) {
    return null;
  }
  return toClient(record);
}

export async function getPortfolioItemBySlug(
  slug: string
): Promise<PortfolioItem | null> {
  const collection = await getCollection();
  const record = await collection.findOne({ slug });
  if (!record) {
    return null;
  }
  return toClient(record);
}

export async function createPortfolioItem(payload: PortfolioInput) {
  const collection = await getCollection();
  const now = new Date();
  const record: Omit<PortfolioRecord, "_id"> = {
    ...payload,
    createdAt: now,
    updatedAt: now
  };

  const result = await collection.insertOne(record as PortfolioRecord);
  return result.insertedId.toString();
}

export async function updatePortfolioItem(
  id: string,
  payload: PortfolioInput
) {
  const collection = await getCollection();
  const now = new Date();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...payload,
        updatedAt: now
      }
    }
  );
}

export async function deletePortfolioItem(id: string) {
  const collection = await getCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}
