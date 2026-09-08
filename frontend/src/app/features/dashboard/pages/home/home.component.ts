import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanzasService } from '../../../../core/services/finanzas.service';
import { Gasto, Ingreso } from '../../../../core/models/finanzas.model';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private _donutCanvas?: ElementRef<HTMLCanvasElement>;
  private _trendCanvas?: ElementRef<HTMLCanvasElement>;
  private _evolutionCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('donutCanvas') set donutCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._donutCanvas = ref;
    if (ref?.nativeElement) {
      setTimeout(() => this.initDonutChart(), 20);
    }
  }
  get donutCanvas(): ElementRef<HTMLCanvasElement> | undefined {
    return this._donutCanvas;
  }

  @ViewChild('trendCanvas') set trendCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._trendCanvas = ref;
    if (ref?.nativeElement) {
      setTimeout(() => this.initTrendChart(), 20);
    }
  }
  get trendCanvas(): ElementRef<HTMLCanvasElement> | undefined {
    return this._trendCanvas;
  }

  @ViewChild('evolutionCanvas') set evolutionCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._evolutionCanvas = ref;
    if (ref?.nativeElement) {
      setTimeout(() => this.initEvolutionChart(), 20);
    }
  }
  get evolutionCanvas(): ElementRef<HTMLCanvasElement> | undefined {
    return this._evolutionCanvas;
  }

  private donutChart: Chart | null = null;
  private trendChart: Chart | null = null;
  private evolutionChart: Chart | null = null;

  // Modales y vistas activas
  readonly activeView = signal<'dashboard' | 'ingresos' | 'history' | 'reports' | 'config'>('dashboard');
  readonly showIncomeModal = signal(false);
  readonly showExpenseModal = signal(false);
  readonly showDeleteConfirm = signal<{ type: 'ingreso' | 'gasto'; id: number; title: string } | null>(null);
  readonly editingItem = signal<{ type: 'ingreso' | 'gasto'; data: Ingreso | Gasto } | null>(null);
  readonly mobileSidebarOpen = signal(false);

  // Panel de Notificaciones
  readonly showNotifications = signal(false);
  readonly unreadNotificationsCount = computed(() => {
    return this.finanzasService.notifications().filter((n) => !n.leida).length;
  });

  // Modal para cambiar avatar de perfil
  readonly showAvatarModal = signal(false);
  readonly newAvatarUrlInput = signal('');
  readonly predefinedAvatars = [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  ];

  // Formulario reactivo para búsqueda
  readonly searchControl = signal('');
  readonly showSearchDropdown = signal(false);

  // Formularios reactivos
  incomeForm!: FormGroup;
  expenseForm!: FormGroup;
  incomeConfigForm!: FormGroup;

  formSubmitting = signal(false);
  formError = signal<string | null>(null);
  formSuccess = signal<string | null>(null);

  // Feedback para pantalla de ingresos
  incomeConfigSuccess = signal<string | null>(null);
  incomeConfigSubmitting = signal(false);

  // Filtros de historial
  readonly historyFilter = signal<'all' | 'ingreso' | 'gasto'>('all');
  readonly historyCategoryFilter = signal<string>('all');

  // Categorías predefinidas
  readonly standardCategories = ['Vivienda', 'Alimentación', 'Transporte', 'Otros'];

  // Bancos predefinidos
  readonly bancosDisponibles = [
    'Banco Industrial',
    'Banco G&T Continental',
    'Banrural',
    'BAC Credomatic',
    'Banco Promerica',
    'Interbanco',
    'Otro Banco',
  ];

  // Fuentes de ingreso calculadas en tiempo real
  readonly defaultBankInfo = {
    nombreBanco: 'Banco Industrial',
    numeroCuenta: '',
    tipoCuenta: 'Cuenta corriente',
    taxId: '',
    frecuenciaPago: 'Mensual',
    currency: 'GTQ (Q)',
  };

  readonly bankInfoSignal = computed(() => {
    const cfg = this.finanzasService.configuracion();
    if (!cfg) return this.defaultBankInfo;
    return {
      nombreBanco: cfg.nombreBanco || 'Banco Industrial',
      numeroCuenta: cfg.numeroCuenta || '',
      tipoCuenta: cfg.tipoCuenta || 'Cuenta corriente',
      taxId: cfg.taxId || '',
      frecuenciaPago: cfg.frecuenciaPago || 'Mensual',
      currency: cfg.moneda || 'GTQ (Q)',
    };
  });

  // Saldo y Ahorro unificados: Consumen directamente la única fuente de verdad (backend)
  readonly displaySaldoTotal = computed(() => this.finanzasService.resumen().saldoTotal);
  readonly displayAhorroAcumulado = computed(() => this.finanzasService.resumen().ahorroAcumulado);

  readonly fuentesIngresoBreakdown = computed(() => {
    const incomes = this.finanzasService.ingresos();
    const total = incomes.reduce((acc, curr) => acc + curr.monto, 0);

    if (total === 0) {
      return [];
    }

    const salarioTotal = incomes
      .filter((i) => i.categoria.toLowerCase().includes('salario') || i.categoria.toLowerCase().includes('sueldo'))
      .reduce((acc, curr) => acc + curr.monto, 0);

    const freelanceTotal = incomes
      .filter((i) => i.categoria.toLowerCase().includes('freelance') || i.categoria.toLowerCase().includes('servicios'))
      .reduce((acc, curr) => acc + curr.monto, 0);

    const inversionesTotal = incomes
      .filter((i) => i.categoria.toLowerCase().includes('inversion') || i.categoria.toLowerCase().includes('comision'))
      .reduce((acc, curr) => acc + curr.monto, 0);

    const otrosTotal = Math.max(0, total - (salarioTotal + freelanceTotal + inversionesTotal));

    const result: { nombre: string; porcentaje: number }[] = [];
    if (salarioTotal > 0) {
      result.push({ nombre: 'Salario Base', porcentaje: Math.round((salarioTotal / total) * 100) });
    }
    if (freelanceTotal > 0) {
      result.push({ nombre: 'Freelance', porcentaje: Math.round((freelanceTotal / total) * 100) });
    }
    if (inversionesTotal > 0) {
      result.push({ nombre: 'Inversiones', porcentaje: Math.round((inversionesTotal / total) * 100) });
    }
    if (otrosTotal > 0) {
      result.push({ nombre: 'Otros', porcentaje: Math.round((otrosTotal / total) * 100) });
    }

    return result;
  });

  // Lista combinada de transacciones filtradas por búsqueda
  readonly filteredTransactions = computed(() => {
    const query = this.searchControl().toLowerCase().trim();
    const typeFilter = this.historyFilter();
    const catFilter = this.historyCategoryFilter();

    const incomes = this.finanzasService.ingresos().map((i) => ({
      ...i,
      transactionType: 'ingreso' as const,
    }));

    const expenses = this.finanzasService.gastos().map((g) => ({
      ...g,
      transactionType: 'gasto' as const,
    }));

    let combined: Array<(Ingreso | Gasto) & { transactionType: 'ingreso' | 'gasto' }> = [];

    if (typeFilter === 'all' || typeFilter === 'ingreso') {
      combined.push(...incomes);
    }
    if (typeFilter === 'all' || typeFilter === 'gasto') {
      combined.push(...expenses);
    }

    combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (catFilter !== 'all') {
      combined = combined.filter(
        (t) => t.categoria.toLowerCase() === catFilter.toLowerCase(),
      );
    }

    if (query) {
      combined = combined.filter(
        (t) =>
          t.descripcion.toLowerCase().includes(query) ||
          t.categoria.toLowerCase().includes(query) ||
          t.estado.toLowerCase().includes(query) ||
          t.monto.toString().includes(query) ||
          t.fecha.includes(query),
      );
    }

    return combined;
  });

  constructor(
    readonly authService: AuthService,
    readonly finanzasService: FinanzasService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
  ) {
    effect(() => {
      this.finanzasService.categorias();
      if (this.donutCanvas) {
        this.updateDonutChart();
      }
    });

    effect(() => {
      this.finanzasService.tendencia();
      if (this.trendCanvas) {
        this.updateTrendChart();
      }
      if (this.evolutionCanvas) {
        this.updateEvolutionChart();
      }
    });

    // Sincronizar formulario de configuración con los datos persistidos en PostgreSQL
    effect(() => {
      const cfg = this.finanzasService.configuracion();
      if (cfg && this.incomeConfigForm) {
        this.incomeConfigForm.patchValue(
          {
            nombreBanco: cfg.nombreBanco || 'Banco Industrial',
            numeroCuenta: cfg.numeroCuenta || '',
            tipoCuenta: cfg.tipoCuenta || 'Cuenta corriente',
            taxId: cfg.taxId || '',
            frecuenciaPago: cfg.frecuenciaPago || 'Mensual',
            currency: cfg.moneda || 'GTQ (Q)',
          },
          { emitEvent: false }
        );
      }
    });
  }

  getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnInit(): void {
    this.initForms();
    this.finanzasService.loadAll();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initDonutChart();
      this.initTrendChart();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private initForms(): void {
    const today = this.getLocalDateString();

    this.incomeForm = this.fb.group({
      monto: [null, [Validators.required, Validators.min(0.01)]],
      descripcion: ['', [Validators.required, Validators.minLength(2)]],
      fecha: [today, Validators.required],
      categoria: ['Salario', Validators.required],
      estado: ['completado', Validators.required],
      tipoCuenta: ['Cuenta corriente', Validators.required],
    });

    this.expenseForm = this.fb.group({
      monto: [null, [Validators.required, Validators.min(0.01)]],
      descripcion: ['', [Validators.required, Validators.minLength(2)]],
      fecha: [today, Validators.required],
      categoria: ['Alimentación', Validators.required],
      estado: ['pagado', Validators.required],
    });

    // =========================================================================
    // MÓDULO: INGRESAR LOS INGRESOS (GITHUB COMMIT)
    // Formulario de configuración de salario, información bancaria y datos tributarios
    // =========================================================================
    this.incomeConfigForm = this.fb.group({
      montoIngreso: [null, [Validators.required, Validators.min(1)]],
      sueldoHora: [{ value: 0, disabled: false }],
      nombreBanco: [this.defaultBankInfo.nombreBanco, Validators.required],
      numeroCuenta: [this.defaultBankInfo.numeroCuenta, Validators.required],
      tipoCuenta: [this.defaultBankInfo.tipoCuenta, Validators.required],
      taxId: [this.defaultBankInfo.taxId, Validators.required],
      frecuenciaPago: [this.defaultBankInfo.frecuenciaPago, Validators.required],
      currency: [this.defaultBankInfo.currency, Validators.required],
    });

    // Cálculo dinámico automático: Sueldo por hora basado en 160 horas al mes
    this.incomeConfigForm.get('montoIngreso')?.valueChanges.subscribe((val) => {
      if (val && val > 0) {
        const porHora = Math.round((val / 160) * 100) / 100;
        this.incomeConfigForm.patchValue({ sueldoHora: porHora }, { emitEvent: false });
      }
    });
  }

  // =========================================================================
  // CÁLCULOS FINANCIEROS REACTIVOS (INGRESAR INGRESOS - IVA 12% GUATEMALA)
  // =========================================================================
  get currentMontoIngreso(): number {
    return Number(this.incomeConfigForm?.get('montoIngreso')?.value) || 0;
  }

  get currentSueldoHora(): number {
    const val = Number(this.incomeConfigForm?.get('sueldoHora')?.value);
    return val > 0 ? val : (this.currentMontoIngreso > 0 ? Math.round((this.currentMontoIngreso / 160) * 100) / 100 : 0);
  }

  /**
   * Cálculo de IVA al 12% según régimen tributario estándar de Guatemala
   */
  get ivaDesglose(): number {
    return Math.round(this.currentMontoIngreso * 0.12 * 100) / 100;
  }

  /**
   * Ingreso neto estimado (Monto Bruto - 12% IVA)
   */
  get netoEstimado(): number {
    return Math.round(this.currentMontoIngreso * 0.88 * 100) / 100;
  }

  /**
   * Proyección anual bruta (Monto mensual * 12 meses)
   */
  get brutoAnualProyectado(): number {
    return Math.round(this.currentMontoIngreso * 12 * 100) / 100;
  }

  /**
   * Proyección anual neta (Monto neto mensual * 12 meses)
   */
  get netoAnualProyectado(): number {
    return Math.round(this.netoEstimado * 12 * 100) / 100;
  }

  // =========================================================================
  // PERSISTENCIA DE INGRESO Y PERFIL BANCARIO (POSTGRESQL + LOCALSTORAGE)
  // =========================================================================
  // =========================================================================
  // PERSISTENCIA DE INGRESO Y PERFIL BANCARIO (POSTGRESQL)
  // =========================================================================
  saveIncomeConfiguration(): void {
    if (this.incomeConfigForm.invalid) {
      this.incomeConfigForm.markAllAsTouched();
      return;
    }

    this.incomeConfigSubmitting.set(true);
    this.incomeConfigSuccess.set(null);

    const values = this.incomeConfigForm.value;
    const isAhorro = values.tipoCuenta === 'Cuenta de ahorro';

    // 1. Persistir información bancaria en PostgreSQL vía API
    const bankDataToSave = {
      nombreBanco: values.nombreBanco,
      numeroCuenta: values.numeroCuenta,
      tipoCuenta: values.tipoCuenta,
      taxId: values.taxId,
      frecuenciaPago: values.frecuenciaPago,
      moneda: values.currency,
    };

    this.finanzasService.updateConfiguracion(bankDataToSave).subscribe({
      error: (err) => console.error('Error al actualizar configuración bancaria:', err),
    });

    // 2. Registrar el nuevo ingreso financiero en PostgreSQL
    const today = this.getLocalDateString();
    this.finanzasService
      .createIngreso({
        monto: Number(values.montoIngreso),
        descripcion: `Salario ${values.frecuenciaPago} - ${values.nombreBanco}`,
        fecha: today,
        categoria: 'Salario',
        estado: 'completado',
        esAhorro: isAhorro,
      })
      .subscribe({
        next: () => {
          this.incomeConfigSubmitting.set(false);
          this.incomeConfigSuccess.set('¡Ingreso y configuración guardados exitosamente en la base de datos!');
          this.incomeConfigForm.patchValue({
            montoIngreso: null,
            sueldoHora: 0,
          });
          setTimeout(() => this.incomeConfigSuccess.set(null), 4000);
        },
        error: (err) => {
          this.incomeConfigSubmitting.set(false);
          this.incomeConfigSuccess.set(err?.error?.message || 'Error al registrar ingreso.');
          setTimeout(() => this.incomeConfigSuccess.set(null), 4000);
        },
      });
  }

  // --- Gráfica Donut (Gastos por categorías) ---
  private initDonutChart(): void {
    if (!this.donutCanvas) return;
    const ctx = this.donutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }

    const cats = this.finanzasService.categorias();
    const totalGastos = cats.reduce((acc, c) => acc + c.total, 0);

    // Si no hay gastos registrados, no renderizar gráfica con datos fabricados
    if (totalGastos === 0) {
      return;
    }

    const labels = cats.map((c) => c.categoria);
    const data = cats.map((c) => c.total);
    const backgroundColors = ['#0b3d4a', '#f2a625', '#1ea6b6', '#ffffff'];

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors,
            borderColor: '#1a8881',
            borderWidth: 3,
            hoverOffset: 6,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#08323d',
            titleColor: '#ffffff',
            bodyColor: '#95b5bc',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const total = context.parsed;
                return ` ${context.label}: Q${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              },
            },
          },
        },
      },
    });
  }

  private updateDonutChart(): void {
    if (!this.donutChart) {
      this.initDonutChart();
      return;
    }

    const cats = this.finanzasService.categorias();
    const totalGastos = cats.reduce((acc, c) => acc + c.total, 0);
    if (totalGastos === 0) {
      this.donutChart.destroy();
      this.donutChart = null;
      return;
    }

    this.donutChart.data.labels = cats.map((c) => c.categoria);
    this.donutChart.data.datasets[0].data = cats.map((c) => c.total);
    this.donutChart.update();
  }

  // --- Gráfica de Barras (Tendencia de ahorro del backend) ---
  private initTrendChart(): void {
    if (!this.trendCanvas) return;
    const ctx = this.trendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }

    const trend = this.finanzasService.tendencia();
    const labels = trend.map((t) => t.mes);
    const data = trend.map((t) => t.ahorro);

    this.trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ahorro',
            data: data,
            backgroundColor: '#dca044',
            hoverBackgroundColor: '#f2a625',
            borderRadius: {
              topLeft: 6,
              topRight: 6,
              bottomLeft: 0,
              bottomRight: 0,
            },
            borderSkipped: false,
            barPercentage: 0.75,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#08323d',
            titleColor: '#ffffff',
            bodyColor: '#f2a625',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const item = this.finanzasService.tendencia()[idx];
                return item ? `${item.mesCompleto} ${item.ano}` : items[0]?.label ?? '';
              },
              label: (context) => {
                const idx = context.dataIndex;
                const item = this.finanzasService.tendencia()[idx];
                if (item) {
                  return `Ahorro: Q${item.ahorro.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                }
                return `Valor: ${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#8fa7ad',
              font: {
                size: 11,
                family: 'Plus Jakarta Sans',
              },
            },
            border: {
              display: false,
            },
          },
          y: {
            min: 0,
            ticks: {
              color: '#8fa7ad',
              font: {
                size: 11,
                family: 'Plus Jakarta Sans',
              },
            },
            grid: {
              color: 'rgba(26, 136, 129, 0.3)',
            },
            border: {
              display: false,
            },
          },
        },
      },
    });
  }

  private updateTrendChart(): void {
    if (!this.trendChart) {
      this.initTrendChart();
      return;
    }

    const trend = this.finanzasService.tendencia();
    this.trendChart.data.labels = trend.map((t) => t.mes);
    this.trendChart.data.datasets[0].data = trend.map((t) => t.ahorro);
    this.trendChart.update();
  }

  // --- Gráfica de Área (Evolución de ingresos de los últimos 6 meses) ---
  private initEvolutionChart(): void {
    if (!this.evolutionCanvas?.nativeElement) return;
    const ctx = this.evolutionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.evolutionChart) {
      this.evolutionChart.destroy();
      this.evolutionChart = null;
    }

    const trend = this.finanzasService.tendencia().slice(-6);
    const labels = trend.map((t) => t.mes);
    const data = trend.map((t) => t.ingresos);
    const maxVal = Math.max(...data, 0);

    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, 'rgba(40, 190, 208, 0.45)');
    gradient.addColorStop(1, 'rgba(40, 190, 208, 0.0)');

    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos',
            data: data,
            borderColor: '#28bed0',
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#28bed0',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#08323d',
            titleColor: '#ffffff',
            bodyColor: '#28bed0',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` Ingresos: Q${(ctx.parsed.y || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8fa7ad', font: { size: 10, family: 'Plus Jakarta Sans' } },
            border: { display: false },
          },
          y: {
            display: false,
            suggestedMin: 0,
            suggestedMax: maxVal > 0 ? maxVal * 1.15 : 1000,
            grid: { display: false },
          },
        },
      },
    });
  }

  private updateEvolutionChart(): void {
    if (!this.evolutionChart) {
      this.initEvolutionChart();
      return;
    }
    const trend = this.finanzasService.tendencia().slice(-6);
    this.evolutionChart.data.labels = trend.map((t) => t.mes);
    this.evolutionChart.data.datasets[0].data = trend.map((t) => t.ingresos);
    this.evolutionChart.data.datasets[0].label = 'Ingresos';
    const maxVal = Math.max(...trend.map((t) => t.ingresos), 0);
    if (this.evolutionChart.options.scales?.['y']) {
      this.evolutionChart.options.scales['y'].suggestedMax = maxVal > 0 ? maxVal * 1.15 : 1000;
    }
    this.evolutionChart.update();
  }

  private destroyCharts(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
      this.evolutionChart = null;
    }
  }

  // --- Manejo de Navegación & Vistas ---
  setView(view: 'dashboard' | 'ingresos' | 'history' | 'reports' | 'config'): void {
    this.activeView.set(view);
    this.mobileSidebarOpen.set(false);

    if (view === 'dashboard') {
      setTimeout(() => {
        this.initDonutChart();
        this.initTrendChart();
      }, 60);
    } else if (view === 'ingresos') {
      setTimeout(() => {
        this.initEvolutionChart();
      }, 60);
    }
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  // --- Modales de Crear / Editar ---
  // --- Modales de Crear / Editar ---
  openAddIncomeModal(): void {
    this.editingItem.set(null);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.incomeForm.reset({
      monto: null,
      descripcion: '',
      fecha: this.getLocalDateString(),
      categoria: 'Salario',
      estado: 'completado',
      tipoCuenta: 'Cuenta corriente',
    });
    this.showIncomeModal.set(true);
    this.mobileSidebarOpen.set(false);
  }

  openAddExpenseModal(): void {
    this.editingItem.set(null);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.expenseForm.reset({
      monto: null,
      descripcion: '',
      fecha: this.getLocalDateString(),
      categoria: 'Alimentación',
      estado: 'pagado',
    });
    this.showExpenseModal.set(true);
    this.mobileSidebarOpen.set(false);
  }

  openEditModal(item: (Ingreso | Gasto) & { transactionType: 'ingreso' | 'gasto' }): void {
    this.formError.set(null);
    this.formSuccess.set(null);
    this.editingItem.set({ type: item.transactionType, data: item });

    if (item.transactionType === 'ingreso') {
      const ingresoItem = item as Ingreso;
      const isAhorro = Boolean(ingresoItem.esAhorro);
      this.incomeForm.patchValue({
        monto: ingresoItem.monto,
        descripcion: ingresoItem.descripcion,
        fecha: ingresoItem.fecha ? ingresoItem.fecha.split('T')[0] : this.getLocalDateString(),
        categoria: ingresoItem.categoria,
        estado: ingresoItem.estado,
        tipoCuenta: isAhorro ? 'Cuenta de ahorro' : 'Cuenta corriente',
      });
      this.showIncomeModal.set(true);
    } else {
      const gastoItem = item as Gasto;
      this.expenseForm.patchValue({
        monto: gastoItem.monto,
        descripcion: gastoItem.descripcion,
        fecha: gastoItem.fecha ? gastoItem.fecha.split('T')[0] : this.getLocalDateString(),
        categoria: gastoItem.categoria,
        estado: gastoItem.estado,
      });
      this.showExpenseModal.set(true);
    }
  }

  closeModals(): void {
    this.showIncomeModal.set(false);
    this.showExpenseModal.set(false);
    this.showDeleteConfirm.set(null);
    this.editingItem.set(null);
    this.formError.set(null);
    this.formSuccess.set(null);
  }

  // --- Guardar Ingreso ---
  saveIncome(): void {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    const rawValues = this.incomeForm.value;
    const isAhorro = rawValues.tipoCuenta === 'Cuenta de ahorro';
    
    const values = {
      monto: Number(rawValues.monto),
      descripcion: String(rawValues.descripcion).trim(),
      fecha: rawValues.fecha,
      categoria: rawValues.categoria,
      estado: rawValues.estado,
      esAhorro: isAhorro,
    };

    const isEdit = this.editingItem();

    if (isEdit && isEdit.type === 'ingreso') {
      this.finanzasService.updateIngreso(isEdit.data.id, values).subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.closeModals();
        },
        error: (err) => {
          this.formSubmitting.set(false);
          this.formError.set(err?.error?.message || 'Error al actualizar ingreso');
        },
      });
    } else {
      this.finanzasService.createIngreso(values).subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.closeModals();
        },
        error: (err) => {
          this.formSubmitting.set(false);
          this.formError.set(err?.error?.message || 'Error al registrar ingreso');
        },
      });
    }
  }

  // --- Guardar Gasto ---
  saveExpense(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    const rawValues = this.expenseForm.value;
    const values = {
      monto: Number(rawValues.monto),
      descripcion: String(rawValues.descripcion).trim(),
      fecha: rawValues.fecha,
      categoria: rawValues.categoria,
      estado: rawValues.estado,
    };
    const isEdit = this.editingItem();

    if (isEdit && isEdit.type === 'gasto') {
      this.finanzasService.updateGasto(isEdit.data.id, values).subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.expenseForm.reset({
            monto: null,
            descripcion: '',
            fecha: this.getLocalDateString(),
            categoria: 'Alimentación',
            estado: 'pagado',
          });
          this.closeModals();
        },
        error: (err) => {
          this.formSubmitting.set(false);
          this.formError.set(err?.error?.message || 'Error al actualizar gasto');
        },
      });
    } else {
      this.finanzasService.createGasto(values).subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.expenseForm.reset({
            monto: null,
            descripcion: '',
            fecha: this.getLocalDateString(),
            categoria: 'Alimentación',
            estado: 'pagado',
          });
          this.closeModals();
        },
        error: (err) => {
          this.formSubmitting.set(false);
          this.formError.set(err?.error?.message || 'Error al registrar gasto');
        },
      });
    }
  }

  // --- Confirmar y Ejecutar Eliminación ---
  confirmDelete(item: (Ingreso | Gasto) & { transactionType: 'ingreso' | 'gasto' }): void {
    this.showDeleteConfirm.set({
      type: item.transactionType,
      id: item.id,
      title: item.descripcion,
    });
  }

  executeDelete(): void {
    const toDelete = this.showDeleteConfirm();
    if (!toDelete) return;

    this.formSubmitting.set(true);

    const obs =
      toDelete.type === 'ingreso'
        ? this.finanzasService.deleteIngreso(toDelete.id)
        : this.finanzasService.deleteGasto(toDelete.id);

    obs.subscribe({
      next: () => {
        this.formSubmitting.set(false);
        this.showDeleteConfirm.set(null);
      },
      error: (err) => {
        this.formSubmitting.set(false);
        this.formError.set(err?.error?.message || 'Error al eliminar registro');
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchControl.set(input.value);
    this.showSearchDropdown.set(input.value.trim().length > 0);
  }

  selectSearchResult(item: (Ingreso | Gasto) & { transactionType: 'ingreso' | 'gasto' }): void {
    this.showSearchDropdown.set(false);
    this.openEditModal(item);
  }

  // --- Manejo de Notificaciones ---
  toggleNotifications(): void {
    const isShowing = this.showNotifications();
    this.showNotifications.set(!isShowing);
    if (!isShowing) {
      this.finanzasService.markNotificationsAsRead();
    }
  }

  clearAllNotifications(): void {
    this.finanzasService.clearNotifications();
  }

  // --- Manejo de Avatar de Usuario ---
  openAvatarModal(): void {
    this.newAvatarUrlInput.set(this.finanzasService.userAvatar());
    this.showAvatarModal.set(true);
  }

  choosePredefinedAvatar(url: string): void {
    this.finanzasService.setAvatar(url);
    this.showAvatarModal.set(false);
  }

  saveCustomAvatarUrl(): void {
    const url = this.newAvatarUrlInput().trim();
    if (url) {
      this.finanzasService.setAvatar(url);
      this.showAvatarModal.set(false);
    }
  }

  onAvatarFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        this.finanzasService.setAvatar(base64);
        this.showAvatarModal.set(false);
      };
      reader.readAsDataURL(file);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  // Helper para formato de moneda
  formatMoney(amount: number | undefined): string {
    if (amount === undefined || isNaN(amount)) return 'Q0.00';
    return (
      'Q' +
      amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}
