import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  jwt: {
    secret: required('JWT_SECRET', 'a815437c83ea62ebbcaa58fe4889b33adca680f6f8be07ce4afe34d9b9f3f8d248b281a6b8ca8d9ff57b2cc4bd88202b561efc6848bd097f235d7d82b8ec4a6b'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
    inactivityTimeoutMinutes: parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES ?? '1', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },

  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: required('DB_USER', 'postgres'),
    password: required('DB_PASSWORD', 'admin'),
    database: required('DB_NAME', 'gestion_ingresos'),
  },

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
};
