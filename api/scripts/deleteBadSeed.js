import "dotenv/config";
import { db } from "../src/firebaseAdmin.js";

const BAD_OWNER = "PASTE_UID_AICI";

async function run() {
  const snap = await db.collection("products").where("ownerId", "==", BAD_OWNER).get();
  console.log("Found:", snap.size, "bad products");

  let batch = db.batch();
  let i = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    i++;
    if (i % 450 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log("Deleted", i);
    }
  }

  await batch.commit();
  console.log("✅ Done. Deleted", i);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
