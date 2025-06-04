import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Not, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  MetricaDefinicao,
  CategoriaMetrica,
  TipoMetrica,
} from '../../../entities/metrica-definicao.entity';
import { MetricaConfiguracao } from '../../../entities/metrica-configuracao.entity';
import { MetricaSnapshot } from '../../../entities/metrica-snapshot.entity';
import {
  CriarMetricaDefinicaoDto,
  AtualizarMetricaDefinicaoDto,
  FiltroMetricasDto,
} from '../dto/metrica-definicao.dto';
import {
  CriarMetricaConfiguracaoDto,
  AtualizarMetricaConfiguracaoDto,
} from '../dto/metrica-configuracao.dto';
import { MetricasCacheService } from './metricas-cache.service';

/**
 * Serviço responsável pelo gerenciamento de definições de métricas
 *
 * Este serviço gerencia o ciclo de vida das definições de métricas,
 * incluindo criação, atualização, consulta e remoção.
 */
@Injectable()
export class MetricasService {
  private readonly logger = new Logger(MetricasService.name);

  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,

    @InjectRepository(MetricaConfiguracao)
    private readonly metricaConfiguracaoRepository: Repository<MetricaConfiguracao>,

    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,

    private readonly cacheService: MetricasCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria uma nova definição de métrica
   *
   * @param dto Dados da métrica a ser criada
   * @param usuarioId ID do usuário que está criando a métrica
   * @param usuarioNome Nome do usuário que está criando a métrica
   * @returns Métrica criada
   */
  async criarMetrica(
    dto: CriarMetricaDefinicaoDto,
    usuarioId: string,
    usuarioNome: string,
  ): Promise<MetricaDefinicao> {
    this.logger.log(`Criando métrica: ${dto.codigo}`);

    // Verificar se já existe métrica com o mesmo código
    const metricaExistente = await this.metricaDefinicaoRepository.findOne({
      where: { codigo: dto.codigo },
    });

    if (metricaExistente) {
      throw new BadRequestException(
        `Já existe uma métrica com o código '${dto.codigo}'`,
      );
    }

    // Validar configurações específicas para cada tipo de métrica
    await this.validarDadosMetrica(dto);

    // Criar nova métrica
    const metrica = this.metricaDefinicaoRepository.create({
      ...dto,
      versao: 1,
      criado_por: `${usuarioNome} (${usuarioId})`,
      atualizado_por: `${usuarioNome} (${usuarioId})`,
    });

    // Salvar métrica
    const metricaSalva = await this.metricaDefinicaoRepository.save(metrica);

    // Emitir evento para notificar criação da métrica
    this.eventEmitter.emit('metrica.criada', {
      metrica_id: metricaSalva.id,
      metrica_codigo: metricaSalva.codigo,
      usuario_id: usuarioId,
    });

    this.logger.log(
      `Métrica criada com sucesso: ${metricaSalva.codigo} (ID: ${metricaSalva.id})`,
    );

    return metricaSalva;
  }

  /**
   * Atualiza uma definição de métrica existente
   *
   * @param id ID da métrica a ser atualizada
   * @param dto Dados para atualização
   * @param usuarioId ID do usuário que está atualizando a métrica
   * @param usuarioNome Nome do usuário que está atualizando a métrica
   * @returns Métrica atualizada
   */
  async atualizarMetrica(
    id: string,
    dto: AtualizarMetricaDefinicaoDto,
    usuarioId: string,
    usuarioNome: string,
  ): Promise<MetricaDefinicao> {
    this.logger.log(`Atualizando métrica com ID: ${id}`);

    // Buscar métrica existente
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id },
    });

    if (!metrica) {
      throw new NotFoundException(`Métrica com ID ${id} não encontrada`);
    }

    // Verificar se está tentando alterar o tipo da métrica
    if (dto.tipo && dto.tipo !== metrica.tipo) {
      // Verificar se já existem snapshots para esta métrica
      const countSnapshots = await this.metricaSnapshotRepository.count({
        where: { definicao_id: id },
      });

      if (countSnapshots > 0) {
        throw new BadRequestException(
          'Não é possível alterar o tipo de uma métrica que já possui valores coletados',
        );
      }
    }

    // Combinar dados atuais com atualizações
    const metricaAtualizada = {
      ...metrica,
      ...dto,
      versao: metrica.versao + 1,
      atualizado_por: `${usuarioNome} (${usuarioId})`,
    };

    // Validar configurações específicas para cada tipo de métrica
    await this.validarDadosMetrica(metricaAtualizada);

    // Salvar métrica atualizada
    const resultado =
      await this.metricaDefinicaoRepository.save(metricaAtualizada);

    // Invalidar cache da métrica
    this.cacheService.invalidarCacheMetrica(id);

    // Emitir evento para notificar atualização da métrica
    this.eventEmitter.emit('metrica.atualizada', {
      metrica_id: resultado.id,
      metrica_codigo: resultado.codigo,
      usuario_id: usuarioId,
    });

    this.logger.log(
      `Métrica atualizada com sucesso: ${resultado.codigo} (ID: ${resultado.id})`,
    );

    return resultado;
  }

  /**
   * Busca uma métrica pelo ID
   *
   * @param id ID da métrica
   * @returns Métrica encontrada ou null
   */
  async buscarMetricaPorId(id: string): Promise<MetricaDefinicao> {
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id },
      relations: ['configuracoes'],
    });

    if (!metrica) {
      throw new NotFoundException(`Métrica com ID ${id} não encontrada`);
    }

    return metrica;
  }

  /**
   * Busca uma métrica pelo código
   *
   * @param codigo Código da métrica
   * @returns Métrica encontrada ou null
   */
  async buscarMetricaPorCodigo(
    codigo: string,
  ): Promise<MetricaDefinicao | null> {
    return this.cacheService.obterMetrica(codigo);
  }

  /**
   * Lista métricas com filtros e paginação
   *
   * @param filtros Filtros para busca
   * @returns Lista paginada de métricas
   */
  async listarMetricas(
    filtros: FiltroMetricasDto,
  ): Promise<{ items: MetricaDefinicao[]; total: number }> {
    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 10;
    const skip = (pagina - 1) * limite;

    // Construir condições de busca
    const where: FindOptionsWhere<MetricaDefinicao> = {};

    if (filtros.codigo) {
      where.codigo = Like(`%${filtros.codigo}%`);
    }

    if (filtros.nome) {
      where.nome = Like(`%${filtros.nome}%`);
    }

    if (filtros.categoria) {
      where.categoria = filtros.categoria;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.ativa !== undefined) {
      where.ativa = filtros.ativa;
    }

    if (filtros.tag) {
      // Filtrar por tag (equivalente a "tags LIKE '%tag%'")
      // Implementação simplificada, em um cenário real seria melhor usar uma abordagem específica do banco de dados
      where.tags = Like(`%${filtros.tag}%`);
    }

    // Buscar total de registros
    const total = await this.metricaDefinicaoRepository.count({ where });

    // Buscar métricas
    const items = await this.metricaDefinicaoRepository.find({
      where,
      order: {
        codigo: 'ASC',
      },
      skip,
      take: limite,
    });

    return { items, total };
  }

  /**
   * Remove uma métrica (exclusão lógica)
   *
   * @param id ID da métrica a ser removida
   */
  async removerMetrica(id: string): Promise<void> {
    this.logger.log(`Removendo métrica com ID: ${id}`);

    // Buscar métrica existente
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id },
    });

    if (!metrica) {
      throw new NotFoundException(`Métrica com ID ${id} não encontrada`);
    }

    // Inativar métrica (exclusão lógica)
    await this.metricaDefinicaoRepository.update(id, {
      ativa: false,
    });

    // Invalidar cache da métrica
    this.cacheService.invalidarCacheMetrica(id);

    // Emitir evento para notificar remoção da métrica
    this.eventEmitter.emit('metrica.removida', {
      metrica_id: id,
      metrica_codigo: metrica.codigo,
    });

    this.logger.log(
      `Métrica removida com sucesso: ${metrica.codigo} (ID: ${id})`,
    );
  }

  /**
   * Cria configuração para uma métrica
   *
   * @param dto Dados da configuração
   * @param usuarioId ID do usuário que está criando a configuração
   * @param usuarioNome Nome do usuário que está criando a configuração
   * @returns Configuração criada
   */
  async criarConfiguracao(
    dto: CriarMetricaConfiguracaoDto,
    usuarioId: string,
    usuarioNome: string,
  ): Promise<MetricaConfiguracao> {
    this.logger.log(`Criando configuração para métrica: ${dto.metrica_id}`);

    // Verificar se a métrica existe
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id: dto.metrica_id },
    });

    if (!metrica) {
      throw new NotFoundException(
        `Métrica com ID ${dto.metrica_id} não encontrada`,
      );
    }

    // Verificar se já existe configuração para esta métrica
    const configExistente = await this.metricaConfiguracaoRepository.findOne({
      where: { metrica_id: dto.metrica_id },
    });

    if (configExistente) {
      throw new BadRequestException(
        `Já existe uma configuração para a métrica ${metrica.codigo}. Use a atualização.`,
      );
    }

    // Validar configurações específicas para cada tipo de agendamento
    await this.validarDadosConfiguracao(dto);

    // Criar nova configuração
    const config = this.metricaConfiguracaoRepository.create({
      ...dto,
      criado_por: `${usuarioNome} (${usuarioId})`,
      atualizado_por: `${usuarioNome} (${usuarioId})`,
    });

    // Salvar configuração
    const configSalva = await this.metricaConfiguracaoRepository.save(config);

    // Emitir evento para notificar criação da configuração
    this.eventEmitter.emit('metrica.configuracao.criada', {
      metrica_id: dto.metrica_id,
      configuracao_id: configSalva.id,
      usuario_id: usuarioId,
    });

    this.logger.log(
      `Configuração criada com sucesso para métrica: ${metrica.codigo}`,
    );

    return configSalva;
  }

  /**
   * Atualiza configuração de uma métrica
   *
   * @param id ID da configuração a ser atualizada
   * @param dto Dados para atualização
   * @param usuarioId ID do usuário que está atualizando a configuração
   * @param usuarioNome Nome do usuário que está atualizando a configuração
   * @returns Configuração atualizada
   */
  async atualizarConfiguracao(
    id: string,
    dto: AtualizarMetricaConfiguracaoDto,
    usuarioId: string,
    usuarioNome: string,
  ): Promise<MetricaConfiguracao> {
    this.logger.log(`Atualizando configuração com ID: ${id}`);

    // Buscar configuração existente
    const config = await this.metricaConfiguracaoRepository.findOne({
      where: { id },
      relations: ['metrica'],
    });

    if (!config) {
      throw new NotFoundException(`Configuração com ID ${id} não encontrada`);
    }

    // Combinar dados atuais com atualizações
    const configAtualizada = {
      ...config,
      ...dto,
      atualizado_por: `${usuarioNome} (${usuarioId})`,
    };

    // Validar configurações específicas para cada tipo de agendamento
    await this.validarDadosConfiguracao(configAtualizada);

    // Salvar configuração atualizada
    const resultado =
      await this.metricaConfiguracaoRepository.save(configAtualizada);

    // Invalidar cache da métrica
    this.cacheService.invalidarCacheMetrica(config.metrica_id);

    // Emitir evento para notificar atualização da configuração
    this.eventEmitter.emit('metrica.configuracao.atualizada', {
      metrica_id: config.metrica_id,
      configuracao_id: resultado.id,
      usuario_id: usuarioId,
    });

    // Carregar a entidade metrica para acessar suas propriedades, se disponível
    let codigoMetrica = config.metrica_id;
    if (config.metrica) {
      const metrica = await config.metrica;
      codigoMetrica = metrica.codigo || config.metrica_id;
    }

    this.logger.log(
      `Configuração atualizada com sucesso para métrica: ${codigoMetrica}`,
    );

    return resultado;
  }

  /**
   * Busca configuração de uma métrica
   *
   * @param metricaId ID da métrica
   * @returns Configuração encontrada ou null
   */
  async buscarConfiguracaoPorMetrica(
    metricaId: string,
  ): Promise<MetricaConfiguracao> {
    const config = await this.metricaConfiguracaoRepository.findOne({
      where: { metrica_id: metricaId },
      relations: ['metrica'],
    });

    if (!config) {
      throw new NotFoundException(
        `Configuração para métrica ${metricaId} não encontrada`,
      );
    }

    return config;
  }

  /**
   * Valida dados específicos para cada tipo de métrica
   *
   * @param metrica Dados da métrica a ser validada
   */
  private async validarDadosMetrica(
    metrica: CriarMetricaDefinicaoDto | MetricaDefinicao,
  ): Promise<void> {
    // Validar formato do código (snake_case)
    const codigoRegex = /^[a-z][a-z0-9_]*$/;
    if (!codigoRegex.test(metrica.codigo)) {
      throw new BadRequestException(
        'Código da métrica deve estar em formato snake_case (apenas letras minúsculas, números e underscore)',
      );
    }

    switch (metrica.tipo) {
      case TipoMetrica.CONTAGEM:
      case TipoMetrica.SOMA:
      case TipoMetrica.MEDIA:
      case TipoMetrica.MINIMO:
      case TipoMetrica.MAXIMO:
      case TipoMetrica.CARDINALIDADE:
        // Validar consulta SQL
        if (!metrica.sql_consulta) {
          throw new BadRequestException(
            `Métricas do tipo ${metrica.tipo} requerem uma consulta SQL`,
          );
        }
        break;

      case TipoMetrica.PERCENTIL:
        // Validar consulta SQL e parâmetro de percentil
        if (!metrica.sql_consulta) {
          throw new BadRequestException(
            'Métricas do tipo PERCENTIL requerem uma consulta SQL',
          );
        }

        if (!metrica.parametros_especificos?.percentil) {
          throw new BadRequestException(
            'Métricas do tipo PERCENTIL requerem o parâmetro "percentil" (ex: 95)',
          );
        }

        const percentil = Number(metrica.parametros_especificos.percentil);
        if (isNaN(percentil) || percentil < 0 || percentil > 100) {
          throw new BadRequestException(
            'O valor do percentil deve ser um número entre 0 e 100',
          );
        }
        break;

      case TipoMetrica.COMPOSTA:
        // Validar fórmula e métricas dependentes
        if (!metrica.formula_calculo) {
          throw new BadRequestException(
            'Métricas do tipo COMPOSTA requerem uma fórmula de cálculo',
          );
        }

        if (
          !metrica.metricas_dependentes ||
          metrica.metricas_dependentes.length === 0
        ) {
          throw new BadRequestException(
            'Métricas do tipo COMPOSTA requerem a definição de métricas dependentes',
          );
        }

        // Verificar se as métricas dependentes existem
        for (const codigoDependente of metrica.metricas_dependentes) {
          // Ignorar a própria métrica sendo editada
          if (codigoDependente === metrica.codigo) {
            continue;
          }

          const dependente = await this.metricaDefinicaoRepository.findOne({
            where: { codigo: codigoDependente },
          });

          if (!dependente) {
            throw new BadRequestException(
              `Métrica dependente '${codigoDependente}' não encontrada`,
            );
          }
        }
        break;

      case TipoMetrica.TAXA_VARIACAO:
        // Validar consulta SQL
        if (!metrica.sql_consulta) {
          throw new BadRequestException(
            'Métricas do tipo TAXA_VARIACAO requerem uma consulta SQL',
          );
        }
        break;

      default:
        throw new BadRequestException(
          `Tipo de métrica não suportado: ${metrica.tipo}`,
        );
    }
  }

  /**
   * Valida dados específicos para cada tipo de agendamento
   *
   * @param config Dados da configuração a ser validada
   */
  private async validarDadosConfiguracao(
    config: CriarMetricaConfiguracaoDto | MetricaConfiguracao,
  ): Promise<void> {
    if (config.tipo_agendamento === 'cron' && !config.expressao_cron) {
      throw new BadRequestException(
        'Agendamento do tipo CRON requer a definição de uma expressão cron',
      );
    }

    if (config.tipo_agendamento === 'evento' && !config.nome_evento) {
      throw new BadRequestException(
        'Agendamento do tipo EVENTO requer a definição do nome do evento',
      );
    }

    if (
      config.estrategia_amostragem !== 'completa' &&
      !config.tamanho_amostra
    ) {
      throw new BadRequestException(
        `Estratégia de amostragem '${config.estrategia_amostragem}' requer a definição do tamanho da amostra`,
      );
    }

    // Validar alertas
    if (config.alertas && config.alertas.length > 0) {
      for (const alerta of config.alertas) {
        if (!alerta.tipo) {
          throw new BadRequestException(
            'Cada alerta deve ter um tipo definido',
          );
        }

        if (alerta.valor === undefined || alerta.valor === null) {
          throw new BadRequestException(
            `Alerta do tipo '${alerta.tipo}' requer um valor de referência`,
          );
        }

        if (!alerta.severidade) {
          throw new BadRequestException(
            `Alerta do tipo '${alerta.tipo}' requer uma severidade definida`,
          );
        }
      }
    }
  }
}
