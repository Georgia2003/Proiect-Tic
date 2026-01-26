import { Router } from "express";
import { db, admin } from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

import { validateBody } from "../src/validators/validate.js";
import { orderCreateSchema, orderUpdateSchema } from "../src/validators/orders.schema.js";

const router = Router();
router.use(requireAuth);

const ordersCol = db.collection("orders");

// ---------- GET all (cu sortare + paginare) ----------
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const sortByRaw = String(req.query.sortBy || "createdAt");
    const orderRaw = String(req.query.order || "desc").toLowerCase();
    const pageToken = req.query.pageToken ? String(req.query.pageToken) : null;

    const allowedSort = new Set(["createdAt", "updatedAt", "status"]);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "createdAt";
    const order = orderRaw === "asc" ? "asc" : "desc";

    let q = ordersCol
      .where("userId", "==", req.user.uid)
      .orderBy(sortBy, order)
      .limit(limit);

    if (pageToken) {
      const lastDoc = await ordersCol.doc(pageToken).get();
      if (lastDoc.exists) {
        q = ordersCol
          .where("userId", "==", req.user.uid)
          .orderBy(sortBy, order)
          .startAfter(lastDoc)
          .limit(limit);
      }
    }

    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const nextPageToken = snap.docs.length
      ? snap.docs[snap.docs.length - 1].id
      : null;

    return res.json({ items, nextPageToken, limit, sortBy, order });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return res.status(500).json({ error: err?.message || "Failed to load orders" });
  }
});

// ---------- GET one (doar owner) ----------
router.get("/:id", async (req, res) => {
  try {
    const ref = ordersCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    return res.json({ id: docSnap.id, ...data });
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    return res.status(500).json({ error: err?.message || "Failed to load order" });
  }
});

// ---------- POST create ----------
router.post("/", validateBody(orderCreateSchema), async (req, res) => {
  try {
    const { products, status, shipping } = req.body;

    // Joi a validat deja. Aici doar adăugăm productName din Firestore.
    const cleanProducts = [];

    for (const p of products) {
      let productName = "";

      try {
        const productDoc = await db.collection("products").doc(p.productId).get();
        if (productDoc.exists) productName = productDoc.data()?.name || "";
      } catch (err) {
        console.warn("Could not fetch product name for", p.productId, err);
      }

      cleanProducts.push({
        productId: p.productId,
        productName,
        quantity: p.quantity,
        priceAtPurchase: p.priceAtPurchase,
        productSnapshot: p.productSnapshot || {},
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const newOrder = {
      userId: req.user.uid,
      products: cleanProducts,
      status,   // deja validat/curățat de Joi
      shipping, // deja validat/curățat de Joi
      createdAt: now,
      updatedAt: now,
    };

    const created = await ordersCol.add(newOrder);
    return res.status(201).json({ id: created.id, ...newOrder });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return res.status(500).json({ error: err?.message || "Failed to create order" });
  }
});

// ---------- PUT update (doar owner) ----------
router.put("/:id", validateBody(orderUpdateSchema), async (req, res) => {
  try {
    const ref = ordersCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    const { status, shipping } = req.body;
    const updates = {};

    if (status !== undefined) updates.status = status;
    if (shipping !== undefined) updates.shipping = shipping;

    const now = admin.firestore.FieldValue.serverTimestamp();
    updates.updatedAt = now;

    await ref.update(updates);
    return res.json({ ok: true, id: req.params.id, updates });
  } catch (err) {
    console.error("PUT /api/orders error:", err);
    return res.status(500).json({ error: err?.message || "Failed to update order" });
  }
});

// ---------- DELETE (doar owner) ----------
router.delete("/:id", async (req, res) => {
  try {
    const ref = ordersCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    await ref.delete();
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    console.error("DELETE /api/orders error:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete order" });
  }
});

export default router;
