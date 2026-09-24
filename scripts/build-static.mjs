import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ejs = require("ejs");
const renderFile = promisify(ejs.renderFile);

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const VIEWS = path.join(ROOT, "server", "views");
const OUT = path.join(ROOT, "dist");

const PAGES = [
  { name: "index", file: "index.ejs", data: {} },
  { name: "login", file: "login.ejs", data: {} },
  { name: "signup", file: "signup.ejs", data: {} },
  { name: "dashboard", file: "dashboard.ejs", data: { title: "Dashboard", active: "dashboard" } },
  { name: "farmers", file: "farmers.ejs", data: { title: "Farmers", active: "farmers" } },
  { name: "farms", file: "farms.ejs", data: { title: "Farms & Plots", active: "farms" } },
  { name: "farmer-dashboard", file: "farmer-dashboard.ejs", data: { title: "Farmer Dashboard", active: "dashboard" } },
  { name: "dco-dashboard", file: "dco-dashboard.ejs", data: { title: "DCO Dashboard", active: "dashboard" } },
  { name: "org-dashboard", file: "org-dashboard.ejs", data: { title: "Organization Dashboard", active: "dashboard" } },
  { name: "drone", file: "drone.ejs", data: { title: "Drone Monitoring", active: "drone" } },
  { name: "iot", file: "iot.ejs", data: { title: "IoT Sensors", active: "iot" } },
  { name: "advisory", file: "advisory.ejs", data: { title: "AI Advisory", active: "advisory" } },
  { name: "agriscore", file: "agriscore.ejs", data: { title: "AgriScore", active: "agriscore" } },
  { name: "analytics", file: "analytics.ejs", data: { title: "Analytics", active: "analytics" } },
];

const REDIRECTS = [
  "/api/*  https://production-lvw9.onrender.com/api/:splat  200",
  "/dashboard /dashboard.html 200",
  "/farmers /farmers.html 200",
  "/farms /farms.html 200",
  "/farmer-dashboard /farmer-dashboard.html 200",
  "/dco-dashboard /dco-dashboard.html 200",
  "/org-dashboard /org-dashboard.html 200",
  "/drone /drone.html 200",
  "/iot /iot.html 200",
  "/advisory /advisory.html 200",
  "/agriscore /agriscore.html 200",
  "/analytics /analytics.html 200",
  "/login /login.html 200",
  "/signup /signup.html 200",
].join("\n");

await fs.rm(OUT, { recursive: true, force: true });

for (const page of PAGES) {
  const html = await renderFile(
    path.join(VIEWS, page.file),
    {
      title: page.data.title,
      active: page.data.active,
    },
    { root: VIEWS }
  );
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, `${page.name}.html`), html, "utf8");
}

await fs.writeFile(path.join(OUT, "_redirects"), REDIRECTS, "utf8");

for (const dir of ["css", "js", "images"]) {
  await fs.cp(path.join(ROOT, dir), path.join(OUT, dir), { recursive: true });
}

console.log(`Built ${PAGES.length} pages to ${OUT}`);
for (const f of await fs.readdir(OUT)) console.log(" - " + f);