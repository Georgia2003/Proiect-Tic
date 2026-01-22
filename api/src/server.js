import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";

import admin from "firebase-admin";

// ========== Firebase Admin init ==========
// Varianta 1: cu fișier JSON (cel mai simplu la început)
// 1) pui fișierul serviceAccountKey.json în api/ (sau api/src/)
// 2) în .env pui: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
//
// Varianta 2: cu env (mai clean) – îți explic după ce merge varianta 1.

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

// ========== App init ==========
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ========== Helpers ==========
function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

// ========== Auth middleware ==========
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ========== Base routes ==========
app.get("/", (req, res) => res.send("API is running ✅"));

app.get("/health", (req, res) => res.json({ ok: true, status: "healthy" }));

// Debug endpoint (îl arăți la prezentare)
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ========== PRODUCTS CRUD ==========
const productsCol = db.collection("products");

// READ all (doar ale userului)
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const snap = await productsCol
      .where("ownerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to load products" });
  }
});

// READ one (doar dacă e owner)
app.get("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ id: docSnap.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to load product" });
  }
});

// CREATE
app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "Name is required" });
    }

    const p = toNumber(price);
    if (Number.isNaN(p) || p < 0) {
      return res.status(400).json({ error: "Price must be a number >= 0" });
    }

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
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// UPDATE (doar owner)
app.put("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const { name, price, description } = req.body;

    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = {};

    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        return res.status(400).json({ error: "Name must be non-empty" });
      }
      updates.name = name.trim();
    }

    if (price !== undefined) {
      const p = toNumber(price);
      if (Number.isNaN(p) || p < 0) {
        return res.status(400).json({ error: "Price must be a number >= 0" });
      }
      updates.price = p;
    }

    if (description !== undefined) {
      updates.description = isNonEmptyString(description) ? description.trim() : "";
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(updates);
    res.json({ ok: true, id: req.params.id, updates });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE (doar owner)
app.delete("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const ref = productsCol.doc(req.params.id);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

    const data = docSnap.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await ref.delete();
    res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ========== Start ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
