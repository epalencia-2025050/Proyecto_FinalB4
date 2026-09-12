import { Injectable, computed, signal, OnDestroy, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Role, User } from '../models/user.model';

const TOKEN_KEY = 'gi_token';
const USER_KEY = 'gi_user';

/** Configuración de tiempo de inactividad en minutos por defecto */
export let INACTIVITY_TIMEOUT_MINUTES = 2;

/** Eventos del usuario a monitorear para determinar actividad */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'keydown',
  'mousemove',
  'touchstart',
  'scroll',
];

/** Throttling de eventos de usuario (1 seg para máxima respuesta en interacción) */
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Intervalo dinámico y seguro de renovación al backend:
 * Se renueva al alcanzar el 50% del tiempo de inactividad, con un tope máximo de 2 minutos
 * y un mínimo de 10 segundos, garantizando que el refresh ocurra siempre ANTES de que expire.
 */
function getMinRefreshIntervalMs(): number {
  const timeoutMs = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
  return Math.max(10_000, Math.min(2 * 60 * 1000, timeoutMs / 2));
}

/** Forma minima del payload de un JWT que nos interesa leer en el cliente. */
interface DecodedJwtPayload {
  sub?: number;
  email?: string;
  rol?: Role;
  exp?: number; // timestamp en SEGUNDOS (no milisegundos) de expiracion
  lastActivity?: number; // timestamp en ms
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  // Signal privada con el usuario actual (null si no hay sesion)
  private readonly currentUserSignal = signal<User | null>(this.loadUserFromStorage());

  // Exponemos version de solo lectura hacia afuera
  readonly currentUser = this.currentUserSignal.asReadonly();

  // Signal derivada: true/false segun si hay usuario autenticado
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  // Signal derivada: true si el usuario autenticado tiene rol 'admin'
  readonly isAdmin = computed(() => this.currentUserSignal()?.rol === 'admin');

  // Signal para almacenar el mensaje de expiración de sesión
  readonly sessionExpiredMessage = signal<string | null>(null);

  /** Handle del setTimeout para poder cancelarlo en logout o al destruir */
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  private lastActivityTimestamp = Date.now();
  private lastRefreshTimestamp = 0;
  private lastEventProcessed = 0;
  private isListeningToActivity = false;
  private boundEventListener: ((e: Event) => void) | null = null;

  private readonly ngZone = inject(NgZone);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    // Obtener la configuración centralizada de inactividad desde el backend
    this.fetchInactivityTimeout();

    // Al arrancar la app, si ya había una sesión guardada, programa la vigilancia de inactividad
    if (this.isAuthenticated()) {
      this.scheduleTokenExpiry();
      this.startActivityMonitoring();
    }
  }

  /**
   * Obtiene la configuración única de inactividad establecida en el backend (.env)
   * para que el usuario solo deba cambiar el tiempo en un solo lugar.
   */
  fetchInactivityTimeout(): void {
    this.http.get<{ data: { inactivityTimeoutMinutes: number } }>(`${environment.apiUrl}/auth/timeout`).subscribe({
      next: (res) => {
        if (res?.data?.inactivityTimeoutMinutes) {
          INACTIVITY_TIMEOUT_MINUTES = res.data.inactivityTimeoutMinutes;
          if (this.isAuthenticated()) {
            this.scheduleInactivityCheck();
          }
        }
      },
      error: () => {
        // En caso de fallo de red puntual, usa el valor default
      }
    });
  }

  ngOnDestroy(): void {
    this.cancelTokenExpiry();
    this.stopActivityMonitoring();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.sessionExpiredMessage.set(null);
          this.setSession(response.data.token, response.data.user);
          this.fetchInactivityTimeout();
          this.startActivityMonitoring();
        }),
      );
  }

  /**
   * Envía el ID token de Google al backend para verificación.
   * Al responder con éxito, almacena el JWT propio de la app y usuario mediante el mecanismo actual.
   */
  loginWithGoogle(credential: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/google`, { credential })
      .pipe(
        tap((response) => {
          this.sessionExpiredMessage.set(null);
          this.setSession(response.data.token, response.data.user);
          this.fetchInactivityTimeout();
          this.startActivityMonitoring();
        }),
      );
  }

  logout(sessionExpired: boolean = false, message?: string): void {
    this.cancelTokenExpiry();
    this.stopActivityMonitoring();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);

    if (sessionExpired) {
      const msg = message || 'Tu sesión expiró por inactividad.';
      this.sessionExpiredMessage.set(msg);
      this.router.navigate(['/login'], {
        queryParams: { sessionExpired: 'true' },
      });
    } else {
      this.sessionExpiredMessage.set(null);
      this.router.navigate(['/login']);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Util para chequear roles especificos en templates o guards,
   * por ejemplo: authService.hasRole(['admin', 'user'])
   */
  hasRole(roles: Role[]): boolean {
    const rol = this.currentUserSignal()?.rol;
    return rol !== undefined && roles.includes(rol);
  }

  /**
   * Revisa la expiracion del JWT SIN llamar al backend, decodificando
   * directamente el token guardado en localStorage. Util para reaccionar
   * de forma inmediata (ej. al hacer click) sin esperar un 401 del servidor.
   *
   * Nota: esto NO reemplaza la validacion del backend (auth.middleware.ts),
   * que sigue siendo la unica fuente de verdad real. Esto es solo para
   * mejorar la experiencia del usuario en el frontend.
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return false; // sin token no hay "sesion expirada", simplemente no hay sesion
    }

    const payload = this.decodeToken(token);
    if (!payload?.exp) {
      // Token malformado o sin campo exp: lo tratamos como invalido/expirado
      return true;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds;
  }

  /**
   * Programa un setTimeout que llama a logout() exactamente cuando
   * el token expire. Se cancela si el usuario hace logout manual antes.
   *
   * El maximo de setTimeout es ~24.8 dias (2^31 ms). Para tokens con
   * expiracion mayor se puede usar setInterval, pero con JWT_EXPIRES_IN=24h
   * este valor es siempre seguro.
   */
  scheduleTokenExpiry(): void {
    this.cancelTokenExpiry(); // limpiar timer previo si existia

    const token = this.getToken();
    if (!token) return;

    const payload = this.decodeToken(token);
    if (!payload?.exp) return;

    const nowMs = Date.now();
    const expiryMs = payload.exp * 1000; // convertir segundos a milisegundos
    const msUntilExpiry = expiryMs - nowMs;

    if (msUntilExpiry <= 0) {
      // Ya expiró: cerrar sesión inmediatamente notificando expiración
      this.logout(true);
      return;
    }

    this.expiryTimer = setTimeout(() => {
      this.logout(true);
    }, msUntilExpiry);
  }

  /** Cancela el timer de expiración si existe. */
  private cancelTokenExpiry(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  /**
   * Registra una actividad válida del usuario (click, tecla, navegación, API call)
   * y reinicia el temporizador de inactividad.
   */
  recordActivity(): void {
    this.lastActivityTimestamp = Date.now();
    this.scheduleInactivityCheck();
    this.considerTokenRefresh();
  }

  /**
   * Inicia los listeners de eventos DOM para detectar interacción real.
   */
  startActivityMonitoring(): void {
    if (this.isListeningToActivity) return;
    this.isListeningToActivity = true;
    this.lastActivityTimestamp = Date.now();
    this.lastRefreshTimestamp = Date.now();

    this.boundEventListener = () => this.handleUserInteraction();

    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.addEventListener(event, this.boundEventListener!, { passive: true });
      });
    });

    this.scheduleInactivityCheck();
  }

  /**
   * Detiene el monitoreo y limpia listeners y timer.
   */
  stopActivityMonitoring(): void {
    if (!this.isListeningToActivity) return;
    this.isListeningToActivity = false;

    if (this.boundEventListener) {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, this.boundEventListener!);
      });
      this.boundEventListener = null;
    }

    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private handleUserInteraction(): void {
    const now = Date.now();
    if (now - this.lastEventProcessed < ACTIVITY_THROTTLE_MS) {
      return;
    }
    this.lastEventProcessed = now;
    this.lastActivityTimestamp = now;

    this.scheduleInactivityCheck();
    this.considerTokenRefresh();
  }

  /**
   * Programa la verificación de inactividad según INACTIVITY_TIMEOUT_MINUTES.
   */
  private scheduleInactivityCheck(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (!this.isAuthenticated()) return;

    const timeoutMs = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
    const elapsed = Date.now() - this.lastActivityTimestamp;
    const remaining = timeoutMs - elapsed;

    if (remaining <= 0) {
      this.triggerInactivityLogout();
      return;
    }

    this.inactivityTimer = setTimeout(() => {
      const currentElapsed = Date.now() - this.lastActivityTimestamp;
      if (currentElapsed >= timeoutMs) {
        this.triggerInactivityLogout();
      } else {
        this.scheduleInactivityCheck();
      }
    }, remaining);
  }

  private triggerInactivityLogout(): void {
    this.ngZone.run(() => {
      this.logout(true, 'Tu sesión expiró por inactividad.');
    });
  }

  /**
   * Renueva el JWT contra el backend de forma controlada y solo si hubo interacción real.
   */
  private considerTokenRefresh(): void {
    if (!this.isAuthenticated()) return;

    const now = Date.now();
    const minInterval = getMinRefreshIntervalMs();
    if (now - this.lastRefreshTimestamp < minInterval) {
      return;
    }

    this.lastRefreshTimestamp = now;
    this.refreshToken().subscribe({
      error: (err) => {
        if (err?.error?.code === 'INACTIVITY_TIMEOUT' || err?.status === 401) {
          this.triggerInactivityLogout();
        }
      },
    });
  }

  /**
   * Llama al endpoint /auth/refresh para obtener un nuevo token con `lastActivity` actualizado.
   */
  refreshToken(): Observable<{ data: { token: string } }> {
    return this.http
      .post<{ data: { token: string } }>(`${environment.apiUrl}/auth/refresh`, {})
      .pipe(
        tap((res) => {
          if (res?.data?.token) {
            localStorage.setItem(TOKEN_KEY, res.data.token);
            this.scheduleTokenExpiry();
          }
        }),
      );
  }

  /**
   * Decodifica la parte "payload" de un JWT (segunda seccion, separada por
   * puntos) sin verificar la firma. Verificar la firma es responsabilidad
   * exclusiva del backend; aqui solo queremos LEER datos publicos como "exp".
   */
  private decodeToken(token: string): DecodedJwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64Payload)
          .split('')
          .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(''),
      );
      return JSON.parse(jsonPayload) as DecodedJwtPayload;
    } catch {
      return null;
    }
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
    this.lastActivityTimestamp = Date.now();
    this.lastRefreshTimestamp = Date.now();
    // Programar el cierre automático y la vigilancia de inactividad
    this.scheduleTokenExpiry();
    this.scheduleInactivityCheck();
  }

  private loadUserFromStorage(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
