import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository';
import { toPublicUser, UserPublic } from '../models/user.model';
import { signAccessToken } from '../utils/jwt.util';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { googleAuthService } from './google-auth.service';

const SALT_ROUNDS = 10;

export interface LoginResult {
  token: string;
  user: UserPublic;
}

export class AuthService {
  /**
   * Valida credenciales y, si son correctas, genera un JWT que incluye el rol.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await userRepository.findByEmail(email.toLowerCase().trim());

    // Importante: usar el mismo mensaje de error tanto si el email no existe
    // como si la contrasena es incorrecta, para no revelar informacion.
    if (!user || !user.activo) {
      throw new UnauthorizedError('Email o contrasena incorrectos');
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Email o contrasena incorrectos');
    }

    const token = signAccessToken({ sub: user.id, email: user.email, rol: user.rol, lastActivity: Date.now() });

    return { token, user: toPublicUser(user) };
  }

  /**
   * Registro publico de un nuevo usuario. SIEMPRE crea con rol 'user':
   * la promocion a 'admin' se hace desde un endpoint protegido por
   * roleMiddleware(['admin']) o directamente en base de datos, nunca
   * dejando que el propio usuario elija su rol.
   */
  async register(nombre: string, email: string, password: string): Promise<UserPublic> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('Ya existe un usuario registrado con ese email');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const created = await userRepository.create(nombre.trim(), normalizedEmail, passwordHash, 'user');

    return toPublicUser(created);
  }

  /**
   * Autenticación con Google Identity Services:
   * 1. Verifica el token con GoogleAuthService.
   * 2. Si el usuario ya existe por google_id, inicia sesión.
   * 3. Si no existe por google_id pero el email ya está registrado localmente:
   *    NO vincula automáticamente, NO sobreescribe contraseña ni password_hash. Retorna conflicto controlado.
   * 4. Si no existe, crea el usuario con rol 'user', activo=true y emite el JWT idéntico al tradicional.
   */
  async loginWithGoogle(credential: string): Promise<LoginResult> {
    const googleUser = await googleAuthService.verifyIdToken(credential);

    // 1. Buscar si ya existe asociado a este google_id
    let user = await userRepository.findByGoogleId(googleUser.googleId);

    if (user) {
      if (!user.activo) {
        throw new UnauthorizedError('Usuario inactivo o suspendido');
      }
      const token = signAccessToken({
        sub: user.id,
        email: user.email,
        rol: user.rol,
        lastActivity: Date.now(),
      });
      return { token, user: toPublicUser(user) };
    }

    // 2. Si no existe por google_id, verificar si ya existe una cuenta local con ese email
    const localUser = await userRepository.findByEmail(googleUser.email);
    if (localUser) {
      // Regla obligatoria: NO sobrescribir password_hash, NO vincular silenciosamente.
      throw new ConflictError(
        'Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión con tu contraseña para vincular tu cuenta.',
      );
    }

    // 3. Usuario nuevo: crearlo con rol 'user', activo por defecto y un hash aleatorio no utilizable
    const randomPassword = `google_${googleUser.googleId}_${Date.now()}`;
    const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);
    const nombre = googleUser.name || googleUser.email.split('@')[0];

    const newUser = await userRepository.createWithGoogle(
      nombre.trim(),
      googleUser.email,
      googleUser.googleId,
      passwordHash,
      'user',
    );

    const token = signAccessToken({
      sub: newUser.id,
      email: newUser.email,
      rol: newUser.rol,
      lastActivity: Date.now(),
    });

    return { token, user: toPublicUser(newUser) };
  }

  async getProfile(userId: number): Promise<UserPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }
    return toPublicUser(user);
  }

  /**
   * Solo deberia exponerse detras de roleMiddleware(['admin']).
   */
  async listUsers(): Promise<UserPublic[]> {
    const users = await userRepository.findAll();
    return users.map(toPublicUser);
  }
}

export const authService = new AuthService();
