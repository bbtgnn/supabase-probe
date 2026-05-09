const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const requiredEnv = ["DATABASE_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.warn(`Missing env vars: ${missingEnv.join(", ")}`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/status", async (_req, res) => {
  const startedAt = Date.now();
  const payload = {
    ok: false,
    app: "up",
    db: "down",
    latencyMs: null,
    timestamp: new Date().toISOString()
  };

  if (!process.env.DATABASE_URL) {
    payload.latencyMs = Date.now() - startedAt;
    payload.error = "DATABASE_URL is not configured";
    return res.status(503).json(payload);
  }

  try {
    const result = await pool.query("select 1 as ok;");
    payload.ok = result.rows?.[0]?.ok === 1;
    payload.db = payload.ok ? "up" : "degraded";
    payload.latencyMs = Date.now() - startedAt;
    return res.status(payload.ok ? 200 : 503).json(payload);
  } catch (error) {
    payload.latencyMs = Date.now() - startedAt;
    payload.error = error.message;
    return res.status(503).json(payload);
  }
});

app.get("/api/healthz", (_req, res) => {
  res.status(200).json({ ok: true, app: "up", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
