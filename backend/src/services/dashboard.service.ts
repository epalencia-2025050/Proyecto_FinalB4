import { ingresoRepository } from '../repositories/ingreso.repository';
import { gastoRepository } from '../repositories/gasto.repository';
import { CategoriaGasto, DashboardResumen, TendenciaMensual } from '../models/dashboard.model';

const CATEGORY_COLORS: Record<string, string> = {
  vivienda: '#0b3d4a',
  alimentacion: '#f5a324',
  alimentación: '#f5a324',
  transporte: '#1ea6b6',
  otros: '#ffffff',
  otro: '#ffffff',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export class DashboardService {
  async getResumen(userId: number): Promise<DashboardResumen> {
    const [totalIngresos, totalGastos, ahorroAcumulado, estadosGastos, ingresosMensuales, gastosMensuales, ahorrosMensuales] = await Promise.all([
      ingresoRepository.getTotalByUserId(userId),
      gastoRepository.getTotalByUserId(userId),
      ingresoRepository.getTotalAhorroByUserId(userId),
      gastoRepository.getTotalsByEstado(userId),
      ingresoRepository.getMonthlyTotals(userId, 14),
      gastoRepository.getMonthlyTotals(userId, 14),
      ingresoRepository.getMonthlyAhorroTotals(userId, 14),
    ]);

    const saldoTotal = totalIngresos - totalGastos;

    // Cálculo de variación mensual real (Mes Actual vs Mes Anterior)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const ingActual = ingresosMensuales.find(x => x.mes_num === currentMonth && x.ano === currentYear)?.total || 0;
    const gstActual = gastosMensuales.find(x => x.mes_num === currentMonth && x.ano === currentYear)?.total || 0;
    const ahrActual = ahorrosMensuales.find(x => x.mes_num === currentMonth && x.ano === currentYear)?.total || 0;
    const saldoActual = ingActual - gstActual;

    const ingPrev = ingresosMensuales.find(x => x.mes_num === prevMonth && x.ano === prevYear)?.total || 0;
    const gstPrev = gastosMensuales.find(x => x.mes_num === prevMonth && x.ano === prevYear)?.total || 0;
    const ahrPrev = ahorrosMensuales.find(x => x.mes_num === prevMonth && x.ano === prevYear)?.total || 0;
    const saldoPrev = ingPrev - gstPrev;

    // ¿Hubo actividad en el mes anterior?
    const hasPrevHistory = ingPrev > 0 || gstPrev > 0 || ahrPrev > 0;

    let porcentajeSaldoMes: number | null = null;
    if (hasPrevHistory) {
      if (saldoPrev !== 0) {
        porcentajeSaldoMes = Math.round(((saldoActual - saldoPrev) / Math.abs(saldoPrev)) * 1000) / 10;
      } else if (saldoActual !== 0) {
        porcentajeSaldoMes = saldoActual > 0 ? 100 : -100;
      } else {
        porcentajeSaldoMes = 0;
      }
    }

    let porcentajeAhorroMes: number | null = null;
    if (hasPrevHistory) {
      if (ahrPrev > 0) {
        porcentajeAhorroMes = Math.round(((ahrActual - ahrPrev) / ahrPrev) * 1000) / 10;
      } else if (ahrActual > 0) {
        porcentajeAhorroMes = 100;
      } else {
        porcentajeAhorroMes = 0;
      }
    }

    // Evolución de ingresos: Últimos 6 meses vs 6 meses anteriores
    let sumSemestreActual = 0;
    let sumSemestreAnterior = 0;
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      sumSemestreActual += ingresosMensuales.find(x => x.mes_num === m && x.ano === y)?.total || 0;
    }
    for (let i = 6; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      sumSemestreAnterior += ingresosMensuales.find(x => x.mes_num === m && x.ano === y)?.total || 0;
    }

    let porcentajeEvolucionSemestre: number | null = null;
    if (sumSemestreAnterior > 0) {
      porcentajeEvolucionSemestre = Math.round(((sumSemestreActual - sumSemestreAnterior) / sumSemestreAnterior) * 1000) / 10;
    }

    // Porcentaje de ingresos cobrados
    const porcentajeIngresosCobrados = totalIngresos > 0 ? 100 : 0;

    // Estado dinámico según datos reales
    let estadoCobrados = 'Sin movimientos';
    if (estadosGastos.cobrados > 0 || estadosGastos.porCobrar > 0) {
      estadoCobrados = estadosGastos.porCobrar === 0 ? 'Al día' : 'En proceso';
    }

    const estadoPorCobrar = estadosGastos.porCobrar > 0 ? 'Requiere atención' : 'Al día';

    return {
      saldoTotal: Math.round(saldoTotal * 100) / 100,
      ahorroAcumulado: Math.round(ahorroAcumulado * 100) / 100,
      gastosCobrados: Math.round(estadosGastos.cobrados * 100) / 100,
      gastosPorCobrar: Math.round(estadosGastos.porCobrar * 100) / 100,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalGastos: Math.round(totalGastos * 100) / 100,
      porcentajeSaldoMes,
      porcentajeAhorroMes,
      porcentajeEvolucionSemestre,
      porcentajeIngresosCobrados,
      estadoCobrados,
      estadoPorCobrar,
    };
  }

  async getCategorias(userId: number): Promise<CategoriaGasto[]> {
    const rawCategories = await gastoRepository.getCategoryBreakdown(userId);
    const totalGasto = rawCategories.reduce((acc, curr) => acc + curr.total, 0);

    // Garantizar que estén representadas las categorías estándar
    const standardCategories = ['Vivienda', 'Alimentación', 'Transporte', 'Otros'];
    const map = new Map<string, number>();

    standardCategories.forEach(cat => map.set(cat.toLowerCase(), 0));

    rawCategories.forEach(item => {
      const lower = item.categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let matched = false;
      for (const std of standardCategories) {
        const stdLower = std.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (stdLower === lower || lower.includes(stdLower) || stdLower.includes(lower)) {
          map.set(std.toLowerCase(), (map.get(std.toLowerCase()) || 0) + item.total);
          matched = true;
          break;
        }
      }
      if (!matched) {
        map.set('otros', (map.get('otros') || 0) + item.total);
      }
    });

    const result: CategoriaGasto[] = standardCategories.map(cat => {
      const key = cat.toLowerCase();
      const val = map.get(key) || 0;
      const pct = totalGasto > 0 ? Math.round((val / totalGasto) * 1000) / 10 : 0;
      return {
        categoria: cat,
        total: Math.round(val * 100) / 100,
        porcentaje: pct,
        color: CATEGORY_COLORS[key] || '#1fb4c2',
      };
    });

    return result;
  }

  async getTendencia(userId: number, totalMonths: number = 6): Promise<TendenciaMensual[]> {
    const [ingresosMensuales, gastosMensuales, ahorrosMensuales] = await Promise.all([
      ingresoRepository.getMonthlyTotals(userId, 12),
      gastoRepository.getMonthlyTotals(userId, 12),
      ingresoRepository.getMonthlyAhorroTotals(userId, 12),
    ]);

    const now = new Date();
    const result: TendenciaMensual[] = [];

    // Generar 12 meses cronológicos de más antiguo a más reciente
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = d.getMonth() + 1; // 1..12
      const year = d.getFullYear();

      const ing = ingresosMensuales.find(x => x.mes_num === mNum && x.ano === year)?.total || 0;
      const gst = gastosMensuales.find(x => x.mes_num === mNum && x.ano === year)?.total || 0;
      const ahr = ahorrosMensuales.find(x => x.mes_num === mNum && x.ano === year)?.total || 0;

      result.push({
        mes: MONTH_NAMES[mNum - 1],
        mesCompleto: MONTH_FULL_NAMES[mNum - 1],
        ano: year,
        ingresos: Math.round(ing * 100) / 100,
        gastos: Math.round(gst * 100) / 100,
        ahorro: Math.round(ahr * 100) / 100,
        valorGrafica: Math.round(ahr * 100) / 100,
      });
    }

    return result;
  }
}

export const dashboardService = new DashboardService();

