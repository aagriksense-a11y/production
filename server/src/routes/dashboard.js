import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

function fmtNum(n) {
  if (n === null || n === undefined) return null;
  return Math.round(n * 10) / 10;
}

async function farmerDashboard(request) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: {
      farmerProfile: { include: { organizationMemberships: { include: { organization: true } } } },
      bankAccounts: true,
      farms: {
        include: {
          plots: { include: { sensors: { include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } } }, advisories: { orderBy: { createdAt: "desc" }, take: 3 } } },
        },
      },
    },
  });
  if (!user || !user.farmerProfile) {
    return { error: { status: 404, message: "Farmer profile not found" } };
  }

  const p = user.farmerProfile;
  const allPlots = user.farms.flatMap((f) => f.plots);
  const allSensors = allPlots.flatMap((pl) => pl.sensors);
  const totalArea = allPlots.reduce((a, pl) => a + (pl.areaHa || 0), 0);

  return {
    platformId: user.platformId,
    onboardingStep: user.onboardingStep,
    profile: {
      firstName: p.firstName,
      lastName: p.lastName,
      otherName: p.otherName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      state: p.state,
      lga: p.lga,
      cityTown: p.cityTown,
      address: p.address,
      nin: p.nin,
      ninStatus: p.ninStatus,
      agriScore: p.agriScore,
      creditReady: p.creditReady,
      managerName: p.managerName,
      managerPhone: p.managerPhone,
    },
    memberships: (p.organizationMemberships || []).map((m) => ({
      id: m.id,
      membershipId: m.membershipId,
      isVerified: m.isVerified,
      verifiedAt: m.verifiedAt,
      orgName: m.organization?.orgName || "Organization",
    })),
    bankAccounts: user.bankAccounts.map((b) => ({ id: b.id, accountName: b.accountName, accountNumber: b.accountNumber, bankName: b.bankName })),
    farms: user.farms.map((f) => ({
      id: f.id,
      name: f.name,
      state: f.state,
      lga: f.lga,
      cityTown: f.cityTown,
      address: f.address,
      plots: f.plots.map((pl) => ({
        id: pl.id,
        name: pl.name,
        crop: pl.crop,
        areaHa: fmtNum(pl.areaHa),
        soilHealth: pl.soilHealth,
        soilMoisture: pl.soilMoisture,
        stressLevel: pl.stressLevel,
        status: pl.status,
        mapStatus: pl.mapStatus,
        sensors: pl.sensors.map((s) => ({
          id: s.id,
          name: s.name,
          sensorType: s.sensorType,
          status: s.status,
          battery: s.battery,
          lastReading: s.readings[0] ? { value: s.readings[0].value, unit: s.readings[0].unit } : null,
        })),
        advisories: pl.advisories.map((a) => ({ id: a.id, title: a.title, body: a.body, priority: a.priority, sent: a.sent, createdAt: a.createdAt })),
      })),
    })),
    stats: {
      farms: user.farms.length,
      plots: allPlots.length,
      areaHa: fmtNum(totalArea),
      sensors: allSensors.length,
      sensorsOnline: allSensors.filter((s) => s.status === "ONLINE").length,
    },
  };
}

async function dcoDashboard(request) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: {
      dcoProfile: true,
      bankAccounts: true,
      visitRequests: { include: { farms: true }, orderBy: { createdAt: "desc" }, take: 50 },
      assignments: { include: { farm: { include: { plots: true, owner: { include: { farmerProfile: true } } } } }, orderBy: { assignedAt: "desc" }, take: 50 },
    },
  });
  if (!user || !user.dcoProfile) {
    return { error: { status: 404, message: "DCO profile not found" } };
  }
  const p = user.dcoProfile;

  const rates = await prisma.fareRate.findMany({ select: { state: true, costPerMile: true } });
  const myFare = rates.find((r) => r.state === p.state) || null;

  return {
    platformId: user.platformId,
    onboardingStep: user.onboardingStep,
    profile: {
      firstName: p.firstName,
      lastName: p.lastName,
      otherName: p.otherName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      state: p.state,
      lga: p.lga,
      cityTown: p.cityTown,
      address: p.address,
      nin: p.nin,
      ninStatus: p.ninStatus,
    },
    fareRate: myFare,
    visitRequests: user.visitRequests.map((r) => ({
      id: r.id,
      status: r.status,
      farmCount: r.farmCount,
      estimatedCost: r.estimatedCost,
      notes: r.notes,
      createdAt: r.createdAt,
      farms: r.farms.map((f) => ({ id: f.id, farmName: f.farmName, address: f.address, state: f.state, transportCost: f.transportCost, distanceKm: f.distanceKm })),
    })),
    assignments: user.assignments.map((a) => ({
      id: a.id,
      status: a.status,
      assignedAt: a.assignedAt,
      visitedAt: a.visitedAt,
      farm: {
        id: a.farm.id,
        name: a.farm.name,
        state: a.farm.state,
        lga: a.farm.lga,
        cityTown: a.farm.cityTown,
        address: a.farm.address,
        farmer: a.farm.owner.farmerProfile ? `${a.farm.owner.farmerProfile.firstName} ${a.farm.owner.farmerProfile.lastName}` : "—",
        farmerPhone: a.farm.owner.phoneNumber,
        plots: a.farm.plots.map((pl) => ({ name: pl.name, crop: pl.crop, areaHa: fmtNum(pl.areaHa) })),
      },
    })),
  };
}

async function orgDashboard(request) {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: {
      orgProfile: { include: { directors: true } },
      bankAccounts: true,
    },
  });
  if (!user || !user.orgProfile) {
    return { error: { status: 404, message: "Organization profile not found" } };
  }
  const o = user.orgProfile;

  const members = await prisma.organizationMembership.findMany({
    where: { orgId: user.id },
    include: { farmer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return {
    platformId: user.platformId,
    onboardingStep: user.onboardingStep,
    org: {
      orgName: o.orgName,
      headquartersAddress: o.headquartersAddress,
      cityTown: o.cityTown,
      lga: o.lga,
      state: o.state,
      isRegistered: o.isRegistered,
      cacNumber: o.cacNumber,
      cacStatus: o.cacStatus,
      email: user.email,
      phoneNumber: user.phoneNumber,
    },
    directors: o.directors,
    bankAccounts: user.bankAccounts.map((b) => ({ id: b.id, accountName: b.accountName, accountNumber: b.accountNumber, bankName: b.bankName })),
    members: members.map((m) => ({
      id: m.id,
      membershipId: m.membershipId,
      isVerified: m.isVerified,
      verifiedAt: m.verifiedAt,
      createdAt: m.createdAt,
      farmer: {
        id: m.farmer?.user?.id,
        platformId: m.farmer?.user?.platformId,
        name: m.farmer ? `${m.farmer.firstName} ${m.farmer.lastName}` : "—",
        phoneNumber: m.farmer?.user?.phoneNumber,
        state: m.farmer?.state,
        lga: m.farmer?.lga,
      },
    })),
  };
}

async function createOrgMember(request, reply) {
  const b = request.body || {};
  const { firstName, lastName, phoneNumber, email, membershipId, state, lga, cityTown, address } = b;
  if (!firstName || !lastName || !phoneNumber) {
    return reply.code(400).send({ success: false, message: "firstName, lastName, phoneNumber are required" });
  }

  const user = await prisma.user.findUnique({ where: { id: request.user.sub }, include: { orgProfile: true } });
  if (!user || !user.orgProfile) return reply.code(404).send({ success: false, message: "Organization profile not found" });

  let farmer = await prisma.user.findFirst({ where: { OR: [{ phoneNumber }, ...(email ? [{ email: email.toLowerCase() }] : [])] } });
  let farmerProfileId;
  if (farmer) {
    if (farmer.role !== "FARMER" || !farmer.farmerProfile) {
      return reply.code(409).send({ success: false, message: "Phone number belongs to a non-farmer account" });
    }
    farmerProfileId = farmer.farmerProfile.id;
  } else {
    const pid = (await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id"))[0].id;
    farmer = await prisma.user.create({
      data: {
        platformId: pid,
        role: "FARMER",
        phoneNumber,
        email: email ? email.toLowerCase() : null,
        authProvider: "LOCAL",
        onboardingStep: "PHASE_1_BASIC",
        farmerProfile: {
          create: {
            firstName,
            lastName,
            otherName: b.otherName || null,
            state,
            lga,
            cityTown,
            address,
            consentAccepted: true,
          },
        },
      },
      include: { farmerProfile: true },
    });
    farmerProfileId = farmer.farmerProfile.id;
  }

  const exists = await prisma.organizationMembership.findFirst({ where: { farmerId: farmer.id, orgId: user.id } });
  if (exists) return reply.code(409).send({ success: false, message: "Farmer is already a member" });

  const membership = await prisma.organizationMembership.create({
    data: {
      farmerId: farmer.id,
      farmerProfileId,
      orgId: user.id,
      orgProfileId: user.orgProfile.id,
      membershipId: membershipId || `KFCU-${Math.floor(1000 + Math.random() * 9000)}`,
      isVerified: false,
    },
  });
  return reply.code(201).send({ success: true, data: { id: membership.id, membershipId: membership.membershipId } });
}

async function createVisitRequest(request, reply) {
  const b = request.body || {};
  const { knownFarms = [], notes } = b;
  const user = await prisma.user.findUnique({ where: { id: request.user.sub }, include: { dcoProfile: true } });
  if (!user || !user.dcoProfile) return reply.code(404).send({ success: false, message: "DCO profile not found" });

  const state = user.dcoProfile.state;
  const rate = await prisma.fareRate.findUnique({ where: { state } }).catch(() => null);
  const costPerMile = rate?.costPerMile || 600;

  let totalCost = 0;
  const farmRows = [];
  if (knownFarms && knownFarms.length) {
    for (const kf of knownFarms) {
      let farm = null;
      if (kf.farmId) farm = await prisma.farm.findUnique({ where: { id: kf.farmId } });
      const dist = kf.distanceKm || 0;
      const cost = Math.round(dist * costPerMile);
      totalCost += cost;
      farmRows.push({
        farmId: farm?.id || null,
        farmName: kf.farmName || farm?.name || "Farm",
        address: kf.address || farm?.address,
        state: farm?.state || state,
        transportCost: cost,
        distanceKm: dist,
      });
    }
  }

  const req = await prisma.farmVisitRequest.create({
    data: {
      dcoUserId: user.id,
      status: "REQUESTED",
      farmCount: farmRows.length,
      estimatedCost: totalCost,
      notes: notes || null,
      farms: { create: farmRows },
    },
    include: { farms: true },
  });

  return reply.code(201).send({ success: true, data: req });
}

export default async function dashboardRoutes(fastify) {
  fastify.get("/farmer", { onRequest: [requireAuth, requireRole("FARMER")] }, async (request) => {
    const out = await farmerDashboard(request);
    if (out.error) return { success: false, message: out.error.message };
    return { success: true, data: out };
  });
  fastify.get("/dco", { onRequest: [requireAuth, requireRole("DATA_COLLECTION_OFFICER")] }, async (request) => {
    const out = await dcoDashboard(request);
    if (out.error) return { success: false, message: out.error.message };
    return { success: true, data: out };
  });
  fastify.get("/organization", { onRequest: [requireAuth, requireRole("ORGANIZATION")] }, async (request) => {
    const out = await orgDashboard(request);
    if (out.error) return { success: false, message: out.error.message };
    return { success: true, data: out };
  });
  fastify.post("/organization/members", { onRequest: [requireAuth, requireRole("ORGANIZATION")] }, createOrgMember);
  fastify.post("/dco/visit-requests", { onRequest: [requireAuth, requireRole("DATA_COLLECTION_OFFICER")] }, createVisitRequest);
}