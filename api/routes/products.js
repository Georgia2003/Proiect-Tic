import { Router } from "express";
import { db, admin } from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

import { validateBody } from "../src/validators/validate.js";
import {
  productCreateSchema,
  productUpdateSchema,
} from "../src/validators/products.schema.js";

const router = Router();
router.use(requireAuth);

const productsCol = db.collection("products");

// ---------- Helpers ----------
function toSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- GET all (doar ale userului) ----------
router.get("/", async (req, res) => {
  try {
    const snap = await productsCol
      .where("ownerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(products);
  } catch (err) {
    console.error("GET /api/products error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to load products" });
  }
});

// ---------- GET one (doar owner) ----------
router.get("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });

    return res.json({ id: docSnap.id, ...data });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err?.message || "Failed to load product" });
  }
});

// ---------- POST create ----------
router.post("/", validateBody(productCreateSchema), async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      categoryName,
      categoryFeatures,
      inventoryTotal,
      inventoryLocations,
    } = req.body;

    const now = admin.firestore.FieldValue.serverTimestamp();

    const newProduct = {
      name,
      slug: toSlug(name),
      price,
      description,

      ownerId: req.user.uid,

      category: {
        id: db.collection("_").doc().id,
        name: categoryName,
        features: categoryFeatures,
      },

      inventory: {
        total: inventoryTotal,
        locations: inventoryLocations,
      },

      metadata: {
        createdBy: req.user.uid,
        createdAt: now,
        updatedAt: now,
      },

      createdAt: now,
      updatedAt: now,
    };

    const created = await productsCol.add(newProduct);
    return res.status(201).json({ id: created.id, ...newProduct });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to create product" });
  }
});

// ---------- PUT update (doar owner) ----------
router.put("/:id", validateBody(productUpdateSchema), async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });

    const {
      name,
      price,
      description,
      categoryName,
      categoryFeatures,
      inventoryTotal,
      inventoryLocations,
    } = req.body;

    const updates = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = toSlug(name);
    }
    if (price !== undefined) updates.price = price;
    if (description !== undefined) updates.description = description;

    if (categoryName !== undefined || categoryFeatures !== undefined) {
      const current = data.category || {};
      updates.category = {
        id: current.id || db.collection("_").doc().id,
        name: categoryName !== undefined ? categoryName : current.name || "Uncategorized",
        features:
          categoryFeatures !== undefined ? categoryFeatures : current.features || [],
      };
    }

    if (inventoryTotal !== undefined || inventoryLocations !== undefined) {
      const current = data.inventory || {};
      updates.inventory = {
        total: inventoryTotal !== undefined ? inventoryTotal : current.total || 0,
        locations:
          inventoryLocations !== undefined ? inventoryLocations : current.locations || [],
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    updates.updatedAt = now;
    updates["metadata.updatedAt"] = now;

    await ref.update(updates);
    return res.json({ ok: true, id: req.params.id, updates });
  } catch (err) {
    console.error("PUT /api/products error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to update product" });
  }
});

// ---------- DELETE (doar owner) ----------
router.delete("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });

    await ref.delete();
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    console.error("DELETE /api/products error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to delete product" });
  }
});

export default router;
