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
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    inactivityTimeoutMinutes: parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES ?? '1', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },

  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: required('DB_USER', 'postgres'),
    password: required('DB_PASSWORD', 'postgres'),
    database: required('DB_NAME', 'gestion_ingresos'),
  },

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
};
