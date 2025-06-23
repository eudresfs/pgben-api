import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Concessao } from '../../../entities/concessao.entity';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoService } from '../services/pagamento.service';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';
import { addMonths, isAfter } from 'date-fns';

@Injectable()
export class PagamentoRenovacaoScheduler {
  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    private readonly pagamentoService: PagamentoService,
    private readonly logger: UnifiedLoggerService,
  ) {}

  /**
   * REMOVIDO: Renovação automática de pagamentos
   * 
   * A partir da nova implementação, todos os pagamentos são criados no momento da aprovação
   * da solicitação com status PENDENTE. A liberação é controlada pela data prevista e
   * pelo serviço de liberação de pagamentos.
   * 
   * Este scheduler foi desabilitado para evitar conflitos com a nova lógica.
   */
  // @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handlePagamentoRecorrente(): Promise<void> {
    this.logger.debug('[PagamentoRenovacaoScheduler] Scheduler desabilitado - nova lógica de liberação implementada.');
    // Método mantido para compatibilidade, mas sem funcionalidade
  }
}
