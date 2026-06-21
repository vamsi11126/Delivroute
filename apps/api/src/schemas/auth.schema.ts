import { z } from 'zod';

/** Store owner self-registration. Creates a Store + owner User. */
export const registerStoreSchema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required'),
  ownerName: z.string().trim().min(1, 'Owner name is required'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(1, 'Phone is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** Login for all roles — `identifier` is either an email or a phone number. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Exchange a refresh token for a new access token (with rotation). */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/** Logout — invalidates the supplied refresh token. */
export const logoutSchema = refreshSchema;

/** Store owner triggers an OTP invite for a delivery boy's phone. */
export const sendOtpSchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
});

/** Delivery boy onboarding — verifies the OTP and sets up the account. */
export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  name: z.string().trim().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterStoreInput = z.infer<typeof registerStoreSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
