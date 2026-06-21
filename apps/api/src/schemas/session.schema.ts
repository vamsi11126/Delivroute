import { z } from 'zod';

/** Create a delivery session for today. No body fields — boy/store come from JWT. */
export const createSessionSchema = z.object({}).strip();

/** A single package to add to a session (geocoded server-side). */
const packageInputSchema = z.object({
  packageRef: z.string().trim().min(1, 'packageRef is required'),
  customerName: z.string().trim().min(1, 'customerName is required'),
  address: z.string().trim().min(1, 'address is required'),
});

/** Bulk-add packages to a session. */
export const addPackagesSchema = z.object({
  packages: z.array(packageInputSchema).min(1, 'At least one package is required'),
});

/** A GPS coordinate pair — used by optimise and location pings. */
const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Optimise route from the boy's current location. */
export const optimizeSchema = latLngSchema;

/** Push the boy's current GPS location. */
export const pushLocationSchema = latLngSchema;

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type PackageInput = z.infer<typeof packageInputSchema>;
export type AddPackagesInput = z.infer<typeof addPackagesSchema>;
export type OptimizeInput = z.infer<typeof optimizeSchema>;
export type PushLocationInput = z.infer<typeof pushLocationSchema>;
