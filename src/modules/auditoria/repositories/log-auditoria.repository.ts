import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, Raw } from 'typeorm';
import { LogAuditoria } from '../entities/log-auditoria.entity';
import { TipoOperacao } from '../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Promisificar funções de compressão
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

/**
 * Repositório para logs de auditoria
 *
 * Implementa o padrão Repository para operações com logs de auditoria,
 * incluindo suporte a compressão de dados e particionamento de tabelas.
 */
@Injectable()
export class LogAuditoriaRepository {
  private readonly logger = new Logger(LogAuditoriaRepository.name);
  private readonly compressionEnabled: boolean = true;
  private readonly compressionThreshold: number = 1024; // 1KB

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly repository: Repository<LogAuditoria>,
  ) {}

  /**
   * Cria um novo log de auditoria
   *
   * @param createLogAuditoriaDto DTO com dados do log
   * @returns Log de auditoria criado
   */
  async create(
    createLogAuditoriaDto: CreateLogAuditoriaDto,
  ): Promise<LogAuditoria> {
    try {
      // Criar entidade a partir do DTO
      const logAuditoria = this.repository.create(createLogAuditoriaDto);

      // Comprimir dados grandes se necessário
      await this.compressLogDataIfNeeded(logAuditoria);

      // Salvar o log sem assinatura para evitar dependência circular
      const savedLog = await this.repository.save(logAuditoria);
      
      this.logger.debug(`Log ${savedLog.id} criado com sucesso`);

      return savedLog;
    } catch (error) {
      this.logger.error(
        `Erro ao criar log de auditoria: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs de auditoria com filtros e paginação
   *
   * @param queryDto DTO com filtros de busca
   * @returns Logs de auditoria paginados
   */
  async findAll(
    queryDto: QueryLogAuditoriaDto,
  ): Promise<{ items: LogAuditoria[]; total: number }> {
    try {
      const {
        tipo_operacao,
        entidade_afetada,
        entidade_id,
        usuario_id,
        ip_usuario: ip_origem,
        endpoint,
        metodo_http,
        data_inicial: data_inicio,
        data_final: data_fim,
        termo_busca,
        pagina: page = 1,
        itens_por_pagina: limit = 10,
      } = queryDto;

      // Construir where clause
      const where: FindOptionsWhere<LogAuditoria> = {};

      // Filtrar por tipo de operação
      if (tipo_operacao) {
        where.tipo_operacao = tipo_operacao;
      }

      // Filtrar por entidade afetada
      if (entidade_afetada) {
        where.entidade_afetada = entidade_afetada;
      }

      // Filtrar por usuário
      if (usuario_id) {
        where.usuario_id = usuario_id;
      }

      // Filtrar por IP de origem
      if (ip_origem) {
        where.ip_origem = ip_origem;
      }

      // Filtrar por endpoint
      if (endpoint) {
        where.endpoint = Raw(
          (alias) => `(${alias} ILIKE '%${endpoint.replace(/'/g, "''")}%')`,
        );
      }

      // Filtrar por método HTTP
      if (metodo_http) {
        where.metodo_http = metodo_http;
      }

      // Filtrar por período
      if (data_inicio && data_fim) {
        where.created_at = Between(new Date(data_inicio), new Date(data_fim));
      } else if (data_inicio) {
        where.created_at = Raw((alias) => `(${alias} >= :dataInicio)`, {
          dataInicio: new Date(data_inicio),
        });
      } else if (data_fim) {
        where.created_at = Raw((alias) => `(${alias} <= :dataFim)`, {
          dataFim: new Date(data_fim),
        });
      }

      // Filtrar por presença de dados sensíveis
      if (termo_busca) {
        where.dados_sensiveis_acessados = Raw(
          (alias) => `(${alias}::text ILIKE :termo)`,
          { termo: `%${termo_busca}%` },
        );
      }

      // Calcular skip para paginação
      const skip = (page - 1) * limit;

      // Executar consulta
      const [items, total] = await this.repository.findAndCount({
        where,
        skip,
        take: limit,
        order: {
          created_at: 'DESC',
        },
      });

      // Descomprimir dados se necessário
      for (const item of items) {
        await this.decompressLogDataIfNeeded(item);
      }

      return { items, total };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar logs de auditoria: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca um log de auditoria pelo ID
   *
   * @param id ID do log
   * @returns Log de auditoria
   */
  async findOne(id: string): Promise<LogAuditoria | null> {
    try {
      const log = await this.repository.findOne({ where: { id } });

      if (!log) {
        return null;
      }

      // Descomprimir dados se necessário
      await this.decompressLogDataIfNeeded(log);

      return log;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar log de auditoria: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs de auditoria por entidade e ID
   *
   * @param entidade Nome da entidade
   * @param entidadeId ID da entidade
   * @returns Logs de auditoria
   */
  async findByEntity(
    entidade: string,
    entidadeId: string,
  ): Promise<LogAuditoria[]> {
    try {
      const logs = await this.repository.find({
        where: {
          entidade_afetada: entidade,
          entidade_id: entidadeId,
        },
        order: {
          created_at: 'DESC',
        },
      });

      // Descomprimir dados se necessário
      for (const log of logs) {
        await this.decompressLogDataIfNeeded(log);
      }

      return logs;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar logs por entidade: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs de auditoria por usuário
   *
   * @param usuarioId ID do usuário
   * @param limit Limite de registros
   * @returns Logs de auditoria
   */
  async findByUser(
    usuarioId: string,
    limit: number = 100,
  ): Promise<LogAuditoria[]> {
    try {
      const logs = await this.repository.find({
        where: {
          usuario_id: usuarioId,
        },
        order: {
          created_at: 'DESC',
        },
        take: limit,
      });

      // Descomprimir dados se necessário
      for (const log of logs) {
        await this.decompressLogDataIfNeeded(log);
      }

      return logs;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar logs por usuário: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs de auditoria de acesso a dados sensíveis
   *
   * @param limit Limite de registros
   * @returns Logs de auditoria
   */
  async findSensitiveDataAccess(limit: number = 100): Promise<LogAuditoria[]> {
    try {
      const logs = await this.repository.find({
        where: {
          dados_sensiveis_acessados: Raw(
            (alias) => `(${alias} IS NOT NULL AND ${alias}::text != '[]')`,
          ),
        },
        order: {
          created_at: 'DESC',
        },
        take: limit,
      });

      // Descomprimir dados se necessário
      for (const log of logs) {
        await this.decompressLogDataIfNeeded(log);
      }

      return logs;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar logs de acesso a dados sensíveis: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Comprime dados grandes no log de auditoria
   *
   * @param log Log de auditoria
   */
  private async compressLogDataIfNeeded(log: LogAuditoria): Promise<void> {
    if (!this.compressionEnabled) return;

    try {
      // Comprimir dados_anteriores se for grande
      if (log.dados_anteriores) {
        const dadosAnterioresStr = JSON.stringify(log.dados_anteriores);

        if (dadosAnterioresStr.length > this.compressionThreshold) {
          const compressed = await gzipAsync(Buffer.from(dadosAnterioresStr));
          log.dados_anteriores = {
            __compressed: true,
            data: compressed.toString('base64'),
          };
        }
      }

      // Comprimir dados_novos se for grande
      if (log.dados_novos) {
        const dadosNovosStr = JSON.stringify(log.dados_novos);

        if (dadosNovosStr.length > this.compressionThreshold) {
          const compressed = await gzipAsync(Buffer.from(dadosNovosStr));
          log.dados_novos = {
            __compressed: true,
            data: compressed.toString('base64'),
          };
        }
      }
    } catch (error) {
      this.logger.warn(`Erro ao comprimir dados do log: ${error.message}`);
      // Continuar sem compressão em caso de erro
    }
  }

  /**
   * Descomprime dados no log de auditoria
   *
   * @param log Log de auditoria
   */
  private async decompressLogDataIfNeeded(log: LogAuditoria): Promise<void> {
    if (!this.compressionEnabled) return;

    try {
      // Descomprimir dados_anteriores se estiver comprimido
      if (log.dados_anteriores && log.dados_anteriores['__compressed']) {
        const compressedData = Buffer.from(
          log.dados_anteriores['data'],
          'base64',
        );
        const decompressed = await gunzipAsync(compressedData);
        log.dados_anteriores = JSON.parse(decompressed.toString());
      }

      // Descomprimir dados_novos se estiver comprimido
      if (log.dados_novos && log.dados_novos['__compressed']) {
        const compressedData = Buffer.from(log.dados_novos['data'], 'base64');
        const decompressed = await gunzipAsync(compressedData);
        log.dados_novos = JSON.parse(decompressed.toString());
      }
    } catch (error) {
      this.logger.warn(`Erro ao descomprimir dados do log: ${error.message}`);
      // Manter dados comprimidos em caso de erro
    }
  }

  /**
   * Cria uma nova partição na tabela de logs
   *
   * @param dataInicio Data de início da partição
   * @param dataFim Data de fim da partição
   */
  async createPartition(dataInicio: Date, dataFim: Date): Promise<void> {
    try {
      const partitionName = `logs_auditoria_${dataInicio.getFullYear()}_${(dataInicio.getMonth() + 1).toString().padStart(2, '0')}`;
      const startDate = dataInicio.toISOString().split('T')[0];
      const endDate = dataFim.toISOString().split('T')[0];

      // Criar partição usando SQL nativo
      await this.repository.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF logs_auditoria
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `);

      this.logger.log(
        `Partição ${partitionName} criada com sucesso para o período ${startDate} a ${endDate}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao criar partição: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria partições para os próximos meses
   *
   * @param meses Número de meses para criar partições
   */
  async createPartitionsForNextMonths(meses: number = 12): Promise<void> {
    try {
      const hoje = new Date();

      for (let i = 0; i < meses; i++) {
        const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        const dataFim = new Date(
          hoje.getFullYear(),
          hoje.getMonth() + i + 1,
          1,
        );

        await this.createPartition(dataInicio, dataFim);
      }

      this.logger.log(
        `Partições criadas com sucesso para os próximos ${meses} meses`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao criar partições: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Arquiva logs antigos para tabelas de histórico
   *
   * @param mesesRetencao Número de meses para manter logs na tabela principal
   */
  async archiveOldLogs(mesesRetencao: number = 12): Promise<void> {
    try {
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - mesesRetencao);

      // Mover logs antigos para tabela de histórico
      await this.repository.query(`
        INSERT INTO logs_auditoria_historico
        SELECT * FROM logs_auditoria
        WHERE created_at < '${dataLimite.toISOString()}'
      `);

      // Remover logs antigos da tabela principal
      await this.repository.query(`
        DELETE FROM logs_auditoria
        WHERE created_at < '${dataLimite.toISOString()}'
      `);

      this.logger.log(
        `Logs anteriores a ${dataLimite.toISOString()} arquivados com sucesso`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao arquivar logs antigos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
