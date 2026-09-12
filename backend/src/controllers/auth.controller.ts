import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { signAccessToken } from '../utils/jwt.util';
import { Role } from '../models/user.model';
import { env } from '../config/env';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({
        message: 'Login exitoso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential } = req.body;
      const result = await authService.loginWithGoogle(credential);
      res.status(200).json({
        message: 'Login con Google exitoso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombre, email, password } = req.body;
      const user = await authService.register(nombre, email, password);
      res.status(201).json({
        message: 'Usuario registrado correctamente',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.userId es inyectado por authMiddleware tras validar el JWT
      const profile = await authService.getProfile(req.userId!);
      res.status(200).json({ data: profile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Emite un nuevo JWT con `lastActivity` actualizado al momento actual.
   * El authMiddleware ya verificó que el JWT es válido y que no expiró por inactividad.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const newToken = signAccessToken({
        sub: req.userId!,
        email: req.userEmail!,
        rol: req.userRole as Role,
        lastActivity: Date.now(),
      });
      res.status(200).json({ data: { token: newToken } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint público para que el frontend obtenga la configuración centralizada de tiempo de inactividad
   */
  async getTimeout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      data: {
        inactivityTimeoutMinutes: env.jwt.inactivityTimeoutMinutes,
      },
    });
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await authService.listUsers();
      res.status(200).json({ data: users });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
