import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  validate,
  farmerSignUpSchema,
  dcoSignUpSchema,
  orgSignUpSchema,
  loginSchema,
} from '../middlewares/validate';

const router = Router();

// Phase 1 Registration Endpoints[cite: 2]
router.post('/signup/farmer', validate(farmerSignUpSchema), AuthController.registerFarmer);
router.post('/signup/dco', validate(dcoSignUpSchema), AuthController.registerDco);
router.post('/signup/organization', validate(orgSignUpSchema), AuthController.registerOrg);

// Authentication & Token Lifecycle
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Context & Profile
router.get('/me', requireAuth, AuthController.getCurrentUser);

export default router;