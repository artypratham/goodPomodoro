import dotenv from 'dotenv';

// Load .env in development. Render and Vercel supply env at runtime.
dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtIssuer: process.env.JWT_ISSUER ?? 'goodpomodoro',
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? ''
};

export function assertRequiredEnv(): void {
  if (nodeEnv === 'production') {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_SECRET');
    requireEnv('WEB_URL');
    requireEnv('API_URL');
    requireEnv('CORS_ORIGIN');
  }
}
