import { Router } from "express";
import admin from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/auth.js";

const router = Router();
const db = admin.firestore();

// READ: toate produsele (doar user logat, ca în rules)
router.get("/", requireAuth, async (req, res) => {
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// CREATE: ownerId trebuie să fie uid-ul userului
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "Name is required (min 2 chars)" });
    }
    const p = Number(price);
    if (Number.isNaN(p) || p < 0) {
      return res.status(400).json({ error: "Price must be a number >= 0" });
    }

    const docRef = await db.collection("products").add({
      name: String(name).trim(),
      price: p,
      description: String(description || "").trim(),
      ownerId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (e) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// UPDATE: doar owner-ul
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("products").doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Not found" });

    const data = existing.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, price, description } = req.body;

    const updates = {};
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: "Name cannot be empty" });
      updates.name = String(name).trim();
    }
    if (price !== undefined) {
      const p = Number(price);
      if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "Price must be >= 0" });
      updates.price = p;
    }
    if (description !== undefined) updates.description = String(description).trim();

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(updates);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE: doar owner-ul
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("products").doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Not found" });

    const data = existing.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await ref.delete();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
