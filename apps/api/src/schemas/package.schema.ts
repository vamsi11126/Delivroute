import { z } from 'zod';

/** Mark a package delivered. No body required. */
export const markDeliveredSchema = z.object({}).strip();

/** Mark a package failed — a reason is mandatory. */
export const markFailedSchema = z.object({
  failReason: z.string().trim().min(1, 'failReason is required'),
});

export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>;
export type MarkFailedInput = z.infer<typeof markFailedSchema>;
