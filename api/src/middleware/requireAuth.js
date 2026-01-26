// api/src/middleware/requireAuth.js
import { auth as firebaseAuth, db, admin } from "../firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const idToken = match[1].trim();
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    // set user on request
    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
    };

    // ---- Upsert users/{uid} (auto create user doc) ----
    try {
      const userRef = db.collection("users").doc(req.user.uid);
      const snap = await userRef.get();
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (!snap.exists) {
        await userRef.set({
          email: req.user.email || "",
          createdAt: now,
          lastLoginAt: now,
        });
      } else {
        await userRef.set(
          {
            email: req.user.email || snap.data()?.email || "",
            lastLoginAt: now,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn("users upsert failed:", e?.message || e);
      // nu blocăm request-ul dacă upsert-ul de users pică
    }

    return next();
  } catch (err) {
    console.error("requireAuth error:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
