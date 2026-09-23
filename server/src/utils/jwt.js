import crypto from "node:crypto";
import prisma from "../lib/prisma.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "access-secret-key-123";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret-key-456";

export function generateAccessToken(fastify, payload) {
  return fastify.jwt.sign(payload, { secret: ACCESS_SECRET, expiresIn: "15m" });
}

export function generateRefreshToken(fastify, payload) {
  return fastify.jwt.sign(payload, { secret: REFRESH_SECRET, expiresIn: "7d" });
}

export function verifyAccessToken(fastify, token) {
  return fastify.jwt.verify(token, { secret: ACCESS_SECRET });
}

export function verifyRefreshToken(fastify, token) {
  return fastify.jwt.verify(token, { secret: REFRESH_SECRET });
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueTokenPair(fastify, userId, platformId, role) {
  const payload = { sub: userId, platformId, role };
  const accessToken = generateAccessToken(fastify, payload);
  const refreshToken = generateRefreshToken(fastify, payload);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt,
    },
  });
  return { accessToken, refreshToken };
}