import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const signupSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  organization: z.string().trim().min(1).max(160).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128),
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    organization: user.organization,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export default async function authRoutes(fastify) {
  fastify.post("/signup", async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { firstName, lastName, email, organization, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return reply.code(409).send({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        organization: organization || null,
        passwordHash,
      },
    });

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.code(201).send({
      message: "Account created",
      token,
      user: publicUser(user),
    });
  });

  fastify.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.send({
      message: "Logged in",
      token,
      user: publicUser(user),
    });
  });

  fastify.get("/me", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
    });
    if (!user || !user.isActive) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    return { user: publicUser(user) };
  });
}
