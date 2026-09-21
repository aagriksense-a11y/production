import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const farmerSignUpSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherName: z.string().optional(),
  phoneNumber: z.string().min(10, 'Valid WhatsApp phone number required'),
  email: z.string().email().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Farmer Informed Consent terms' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const dcoSignUpSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherName: z.string().optional(),
  email: z.string().email('Valid email is mandatory'),
  phoneNumber: z.string().min(10, 'Valid WhatsApp phone number required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const orgSignUpSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  email: z.string().email('Valid organization email is mandatory'),
  phoneNumber: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone, Email, or 10-digit Platform ID required'),
  password: z.string().min(1, 'Password is required'),
});

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      return res.status(500).json({ success: false, message: 'Validation failed' });
    }
  };
};