import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { generateUniquePlatformId } from "../utils/id-generator.js";
import { issueTokenPair, verifyRefreshToken, hashToken } from "../utils/jwt.js";
import { NotificationService } from "../services/notification.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  farmerSignUpSchema,
  dcoSignUpSchema,
  orgSignUpSchema,
  loginSchema,
  refreshSchema,
  validate,
} from "../middleware/validate.js";

function publicUser(user) {
  return {
    id: user.id,
    platformId: user.platformId,
    role: user.role,
    email: user.email,
    phoneNumber: user.phoneNumber,
    authProvider: user.authProvider,
    onboardingStep: user.onboardingStep,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function getProfile(user) {
  if (user.farmerProfile) {
    return {
      type: "farmer",
      firstName: user.farmerProfile.firstName,
      lastName: user.farmerProfile.lastName,
      otherName: user.farmerProfile.otherName,
      consentAccepted: user.farmerProfile.consentAccepted,
    };
  }
  if (user.dcoProfile) {
    return {
      type: "dco",
      firstName: user.dcoProfile.firstName,
      lastName: user.dcoProfile.lastName,
      otherName: user.dcoProfile.otherName,
    };
  }
  if (user.orgProfile) {
    return {
      type: "organization",
      orgName: user.orgProfile.orgName,
    };
  }
  return null;
}

async function registerFarmer(request, reply) {
  const data = validate(farmerSignUpSchema, request, reply);
  if (!data) return reply;
  const { firstName, lastName, otherName, phoneNumber, email, password, consentAccepted } = data;
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ phoneNumber }, ...(email ? [{ email: email.toLowerCase() }] : [])] },
    });
    if (existing) {
      return reply.code(409).send({ success: false, message: "Phone number already registered" });
    }

    const platformId = await generateUniquePlatformId();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          platformId,
          role: "FARMER",
          email: email ? email.toLowerCase() : null,
          phoneNumber,
          passwordHash,
          authProvider: "LOCAL",
          onboardingStep: "PHASE_1_BASIC",
          farmerProfile: {
            create: {
              firstName,
              lastName,
              otherName: otherName || null,
              consentAccepted: !!consentAccepted,
              consentAcceptedAt: consentAccepted ? new Date() : null,
            },
          },
        },
        include: { farmerProfile: true, dcoProfile: true, orgProfile: true },
      });
    });

    await NotificationService.sendFarmerSms(user.phoneNumber, user.platformId);
    const tokens = await issueTokenPair(request.server, user.id, user.platformId, user.role);

    return reply.code(201).send({
      success: true,
      message: "Farmer account created successfully",
      data: {
        platformId: user.platformId,
        role: user.role,
        onboardingStep: user.onboardingStep,
        profile: getProfile(user),
        ...tokens,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: error.message });
  }
}

async function registerDco(request, reply) {
  const data = validate(dcoSignUpSchema, request, reply);
  if (!data) return reply;
  const { firstName, lastName, otherName, email, phoneNumber, password } = data;
  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { phoneNumber }] },
    });
    if (existingUser) {
      return reply.code(409).send({ success: false, message: "Email or phone number already in use" });
    }

    const platformId = await generateUniquePlatformId();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          platformId,
          role: "DATA_COLLECTION_OFFICER",
          email: email.toLowerCase(),
          phoneNumber,
          passwordHash,
          authProvider: "LOCAL",
          onboardingStep: "PHASE_1_BASIC",
          dcoProfile: {
            create: {
              firstName,
              lastName,
              otherName: otherName || null,
            },
          },
        },
        include: { farmerProfile: true, dcoProfile: true, orgProfile: true },
      });
    });

    await NotificationService.sendDcoWhatsApp(user.phoneNumber, user.platformId);
    const tokens = await issueTokenPair(request.server, user.id, user.platformId, user.role);

    return reply.code(201).send({
      success: true,
      message: "Data Collection Officer account created successfully",
      data: {
        platformId: user.platformId,
        role: user.role,
        onboardingStep: user.onboardingStep,
        profile: getProfile(user),
        ...tokens,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: error.message });
  }
}

async function registerOrg(request, reply) {
  const data = validate(orgSignUpSchema, request, reply);
  if (!data) return reply;
  const { orgName, email, phoneNumber, password } = data;
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, ...(phoneNumber ? [{ phoneNumber }] : [])] },
    });
    if (existing) {
      return reply.code(409).send({ success: false, message: "Email is already registered" });
    }

    const platformId = await generateUniquePlatformId();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          platformId,
          role: "ORGANIZATION",
          email: email.toLowerCase(),
          phoneNumber: phoneNumber || null,
          passwordHash,
          authProvider: "LOCAL",
          onboardingStep: "PHASE_1_BASIC",
          orgProfile: {
            create: { orgName },
          },
        },
        include: { farmerProfile: true, dcoProfile: true, orgProfile: true },
      });
    });

    await NotificationService.sendOrgWelcome(user.email, user.platformId);
    const tokens = await issueTokenPair(request.server, user.id, user.platformId, user.role);

    return reply.code(201).send({
      success: true,
      message: "Organization account created successfully",
      data: {
        platformId: user.platformId,
        role: user.role,
        onboardingStep: user.onboardingStep,
        profile: getProfile(user),
        ...tokens,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: error.message });
  }
}

async function login(request, reply) {
  const data = validate(loginSchema, request, reply);
  if (!data) return reply;
  const { identifier, password } = data;
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
          { platformId: identifier },
        ],
      },
      include: { farmerProfile: true, dcoProfile: true, orgProfile: true },
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({ success: false, message: "Invalid credentials" });
    }
    if (!user.isActive) {
      return reply.code(403).send({ success: false, message: "Account has been disabled. Contact admin" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.code(401).send({ success: false, message: "Invalid credentials" });
    }

    const tokens = await issueTokenPair(request.server, user.id, user.platformId, user.role);

    return reply.code(200).send({
      success: true,
      message: "Login successful",
      data: {
        platformId: user.platformId,
        role: user.role,
        onboardingStep: user.onboardingStep,
        profile: getProfile(user),
        ...tokens,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: error.message });
  }
}

async function refreshToken(request, reply) {
  const data = validate(refreshSchema, request, reply);
  if (!data) return reply;
  const { refreshToken: token } = data;

  let decoded;
  try {
    decoded = verifyRefreshToken(request.server, token);
  } catch {
    return reply.code(401).send({ success: false, message: "Invalid or expired refresh token" });
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    return reply.code(401).send({ success: false, message: "Invalid or expired refresh token" });
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  const tokens = await issueTokenPair(request.server, decoded.sub, decoded.platformId, decoded.role);
  return reply.code(200).send({ success: true, data: tokens });
}

async function getCurrentUser(request, reply) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: { farmerProfile: true, dcoProfile: true, orgProfile: true, bankAccounts: true },
  });
  if (!user || !user.isActive) {
    return reply.code(404).send({ success: false, message: "User not found" });
  }
  return reply.code(200).send({
    success: true,
    data: {
      ...publicUser(user),
      profile: getProfile(user),
    },
  });
}

export default async function authRoutes(fastify) {
  fastify.post("/signup/farmer", registerFarmer);
  fastify.post("/signup/dco", registerDco);
  fastify.post("/signup/organization", registerOrg);
  fastify.post("/login", login);
  fastify.post("/refresh-token", refreshToken);
  fastify.get("/me", { onRequest: [requireAuth] }, getCurrentUser);
}