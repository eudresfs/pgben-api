import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource, Between, MoreThan } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ScheduleAdapterService } from '../../../shared/schedule/schedule-adapter.service';

import { MetricaDefinicao, TipoMetrica } from '../entities/metrica-definicao.entity';
import { MetricaSnapshot } from '../entities/metrica-snapshot.entity';
import { MetricaConfiguracao, TipoAgendamento } from '../entities/metrica-configuracao.entity';
import { MetricaCalculoService } from './metrica-calculo.service';

/**
 * Serviço responsável pela coleta programada e reativa de métricas
 * 
 * Este serviço gerencia o agendamento, coleta e armazenamento de métricas
 * conforme as configurações definidas para cada métrica no sistema.
 */
@Injectable()
export class MetricasColetaService implements OnModuleInit {
  private readonly logger = new Logger(MetricasColetaService.name);
  
  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,
    
    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,
    
    @InjectRepository(MetricaConfiguracao)
    private readonly metricaConfiguracaoRepository: Repository<MetricaConfiguracao>,
    
    private readonly calculoService: MetricaCalculoService,
    private readonly scheduleAdapter: ScheduleAdapterService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}
  
  /**
   * Inicializa os agendamentos quando o módulo é carregado
   */
  async onModuleInit(): Promise<void> {
    // Inicializar verificação de configurações de agendamento a cada hora
    this.scheduleAdapter.scheduleInterval(
      'verificar_configuracoes_agendamento',
      3600000, // 1 hora em milissegundos
      () => this.verificarConfiguracoesAgendamento()
    );
    
    // Inicializar coleta diária de métricas à meia-noite
    this.scheduleAdapter.scheduleDailyTask(
      'coletar_metricas_diarias',
      0, // hora (0 = meia-noite)
      0, // minuto
      () => this.coletarMetricasDiarias()
    );
    
    // Inicializar o serviço de coleta
    await this.inicializar();
  }
  
  /**
   * Inicializa o serviço de coleta de métricas
   * Configura jobs cron para métricas com agendamento
   */
  async inicializar(): Promise<void> {
    this.logger.log('Inicializando serviço de coleta de métricas');
    
    try {
      // Carregar todas as configurações de métricas ativas com coleta automática
      const configuracoes = await this.metricaConfiguracaoRepository.find({
        where: { coleta_automatica: true },
        relations: ['metrica'],
      });
      
      this.logger.log(`Encontradas ${configuracoes.length} métricas configuradas para coleta automática`);
      
      // Configurar agendamentos para cada métrica
      for (const config of configuracoes) {
        // Carregar a entidade metrica para acessar suas propriedades
        const metrica = await config.metrica;
        
        if (!metrica.ativa) {
          this.logger.debug(`Métrica ${metrica.codigo} não está ativa, ignorando agendamento`);
          continue;
        }
        
        await this.configurarAgendamentoMetrica(config);
      }
      
      this.logger.log('Serviço de coleta de métricas inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao inicializar serviço de coleta: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Configura o agendamento para uma métrica específica
   * @param config Configuração da métrica
   */
  private async configurarAgendamentoMetrica(config: MetricaConfiguracao): Promise<void> {
    // Carregar a entidade metrica para acessar suas propriedades
    const metrica = await config.metrica;
    const jobId = `metrica_${metrica.codigo}`;
    
    try {
      // Cancelar agendamento existente, se houver
      this.scheduleAdapter.cancelInterval(jobId);
      
      // Configurar novo job conforme o tipo de agendamento
      switch (config.tipo_agendamento) {
        case TipoAgendamento.CRON:
          if (config.expressao_cron) {
            this.logger.debug(`Configurando job cron para métrica ${metrica.codigo}: ${config.expressao_cron}`);
            
            // Usamos o adaptador de agendamento personalizado
            this.scheduleAdapter.scheduleInterval(
              jobId,
              this.calcularIntervaloEmMilissegundos(config.expressao_cron),
              async () => {
                try {
                  await this.coletarMetrica(metrica.id);
                } catch (err) {
                  this.logger.error(`Erro ao coletar métrica ${metrica.codigo}: ${err.message}`);
                }
              }
            );
            
            this.logger.log(`Agendamento configurado para métrica ${metrica.codigo}`);
          }
          break;
          
        case TipoAgendamento.INTERVALO:
          if (config.intervalo_segundos > 0) {
            this.logger.debug(`Configurando job de intervalo para métrica ${metrica.codigo}: ${config.intervalo_segundos} segundos`);
            
            const intervalo = config.intervalo_segundos * 1000;
            this.logger.debug(`Configurando job de intervalo para métrica ${metrica.codigo}: ${intervalo}ms`);
            
            // Usar o adaptador de agendamento
            this.scheduleAdapter.scheduleInterval(
              jobId,
              intervalo,
              async () => {
                try {
                  await this.coletarMetrica(metrica.id);
                } catch (err) {
                  this.logger.error(`Erro ao coletar métrica ${metrica.codigo}: ${err.message}`);
                }
              }
            );
            
            this.logger.log(`Agendamento configurado para métrica ${metrica.codigo}`);
          }
          break;
          
        case TipoAgendamento.EVENTO:
          // A configuração para eventos é feita via decorador @OnEvent
          this.logger.debug(`Métrica ${metrica.codigo} configurada para coleta via evento: ${config.nome_evento}`);
          break;
          
        case TipoAgendamento.MANUAL:
          this.logger.debug(`Métrica ${metrica.codigo} configurada para coleta manual`);
          break;
          
        default:
          this.logger.warn(`Tipo de agendamento não suportado para métrica ${metrica.codigo}: ${config.tipo_agendamento}`);
      }
      
      this.logger.log(`Agendamento configurado com sucesso para métrica: ${metrica.codigo}`);
    } catch (error) {
      this.logger.error(`Erro ao configurar agendamento para métrica ${metrica.codigo}: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Manipulador de eventos para coleta de métricas baseada em eventos
   * @param payload Dados do evento
   */
  @OnEvent('*')
  async handleEvento(payload: any): Promise<void> {
    if (!payload || !payload.evento) return;
    
    const nomeEvento = payload.evento;
    this.logger.debug(`Evento recebido: ${nomeEvento}`);
    
    try {
      // Buscar métricas configuradas para este evento
      const configuracoes = await this.metricaConfiguracaoRepository.find({
        where: {
          coleta_automatica: true,
          tipo_agendamento: TipoAgendamento.EVENTO,
          nome_evento: nomeEvento,
        },
        relations: ['metrica'],
      });
      
      if (configuracoes.length === 0) return;
      
      this.logger.debug(`Encontradas ${configuracoes.length} métricas para coleta baseada no evento: ${nomeEvento}`);
      
      // Coletar cada métrica encontrada
      for (const config of configuracoes) {
        // Carregar a entidade metrica para acessar suas propriedades
        const metrica = await config.metrica;
        
        if (metrica.ativa) {
          this.coletarMetrica(metrica.id, payload)
            .catch(err => this.logger.error(
              `Erro ao coletar métrica ${metrica.codigo} para evento ${nomeEvento}: ${err.message}`
            ));
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao processar evento ${nomeEvento}: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Coleta dados para uma métrica específica
   * @param metricaId ID da métrica a ser coletada
   * @param contexto Contexto adicional para a coleta (opcional)
   * @returns Snapshot da métrica coletada
   */
  async coletarMetrica(metricaId: string, contexto?: any): Promise<MetricaSnapshot> {
    const inicioColeta = Date.now();
    this.logger.debug(`Iniciando coleta para métrica ID: ${metricaId}`);
    
    try {
      // Buscar definição e configuração da métrica
      const metrica = await this.metricaDefinicaoRepository.findOne({ 
        where: { id: metricaId, ativa: true },
        relations: ['configuracoes'],
      });
      
      if (!metrica) {
        throw new Error(`Métrica não encontrada ou inativa: ${metricaId}`);
      }
      
      const config = metrica.configuracoes[0]; // Usar a primeira configuração disponível
      
      if (!config) {
        throw new Error(`Configuração não encontrada para métrica: ${metrica.codigo}`);
      }
      
      // Definir período de referência para a coleta
      const periodoFim = new Date();
      let periodoInicio: Date;
      
      // Calcular início do período com base na granularidade da métrica
      switch (metrica.granularidade) {
        case 'minuto':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setMinutes(periodoInicio.getMinutes() - 1);
          periodoInicio.setSeconds(0, 0);
          break;
        case 'hora':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setHours(periodoInicio.getHours() - 1);
          periodoInicio.setMinutes(0, 0, 0);
          break;
        case 'dia':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setDate(periodoInicio.getDate() - 1);
          periodoInicio.setHours(0, 0, 0, 0);
          break;
        case 'semana':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setDate(periodoInicio.getDate() - 7);
          periodoInicio.setHours(0, 0, 0, 0);
          break;
        case 'mes':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setMonth(periodoInicio.getMonth() - 1);
          periodoInicio.setDate(1);
          periodoInicio.setHours(0, 0, 0, 0);
          break;
        case 'trimestre':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setMonth(periodoInicio.getMonth() - 3);
          periodoInicio.setDate(1);
          periodoInicio.setHours(0, 0, 0, 0);
          break;
        case 'ano':
          periodoInicio = new Date(periodoFim);
          periodoInicio.setFullYear(periodoInicio.getFullYear() - 1);
          periodoInicio.setMonth(0, 1);
          periodoInicio.setHours(0, 0, 0, 0);
          break;
        default:
          // Padrão: um dia
          periodoInicio = new Date(periodoFim);
          periodoInicio.setDate(periodoInicio.getDate() - 1);
          periodoInicio.setHours(0, 0, 0, 0);
      }
      
      // Definir dimensões e metadados para o snapshot
      const dimensoes = contexto?.dimensoes || {};
      const metadados = {
        origem: 'coleta_automatica',
        job_id: `metrica_${metrica.codigo}`,
        contexto: contexto ? JSON.stringify(contexto).substring(0, 1000) : null,
      };
      
      // Calcular hash das dimensões para garantir unicidade
      const dimensoesHash = this.gerarHashDimensoes(dimensoes);
      
      // Verificar se já existe um snapshot para o mesmo período e dimensões
      const snapshotExistente = await this.metricaSnapshotRepository.findOne({
        where: {
          definicao_id: metrica.id,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          dimensoes_hash: dimensoesHash,
        },
      });
      
      if (snapshotExistente) {
        this.logger.debug(`Snapshot já existe para métrica ${metrica.codigo} no período especificado`);
        return snapshotExistente;
      }
      
      // Calcular valor da métrica
      const valorCalculado = await this.calculoService.calcularValorMetrica(
        metrica, 
        periodoInicio, 
        periodoFim, 
        dimensoes
      );
      
      // Formatar valor conforme configurações da métrica
      const valorFormatado = this.formatarValorMetrica(valorCalculado, metrica);
      
      // Criar snapshot
      const snapshot = this.metricaSnapshotRepository.create({
        definicao_id: metrica.id,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        granularidade: metrica.granularidade,
        valor: valorCalculado,
        valor_formatado: valorFormatado,
        dimensoes,
        dimensoes_hash: dimensoesHash,
        metadados,
        versao_definicao: metrica.versao,
        duracao_processamento_ms: Date.now() - inicioColeta,
        status_coleta: 'sucesso',
      });
      
      // Salvar snapshot no banco de dados
      const snapshotSalvo = await this.metricaSnapshotRepository.save(snapshot);
      
      // Atualizar data da última coleta na definição da métrica
      await this.metricaDefinicaoRepository.update(
        { id: metrica.id },
        { ultima_coleta: new Date() }
      );
      
      this.logger.log(`Métrica coletada com sucesso: ${metrica.codigo}, valor: ${valorCalculado}`);
      
      // Verificar se o valor ultrapassa limites configurados para alertas
      await this.verificarAlertas(metrica, config, valorCalculado);
      
      // Limpar snapshots antigos conforme política de retenção
      this.limparSnapshotsAntigos(metrica.id, config).catch(err => 
        this.logger.error(`Erro ao limpar snapshots antigos: ${err.message}`)
      );
      
      return snapshotSalvo;
    } catch (error) {
      const duracao = Date.now() - inicioColeta;
      this.logger.error(`Erro ao coletar métrica ${metricaId}: ${error.message}`, error.stack);
      
      // Registrar snapshot com erro
      try {
        const metrica = await this.metricaDefinicaoRepository.findOne({ where: { id: metricaId } });
        
        if (metrica) {
          const snapshot = this.metricaSnapshotRepository.create({
            definicao_id: metricaId,
            periodo_inicio: new Date(),
            periodo_fim: new Date(),
            granularidade: metrica.granularidade,
            valor: 0,
            valor_formatado: 'ERRO',
            dimensoes: {},
            dimensoes_hash: this.gerarHashDimensoes({}),
            metadados: { erro: error.message },
            duracao_processamento_ms: duracao,
            status_coleta: 'erro',
            mensagem_status: error.message.substring(0, 500),
          });
          
          await this.metricaSnapshotRepository.save(snapshot);
        }
      } catch (saveError) {
        this.logger.error(`Erro ao salvar snapshot de erro: ${saveError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Verifica se o valor da métrica ultrapassa limites configurados e gera alertas
   * @param metrica Definição da métrica
   * @param config Configuração da métrica
   * @param valor Valor calculado
   */
  private async verificarAlertas(
    metrica: MetricaDefinicao, 
    config: MetricaConfiguracao, 
    valor: number
  ): Promise<void> {
    if (!config.alertas || config.alertas.length === 0) return;
    
    for (const alerta of config.alertas) {
      let condicaoAtivada = false;
      
      // Verificar condição do alerta
      switch (alerta.tipo) {
        case 'valor_maximo':
          condicaoAtivada = valor > alerta.valor;
          break;
        case 'valor_minimo':
          condicaoAtivada = valor < alerta.valor;
          break;
        case 'valor_igual':
          condicaoAtivada = valor === alerta.valor;
          break;
        case 'valor_mudanca_percentual':
          try {
            // Buscar snapshot anterior para comparação
            const snapshotAnterior = await this.metricaSnapshotRepository.findOne({
              where: { 
                definicao_id: metrica.id,
                periodo_fim: MoreThan(new Date(Date.now() - 86400000)) // Últimas 24h
              },
              order: { periodo_fim: 'DESC' },
            });
            
            if (snapshotAnterior) {
              const variacaoPercentual = ((valor - snapshotAnterior.valor) / snapshotAnterior.valor) * 100;
              condicaoAtivada = Math.abs(variacaoPercentual) > alerta.valor;
            }
          } catch (error) {
            this.logger.error(`Erro ao verificar variação percentual: ${error.message}`);
          }
          break;
      }
      
      // Se a condição for satisfeita, emitir alerta
      if (condicaoAtivada) {
        const mensagem = alerta.mensagem || 
          `Alerta para métrica ${metrica.codigo}: valor ${valor} ${alerta.tipo === 'valor_maximo' ? 'acima' : 'abaixo'} do limite ${alerta.valor}`;
        
        this.logger.warn(`[ALERTA] ${mensagem} [Severidade: ${alerta.severidade || 'média'}]`);
        
        // Emitir evento para ser capturado por outros serviços
        this.eventEmitter.emit('metrica.alerta', {
          metrica_id: metrica.id,
          metrica_codigo: metrica.codigo,
          metrica_nome: metrica.nome,
          valor,
          valor_limite: alerta.valor,
          tipo_alerta: alerta.tipo,
          mensagem,
          severidade: alerta.severidade || 'média',
          timestamp: new Date(),
        });
      }
    }
  }
  
  /**
   * Limpa snapshots antigos conforme política de retenção
   * @param metricaId ID da métrica
   * @param config Configuração da métrica
   */
  private async limparSnapshotsAntigos(
    metricaId: string, 
    config: MetricaConfiguracao
  ): Promise<void> {
    try {
      // Limpar por período de retenção
      if (config.periodo_retencao_dias > 0) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - config.periodo_retencao_dias);
        
        const resultado = await this.metricaSnapshotRepository.delete({
          definicao_id: metricaId,
          created_at: Between(new Date(0), dataLimite),
        });
        
        if (resultado.affected && resultado.affected > 0) {
          this.logger.debug(`Removidos ${resultado.affected} snapshots antigos da métrica ${metricaId}`);
        }
      }
      
      // Limitar número máximo de snapshots
      if (config.max_snapshots > 0) {
        const count = await this.metricaSnapshotRepository.count({
          where: { definicao_id: metricaId },
        });
        
        if (count > config.max_snapshots) {
          // Buscar IDs mais antigos que excedem o limite
          const snapshots = await this.metricaSnapshotRepository.find({
            where: { definicao_id: metricaId },
            order: { created_at: 'ASC' },
            take: count - config.max_snapshots,
            select: ['id'],
          });
          
          if (snapshots.length > 0) {
            const ids = snapshots.map(s => s.id);
            const resultado = await this.metricaSnapshotRepository.delete(ids);
            
            if (resultado.affected && resultado.affected > 0) {
              this.logger.debug(`Removidos ${resultado.affected} snapshots excedentes da métrica ${metricaId}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao limpar snapshots antigos: ${error.message}`);
    }
  }
  
  /**
   * Gera um hash único para as dimensões de um snapshot
   * @param dimensoes Objeto de dimensões
   * @returns Hash das dimensões
   */
  private gerarHashDimensoes(dimensoes: Record<string, any>): string {
    const stringDimensoes = JSON.stringify(dimensoes || {});
    return crypto.createHash('sha256').update(stringDimensoes).digest('hex');
  }
  
  /**
   * Formata o valor numérico da métrica conforme configurações
   * @param valor Valor numérico
   * @param metrica Definição da métrica
   * @returns Valor formatado como string
   */
  private formatarValorMetrica(valor: number, metrica: MetricaDefinicao): string {
    try {
      let valorFormatado = Number(valor).toFixed(metrica.casas_decimais);
      
      // Adicionar prefixo e sufixo, se definidos
      if (metrica.prefixo) {
        valorFormatado = `${metrica.prefixo}${valorFormatado}`;
      }
      
      if (metrica.sufixo) {
        valorFormatado = `${valorFormatado}${metrica.sufixo}`;
      }
      
      return valorFormatado;
    } catch (error) {
      this.logger.error(`Erro ao formatar valor: ${error.message}`);
      return valor.toString();
    }
  }
  
  /**
   * Coleta manual de uma métrica específica
   * @param codigo Código da métrica
   * @param dimensoes Dimensões para filtrar a coleta
   * @returns Snapshot da métrica coletada
   */
  async coletarMetricaManual(codigo: string, dimensoes?: Record<string, any>): Promise<MetricaSnapshot> {
    try {
      const metrica = await this.metricaDefinicaoRepository.findOne({
        where: { codigo, ativa: true },
      });
      
      if (!metrica) {
        throw new Error(`Métrica não encontrada ou inativa: ${codigo}`);
      }
      
      return this.coletarMetrica(metrica.id, { 
        dimensoes, 
        metadados: { origem: 'coleta_manual' } 
      });
    } catch (error) {
      this.logger.error(`Erro na coleta manual da métrica ${codigo}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Agenda a coleta de todas as métricas configuradas para coleta automática
   */
  async verificarConfiguracoesAgendamento(): Promise<void> {
    try {
      this.logger.debug('Verificando configurações de agendamento');
      
      const configuracoes = await this.metricaConfiguracaoRepository.find({
        where: { coleta_automatica: true },
        relations: ['metrica'],
      });
      
      for (const config of configuracoes) {
        // Carregar a entidade metrica para acessar suas propriedades
        const metrica = await config.metrica;
        
        if (metrica.ativa) {
          await this.configurarAgendamentoMetrica(config);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao verificar configurações de agendamento: ${error.message}`);
    }
  }
  
  /**
   * Coleta programada de métricas diárias (executada uma vez por dia à meia-noite)
   */
  async coletarMetricasDiarias(): Promise<void> {
    try {
      this.logger.log('Iniciando coleta diária de métricas');
      
      const metricas = await this.metricaDefinicaoRepository.find({
        where: { 
          ativa: true,
          granularidade: "dia" as any, // Forçando o tipo para evitar erro de incompatibilidade
        },
        relations: ['configuracoes'],
      });
      
      this.logger.debug(`Encontradas ${metricas.length} métricas diárias para coleta programada`);
      
      for (const metrica of metricas) {
        // Carregar o relacionamento lazy configuracoes
        const configuracoes = await metrica.configuracoes;
        
        if (configuracoes.length === 0 || !configuracoes[0].coleta_automatica) {
          continue;
        }
        
        this.coletarMetrica(metrica.id).catch(err => 
          this.logger.error(`Erro ao coletar métrica diária ${metrica.codigo}: ${err.message}`)
        );
      }
    } catch (error) {
      this.logger.error(`Erro na coleta diária: ${error.message}`);
    }
  }
  
  /**
   * Calcula o intervalo em milissegundos a partir de uma expressão cron
   * Esta é uma implementação simplificada que converte expressões cron comuns em intervalos
   * @param cronExpression Expressão cron
   * @returns Intervalo aproximado em milissegundos
   */
  private calcularIntervaloEmMilissegundos(cronExpression: string): number {
    // Expressões cron comuns e seus intervalos aproximados
    const intervalos = {
      '0 * * * *': 60 * 60 * 1000, // A cada hora
      '0 0 * * *': 24 * 60 * 60 * 1000, // Diário
      '0 0 * * 0': 7 * 24 * 60 * 60 * 1000, // Semanal
      '0 0 1 * *': 30 * 24 * 60 * 60 * 1000, // Mensal (aproximado)
    };
    
    return intervalos[cronExpression] || 60 * 60 * 1000; // Padrão: 1 hora
  }
}
