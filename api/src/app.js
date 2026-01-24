import express from "express";
import cors from "cors";
import morgan from "morgan";

import productsRouter from "../routes/products.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true, status: "healthy" }));

// endpoint de demo: arată că token-ul e valid și cine e userul
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.use("/api/products", productsRouter);

export default app;
