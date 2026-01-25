// api/scripts/seedProducts.js
import "dotenv/config";
import { faker } from "@faker-js/faker";
import { db, admin } from "../src/firebaseAdmin.js";

// IMPORTANT: pune aici UID-ul tău (ownerId) ca să treacă de rules
// îl iei din endpoint-ul tău: GET http://localhost:3000/api/me (după login)
const OWNER_ID = process.env.SEED_OWNER_ID;

if (!OWNER_ID) {
  console.error("Missing SEED_OWNER_ID in api/.env");
  process.exit(1);
}

function pickCategory() {
  const categories = [
    "Electronics",
    "Accessories",
    "Audio",
    "Home Office",
    "Smart Home",
    "Fitness",
    "Books",
  ];
  return faker.helpers.arrayElement(categories);
}

function pickFeatures() {
  const pool = [
    "gaming",
    "portable",
    "rgb",
    "wireless",
    "ergonomic",
    "lightweight",
    "bluetooth",
    "hi-fi",
    "minimal",
    "productivity",
    "durable",
    "eco",
  ];
  return faker.helpers.arrayElements(pool, { min: 2, max: 4 });
}

function makeProduct() {
  const total = faker.number.int({ min: 0, max: 100 });

  // locations array (NoSQL)
  const locationsCount = faker.number.int({ min: 1, max: 3 });
  const locations = Array.from({ length: locationsCount }, () => ({
    warehouse: faker.location.city(),
    quantity: faker.number.int({ min: 0, max: total }),
  }));

  const now = admin.firestore.FieldValue.serverTimestamp();

  return {
    name: faker.commerce.productName(),
    slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    price: Number(faker.commerce.price({ min: 10, max: 5000, dec: 2 })),
    description: faker.commerce.productDescription(),

    ownerId: OWNER_ID,

    category: {
      id: faker.string.uuid(),
      name: pickCategory(),
      features: pickFeatures(),
    },

    inventory: {
      total,
      locations,
    },

    metadata: {
      createdBy: OWNER_ID,
      createdAt: now,
      updatedAt: now,
    },

    createdAt: now,
    updatedAt: now,
  };
}


async function seed(count = 30) {
  console.log(`Seeding ${count} products for ownerId=${OWNER_ID} ...`);

  const batch = db.batch();
  for (let i = 0; i < count; i++) {
    const ref = db.collection("products").doc();
    batch.set(ref, makeProduct());
  }

  await batch.commit();
  console.log("✅ Done.");
}

const n = Number(process.argv[2] || 30);
seed(Number.isFinite(n) ? n : 30).catch((e) => {
  console.error(e);
  process.exit(1);
});
