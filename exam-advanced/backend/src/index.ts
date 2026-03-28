import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

// TODO: POST /reservations
// TODO: GET /reservations

const port = Number(process.env.PORT) || 8080;
console.log(`Backend running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
