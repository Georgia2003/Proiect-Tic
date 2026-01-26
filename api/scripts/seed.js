// api/scripts/seed.js
import { db, admin } from "../src/firebaseAdmin.js";

// Config
const OWNER_UID = process.env.SEED_OWNER_UID || ""; // recomandat să pui UID-ul tău aici
const PRODUCTS_COUNT = Number(process.env.SEED_PRODUCTS_COUNT || 50);
const ORDERS_COUNT = Number(process.env.SEED_ORDERS_COUNT || 50);

// Helpers
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
async function deleteAllDocs(collectionName) {
  const col = db.collection(collectionName);
  const snap = await col.get();
  if (snap.empty) return 0;

  const batchSize = 400; // safe-ish under 500
  let deleted = 0;
  let batch = db.batch();
  let opCount = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    opCount++;
    deleted++;

    if (opCount >= batchSize) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();

  return deleted;
}

async function main() {
  console.log("=== Firestore SEED START ===");

  if (!OWNER_UID) {
    console.log(
      "ERROR: Missing SEED_OWNER_UID.\n" +
        "Set it in api/.env as SEED_OWNER_UID=YOUR_FIREBASE_AUTH_UID\n" +
        "You can find UID in Firebase Console > Authentication > Users."
    );
    process.exit(1);
  }

  // 1) DELETE existing
  console.log("Deleting existing documents...");
  const delOrders = await deleteAllDocs("orders");
  const delProducts = await deleteAllDocs("products");
  console.log(`Deleted orders: ${delOrders}`);
  console.log(`Deleted products: ${delProducts}`);

  // 2) CREATE products
  console.log(`Creating ${PRODUCTS_COUNT} products...`);
  const productsCol = db.collection("products");
  const now = admin.firestore.FieldValue.serverTimestamp();

  const categories = ["Electronic", "Office", "Gaming", "Home", "Accessories"];
  const featurePool = [
    "lightweight",
    "wireless",
    "fast",
    "silent",
    "premium",
    "budget",
    "eco",
    "portable",
    "durable",
    "RGB",
  ];

  const createdProducts = [];
  for (let i = 1; i <= PRODUCTS_COUNT; i++) {
    const nameBase = pick(["Keyboard", "Laptop", "Mouse", "Headphones", "Monitor", "Chair", "Router", "SSD"]);
    const name = `${nameBase} ${i}`;
    const price = Number((randInt(1999, 199999) / 100).toFixed(2));
    const description = pick(["wow", "nice", "best value", "good for work", "good for gaming", "compact", "fast shipping"]);

    const catName = pick(categories);
    const featuresCount = randInt(1, 3);
    const features = Array.from({ length: featuresCount }, () => pick(featurePool));

    const total = randInt(0, 200);
    const locations = [
      { warehouse: "Bucharest", quantity: randInt(0, total) },
      { warehouse: "Cluj", quantity: randInt(0, Math.max(0, total - 1)) },
    ];

    const doc = {
      name,
      slug: slugify(name),
      price,
      description,

      ownerId: OWNER_UID,

      category: {
        id: admin.firestore().collection("_").doc().id,
        name: catName,
        features,
      },
      inventory: {
        total,
        locations,
      },
      metadata: {
        createdBy: OWNER_UID,
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const ref = await productsCol.add(doc);
    createdProducts.push({ id: ref.id, ...doc });
  }

  console.log(`Created products: ${createdProducts.length}`);

  // 3) CREATE orders
  console.log(`Creating ${ORDERS_COUNT} orders...`);
  const ordersCol = db.collection("orders");

  const statuses = ["processing", "shipped", "delivered", "cancelled"];
  const cities = ["Bucharest", "Cluj", "Iasi", "Timisoara", "Constanta"];
  const streets = ["Iuliu Maniu", "Unirii", "Victoriei", "Aviatorilor", "Dorobanti"];

  for (let i = 1; i <= ORDERS_COUNT; i++) {
    const itemsCount = randInt(1, 3);
    const pickedProducts = Array.from({ length: itemsCount }, () => pick(createdProducts));

    const products = pickedProducts.map((p) => {
      const quantity = randInt(1, 5);
      return {
        productId: p.id,
        productName: p.name,
        quantity,
        priceAtPurchase: p.price,
        productSnapshot: {
          name: p.name,
          price: p.price,
          categoryName: p.category?.name || "",
        },
      };
    });

    const status = pick(statuses);
    const shipping = {
      address: `${pick(streets)} ${randInt(1, 200)}`,
      city: pick(cities),
      tracking: Math.random() > 0.5 ? `TRK-${randInt(100000, 999999)}` : "",
    };

    const doc = {
      userId: OWNER_UID,
      products,
      status,
      shipping,
      createdAt: now,
      updatedAt: now,
    };

    await ordersCol.add(doc);
  }

  console.log("=== Firestore SEED DONE ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
