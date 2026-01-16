import { z } from 'zod';

/**
 * Shared environment variables used across all packages
 */
export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Database configuration
 */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
});

/**
 * DragonflyDB / Redis configuration
 */
export const cacheEnvSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

/**
 * Ory Kratos configuration
 */
export const kratosEnvSchema = z.object({
  KRATOS_PUBLIC_URL: z.string().url().default('http://localhost:4433'),
  KRATOS_ADMIN_URL: z.string().url().default('http://localhost:4434'),
});

/**
 * Ory Hydra configuration
 */
export const hydraEnvSchema = z.object({
  HYDRA_PUBLIC_URL: z.string().url().default('http://localhost:4444'),
  HYDRA_ADMIN_URL: z.string().url().default('http://localhost:4445'),
});

/**
 * SpiceDB configuration
 */
export const spicedbEnvSchema = z.object({
  SPICEDB_ENDPOINT: z.string().default('localhost:50051'),
  SPICEDB_PRESHARED_KEY: z.string().describe('SpiceDB preshared key for authentication'),
  SPICEDB_INSECURE: z.coerce.boolean().default(true).describe('Use insecure connection (dev only)'),
});

/**
 * Meilisearch configuration
 */
export const meilisearchEnvSchema = z.object({
  MEILISEARCH_URL: z.string().url().default('http://localhost:7700'),
  MEILISEARCH_MASTER_KEY: z.string().describe('Meilisearch master key for admin operations'),
});

/**
 * Helper to parse and validate environment
 */
export function createEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  env: Record<string, string | undefined> = process.env
): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return result.data;
}

export type SharedEnv = z.infer<typeof sharedEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type CacheEnv = z.infer<typeof cacheEnvSchema>;
export type KratosEnv = z.infer<typeof kratosEnvSchema>;
export type HydraEnv = z.infer<typeof hydraEnvSchema>;
export type SpiceDBEnv = z.infer<typeof spicedbEnvSchema>;
export type MeilisearchEnv = z.infer<typeof meilisearchEnvSchema>;
