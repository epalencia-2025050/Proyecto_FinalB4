export interface DashboardResumen {
  saldoTotal: number;
  ahorroAcumulado: number;
  gastosCobrados: number;
  gastosPorCobrar: number;
  totalIngresos: number;
  totalGastos: number;
  porcentajeSaldoMes: number | null;
  porcentajeAhorroMes: number | null;
  porcentajeEvolucionSemestre: number | null;
  porcentajeIngresosCobrados: number;
  estadoCobrados: string;
  estadoPorCobrar: string;
}

export interface CategoriaGasto {
  categoria: string;
  total: number;
  porcentaje: number;
  color?: string;
}

export interface TendenciaMensual {
  mes: string; // ej: 'Jan', 'Feb', 'Mar'
  mesCompleto: string;
  ano: number;
  ingresos: number;
  gastos: number;
  ahorro: number;
  valorGrafica: number;
}


