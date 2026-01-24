import { Router } from "express";
import { db, admin } from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const productsCol = db.collection("products");

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

// GET all (doar ale userului)
router.get("/", async (req, res) => {
  try {
    const snap = await productsCol
      .where("ownerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(products);
  } catch (err) {
  console.error("GET /api/products error:", err);
  console.error("code:", err?.code, "message:", err?.message);
  return res.status(500).json({ error: err?.message || "Failed to load products" });
}
});

// POST create
router.post("/", async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!isNonEmptyString(name)) return res.status(400).json({ error: "Name is required" });

    const p = toNumber(price);
    if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "Price must be a number >= 0" });

    const now = admin.firestore.FieldValue.serverTimestamp();

    const newProduct = {
      name: name.trim(),
      price: p,
      description: isNonEmptyString(description) ? description.trim() : "",
      ownerId: req.user.uid,
      createdAt: now,
      updatedAt: now,
    };

    const created = await productsCol.add(newProduct);
    res.status(201).json({ id: created.id, ...newProduct });
  } catch {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    const { name, price, description } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!isNonEmptyString(name)) return res.status(400).json({ error: "Name must be non-empty" });
      updates.name = name.trim();
    }
    if (price !== undefined) {
      const p = toNumber(price);
      if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "Price must be a number >= 0" });
      updates.price = p;
    }
    if (description !== undefined) {
      updates.description = isNonEmptyString(description) ? description.trim() : "";
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(updates);
    res.json({ ok: true, id: req.params.id, updates });
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    await ref.delete();
    res.json({ ok: true, deletedId: req.params.id });
  } catch {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
