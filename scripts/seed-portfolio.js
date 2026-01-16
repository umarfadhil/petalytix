const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "petalytix";

if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const items = [
  {
    slug: "google-maps-business-reviewer",
    title: {
      en: "Google Maps Business Reviewer",
      id: "Google Maps Business Reviewer"
    },
    summary: {
      en: "Automated review pipeline that captures Google Maps ratings and highlights reputation signals across locations.",
      id: "Pipeline otomatis yang menangkap rating Google Maps dan menyorot sinyal reputasi lintas lokasi."
    },
    description: {
      en: "Collects review data, normalizes sentiment, and visualizes branch performance for faster decision making.",
      id: "Mengumpulkan data ulasan, menormalkan sentimen, dan memvisualkan performa cabang untuk keputusan yang lebih cepat."
    },
    role: {
      en: "Data product and analytics pipeline",
      id: "Produk data dan pipeline analitik"
    },
    year: "2025",
    location: "Bogor, Indonesia",
    stack: ["MongoDB", "Node.js", "Maps", "Dashboard"],
    tags: ["reviews", "sentiment", "location"],
    primaryUrl: "",
    secondaryUrl: "",
    coverImage: "/images/projects/google-maps-reviewer.png",
    featured: true
  },
  {
    slug: "ayanaon-app",
    title: {
      en: "Ayanaon.app",
      id: "Ayanaon.app"
    },
    summary: {
      en: "Experimental location based product exploring spatial discovery and map centric UX.",
      id: "Produk berbasis lokasi yang mengeksplorasi discovery spasial dan UX berbasis peta."
    },
    description: {
      en: "Focuses on location context, curated recommendations, and lightweight mapping interactions.",
      id: "Fokus pada konteks lokasi, rekomendasi terkurasi, dan interaksi peta yang ringan."
    },
    role: {
      en: "Product concept and UX prototype",
      id: "Konsep produk dan prototipe UX"
    },
    year: "2024",
    location: "Indonesia",
    stack: ["Next.js", "Maps", "UI"],
    tags: ["prototype", "location"],
    primaryUrl: "",
    secondaryUrl: "",
    coverImage: "/images/projects/ayanaon.png",
    featured: false
  }
];

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const collection = client.db(dbName).collection("portfolio");
  const now = new Date();

  for (const item of items) {
    await collection.updateOne(
      { slug: item.slug },
      {
        $set: {
          ...item,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  await client.close();
  console.log("Seeded portfolio items.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
