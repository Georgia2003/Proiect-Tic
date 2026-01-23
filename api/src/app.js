import express from "express";
import cors from "cors";
import morgan from "morgan";

import productsRouter from "../routes/products.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true, status: "healthy" }));

app.use("/api/products", productsRouter);

export default app;
