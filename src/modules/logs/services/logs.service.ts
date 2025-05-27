import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../auditoria/entities/log-auditoria.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { LogsFilterDto, CriticidadeLog } from '../dto/logs-filter.dto';
import { LogResponseDto } from '../dto/log-response.dto';

/**
 * Serviço para gerenciamento de logs de auditoria
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(LogAuditoria)
    private logAuditoriaRepository: Repository<LogAuditoria>,

    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>
  ) {
    this.logger.log('Serviço de Logs inicializado');
  }

  /**
   * Busca logs com filtros e paginação
   * @param filter Filtros para busca de logs
   * @returns Logs encontrados e metadados de paginação
   */
  async findAll(filter: LogsFilterDto) {
    const {
      page = 1,
      limit = 10,
      entidade,
      entidade_id,
      usuario_id,
      acao,
      modulo,
      criticidade,
      data_inicio,
      data_fim,
    } = filter;

    const queryBuilder = this.logAuditoriaRepository.createQueryBuilder('log');

    // Aplicar filtros
    if (entidade) {
      queryBuilder.andWhere('log.entidade_afetada = :entidade', { entidade });
    }

    if (entidade_id) {
      queryBuilder.andWhere('log.entidade_id = :entidade_id', { entidade_id });
    }

    if (usuario_id) {
      queryBuilder.andWhere('log.usuario_id = :usuario_id', { usuario_id });
    }

    if (acao) {
      queryBuilder.andWhere('log.tipo_operacao = :acao', { acao });
    }

    if (modulo) {
      // Filtrar por módulo usando o endpoint como referência
      queryBuilder.andWhere('log.endpoint LIKE :modulo', { modulo: `/${modulo}%` });
    }

    // Filtro por período
    if (data_inicio && data_fim) {
      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      queryBuilder.andWhere('log.created_at BETWEEN :inicio AND :fim', {
        inicio,
        fim,
      });
    } else if (data_inicio) {
      const inicio = new Date(data_inicio);
      queryBuilder.andWhere('log.created_at >= :inicio', { inicio });
    } else if (data_fim) {
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
      queryBuilder.andWhere('log.created_at <= :fim', { fim });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão
    queryBuilder.orderBy('log.created_at', 'DESC');

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    // Mapear resultados para DTOs
    const logs = items.map(log => this.mapToDto(log));

    return {
      items: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um log pelo ID
   * @param id ID do log
   * @returns Log encontrado
   */
  async findById(id: string): Promise<LogResponseDto> {
    const log = await this.logAuditoriaRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!log) {
      throw new NotFoundException(`Log com ID ${id} não encontrado`);
    }

    return this.mapToDto(log);
  }

  /**
   * Lista as entidades disponíveis para filtro
   * @returns Lista de entidades
   */
  async listarEntidades(): Promise<string[]> {
    const result = await this.logAuditoriaRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.entidade_afetada', 'entidade')
      .orderBy('entidade')
      .getRawMany();

    return result.map(item => item.entidade);
  }

  /**
   * Lista os módulos disponíveis para filtro
   * @returns Lista de módulos
   */
  async listarModulos(): Promise<string[]> {
    // Extrair o módulo do endpoint (primeiro segmento do caminho)
    const result = await this.logAuditoriaRepository
      .createQueryBuilder('log')
      .select("DISTINCT SPLIT_PART(SUBSTRING(log.endpoint FROM '^/([^/]+)'), '/', 1)", 'modulo')
      .where('log.endpoint IS NOT NULL')
      .orderBy('modulo')
      .getRawMany();

    return result.map(item => item.modulo).filter(Boolean);
  }

  /**
   * Lista as ações disponíveis para filtro
   * @returns Lista de ações
   */
  async listarAcoes(): Promise<string[]> {
    const result = await this.logAuditoriaRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.tipo_operacao', 'acao')
      .orderBy('acao')
      .getRawMany();

    return result.map(item => item.acao);
  }

  /**
   * Lista as criticidades de log disponíveis
   * @returns Lista de criticidades
   */
  async listarCriticidades(): Promise<string[]> {
    return Object.values(CriticidadeLog);
  }

  /**
   * Exporta logs para CSV
   * @param filter Filtros para exportação
   * @returns Buffer com o conteúdo CSV
   */
  async exportarCsv(filter: LogsFilterDto): Promise<Buffer> {
    // Remover paginação para exportar todos os logs
    filter.page = undefined;
    filter.limit = undefined;

    const { items } = await this.findAll(filter);

    // Cabeçalho do CSV
    const header = [
      'ID',
      'Data',
      'ID do Usuário',
      'Ação',
      'Entidade',
      'ID da Entidade',
      'Endpoint',
      'Método HTTP',
      'Detalhes',
      'IP',
      'User Agent',
    ].join(',');

    // Linhas do CSV
    const rows = items.map(log => {
      return [
        log.id,
        log.created_at.toISOString(),
        log.usuario_id || '',
        log.acao,
        log.entidade,
        log.entidade_id || '',
        log.modulo || '',
        log.user_agent?.split(' ')[0] || '',  // Primeiro elemento do User Agent geralmente é o navegador
        (log.detalhes || '').replace(/,/g, ';'),
        log.ip_address || '',
        (log.user_agent || '').replace(/,/g, ';'),
      ].join(',');
    });

    // Montar o CSV
    const csv = [header, ...rows].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Mapeia um log para o DTO de resposta
   * @param log Log a ser mapeado
   * @returns DTO de resposta
   */
  private mapToDto(log: LogAuditoria): LogResponseDto {
    const dto = new LogResponseDto();
    dto.id = log.id;
    dto.usuario_id = log.usuario_id;
    
    // Buscar nome do usuário via relacionamento seria ideal, mas foi removido no MVP
    // Para uma implementação completa, seria necessário buscar o usuário separadamente
    
    dto.acao = log.tipo_operacao;
    dto.entidade = log.entidade_afetada;
    dto.entidade_id = log.entidade_id;
    dto.dados_anteriores = log.dados_anteriores;
    dto.dados_novos = log.dados_novos;
    dto.ip_address = log.ip_origem;
    dto.user_agent = log.user_agent;
    dto.modulo = log.endpoint?.split('/')[1] || 'sistema'; // Extrair módulo do endpoint como fallback
    dto.criticidade = CriticidadeLog.NORMAL; // Valor padrão até implementação completa
    dto.detalhes = log.descricao;
    dto.created_at = log.created_at;
    
    return dto;
  }
}
