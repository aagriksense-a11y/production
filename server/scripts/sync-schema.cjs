"use strict";
const { execSync } = require("node:child_process");

const dbUrl = process.env.DATABASE_URL || "";
const isProduction = process.env.NODE_ENV === "production" || /\.(ohio|oregon|virginia)-postgres\./i.test(dbUrl);

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

try {
  run("npx prisma generate");
} catch (err) {
  console.warn("schema-sync: prisma generate failed.", err.message);
}

const pushCmd = isProduction ? "npx prisma db push --accept-data-loss" : "npx prisma db push";
try {
  run(pushCmd);
  console.log(`schema-sync: db push ${pushCmd.includes("--accept-data-loss") ? "(with data-loss accepted, production)" : "(safe, non-production)"}`);
} catch (err) {
  console.error("schema-sync: db push failed.", err.message);
  process.exit(1);
}