import { admin } from "../firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
