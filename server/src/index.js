import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import ejs from "ejs";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import dashboardRoutes from "./routes/dashboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const VIEWS = path.join(__dirname, "../views");

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const origins = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (origin, cb) => {
    const normalize = (o) => (o || "").replace(/^https?:\/\/(www\.)?/, "https://");
    if (!origin || origins.includes("*") || origins.includes(origin) || origins.includes("null")) {
      cb(null, true);
      return;
    }
    if (origins.some((allowed) => normalize(allowed) === normalize(origin))) {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-secret",
});

app.decorate("authenticate", async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
});

await app.register(fastifyView, {
  engine: { ejs },
  root: VIEWS,
  viewExt: "ejs",
});

app.get("/health", async () => ({ ok: true, service: "agriksense-api" }));
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(adminRoutes, { prefix: "/api/admin" });
await app.register(dashboardRoutes, { prefix: "/api/dashboards" });

app.get("/", async (_request, reply) => reply.view("index.ejs"));
app.get("/login", async (_request, reply) => reply.view("login.ejs"));
app.get("/signup", async (_request, reply) => reply.view("signup.ejs"));
app.get("/dashboard", async (_request, reply) => reply.view("dashboard.ejs"));
app.get("/farmers", async (_request, reply) => reply.view("farmers.ejs"));
app.get("/farms", async (_request, reply) => reply.view("farms.ejs"));
app.get("/farmer-dashboard", async (_request, reply) => reply.view("farmer-dashboard.ejs"));
app.get("/dco-dashboard", async (_request, reply) => reply.view("dco-dashboard.ejs"));
app.get("/org-dashboard", async (_request, reply) => reply.view("org-dashboard.ejs"));
app.get("/drone", async (_request, reply) => reply.view("drone.ejs"));
app.get("/iot", async (_request, reply) => reply.view("iot.ejs"));
app.get("/advisory", async (_request, reply) => reply.view("advisory.ejs"));
app.get("/agriscore", async (_request, reply) => reply.view("agriscore.ejs"));
app.get("/analytics", async (_request, reply) => reply.view("analytics.ejs"));

await app.register(fastifyStatic, {
  root: path.join(ROOT, "css"),
  prefix: "/css/",
  decorateReply: false,
});

await app.register(fastifyStatic, {
  root: path.join(ROOT, "js"),
  prefix: "/js/",
  decorateReply: false,
});

await app.register(fastifyStatic, {
  root: path.join(ROOT, "images"),
  prefix: "/images/",
  decorateReply: false,
});

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Agriksense running on http://localhost:${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
