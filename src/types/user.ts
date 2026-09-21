import { UserRole, OnboardingStatus, VerificationStatus, AuthProvider } from '@prisma/client';

export interface CreateFarmerInput {
  firstName: string;
  lastName: string;
  otherName?: string;
  phoneNumber: string; // WhatsApp number
  email?: string;
  password?: string;
  consentAccepted: boolean;
}

export interface CreateDcoInput {
  firstName: string;
  lastName: string;
  otherName?: string;
  phoneNumber: string; // WhatsApp number
  email: string;
  password?: string;
}

export interface CreateOrgInput {
  orgName: string;
  email: string;
  phoneNumber?: string;
  password?: string;
}

export interface FarmerPhase2Input {
  altPhoneNumber?: string;
  nin: string;
  ninDocUrl?: string;
  address: string;
  cityTown: string;
  lga: string;
  state: string;
  avatarUrl?: string;
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
  };
}

export interface DcoPhase2Input {
  altPhoneNumber?: string;
  nin: string;
  ninDocUrl?: string;
  address: string;
  cityTown: string;
  lga: string;
  state: string;
  avatarUrl?: string;
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
  };
}

export interface OrgDirectorInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  nin: string;
  ninDocUrl?: string;
  address: string;
  utilityBillUrl: string;
}

export interface OrgPhase2Input {
  headquartersAddress: string;
  cityTown: string;
  lga: string;
  state: string;
  isRegistered: boolean;
  cacNumber?: string;
  cacCertUrl?: string;
  cacForm2Url?: string;
  cacForm7Url?: string;
  directors: OrgDirectorInput[];
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
  };
}