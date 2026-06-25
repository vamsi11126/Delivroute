import { apiClient } from './client';
import type { AuthTokens, User } from '../types/models';

/** Standard backend response envelope. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

/** Raw shape returned by POST /auth/verify-otp. */
interface VerifyOtpData {
  accessToken: string;
  refreshToken: string;
  user: User;
  /** True when the account was just created and still needs a profile. */
  isNewUser: boolean;
}

export interface VerifyOtpResult {
  tokens: AuthTokens;
  user: User;
  isNewUser: boolean;
}

/** POST /auth/send-otp — request a one-time code for the given phone (+91…). */
export async function sendOtp(phone: string): Promise<void> {
  await apiClient.post('/auth/send-otp', { phone });
}

/** POST /auth/verify-otp — verify the code; returns tokens + user. */
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const { data } = await apiClient.post<Envelope<VerifyOtpData>>('/auth/verify-otp', {
    phone,
    otp,
  });
  const d = data.data;
  return {
    tokens: { accessToken: d.accessToken, refreshToken: d.refreshToken },
    user: d.user,
    isNewUser: Boolean(d.isNewUser),
  };
}

/** PATCH /auth/profile — set the delivery boy's name + password. */
export async function updateProfile(input: {
  name: string;
  password: string;
}): Promise<User> {
  const { data } = await apiClient.patch<Envelope<{ user: User }>>(
    '/auth/profile',
    input,
  );
  return data.data.user;
}
