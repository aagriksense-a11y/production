import { prisma } from '../config/prisma';
import { generateUniquePlatformId } from '../utils/id-generator';
import { 
  UserRole, 
  OnboardingStatus, 
  VerificationStatus, 
  AuthProvider, 
  User, 
  Prisma 
} from '@prisma/client';
import {
  CreateFarmerInput,
  CreateDcoInput,
  CreateOrgInput,
  FarmerPhase2Input,
  DcoPhase2Input,
  OrgPhase2Input,
} from '../types/user';

export class UserModel {
  /**
   * Find a user by internal UUID along with all profile variants and bank accounts
   */
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        farmerProfile: {
          include: {
            organizationMemberships: {
              include: { organization: true },
            },
          },
        },
        dcoProfile: true,
        orgProfile: {
          include: {
            directors: true,
          },
        },
        bankAccounts: true,
      },
    });
  }

  /**
   * Find a user by the public 10-digit Agriksense ID
   */
  static async findByPlatformId(platformId: string) {
    return prisma.user.findUnique({
      where: { platformId },
      include: {
        farmerProfile: true,
        dcoProfile: true,
        orgProfile: true,
      },
    });
  }

  /**
   * Find a user by authentication credentials
   */
  static async findByEmailOrPhone(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });
  }

  /**
   * Phase 1: Onboard Farmer
   */
  static async createFarmer(input: CreateFarmerInput, passwordHash?: string): Promise<User> {
    const platformId = await generateUniquePlatformId();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          platformId,
          role: UserRole.FARMER,
          email: input.email || null,
          phoneNumber: input.phoneNumber,
          passwordHash: passwordHash || null,
          authProvider: passwordHash ? AuthProvider.LOCAL : AuthProvider.GOOGLE,
          onboardingStep: OnboardingStatus.PHASE_1_BASIC,
          farmerProfile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName,
              otherName: input.otherName || null,
              consentAccepted: input.consentAccepted,
              consentAcceptedAt: input.consentAccepted ? new Date() : null,
            },
          },
        },
      });
      return user;
    });
  }

  /**
   * Phase 1: Onboard Data Collection Officer (DCO)
   */
  static async createDco(input: CreateDcoInput, passwordHash?: string): Promise<User> {
    const platformId = await generateUniquePlatformId();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          platformId,
          role: UserRole.DATA_COLLECTION_OFFICER,
          email: input.email,
          phoneNumber: input.phoneNumber,
          passwordHash: passwordHash || null,
          authProvider: passwordHash ? AuthProvider.LOCAL : AuthProvider.GOOGLE,
          onboardingStep: OnboardingStatus.PHASE_1_BASIC,
          dcoProfile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName,
              otherName: input.otherName || null,
            },
          },
        },
      });
      return user;
    });
  }

  /**
   * Phase 1: Onboard Organization
   */
  static async createOrganization(input: CreateOrgInput, passwordHash?: string): Promise<User> {
    const platformId = await generateUniquePlatformId();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          platformId,
          role: UserRole.ORGANIZATION,
          email: input.email,
          phoneNumber: input.phoneNumber || null,
          passwordHash: passwordHash || null,
          authProvider: passwordHash ? AuthProvider.LOCAL : AuthProvider.GOOGLE,
          onboardingStep: OnboardingStatus.PHASE_1_BASIC,
          orgProfile: {
            create: {
              orgName: input.orgName,
            },
          },
        },
      });
      return user;
    });
  }

  /**
   * Phase 2: Complete Farmer Profile & Add Bank Details
   */
  static async completeFarmerPhase2(
    userId: string,
    data: FarmerPhase2Input,
    ninStatus: VerificationStatus = VerificationStatus.PENDING
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedFarmer = await tx.farmerProfile.update({
        where: { userId },
        data: {
          altPhoneNumber: data.altPhoneNumber,
          nin: data.nin,
          ninDocUrl: data.ninDocUrl,
          ninStatus,
          address: data.address,
          cityTown: data.cityTown,
          lga: data.lga,
          state: data.state,
          avatarUrl: data.avatarUrl,
          managerName: data.managerName,
          managerPhone: data.managerPhone,
          managerEmail: data.managerEmail,
        },
      });

      await tx.bankAccount.create({
        data: {
          userId,
          accountName: data.bankAccount.accountName,
          accountNumber: data.bankAccount.accountNumber,
          bankName: data.bankAccount.bankName,
          bankCode: data.bankAccount.bankCode,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStatus.PHASE_2_COMPLETED },
      });

      return updatedFarmer;
    });
  }

  /**
   * Phase 2: Complete DCO Profile & Add Bank Details
   */
  static async completeDcoPhase2(
    userId: string,
    data: DcoPhase2Input,
    ninStatus: VerificationStatus = VerificationStatus.PENDING
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedDco = await tx.dcoProfile.update({
        where: { userId },
        data: {
          altPhoneNumber: data.altPhoneNumber,
          nin: data.nin,
          ninDocUrl: data.ninDocUrl,
          ninStatus,
          address: data.address,
          cityTown: data.cityTown,
          lga: data.lga,
          state: data.state,
          avatarUrl: data.avatarUrl,
        },
      });

      await tx.bankAccount.create({
        data: {
          userId,
          accountName: data.bankAccount.accountName,
          accountNumber: data.bankAccount.accountNumber,
          bankName: data.bankAccount.bankName,
          bankCode: data.bankAccount.bankCode,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStatus.PHASE_2_COMPLETED },
      });

      return updatedDco;
    });
  }

  /**
   * Phase 2: Complete Organization Profile, Directors, and Bank Details
   */
  static async completeOrgPhase2(
    userId: string,
    data: OrgPhase2Input,
    cacStatus: VerificationStatus = VerificationStatus.PENDING
  ) {
    return prisma.$transaction(async (tx) => {
      const orgProfile = await tx.orgProfile.update({
        where: { userId },
        data: {
          headquartersAddress: data.headquartersAddress,
          cityTown: data.cityTown,
          lga: data.lga,
          state: data.state,
          isRegistered: data.isRegistered,
          cacNumber: data.cacNumber,
          cacStatus,
          cacCertUrl: data.cacCertUrl,
          cacForm2Url: data.cacForm2Url,
          cacForm7Url: data.cacForm7Url,
          directors: {
            create: data.directors.map((director) => ({
              fullName: director.fullName,
              phoneNumber: director.phoneNumber,
              email: director.email,
              nin: director.nin,
              ninDocUrl: director.ninDocUrl,
              address: director.address,
              utilityBillUrl: director.utilityBillUrl,
            })),
          },
        },
      });

      await tx.bankAccount.create({
        data: {
          userId,
          accountName: data.bankAccount.accountName,
          accountNumber: data.bankAccount.accountNumber,
          bankName: data.bankAccount.bankName,
          bankCode: data.bankAccount.bankCode,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStatus.PHASE_2_COMPLETED },
      });

      return orgProfile;
    });
  }

  /**
   * Link Farmer to an Organization with Membership ID
   */
  static async linkFarmerToOrganization(
    farmerId: string,
    orgId: string,
    membershipId: string,
    isVerified: boolean = false
  ) {
    return prisma.organizationMembership.create({
      data: {
        farmerId,
        orgId,
        membershipId,
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
      },
    });
  }
}