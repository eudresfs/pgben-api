import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MetricaDefinicao } from '../../../entities/metrica-definicao.entity';
import { MetricaSnapshot } from '../../../entities/metrica-snapshot.entity';
import {
  NivelConfiancaAnomalia,
  ResultadoDeteccaoAnomalia,
  ResultadoDeteccaoAnomaliaPorCodigo,
  AnomaliaDetectada,
} from '../interfaces/anomalias.interface';
import { EstatisticaUtils } from '../utils/estatistica.utils';

@Injectable()
export class AnomaliasService {
  private readonly logger = new Logger(AnomaliasService.name);

  // Limites de Z-score para diferentes níveis de confiança
  private readonly Z_SCORE_LIMITES = {
    [NivelConfiancaAnomalia.BAIXO]: 2.0, // 95.5% dos dados dentro deste limite
    [NivelConfiancaAnomalia.MEDIO]: 2.5, // 98.8% dos dados dentro deste limite
    [NivelConfiancaAnomalia.ALTO]: 3.0, // 99.7% dos dados dentro deste limite
  };

  // Número mínimo de pontos para análise estatística confiável
  private readonly MIN_PONTOS_ANALISE = 5;

  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,

    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Métodos específicos de detecção de anomalias...
}
