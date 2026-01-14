import { z } from 'zod';
import {
  sharedEnvSchema,
  databaseEnvSchema,
  cacheEnvSchema,
  kratosEnvSchema,
  spicedbEnvSchema,
  createEnv,
} from './index.js';

/**
 * Backend-specific environment schema
 * Combines all required environment variables for the NestJS backend
 */
export const backendEnvSchema = sharedEnvSchema
  .merge(databaseEnvSchema)
  .merge(cacheEnvSchema)
  .merge(kratosEnvSchema)
  .merge(spicedbEnvSchema)
  .extend({
    // Server configuration
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    
    // CORS
    CORS_ORIGINS: z
      .string()
      .transform((val) => val.split(',').map((s) => s.trim()))
      .default('http://localhost:5173,http://localhost:6868'),
    
    // API configuration
    API_PREFIX: z.string().default('api'),
    
    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  });

export type BackendEnv = z.infer<typeof backendEnvSchema>;

/**
 * Validated backend environment
 * Use this in your NestJS ConfigModule
 */
export function getBackendEnv(): BackendEnv {
  return createEnv(backendEnvSchema);
}

/**
 * NestJS ConfigModule factory
 * Usage: ConfigModule.forRoot({ load: [backendConfigFactory] })
 */
export const backendConfigFactory = () => getBackendEnv();
