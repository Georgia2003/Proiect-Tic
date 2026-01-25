import { Router } from "express";
import { db, admin } from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const productsCol = db.collection("products");

// ---------- Helpers ----------
function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}
function toSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function parseFeatures(x) {
  // acceptă array sau string "a,b,c"
  if (Array.isArray(x)) {
    return x.map(String).map((v) => v.trim()).filter(Boolean);
  }
  if (typeof x === "string") {
    return x
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
function parseLocations(x) {
  // acceptă array cu {warehouse, quantity}
  if (!Array.isArray(x)) return [];
  const out = [];
  for (const item of x) {
    const warehouse = isNonEmptyString(item?.warehouse) ? item.warehouse.trim() : "";
    const q = toNumber(item?.quantity);
    if (!warehouse) continue;
    if (Number.isNaN(q) || q < 0) continue;
    out.push({ warehouse, quantity: q });
  }
  return out;
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
    console.error("code:", err?.code, "message:", err?.message);
    return res.status(500).json({ error: err?.message || "Failed to load products" });
  }
});

// ---------- GET one (doar owner) ----------
router.get("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    return res.json({ id: docSnap.id, ...data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to load product" });
  }
});

// ---------- POST create ----------
router.post("/", async (req, res) => {
  try {
    const {
      name,
      price,
      description,

      // NoSQL nested
      categoryName,
      categoryFeatures,
      inventoryTotal,
      inventoryLocations,
    } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "Name is required" });
    }

    const p = toNumber(price);
    if (Number.isNaN(p) || p < 0) {
      return res.status(400).json({ error: "Price must be a number >= 0" });
    }

    // category
    const catName = isNonEmptyString(categoryName) ? categoryName.trim() : "General";
    const catFeatures = parseFeatures(categoryFeatures);

    // inventory
    const total = inventoryTotal === undefined ? 0 : toNumber(inventoryTotal);
    if (Number.isNaN(total) || total < 0) {
      return res.status(400).json({ error: "Inventory total must be a number >= 0" });
    }
    const locations = parseLocations(inventoryLocations);

    const now = admin.firestore.FieldValue.serverTimestamp();

    const newProduct = {
      name: name.trim(),
      slug: toSlug(name),
      price: p,
      description: isNonEmptyString(description) ? description.trim() : "",

      // owner
      ownerId: req.user.uid,

      // nested objects (NoSQL)
      category: {
        id: admin.firestore().collection("_").doc().id, // id random
        name: catName,
        features: catFeatures,
      },
      inventory: {
        total,
        locations,
      },
      metadata: {
        createdBy: req.user.uid,
        createdAt: now,
        updatedAt: now,
      },

      // păstrăm și câmpurile tale pentru sortare / compatibilitate
      createdAt: now,
      updatedAt: now,
    };

    const created = await productsCol.add(newProduct);
    return res.status(201).json({ id: created.id, ...newProduct });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to create product" });
  }
});

// ---------- PUT update (doar owner) ----------
router.put("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

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
      if (!isNonEmptyString(name)) return res.status(400).json({ error: "Name must be non-empty" });
      updates.name = name.trim();
      updates.slug = toSlug(name);
    }

    if (price !== undefined) {
      const p = toNumber(price);
      if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "Price must be a number >= 0" });
      updates.price = p;
    }

    if (description !== undefined) {
      updates.description = isNonEmptyString(description) ? description.trim() : "";
    }

    // nested updates
    if (categoryName !== undefined || categoryFeatures !== undefined) {
      const current = data.category || {};
      updates.category = {
        id: current.id || admin.firestore().collection("_").doc().id,
        name: categoryName !== undefined && isNonEmptyString(categoryName) ? categoryName.trim() : (current.name || "General"),
        features: categoryFeatures !== undefined ? parseFeatures(categoryFeatures) : (current.features || []),
      };
    }

    if (inventoryTotal !== undefined || inventoryLocations !== undefined) {
      const current = data.inventory || {};
      if (inventoryTotal !== undefined) {
        const t = toNumber(inventoryTotal);
        if (Number.isNaN(t) || t < 0) return res.status(400).json({ error: "Inventory total must be a number >= 0" });
        current.total = t;
      }
      if (inventoryLocations !== undefined) {
        current.locations = parseLocations(inventoryLocations);
      }
      updates.inventory = current;
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    updates.updatedAt = now;
    updates["metadata.updatedAt"] = now;

    await ref.update(updates);
    return res.json({ ok: true, id: req.params.id, updates });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update product" });
  }
});

// ---------- DELETE (doar owner) ----------
router.delete("/:id", async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    await ref.delete();
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to delete product" });
  }
});

export default router;
