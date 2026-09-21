import { prisma } from '../config/prisma';

/**
 * Generates a unique numeric 10-digit platform identifier.
 * Example output: "4820193847"
 */
export async function generateUniquePlatformId(): Promise<string> {
  let isUnique = false;
  let candidateId = '';

  while (!isUnique) {
    // Generate a random 10-digit number (ensuring non-zero leading digit)
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