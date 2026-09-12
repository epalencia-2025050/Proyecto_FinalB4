import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Datos verificados obtenidos directamente del Google ID Token criptográficamente validado.
 */
export interface GoogleUserData {
  /** Identificador único, inmutable y estable del usuario en Google (claim 'sub') */
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.google.clientId);
  }

  /**
   * Verifica criptográficamente el ID token de Google Identity Services.
   * Valida:
   * 1. Firma con claves públicas oficiales de Google.
   * 2. Audiencia contra GOOGLE_CLIENT_ID.
   * 3. Expiración y formato del token.
   * 
   * Lanza UnauthorizedError si el token es inválido, expirado o manipulado.
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserData> {
    if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
      throw new UnauthorizedError('Token de Google no proporcionado');
    }

    const clientId = env.google.clientId;
    if (!clientId) {
      throw new UnauthorizedError('Configuración de Google Client ID no disponible en el servidor');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken.trim(),
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedError('Token de Google no contiene la información requerida');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        name: payload.name ?? '',
        picture: payload.picture,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      // Error controlado sin revelar información interna sensible
      throw new UnauthorizedError('Token de Google inválido o expirado');
    }
  }
}

export const googleAuthService = new GoogleAuthService();
