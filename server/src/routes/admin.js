import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const PAGE_SIZE = 50;

function titleCase(s = "") {
  return s.replace(/(^|\s)([a-z])/g, (m) => m.toUpperCase());
}

function healthTag(score, stress) {
  if (stress === "High" || (score !== null && score < 600)) return "WATCHLIST";
  if (stress === "Watch" || (score !== null && score < 650)) return "WATCHLIST";
  return "HEALTHY";
}

function onboardingLabel(onboarding) {
  if (onboarding === "PHASE_2_COMPLETED") return { label: "Onboarded", cls: "green" };
  if (onboarding === "PHASE_1_BASIC") return { label: "Basic", cls: "amber" };
  return { label: onboarding, cls: "gray" };
}

async function getSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [farmers, farms, plots, sensors, readings, advisories, agriScoreAgg, farmerCount, verifiedCount, gpsPlotCount, creditCount, orgCount, dcoCount, monthFarmers, weeklySignups, visitRequests] =
    await Promise.all([
      prisma.user.count({ where: { role: "FARMER" } }),
      prisma.farm.count(),
      prisma.plot.count(),
      prisma.sensor.count(),
      prisma.sensorReading.count(),
      prisma.advisory.count(),
      prisma.farmerProfile.aggregate({ _avg: { agriScore: true }, _count: { _all: true } }),
      prisma.farmerProfile.count({ where: { user: { role: "FARMER" } } }),
      prisma.farmerProfile.count({ where: { ninStatus: "VERIFIED" } }),
      prisma.plot.count({ where: { mapStatus: "MAPPED" } }),
      prisma.farmerProfile.count({ where: { creditReady: true } }),
      prisma.orgProfile.count(),
      prisma.dcoProfile.count(),
      prisma.user.count({ where: { role: "FARMER", createdAt: { gte: monthStart } } }),
      prisma.user.groupBy({
        by: ["createdAt"],
        where: { role: "FARMER", createdAt: { gte: weekAgo } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.farmVisitRequest.count({ where: { status: "REQUESTED" } }),
    ]);

  const sensorsOnline = await prisma.sensor.count({ where: { status: "ONLINE" } });
  const sensorStatus = sensors ? Math.round((sensorsOnline / sensors) * 100) : 100;

  const activePlots = await prisma.plot.findMany({
    include: { farm: { include: { owner: { include: { farmerProfile: true } } } }, sensors: true, advisories: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const healthMix = { healthy: 0, watch: 0, critical: 0 };
  for (const p of activePlots) {
    const t = healthTag(p.farm?.owner?.farmerProfile?.agriScore ?? null, p.stressLevel);
    if (t === "HEALTHY") healthMix.healthy++;
    else healthMix.watch++;
  }
  const totalPlots = Math.max(1, await prisma.plot.count());
  healthMix.healthy = Math.round((healthMix.healthy / totalPlots) * 100);
  healthMix.watch = Math.round((healthMix.watch / totalPlots) * 100);
  healthMix.critical = Math.max(0, 100 - healthMix.healthy - healthMix.watch);

  const cropAgg = await prisma.plot.groupBy({ by: ["crop"], _count: { _all: true }, _sum: { areaHa: true } });
  const crops = cropAgg.map((c) => ({ crop: c.crop || "Other", plots: c._count._all, areaHa: c._sum.areaHa || 0 }));

  const dayMap = {};
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayMap[key] = 0;
    days.push(key);
  }
  for (const g of weeklySignups) {
    const d = g.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in dayMap) dayMap[key]++;
  }

  const recentFarms = await prisma.farm.findMany({
    include: {
      owner: { include: { farmerProfile: true } },
      plots: { include: { sensors: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const recentAdvisories = await prisma.advisory.findMany({
    include: { plot: { include: { farm: true } }, farmer: { include: { farmerProfile: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const avgScore = agriScoreAgg._avg.agriScore ? Math.round(agriScoreAgg._avg.agriScore) : 0;
  const totalHa = await prisma.plot.aggregate({ _sum: { areaHa: true } });

  return {
    kpis: {
      farmers,
      fieldsMonitored: plots,
      sensors,
      sensorsOnline,
      avgAgriScore: avgScore,
      openAdvisories: advisories,
      monthFarmers,
      farmVisitRequests: visitRequests,
      orgs: orgCount,
      dcos: dcoCount,
    },
    sensorStatus,
    funnel: {
      registered: farmers,
      verified: verifiedCount,
      gpsPlotted: gpsPlotCount,
      creditReady: creditCount,
    },
    farmerCount,
    verifiedCount,
    gpsPlotCount,
    creditCount,
    orgCount,
    dcoCount,
    avgAgriScore: avgScore,
    totalAreaHa: Math.round((totalHa._sum.areaHa || 0) * 10) / 10,
    weeklySignups: days.map((k) => ({ day: k, count: dayMap[k] })),
    healthMix,
    crops,
    recentFarms: recentFarms.map((f) => ({
      id: f.id,
      name: f.name,
      farmer: f.owner.farmerProfile ? `${f.owner.farmerProfile.firstName} ${f.owner.farmerProfile.lastName}` : "—",
      farmerPhone: f.owner.phoneNumber,
      ownerId: f.owner.id,
      state: f.state,
      plots: f.plots.length,
      areaHa: Math.round(f.plots.reduce((a, p) => a + (p.areaHa || 0), 0) * 10) / 10,
      agriScore: f.owner.farmerProfile?.agriScore ?? null,
      moisture: f.plots[0]?.soilMoisture ?? null,
      stress: f.plots[0]?.stressLevel ?? null,
      status: f.plots[0]?.mapStatus ?? "PENDING",
    })),
    recentAdvisories: recentAdvisories.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type.replace("_", " "),
      priority: a.priority,
      sent: a.sent,
      sentAt: a.sentAt,
      createdAt: a.createdAt,
      plot: a.plot?.name || a.plot?.farm?.name || null,
      farmer: a.farmer?.farmerProfile ? `${a.farmer.farmerProfile.firstName} ${a.farmer.farmerProfile.lastName}` : null,
    })),
  };
}

async function listFarmers(request, reply) {
  const { q = "", state = "", status = "", page = 1 } = request.query;
  const limit = Math.min(Number(request.query.limit) || PAGE_SIZE, 200);
  const skip = (Math.max(1, Number(page)) - 1) * limit;

  const where = { role: "FARMER" };
  const or = [];
  if (q) {
    or.push({ farmerProfile: { firstName: { contains: q, mode: "insensitive" } } });
    or.push({ farmerProfile: { lastName: { contains: q, mode: "insensitive" } } });
    or.push({ phoneNumber: { contains: q } });
    or.push({ platformId: q });
  }
  if (state) or.push({ farmerProfile: { state } });
  if (status) {
    if (status === "VERIFIED") or.push({ farmerProfile: { ninStatus: "VERIFIED" } });
    if (status === "PENDING") or.push({ farmerProfile: { ninStatus: { in: ["PENDING", "REJECTED"] } } });
  }
  if (or.length) where.OR = or;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        farmerProfile: { include: { organizationMemberships: true } },
        bankAccounts: true,
        farms: { include: { plots: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const rows = users.map((u) => {
    const farms = u.farms || [];
    const plots = farms.flatMap((f) => f.plots);
    const areaHa = plots.reduce((a, p) => a + (p.areaHa || 0), 0);
    const status = u.farmerProfile?.ninStatus || "PENDING";
    return {
      id: u.id,
      platformId: u.platformId,
      firstName: u.farmerProfile?.firstName || "",
      lastName: u.farmerProfile?.lastName || "",
      otherName: u.farmerProfile?.otherName,
      fullName: `${u.farmerProfile?.firstName || ""} ${u.farmerProfile?.lastName || ""}`.trim(),
      phoneNumber: u.phoneNumber,
      email: u.email,
      state: u.farmerProfile?.state,
      lga: u.farmerProfile?.lga,
      cityTown: u.farmerProfile?.cityTown,
      ninStatus: status,
      agriScore: u.farmerProfile?.agriScore ?? null,
      creditReady: u.farmerProfile?.creditReady ?? false,
      plots: plots.length,
      areaHa: Math.round(areaHa * 10) / 10,
      verifiedMemberships: u.farmerProfile?.organizationMemberships?.filter((m) => m.isVerified).length || 0,
      totalMemberships: u.farmerProfile?.organizationMemberships?.length || 0,
      onboarding: onboardingLabel(u.onboardingStep),
      createdAt: u.createdAt,
    };
  });

  return { total, page: Number(page), limit, rows };
}

async function getFarmerDetail(request, reply) {
  const { id } = request.params;
  const user = await prisma.user.findFirst({
    where: { id, role: "FARMER" },
    include: {
      farmerProfile: { include: { organizationMemberships: { include: { organization: true } } } },
      bankAccounts: true,
      farms: { include: { plots: { include: { sensors: { include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 } } }, advisories: true } } } },
    },
  });
  if (!user) return reply.code(404).send({ success: false, message: "Farmer not found" });

  return {
    id: user.id,
    platformId: user.platformId,
    phoneNumber: user.phoneNumber,
    email: user.email,
    isActive: user.isActive,
    onboardingStep: user.onboardingStep,
    createdAt: user.createdAt,
    profile: user.farmerProfile,
    bankAccounts: user.bankAccounts,
    memberships: (user.farmerProfile?.organizationMemberships || []).map((m) => ({
      id: m.id,
      memberId: m.membershipId,
      isVerified: m.isVerified,
      verifiedAt: m.verifiedAt,
      orgName: m.organization?.orgName || "Organization",
    })),
    farms: user.farms.map((f) => ({
      id: f.id,
      name: f.name,
      state: f.state,
      lga: f.lga,
      cityTown: f.cityTown,
      village: f.village,
      address: f.address,
      lat: f.lat,
      lng: f.lng,
      createdAt: f.createdAt,
      plots: f.plots.map((p) => ({
        id: p.id,
        name: p.name,
        crop: p.crop,
        areaHa: p.areaHa,
        soilHealth: p.soilHealth,
        soilMoisture: p.soilMoisture,
        stressLevel: p.stressLevel,
        cluster: p.cluster,
        season: p.season,
        plantedAt: p.plantedAt,
        status: p.status,
        mapStatus: p.mapStatus,
        lat: p.lat,
        lng: p.lng,
        sensors: p.sensors.map((s) => ({
          id: s.id,
          name: s.name,
          sensorType: s.sensorType,
          status: s.status,
          battery: s.battery,
          lastReading: s.readings[0] ? { value: s.readings[0].value, unit: s.readings[0].unit, recordedAt: s.readings[0].recordedAt } : null,
        })),
        advisories: p.advisories.map((a) => ({ id: a.id, title: a.title, priority: a.priority, sent: a.sent, createdAt: a.createdAt })),
      })),
    })),
  };
}

async function createUser(request, reply) {
  const b = request.body || {};
  const { role = "FARMER", firstName, lastName, otherName, phoneNumber, email, password, state, lga, cityTown, address, nin, orgName, cacNumber } = b;
  if (!phoneNumber || !password) {
    return reply.code(400).send({ success: false, message: "phoneNumber and password are required" });
  }
  if (!["FARMER", "DATA_COLLECTION_OFFICER", "ORGANIZATION"].includes(role)) {
    return reply.code(400).send({ success: false, message: "role must be FARMER, DATA_COLLECTION_OFFICER or ORGANIZATION" });
  }
  if (role === "ORGANIZATION" && !orgName) {
    return reply.code(400).send({ success: false, message: "orgName is required for organization accounts" });
  }
  if (role !== "ORGANIZATION" && (!firstName || !lastName)) {
    return reply.code(400).send({ success: false, message: "firstName and lastName are required" });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ phoneNumber }, ...(email ? [{ email: email.toLowerCase() }] : [])] } });
  if (existing) return reply.code(409).send({ success: false, message: "Phone number or email already registered" });

  const pid = (await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id"))[0].id;
  const passwordHash = await bcrypt.hash(password, 12);
  const base = {
    platformId: pid,
    role,
    phoneNumber,
    email: email ? email.toLowerCase() : null,
    passwordHash,
    authProvider: "LOCAL",
    onboardingStep: "PHASE_1_BASIC",
  };

  let user;
  if (role === "FARMER") {
    user = await prisma.user.create({
      data: {
        ...base,
        farmerProfile: {
          create: {
            firstName: titleCase(firstName),
            lastName: titleCase(lastName),
            otherName: otherName ? titleCase(otherName) : null,
            nin,
            ninStatus: "PENDING",
            address,
            cityTown,
            lga,
            state: titleCase(state),
          },
        },
      },
      include: { farmerProfile: true },
    });
  } else if (role === "DATA_COLLECTION_OFFICER") {
    user = await prisma.user.create({
      data: {
        ...base,
        dcoProfile: {
          create: {
            firstName: titleCase(firstName),
            lastName: titleCase(lastName),
            otherName: otherName ? titleCase(otherName) : null,
            nin,
            ninStatus: "PENDING",
            address,
            cityTown,
            lga,
            state: titleCase(state),
          },
        },
      },
      include: { dcoProfile: true },
    });
  } else {
    user = await prisma.user.create({
      data: {
        ...base,
        orgProfile: {
          create: {
            orgName,
            headquartersAddress: address,
            cityTown,
            lga,
            state: titleCase(state),
            isRegistered: !!cacNumber,
            cacNumber,
            cacStatus: cacNumber ? "PENDING" : "PENDING",
          },
        },
      },
      include: { orgProfile: true },
    });
  }

  return reply.code(201).send({ success: true, data: { id: user.id, platformId: user.platformId, role: user.role } });
}

async function listFarms(request, reply) {
  const { q = "", crop = "", cluster = "", state = "", page = 1 } = request.query;
  const limit = Math.min(Number(request.query.limit) || PAGE_SIZE, 200);
  const skip = (Math.max(1, Number(page)) - 1) * limit;

  const where = {};
  const or = [];
  if (q) {
    or.push({ name: { contains: q, mode: "insensitive" } });
    or.push({ owner: { farmerProfile: { firstName: { contains: q, mode: "insensitive" } } } });
    or.push({ owner: { farmerProfile: { lastName: { contains: q, mode: "insensitive" } } } });
  }
  if (state) or.push({ state });
  if (crop) or.push({ plots: { some: { crop } } });
  if (cluster) or.push({ plots: { some: { cluster } } });
  if (or.length) where.OR = or;

  const [total, farms] = await Promise.all([
    prisma.farm.count({ where }),
    prisma.farm.findMany({
      where,
      include: {
        owner: { include: { farmerProfile: true } },
        plots: { include: { sensors: true, advisories: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const rows = farms.map((f) => {
    const plots = f.plots || [];
    const areaHa = plots.reduce((a, p) => a + (p.areaHa || 0), 0);
    const mapped = plots.filter((p) => p.mapStatus === "MAPPED").length;
    return {
      id: f.id,
      name: f.name,
      ownerId: f.ownerId,
      farmer: f.owner.farmerProfile ? `${f.owner.farmerProfile.firstName} ${f.owner.farmerProfile.lastName}` : "—",
      state: f.state,
      lga: f.lga,
      cityTown: f.cityTown,
      village: f.village,
      address: f.address,
      lat: f.lat,
      lng: f.lng,
      plots: plots.length,
      mapped,
      pending: plots.length - mapped,
      areaHa: Math.round(areaHa * 10) / 10,
      avgMoisture: plots.length ? Math.round(plots.reduce((a, p) => a + (p.soilMoisture || 0), 0) / plots.length) : null,
      crops: [...new Set(plots.map((p) => p.crop).filter(Boolean))],
      sensorsOnline: plots.reduce((a, p) => a + p.sensors.filter((s) => s.status === "ONLINE").length, 0),
      createdAt: f.createdAt,
    };
  });

  return { total, page: Number(page), limit, rows };
}

async function listPlots(request, reply) {
  const { q = "", crop = "", state = "" } = request.query;
  const where = {};
  const or = [];
  if (q) {
    or.push({ name: { contains: q, mode: "insensitive" } });
    or.push({ crop: { contains: q, mode: "insensitive" } });
  }
  if (crop) where.crop = crop;
  if (state) where.farm = { state };
  if (or.length) where.OR = or;

  const plots = await prisma.plot.findMany({
    where,
    include: { farm: { include: { owner: { include: { farmerProfile: true } } } }, sensors: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return plots.map((p) => ({
    id: p.id,
    name: p.name,
    crop: p.crop,
    areaHa: p.areaHa,
    soilHealth: p.soilHealth,
    soilMoisture: p.soilMoisture,
    stressLevel: p.stressLevel,
    cluster: p.cluster,
    season: p.season,
    status: p.status,
    mapStatus: p.mapStatus,
    lat: p.lat,
    lng: p.lng,
    farmName: p.farm.name,
    state: p.farm.state,
    farmer: p.farm.owner.farmerProfile ? `${p.farm.owner.farmerProfile.firstName} ${p.farm.owner.farmerProfile.lastName}` : "—",
    farmerPhone: p.farm.owner.phoneNumber,
    sensors: p.sensors.length,
    sensorsOnline: p.sensors.filter((s) => s.status === "ONLINE").length,
  }));
}

async function createFarm(request, reply) {
  const b = request.body || {};
  const { name, ownerId, state, lga, cityTown, village, address, lat, lng } = b;
  if (!name || !ownerId) return reply.code(400).send({ success: false, message: "name and ownerId are required" });

  const owner = await prisma.user.findFirst({ where: { id: ownerId, role: "FARMER" } });
  if (!owner) return reply.code(404).send({ success: false, message: "Farmer not found" });

  const farm = await prisma.farm.create({
    data: {
      name,
      ownerId,
      state,
      lga,
      cityTown,
      village,
      address,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    },
  });
  return reply.code(201).send({ success: true, data: { id: farm.id } });
}

async function createPlot(request, reply) {
  const b = request.body || {};
  const { name, farmId, crop, areaHa, soilHealth, soilMoisture, stressLevel, cluster, season, lat, lng } = b;
  if (!name || !farmId) return reply.code(400).send({ success: false, message: "name and farmId are required" });

  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) return reply.code(404).send({ success: false, message: "Farm not found" });

  const plot = await prisma.plot.create({
    data: {
      name,
      farmId,
      crop,
      areaHa: areaHa ? Number(areaHa) : null,
      soilHealth,
      soilMoisture: soilMoisture ? Number(soilMoisture) : null,
      stressLevel,
      cluster,
      season,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      status: "ACTIVE",
      mapStatus: lat && lng ? "MAPPED" : "PENDING",
    },
  });
  return reply.code(201).send({ success: true, data: { id: plot.id } });
}

async function listDcos(request, reply) {
  const dcos = await prisma.user.findMany({
    where: { role: "DATA_COLLECTION_OFFICER" },
    include: { dcoProfile: true },
    orderBy: { createdAt: "desc" },
  });
  return dcos.map((u) => ({
    id: u.id,
    platformId: u.platformId,
    fullName: `${u.dcoProfile?.firstName || ""} ${u.dcoProfile?.lastName || ""}`.trim(),
    phoneNumber: u.phoneNumber,
    email: u.email,
    state: u.dcoProfile?.state,
    lga: u.dcoProfile?.lga,
    cityTown: u.dcoProfile?.cityTown,
    ninStatus: u.dcoProfile?.ninStatus || "PENDING",
    onboarding: onboardingLabel(u.onboardingStep),
  }));
}

async function listFareRates(request, reply) {
  const rates = await prisma.fareRate.findMany({ orderBy: { state: "asc" } });
  return rates;
}

async function upsertFareRate(request, reply) {
  const { state, costPerMile } = request.body || {};
  if (!state || !costPerMile) return reply.code(400).send({ success: false, message: "state and costPerMile are required" });
  const rate = await prisma.fareRate.upsert({
    where: { state },
    update: { costPerMile: Number(costPerMile) },
    create: { state, costPerMile: Number(costPerMile) },
  });
  return reply.code(201).send({ success: true, data: rate });
}

async function listVisitRequests(request, reply) {
  const requests = await prisma.farmVisitRequest.findMany({
    include: {
      dco: { include: { dcoProfile: true } },
      farms: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return requests.map((r) => ({
    id: r.id,
    dcoName: r.dco.dcoProfile ? `${r.dco.dcoProfile.firstName} ${r.dco.dcoProfile.lastName}` : "—",
    dcoPlatformId: r.dco.platformId,
    dcoState: r.dco.dcoProfile?.state,
    dcoLga: r.dco.dcoProfile?.lga,
    dcoCity: r.dco.dcoProfile?.cityTown,
    farmCount: r.farmCount,
    estimatedCost: r.estimatedCost,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt,
    farms: r.farms.map((f) => ({ id: f.id, farmName: f.farmName, address: f.address, state: f.state, transportCost: f.transportCost, distanceKm: f.distanceKm })),
  }));
}

async function reviewVisitRequest(request, reply) {
  const { id } = request.params;
  const { action } = request.body || {};
  if (!["approve", "cancel"].includes(action)) {
    return reply.code(400).send({ success: false, message: "action must be 'approve' or 'cancel'" });
  }
  const req = await prisma.farmVisitRequest.findUnique({ where: { id } });
  if (!req) return reply.code(404).send({ success: false, message: "Visit request not found" });

  const updated = await prisma.farmVisitRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "ASSIGNED" : "CANCELLED",
      decidedByUserId: request.user.sub,
      updatedAt: new Date(),
    },
    include: { farms: { where: { farmId: { not: null } }, take: 50 } },
  });

  if (action === "approve") {
    // create assignments for each farm that's linked
    for (const vf of updated.farms) {
      if (!vf.farmId) continue;
      try {
        await prisma.farmAssignment.upsert({
          where: { farmId_dcoUserId: { farmId: vf.farmId, dcoUserId: req.dcoUserId } },
          update: { status: "ASSIGNED" },
          create: { farmId: vf.farmId, dcoUserId: req.dcoUserId, status: "ASSIGNED" },
        });
      } catch (_e) {
        // unique slot race - ignore
      }
    }
  }

  return { success: true, data: { id, status: updated.status } };
}

async function assignFarms(request, reply) {
  const { dcoUserId, farmIds = [], note } = request.body || {};
  if (!dcoUserId || !Array.isArray(farmIds) || !farmIds.length) {
    return reply.code(400).send({ success: false, message: "dcoUserId and farmIds[] are required" });
  }
  const dco = await prisma.user.findFirst({ where: { id: dcoUserId, role: "DATA_COLLECTION_OFFICER" } });
  if (!dco) return reply.code(404).send({ success: false, message: "DCO not found" });

  for (const farmId of farmIds) {
    const farm = await prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm) continue;
    await prisma.farmAssignment.upsert({
      where: { farmId_dcoUserId: { farmId, dcoUserId } },
      update: { status: "ASSIGNED", notes: note || null },
      create: { farmId, dcoUserId, status: "ASSIGNED", notes: note || null },
    });
  }
  return { success: true, data: { assigned: farmIds.length } };
}

async function assignableFarms(request, reply) {
  const farms = await prisma.farm.findMany({
    include: { owner: { include: { farmerProfile: true } }, plots: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return farms.map((f) => ({
    id: f.id,
    name: f.name,
    farmer: f.owner.farmerProfile ? `${f.owner.farmerProfile.firstName} ${f.owner.farmerProfile.lastName}` : "—",
    state: f.state,
    lga: f.lga,
    cityTown: f.cityTown,
    areaHa: Math.round(f.plots.reduce((a, p) => a + (p.areaHa || 0), 0) * 10) / 10,
  }));
}

async function dashboardSummary(_request, _reply) {
  return getSummary();
}

async function farmersList(request, reply) {
  return listFarmers(request, reply);
}

const wrap = (fn) => async (request, reply) => {
  const out = await fn(request, reply);
  if (reply.sent) return out;
  if (out && typeof out === "object" && "success" in out) return out;
  return { success: true, data: out };
};

export default async function adminRoutes(fastify) {
  fastify.get("/summary", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(dashboardSummary));
  fastify.get("/farmers", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(farmersList));
  fastify.get("/farmers/:id", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(getFarmerDetail));
  fastify.post("/farmers", { onRequest: [requireAuth, requireRole("ADMIN")] }, createUser);
  fastify.get("/farms", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(listFarms));
  fastify.get("/plots", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(listPlots));
  fastify.post("/farms", { onRequest: [requireAuth, requireRole("ADMIN")] }, createFarm);
  fastify.post("/plots", { onRequest: [requireAuth, requireRole("ADMIN")] }, createPlot);
  fastify.get("/dcos", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(listDcos));
  fastify.get("/fare-rates", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(listFareRates));
  fastify.post("/fare-rates", { onRequest: [requireAuth, requireRole("ADMIN")] }, upsertFareRate);
  fastify.get("/visit-requests", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(listVisitRequests));
  fastify.post("/visit-requests/:id/review", { onRequest: [requireAuth, requireRole("ADMIN")] }, reviewVisitRequest);
  fastify.post("/assignments", { onRequest: [requireAuth, requireRole("ADMIN")] }, assignFarms);
  fastify.get("/assignable-farms", { onRequest: [requireAuth, requireRole("ADMIN")] }, wrap(assignableFarms));
}