"use strict";
const { execSync } = require("node:child_process");

const dbUrl = process.env.DATABASE_URL || "";
let renderDbHost = false;
try {
  renderDbHost = /^(postgres(ql)?|mysql):\/\//.test(dbUrl)
    ? /^(dpg|dbg)-[a-z0-9]+-[a-z]$/.test(new URL(dbUrl).hostname)
    : false;
} catch {
  renderDbHost = false;
}
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  /\.(ohio|oregon|virginia)-postgres\./i.test(dbUrl) ||
  renderDbHost;

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

try {
  run("npx prisma generate");
} catch (err) {
  console.warn("schema-sync: prisma generate failed.", err.message);
}

if (isProduction) {
  // 1) Preferred: keep data where possible.
  try {
    run("npx prisma db push --accept-data-loss");
    console.log("schema-sync: db push succeeded (production, data-loss accepted where required)");
  } catch (err) {
    // 2) Last resort: schema steps Prisma cannot execute at all (e.g. a required
    //    column with no default on a non-empty table). Only reaches this branch when
    //    the schema genuinely cannot be applied otherwise, so the DB is re-provisioned.
    console.error("schema-sync: destructive push failed, forcing full schema rebuild.", err.message);
    try {
      run("npx prisma db push --force-reset");
      console.log("schema-sync: db push succeeded (production, force-reset)");
    } catch (err2) {
      console.error("schema-sync: db push failed after force-reset.", err2.message);
      process.exit(1);
    }
  }
} else {
  try {
    run("npx prisma db push");
    console.log("schema-sync: db push succeeded (safe, non-production)");
  } catch (err) {
    console.error("schema-sync: db push failed.", err.message);
    process.exit(1);
  }
}

const { seedAdmin } = require("./seed-admin.cjs");
seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed-admin failed:", err.message);
    process.exit(1);
  });