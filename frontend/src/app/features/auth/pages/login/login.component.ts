import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, signal, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import * as THREE from 'three';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styles: [`
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 25px rgba(23, 163, 152, 0.25); }
      50% { box-shadow: 0 0 45px rgba(245, 166, 35, 0.4); }
    }
    @keyframes panelEntrance {
      from { opacity: 0; transform: translateY(30px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .glass-panel {
      background: rgba(43, 45, 51, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(238, 241, 244, 0.18);
      animation: panelEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glass-panel:hover {
      animation: pulseGlow 4s infinite alternate;
    }
  `]
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sphereCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('googleBtnContainer') private googleBtnContainer!: ElementRef<HTMLDivElement>;

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly sessionExpiredMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form: FormGroup;
  private readonly ngZone = inject(NgZone);

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationFrameId!: number;

  private bgMaterial!: THREE.ShaderMaterial;

  // Shader para simular el pliegue y textura de la seda en movimiento
  private vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  private fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 p = vUv * 4.0 - vec2(2.0);
      
      // Deformación armónica para pliegues profundos de tela
      for(int i = 1; i < 6; i++) {
        float f = float(i);
        p.x += 0.4 / f * sin(f * 2.5 * p.y + uTime * 1.2 + float(i)*1.2);
        p.y += 0.4 / f * cos(f * 2.5 * p.x + uTime * 1.1 + float(i)*1.8);
      }

      float wave = sin(p.x * 1.5 + p.y * 1.5);
      float wave2 = cos(p.x * 2.0 - p.y * 1.0);

      // Paleta Oficial: #0F2C4C, #1E8A5D, #17A398, #F5A623
      vec3 azulMarino     = vec3(0.058, 0.172, 0.298);
      vec3 verdeEsmeralda = vec3(0.117, 0.541, 0.364);
      vec3 verdeAzulado   = vec3(0.090, 0.639, 0.596);
      vec3 ambar          = vec3(0.960, 0.650, 0.137);
      vec3 brilloBlanco   = vec3(0.933, 0.945, 0.957);

      // Mezcla de sombras y luces de los pliegues
      vec3 color = mix(azulMarino, verdeEsmeralda, smoothstep(-0.8, 0.8, wave));
      color = mix(color, verdeAzulado, smoothstep(-0.5, 0.9, wave2));
      
      // Reflejo especular satinado (Luces en las crestas de la tela)
      float highlight = pow(max(0.0, wave * wave2), 3.0);
      color = mix(color, ambar, highlight * 0.6);
      color += brilloBlanco * pow(highlight, 2.0) * 0.25;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    // Si authService tiene mensaje de expiración de sesión previo
    if (this.authService.sessionExpiredMessage()) {
      this.sessionExpiredMessage.set(this.authService.sessionExpiredMessage());
    }

    // Escuchar parámetros dinámicamente y limpiar la URL al detectar la flag
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        const msg = this.authService.sessionExpiredMessage() || 'Tu sesión expiró por inactividad.';
        this.sessionExpiredMessage.set(msg);

        // Remover el queryParam de la URL para evitar que persista en refrescos/recargas
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { sessionExpired: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this.init3DScene();
    this.initGoogleSignIn();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.renderer) this.renderer.dispose();
  }

  private init3DScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 6;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Fondo animado de seda
    const bgGeo = new THREE.PlaneGeometry(16, 10);
    this.bgMaterial = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: { uTime: { value: 0 } },
      depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgGeo, this.bgMaterial);
    bgMesh.position.z = -4;
    this.scene.add(bgMesh);

    window.addEventListener('resize', this.onWindowResize);
    this.animate();
  }

  private onWindowResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.bgMaterial) {
      this.bgMaterial.uniforms['uTime'].value += 0.025;
    }

    this.renderer.render(this.scene, this.camera);
  };

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.sessionExpiredMessage.set(null);
    this.authService.sessionExpiredMessage.set(null);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Credenciales inválidas.');
      },
    });
  }

  /**
   * Inicializa el SDK oficial de Google Identity Services y renderiza el botón
   */
  private initGoogleSignIn(): void {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      // Reintentar brevemente si el script de Google todavía está cargando asíncronamente
      setTimeout(() => this.initGoogleSignIn(), 150);
      return;
    }

    const clientId = environment.googleClientId;
    if (!clientId || clientId.includes('TU_GOOGLE_CLIENT_ID')) {
      // Si aún no se ha configurado un client ID real, renderizar botón informativo o fallback
      if (this.googleBtnContainer?.nativeElement) {
        this.googleBtnContainer.nativeElement.innerHTML = `
          <button type="button" class="w-full h-11 px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold flex items-center justify-center gap-3 transition-colors shadow-sm">
            <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"/><path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.4 7.5 23.5 12 23.5z"/></svg>
            <span>Continuar con Google</span>
          </button>
        `;
        const btn = this.googleBtnContainer.nativeElement.querySelector('button');
        if (btn) {
          btn.onclick = () => {
            this.errorMessage.set('Para habilitar Google Login, configure su GOOGLE_CLIENT_ID en environment.ts y .env.');
          };
        }
      }
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleGoogleResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (this.googleBtnContainer?.nativeElement) {
        google.accounts.id.renderButton(this.googleBtnContainer.nativeElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
      }
    } catch (e) {
      console.warn('Google Identity Services no pudo inicializarse:', e);
    }
  }

  /**
   * Procesa la respuesta de Google: extrae credential (ID token) y lo envía al backend
   */
  private handleGoogleResponse(response: any): void {
    if (!response || !response.credential) {
      this.ngZone.run(() => {
        this.errorMessage.set('No se pudo autenticar con Google.');
      });
      return;
    }

    this.ngZone.run(() => {
      this.googleLoading.set(true);
      this.errorMessage.set(null);
      this.sessionExpiredMessage.set(null);

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.googleLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.googleLoading.set(false);
          if (err.status === 409) {
            // Mensaje claro si ya existe cuenta local con ese email
            this.errorMessage.set(
              err?.error?.message ||
              'Ya existe una cuenta local con este correo. Inicia sesión con contraseña.',
            );
          } else {
            this.errorMessage.set(
              err?.error?.message || 'Error al autenticar con Google. Intente nuevamente.',
            );
          }
        },
      });
    });
  }
}