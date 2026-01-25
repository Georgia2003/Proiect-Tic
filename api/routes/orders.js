import { Router } from "express";
import { db, admin } from "../src/firebaseAdmin.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const ordersCol = db.collection("orders");

// helpers
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

// ---------- GET all (doar order-urile userului logat) ----------
router.get("/", async (req, res) => {
  try {
    const snap = await ordersCol
      .where("userId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(orders);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    console.error("code:", err?.code, "message:", err?.message);
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
    return res.status(500).json({ error: err?.message || "Failed to load order" });
  }
});

// ---------- POST create ----------
router.post("/", async (req, res) => {
  try {
    const { products, status, shipping } = req.body;

    // products: [{ productId, quantity, priceAtPurchase, productSnapshot }]
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products must be a non-empty array" });
    }

    const cleanProducts = [];
    for (const p of products) {
      const productId = isNonEmptyString(p?.productId) ? p.productId.trim() : "";
      const qty = toNumber(p?.quantity);
      const priceAtPurchase = toNumber(p?.priceAtPurchase);

      if (!productId) return res.status(400).json({ error: "Each product needs productId" });
      if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: "quantity must be > 0" });
      if (Number.isNaN(priceAtPurchase) || priceAtPurchase < 0) {
        return res.status(400).json({ error: "priceAtPurchase must be >= 0" });
      }

      cleanProducts.push({
        productId,
        quantity: qty,
        priceAtPurchase,
        productSnapshot: p?.productSnapshot || {},
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const newOrder = {
      userId: req.user.uid,
      products: cleanProducts,
      status: isNonEmptyString(status) ? status.trim() : "processing",
      shipping: {
        address: isNonEmptyString(shipping?.address) ? shipping.address.trim() : "",
        city: isNonEmptyString(shipping?.city) ? shipping.city.trim() : "",
        tracking: isNonEmptyString(shipping?.tracking) ? shipping.tracking.trim() : "",
      },
      createdAt: now,
      updatedAt: now,
    };

    const created = await ordersCol.add(newOrder);
    return res.status(201).json({ id: created.id, ...newOrder });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to create order" });
  }
});

// ---------- PUT update (doar owner) ----------
router.put("/:id", async (req, res) => {
  try {
    const ref = ordersCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    const { status, shipping } = req.body;
    const updates = {};

    if (status !== undefined) {
      if (!isNonEmptyString(status)) return res.status(400).json({ error: "status must be non-empty" });
      updates.status = status.trim();
    }

    if (shipping !== undefined) {
      updates.shipping = {
        address: isNonEmptyString(shipping?.address) ? shipping.address.trim() : data.shipping?.address || "",
        city: isNonEmptyString(shipping?.city) ? shipping.city.trim() : data.shipping?.city || "",
        tracking: isNonEmptyString(shipping?.tracking) ? shipping.tracking.trim() : data.shipping?.tracking || "",
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    updates.updatedAt = now;

    await ref.update(updates);
    return res.json({ ok: true, id: req.params.id, updates });
  } catch (err) {
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
    return res.status(500).json({ error: err?.message || "Failed to delete order" });
  }
});

export default router;
