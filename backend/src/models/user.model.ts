/**
 * Roles soportados por el sistema. Al agregar un rol nuevo,
 * solo hay que tocar este tipo y la migracion de BD correspondiente.
 */
export type Role = 'admin' | 'user';

/**
 * Representacion completa de la fila en la tabla `usuarios`.
 * Nunca debe exponerse tal cual al cliente (incluye password_hash).
 */
export interface UserEntity {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Role;
  activo: boolean;
  google_id?: string | null;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

/**
 * Version "publica" del usuario, segura para enviar en respuestas HTTP.
 */
export interface UserPublic {
  id: number;
  nombre: string;
  email: string;
  rol: Role;
  fechaCreacion: Date;
}

export function toPublicUser(user: UserEntity): UserPublic {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    fechaCreacion: user.fecha_creacion,
  };
}
