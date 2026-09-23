import prisma from "../lib/prisma.js";

export async function generateUniquePlatformId() {
  let isUnique = false;
  let candidateId = "";
  while (!isUnique) {
    const min = 1000000000;
    const max = 9999999999;
    candidateId = Math.floor(min + Math.random() * (max - min + 1)).toString();
    const existingUser = await prisma.user.findUnique({
      where: { platformId: candidateId },
      select: { id: true },
    });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return candidateId;
}