import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { UserModel } from '../models/user.model';
import { NotificationService } from '../services/notification.service';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  // 1. Sign Up as Farmer
  static async registerFarmer(req: Request, res: Response) {
    try {
      const { firstName, lastName, otherName, phoneNumber, email, password, consentAccepted } = req.body;

      const existingPhone = await UserModel.findByEmailOrPhone(phoneNumber);
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Phone number already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.createFarmer(
        { firstName, lastName, otherName, phoneNumber, email, consentAccepted },
        passwordHash
      );

      // Mandatory SMS notification[cite: 2]
      await NotificationService.sendFarmerSms(user.phoneNumber!, user.platformId);

      const tokens = await AuthController.issueTokenPair(user.id, user.platformId, user.role);

      return res.status(201).json({
        success: true,
        message: 'Farmer account created successfully',
        data: {
          platformId: user.platformId,
          role: user.role,
          onboardingStep: user.onboardingStep,
          ...tokens,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 2. Sign Up as Data Collection Officer (DCO)
  static async registerDco(req: Request, res: Response) {
    try {
      const { firstName, lastName, otherName, email, phoneNumber, password } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phoneNumber }] },
      });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email or phone number already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.createDco(
        { firstName, lastName, otherName, email, phoneNumber },
        passwordHash
      );

      // Mandatory WhatsApp notification[cite: 2]
      await NotificationService.sendDcoWhatsApp(user.phoneNumber!, user.platformId);

      const tokens = await AuthController.issueTokenPair(user.id, user.platformId, user.role);

      return res.status(201).json({
        success: true,
        message: 'Data Collection Officer account created successfully',
        data: {
          platformId: user.platformId,
          role: user.role,
          onboardingStep: user.onboardingStep,
          ...tokens,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 3. Sign Up as Organization
  static async registerOrg(req: Request, res: Response) {
    try {
      const { orgName, email, phoneNumber, password } = req.body;

      const existing = await UserModel.findByEmailOrPhone(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.createOrganization({ orgName, email, phoneNumber }, passwordHash);

      await NotificationService.sendOrgWelcome(email, user.platformId);

      const tokens = await AuthController.issueTokenPair(user.id, user.platformId, user.role);

      return res.status(201).json({
        success: true,
        message: 'Organization account created successfully',
        data: {
          platformId: user.platformId,
          role: user.role,
          onboardingStep: user.onboardingStep,
          ...tokens,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 4. Unified Sign In (Email, Phone, or 10-Digit ID)
  static async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { phoneNumber: identifier },
            { platformId: identifier }, // Allows direct login via 10-digit ID
          ],
        },
      });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account has been disabled. Contact admin' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const tokens = await AuthController.issueTokenPair(user.id, user.platformId, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          platformId: user.platformId,
          role: user.role,
          onboardingStep: user.onboardingStep,
          ...tokens,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 5. Refresh Access Token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      const hashedToken = hashToken(refreshToken);

      // Verify token in DB and ensure it is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashedToken },
      });

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      }

      // Rotate token: revoke old token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });

      // Issue new pair
      const tokens = await AuthController.issueTokenPair(decoded.userId, decoded.platformId, decoded.role);

      return res.status(200).json({ success: true, data: tokens });
    } catch (error: any) {
      return res.status(401).json({ success: false, message: 'Authentication expired' });
    }
  }

  // 6. Current User Profile (/me)
  static async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await UserModel.findById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Exclude hash
      const { passwordHash, ...safeUserData } = user;
      return res.status(200).json({ success: true, data: safeUserData });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Helper to issue access & refresh tokens
  private static async issueTokenPair(userId: string, platformId: string, role: string) {
    const payload = { userId, platformId, role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to MySQL/Redis[cite: 1]
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
}