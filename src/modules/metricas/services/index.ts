// Exportar serviços e interfaces
export * from './metricas.service';
import { MetricasService as MetricasDefinicaoService } from './metricas-definicao.service';
export { MetricasDefinicaoService };
export * from './metricas-coleta.service';
export * from './metricas-cache.service';
export * from './metricas-anomalia.service';

// Exportar interfaces
export * from '../interfaces/anomalias.interface';
export * from '../interfaces/previsoes.interface';
export * from '../interfaces/tendencias.interface';
