const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const requiredEnv = ["DATABASE_URL", "DIRECT_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.warn(`Missing env vars: ${missingEnv.join(", ")}`);
}

const sslConfig =
  process.env.DB_SSL === "true"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : false;

const connectionTargets = [
  { key: "DATABASE_URL", label: "pooled" },
  { key: "DIRECT_URL", label: "direct" }
];

const pools = Object.fromEntries(
  connectionTargets
    .filter(({ key }) => Boolean(process.env[key]))
    .map(({ key }) => [
      key,
      new Pool({
        connectionString: process.env[key],
        ssl: sslConfig
      })
    ])
);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/status", async (_req, res) => {
  const startedAt = Date.now();
  const payload = {
    ok: false,
    app: "up",
    db: "down",
    connections: {},
    latencyMs: null,
    timestamp: new Date().toISOString()
  };

  if (missingEnv.length > 0) {
    payload.latencyMs = Date.now() - startedAt;
    payload.error = `Missing env vars: ${missingEnv.join(", ")}`;
    return res.status(503).json(payload);
  }

  try {
    const checks = await Promise.all(
      connectionTargets.map(async ({ key, label }) => {
        const pool = pools[key];

        if (!pool) {
          return {
            key,
            label,
            ok: false,
            status: "down",
            error: `${key} is not configured`
          };
        }

        try {
          const result = await pool.query("select 1 as ok;");
          const ok = result.rows?.[0]?.ok === 1;
          return {
            key,
            label,
            ok,
            status: ok ? "up" : "degraded"
          };
        } catch (error) {
          return {
            key,
            label,
            ok: false,
            status: "down",
            error: error.message
          };
        }
      })
    );

    payload.connections = Object.fromEntries(
      checks.map(({ key, label, status, error }) => [
        key,
        {
          label,
          status,
          ...(error ? { error } : {})
        }
      ])
    );
    payload.ok = checks.every((check) => check.ok);
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
