"use strict";
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "aagriksense@gmail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "37qPM8renFTCuAT";
const ADMIN_PHONE = process.env.ADMIN_PHONE || null;

function generatePlatformId() {
  let id = "";
  for (let i = 0; i < 10; i++) id += Math.floor(Math.random() * 10);
  return id;
}

async function uniquePlatformId() {
  for (let i = 0; i < 20; i++) {
    const candidate = generatePlatformId();
    const existing = await prisma.user.findUnique({ where: { platformId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate unique platformId");
}

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existing = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          passwordHash,
          isActive: true,
          ...(ADMIN_PHONE ? { phoneNumber: ADMIN_PHONE } : {}),
        },
      });
      console.log(`seed-admin: promoted ${ADMIN_EMAIL} to ADMIN and reset password`);
    } else {
      const platformId = await uniquePlatformId();
      await prisma.user.create({
        data: {
          platformId,
          role: "ADMIN",
          email: ADMIN_EMAIL,
          passwordHash,
          authProvider: "LOCAL",
          ...(ADMIN_PHONE ? { phoneNumber: ADMIN_PHONE } : {}),
        },
      });
      console.log(`seed-admin: created ADMIN account ${ADMIN_EMAIL} (platformId ${platformId})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { seedAdmin };