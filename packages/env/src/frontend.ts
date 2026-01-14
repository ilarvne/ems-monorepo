import { z } from 'zod';

/**
 * Frontend-specific environment schema
 * These are exposed to the browser, so only include public values
 */
export const frontendEnvSchema = z.object({
  // Vite requires VITE_ prefix for client-exposed env vars
  VITE_API_URL: z.string().url().default('http://localhost:3000'),
  VITE_KRATOS_PUBLIC_URL: z.string().url().default('http://localhost:4433'),
  VITE_HYDRA_PUBLIC_URL: z.string().url().default('http://localhost:4444'),
  
  // Feature flags
  VITE_ENABLE_DEVTOOLS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

export type FrontendEnv = z.infer<typeof frontendEnvSchema>;
