import { z } from 'zod';

/** Store owner invites a delivery boy — triggers an OTP to the given phone. */
export const inviteBoySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
});

/** Daily report query — defaults to today when `date` is omitted. */
export const dailyReportQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
});

export type InviteBoyInput = z.infer<typeof inviteBoySchema>;
export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>;
