"use strict";
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const isProd =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  /^(dpg|dbg)-[a-z0-9]+-[a-z]$/.test((process.env.DATABASE_URL || "").split("@").pop()?.split("/")[0] || "") ||
  /\.(ohio|oregon|virginia)-postgres\.render\.com/i.test(process.env.DATABASE_URL || "");

if (isProd && process.env.SEED_ALLOW_PROD !== "true") {
  console.error("Refusing to seed: target looks like production. Set SEED_ALLOW_PROD=true to override.");
  process.exit(1);
}

const PASSWORD = "Demo@12345";
let passwordHash;

const DEMO = [
  {
    role: "FARMER",
    firstName: "Amina",
    lastName: "Yusuf",
    otherName: "H",
    phoneNumber: "2348031112233",
    email: "amina.demo@agriksense.test",
    state: "Kano",
    lga: "Danbatta",
    cityTown: "Danbatta",
    address: "12 Kofar Gidan, Danbatta",
    nin: "97123456789",
    ninStatus: "VERIFIED",
    ninDocUrl: "https://example.com/nin/amina.pdf",
    avatarUrl: null,
    consentAccepted: true,
    managerName: "Mallam Sule",
    managerPhone: "2348123456789",
    bankAccount: { accountName: "Amina Yusuf", accountNumber: "0123456789", bankName: "GTBank", bankCode: "058" },
    agriScore: 742,
    creditReady: true,
    farms: [
      {
        name: "Yusuf Family Farm - North Field",
        state: "Kano",
        lga: "Danbatta",
        cityTown: "Danbatta",
        village: "Danbatta",
        address: "North of Danbatta township",
        lat: 12.4237,
        lng: 8.519,
        plots: [
          { name: "AY - North field", crop: "Maize", areaHa: 1.6, soilHealth: "Good", soilMoisture: 74, stressLevel: "Low", cluster: "Maize belt", season: "2026 Wet", status: "ACTIVE", mapStatus: "MAPPED", lat: 12.4241, lng: 8.5193 },
        ],
      },
    ],
  },
  {
    role: "FARMER",
    firstName: "Chidi",
    lastName: "Okeke",
    otherName: null,
    phoneNumber: "2348024456710",
    email: "chidi.demo@agriksense.test",
    state: "Enugu",
    lga: "Udi",
    cityTown: "Udi",
    address: "14 Okwojo Road, Udi",
    nin: "88123456712",
    ninStatus: "VERIFIED",
    ninDocUrl: "https://example.com/nin/chidi.pdf",
    avatarUrl: null,
    consentAccepted: true,
    managerName: "Mrs Ngozi Okeke",
    managerPhone: "2348033333333",
    bankAccount: { accountName: "Chidi Okeke", accountNumber: "0234567890", bankName: "Zenith Bank", bankCode: "057" },
    agriScore: 711,
    creditReady: true,
    farms: [
      {
        name: "Okeke Riverside Farm",
        state: "Enugu",
        lga: "Udi",
        cityTown: "Udi",
        village: "Awla",
        address: "Riverside, Udi",
        lat: 6.8882,
        lng: 7.4348,
        plots: [
          { name: "CO - Riverside", crop: "Rice", areaHa: 1.8, soilHealth: "Good", soilMoisture: 68, stressLevel: "Low", cluster: "Rice cluster", season: "2026 Wet", status: "ACTIVE", mapStatus: "MAPPED", lat: 6.8886, lng: 7.435 },
        ],
      },
    ],
  },
  {
    role: "FARMER",
    firstName: "Fatima",
    lastName: "Bello",
    otherName: "A",
    phoneNumber: "2348052201180",
    email: "fatima.demo@agriksense.test",
    state: "Kaduna",
    lga: "Zaria",
    cityTown: "Zaria",
    address: "07 Mota Court, Zaria",
    nin: "79123456721",
    ninStatus: "PENDING",
    ninDocUrl: null,
    avatarUrl: null,
    consentAccepted: true,
    managerName: null,
    bankAccount: { accountName: "Fatima Bello", accountNumber: "0345678901", bankName: "First Bank", bankCode: "011" },
    agriScore: 633,
    creditReady: false,
    farms: [
      {
        name: "Bello Valley Farm",
        state: "Kaduna",
        lga: "Zaria",
        cityTown: "Zaria",
        village: "Mayere",
        address: "Valley road, Mayere",
        lat: 11.0855,
        lng: 7.7199,
        plots: [
          { name: "FB - Valley plot", crop: "Tomato", areaHa: 1.1, soilHealth: "Fair", soilMoisture: 51, stressLevel: "Watch", cluster: "Tomato farms", season: "2026 Dry", status: "ACTIVE", mapStatus: "PENDING", lat: null, lng: null },
        ],
      },
    ],
  },
  {
    role: "FARMER",
    firstName: "Ibrahim",
    lastName: "Musa",
    otherName: null,
    phoneNumber: "2348097714420",
    email: "ibrahim.demo@agriksense.test",
    state: "Katsina",
    lga: "Funtua",
    cityTown: "Funtua",
    address: "22 Danbauchi, Funtua",
    nin: "69123456734",
    ninStatus: "PENDING",
    ninDocUrl: null,
    avatarUrl: null,
    consentAccepted: true,
    managerName: "Alhaji Musa",
    managerPhone: "2348000000000",
    bankAccount: { accountName: "Ibrahim Musa", accountNumber: "0456789012", bankName: "Union Bank", bankCode: "032" },
    agriScore: 581,
    creditReady: false,
    farms: [
      {
        name: "Musa East Farm",
        state: "Katsina",
        lga: "Funtua",
        cityTown: "Funtua",
        village: "Yankara",
        address: "East side of Yankara",
        lat: 11.5264,
        lng: 7.3028,
        plots: [
          { name: "IM - East field", crop: "Maize", areaHa: 2.0, soilHealth: "Fair", soilMoisture: 44, stressLevel: "High", cluster: "Maize belt", season: "2026 Wet", status: "ACTIVE", mapStatus: "PENDING", lat: null, lng: null },
        ],
      },
    ],
  },
  {
    role: "FARMER",
    firstName: "Ngozi",
    lastName: "Eze",
    otherName: null,
    phoneNumber: "2348063009917",
    email: "ngozi.demo@agriksense.test",
    state: "Plateau",
    lga: "Jos North",
    cityTown: "Jos",
    address: "9 Rwang Pam Street, Jos",
    nin: "59123456745",
    ninStatus: "VERIFIED",
    ninDocUrl: "https://example.com/nin/ngozi.pdf",
    avatarUrl: null,
    consentAccepted: true,
    managerName: "Mr Eze",
    managerPhone: "2349022222222",
    bankAccount: { accountName: "Ngozi Eze", accountNumber: "0567890123", bankName: "Access Bank", bankCode: "044" },
    agriScore: 684,
    creditReady: true,
    farms: [
      {
        name: "Eze Hill Farm",
        state: "Plateau",
        lga: "Jos North",
        cityTown: "Jos",
        village: "Vom",
        address: "Hill side, Vom",
        lat: 9.8965,
        lng: 8.8912,
        plots: [
          { name: "NE - Hill plot", crop: "Beans", areaHa: 1.4, soilHealth: "Good", soilMoisture: 70, stressLevel: "Low", cluster: "Beans block", season: "2026 Wet", status: "ACTIVE", mapStatus: "MAPPED", lat: 9.8969, lng: 8.8915 },
        ],
      },
    ],
  },
  {
    role: "FARMER",
    firstName: "Sani",
    lastName: "Abdullahi",
    otherName: null,
    phoneNumber: "2348075563389",
    email: "sani.demo@agriksense.test",
    state: "Jigawa",
    lga: "Dutse",
    cityTown: "Dutse",
    address: "5 Galadima Road, Dutse",
    nin: "49123456756",
    ninStatus: "PENDING",
    ninDocUrl: null,
    avatarUrl: null,
    consentAccepted: true,
    managerName: null,
    bankAccount: { accountName: "Sani Abdullahi", accountNumber: "0678901234", bankName: "UBA", bankCode: "033" },
    agriScore: 645,
    creditReady: false,
    farms: [
      {
        name: "Abdullahi South Farm",
        state: "Jigawa",
        lga: "Dutse",
        cityTown: "Dutse",
        village: "Badin",
        address: "South of Badin",
        lat: 11.7,
        lng: 9.3,
        plots: [
          { name: "SA - South field", crop: "Maize", areaHa: 1.5, soilHealth: "Good", soilMoisture: 66, stressLevel: "Low", cluster: "Maize belt", season: "2026 Wet", status: "ACTIVE", mapStatus: "MAPPED", lat: 11.7, lng: 9.3 },
        ],
      },
    ],
  },
];

const DCO_DEMO = [
  {
    firstName: "Tunde",
    lastName: "Adeyemi",
    otherName: null,
    phoneNumber: "2348111122233",
    email: "tunde.demo@agriksense.test",
    state: "Oyo",
    lga: "Ibadan South East",
    cityTown: "Ibadan",
    address: "18 Orita Aperin, Ibadan",
    nin: "38123456767",
    ninStatus: "VERIFIED",
    ninDocUrl: "https://example.com/nin/tunde.pdf",
    avatarUrl: null,
    bankAccount: { accountName: "Tunde Adeyemi", accountNumber: "0789012345", bankName: "GTBank", bankCode: "058" },
  },
  {
    firstName: "Hauwa",
    lastName: "Suleiman",
    otherName: "B",
    phoneNumber: "2348111133344",
    email: "hauwa.demo@agriksense.test",
    state: "Kano",
    lga: "Nasarawa",
    cityTown: "Kano",
    address: "31 Bataiya Road, Kano",
    nin: "27123456778",
    ninStatus: "PENDING",
    ninDocUrl: null,
    avatarUrl: null,
    bankAccount: { accountName: "Hauwa Suleiman", accountNumber: "0890123456", bankName: "Zenith Bank", bankCode: "057" },
  },
];

const ORG_DEMO = {
  orgName: "Kano Farmers Cooperative Union",
  headquartersAddress: "1 Cooperative House, Independence Road, Kano",
  state: "Kano",
  lga: "Fagge",
  cityTown: "Kano",
  isRegistered: true,
  cacNumber: "RC1234567",
  cacStatus: "VERIFIED",
  cacCertUrl: "https://example.com/cac/kooperkt.pdf",
  email: "kfcu.demo@agriksense.test",
  phoneNumber: "2348034567890",
  directors: [
    { fullName: "Halima Lawal", phoneNumber: "2348020001111", email: "halima@kfcu.test", nin: "96123456789", ninDocUrl: "https://example.com/nin/halima.pdf", address: "7 Kurna Road, Kano", utilityBillUrl: "https://example.com/util/halima.pdf" },
    { fullName: "Yusuf Ibrahim", phoneNumber: "2348020002222", email: "yusuf@kfcu.test", nin: "95123456790", ninDocUrl: "https://example.com/nin/yusuf.pdf", address: "12 Ibrahim Taiwo Road, Kano", utilityBillUrl: "https://example.com/util/yusuf.pdf" },
  ],
};

const STATES_FARE = [
  { state: "Kano", costPerMile: 650 },
  { state: "Kaduna", costPerMile: 620 },
  { state: "Enugu", costPerMile: 700 },
  { state: "Katsina", costPerMile: 600 },
  { state: "Plateau", costPerMile: 720 },
  { state: "Jigawa", costPerMile: 580 },
  { state: "Oyo", costPerMile: 690 },
];

function nowish(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function main() {
  passwordHash = await bcrypt.hash(PASSWORD, 12);
  const created = { farmers: 0, dcos: 0, orgs: 0, farms: 0, plots: 0, sensors: 0, readings: 0, advisories: 0, fareRates: 0, visits: 0, memberships: 0 };

  for (const fr of STATES_FARE) {
    await prisma.fareRate.upsert({ where: { state: fr.state }, update: { costPerMile: fr.costPerMile }, create: fr });
    created.fareRates++;
  }

  const farmerUsers = [];
  for (const demo of DEMO) {
    const existing = await prisma.user.findFirst({ where: { phoneNumber: demo.phoneNumber } });
    if (existing) {
      farmerUsers.push(existing.id);
      continue;
    }
    const platformId = await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id")[0] || "0";
    const pid = (await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id"))[0].id;
    const user = await prisma.user.create({
      data: {
        platformId: pid,
        role: "FARMER",
        phoneNumber: demo.phoneNumber,
        email: demo.email,
        passwordHash,
        authProvider: "LOCAL",
        onboardingStep: "PHASE_2_COMPLETED",
        farmerProfile: {
          create: {
            firstName: demo.firstName,
            lastName: demo.lastName,
            otherName: demo.otherName,
            consentAccepted: demo.consentAccepted,
            consentAcceptedAt: nowish(20),
            nin: demo.nin,
            ninStatus: demo.ninStatus,
            ninDocUrl: demo.ninDocUrl,
            address: demo.address,
            cityTown: demo.cityTown,
            lga: demo.lga,
            state: demo.state,
            avatarUrl: demo.avatarUrl,
            managerName: demo.managerName,
            managerPhone: demo.managerPhone,
            managerEmail: null,
            agriScore: demo.agriScore,
            creditReady: demo.creditReady,
          },
        },
        bankAccounts: { create: demo.bankAccount },
      },
    });
    farmerUsers.push(user.id);
    created.farmers++;

    for (const farm of demo.farms) {
      const farmRec = await prisma.farm.create({
        data: {
          name: farm.name,
          state: farm.state,
          lga: farm.lga,
          cityTown: farm.cityTown,
          village: farm.village,
          address: farm.address,
          lat: farm.lat,
          lng: farm.lng,
          ownerId: user.id,
          plots: { create: farm.plots },
        },
        include: { plots: true },
      });
      created.farms++;
      created.plots += farm.plots.length;

      for (const plot of farmRec.plots) {
        const sensor = await prisma.sensor.create({
          data: {
            name: `${plot.name.replace(/\s+/g, "-")}-s1`,
            sensorType: "SOIL_MOISTURE",
            status: Math.random() > 0.15 ? "ONLINE" : "OFFLINE",
            battery: 70 + Math.floor(Math.random() * 28),
            plotId: plot.id,
          },
        });
        created.sensors++;
        const readings = [
          { days: 6, value: (plot.soilMoisture || 60) - 6 + (plot.stressLevel === "High" ? -8 : 2) },
          { days: 4, value: (plot.soilMoisture || 60) - 3 + (plot.stressLevel === "High" ? -5 : 1) },
          { days: 2, value: plot.soilMoisture || 60 },
          { days: 0, value: (plot.soilMoisture || 60) + 2 },
        ];
        for (const r of readings) {
          await prisma.sensorReading.create({ data: { sensorId: sensor.id, value: Math.max(0, r.value), unit: "%", recordedAt: nowish(r.days) } });
          created.readings++;
        }

        const adviceByCrop = {
          Maize: { title: "Irrigation window opens", type: "IRRIGATION", priority: "MEDIUM", body: "Soil moisture at moderate level. Apply irrigation within 48 hours ahead of the forecast dry spell." },
          Rice: { title: "Maintain water level", type: "IRRIGATION", priority: "HIGH", body: "Rice paddies need 5-8cm standing water to protect tiller growth this week." },
          Tomato: { title: "Early blight watch", type: "PEST_DISEASE", priority: "HIGH", body: "Humidity is rising; scout for early blight on lower leaves and apply preventive fungicide." },
          Beans: { title: "Weed control window", type: "INPUT_TIMING", priority: "MEDIUM", body: "Weed before flowering to reduce competition; use manual or low-herbicide ridge weeding." },
        };
        const adv = adviceByCrop[plot.crop] || { title: "Soil health check", type: "SOIL_HEALTH", priority: "LOW", body: "Run a routine soil check to keep nutrients level through the season." };
        await prisma.advisory.create({
          data: {
            title: adv.title,
            body: adv.body,
            type: adv.type,
            priority: adv.priority,
            channel: "WHATSAPP",
            language: "en",
            sent: true,
            sentAt: nowish(1),
            plotId: plot.id,
            farmerId: user.id,
          },
        });
        created.advisories++;
      }
    }
  }

  const existingOrg = await prisma.user.findFirst({ where: { email: ORG_DEMO.email } });
  let orgId = null;
  let orgProfId = null;
  if (!existingOrg) {
    const pid = (await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id"))[0].id;
    const org = await prisma.user.create({
      data: {
        platformId: pid,
        role: "ORGANIZATION",
        phoneNumber: ORG_DEMO.phoneNumber,
        email: ORG_DEMO.email,
        passwordHash,
        authProvider: "LOCAL",
        onboardingStep: "PHASE_2_COMPLETED",
        orgProfile: {
          create: {
            orgName: ORG_DEMO.orgName,
            headquartersAddress: ORG_DEMO.headquartersAddress,
            cityTown: ORG_DEMO.cityTown,
            lga: ORG_DEMO.lga,
            state: ORG_DEMO.state,
            isRegistered: ORG_DEMO.isRegistered,
            cacNumber: ORG_DEMO.cacNumber,
            cacStatus: ORG_DEMO.cacStatus,
            cacCertUrl: ORG_DEMO.cacCertUrl,
            directors: { create: ORG_DEMO.directors },
          },
        },
      },
      include: { orgProfile: true },
    });
    created.orgs++;
    orgId = org.id;
    orgProfId = org.orgProfile.id;
  } else {
    orgId = existingOrg.id;
    const op = await prisma.orgProfile.findUnique({ where: { userId: existingOrg.id } });
    orgProfId = op?.id || null;
  }

  const memberships = [
    { farmerEmail: "amina.demo@agriksense.test", membershipId: "KFCU-AMINA-0081", isVerified: true },
    { farmerEmail: "chidi.demo@agriksense.test", membershipId: "KFCU-0021", isVerified: true },
    { farmerEmail: "fatima.demo@agriksense.test", membershipId: "KFCU-FB-0012", isVerified: false },
  ];
  for (const m of memberships) {
    const farmer = await prisma.user.findFirst({ where: { email: m.farmerEmail }, include: { farmerProfile: true } });
    if (!farmer || !farmer.farmerProfile) continue;
    const exists = await prisma.organizationMembership.findFirst({ where: { orgId, farmerId: farmer.id } });
    if (exists) continue;
    await prisma.organizationMembership.create({
      data: {
        orgId,
        orgProfileId: orgProfId,
        farmerId: farmer.id,
        farmerProfileId: farmer.farmerProfile.id,
        membershipId: m.membershipId,
        isVerified: m.isVerified,
        verifiedAt: m.isVerified ? nowish(15) : null,
      },
    });
    created.memberships++;
  }

  const dcoUsers = [];
  for (const demo of DCO_DEMO) {
    const existing = await prisma.user.findFirst({ where: { phoneNumber: demo.phoneNumber } });
    if (existing) {
      dcoUsers.push(existing.id);
      continue;
    }
    const pid = (await prisma.$queryRawUnsafe("SELECT floor(random()*8999999999+1000000000)::text AS id"))[0].id;
    const user = await prisma.user.create({
      data: {
        platformId: pid,
        role: "DATA_COLLECTION_OFFICER",
        phoneNumber: demo.phoneNumber,
        email: demo.email,
        passwordHash,
        authProvider: "LOCAL",
        onboardingStep: "PHASE_2_COMPLETED",
        dcoProfile: {
          create: {
            firstName: demo.firstName,
            lastName: demo.lastName,
            otherName: demo.otherName,
            nin: demo.nin,
            ninStatus: demo.ninStatus,
            ninDocUrl: demo.ninDocUrl,
            address: demo.address,
            cityTown: demo.cityTown,
            lga: demo.lga,
            state: demo.state,
            avatarUrl: demo.avatarUrl,
          },
        },
        bankAccounts: { create: demo.bankAccount },
      },
    });
    dcoUsers.push(user.id);
    created.dcos++;
  }

  const tunde = await prisma.user.findFirst({ where: { email: "tunde.demo@agriksense.test" }, include: { dcoProfile: true } });
  if (tunde) {
    const req = await prisma.farmVisitRequest.findFirst({ where: { dcoUserId: tunde.id, status: "REQUESTED" } });
    if (!req) {
      const knownFarms = await prisma.farm.findMany({ where: { state: tunde.dcoProfile?.state || "Oyo" }, take: 2 });
      await prisma.farmVisitRequest.create({
        data: {
          dcoUserId: tunde.id,
          status: "REQUESTED",
          farmCount: knownFarms.length || 0,
          estimatedCost: (knownFarms.length || 0) * 3500,
          notes: "Farms along the same corridor; can cover in one trip.",
          farms: {
            create: knownFarms.map((f) => ({
              farmId: f.id,
              farmName: f.name,
              address: f.address,
              state: f.state,
              transportCost: 3500,
              distanceKm: 5 + Math.round(Math.random() * 9),
            })),
          },
        },
      });
      created.visits++;
    }
  }

  console.log("Seed complete:", JSON.stringify(created));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });