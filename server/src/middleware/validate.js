import { z } from "zod";

export const farmerSignUpSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherName: z.string().optional(),
  phoneNumber: z.string().min(10, "Valid WhatsApp phone number required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Farmer Informed Consent terms" }),
  }),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const dcoSignUpSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherName: z.string().optional(),
  email: z.string().email("Valid email is mandatory"),
  phoneNumber: z.string().min(10, "Valid WhatsApp phone number required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const orgSignUpSchema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  email: z.string().email("Valid organization email is mandatory"),
  phoneNumber: z.string().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().min(3, "Phone, Email, or 10-digit Platform ID required"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export function validate(schema, request, reply) {
  const result = schema.safeParse(request.body);
  if (!result.success) {
    reply.code(400).send({
      success: false,
      errors: result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return null;
  }
  return result.data;
}