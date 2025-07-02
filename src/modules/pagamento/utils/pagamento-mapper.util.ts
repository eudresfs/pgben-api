import { Pagamento } from '../../../entities/pagamento.entity';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Utilitário para mapeamento de dados de pagamento
 * Substitui o pagamento-mapping.service.ts com implementação mais simples
 */
export class PagamentoMapper {
  /**
   * Mapeia DTO de criação para dados da entidade
   */
  static fromCreateDto(
    dto: PagamentoCreateDto,
    usuarioId: string,
  ): Partial<Pagamento> {
    return {
      valor: dto.valor,
      metodoPagamento: dto.metodoPagamento,
      observacoes: dto.observacoes,
      status: StatusPagamentoEnum.PENDENTE,
      criadoPor: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Mapeia DTO para entidade (versão simplificada)
   */
  static toEntity(dto: PagamentoCreateDto): Partial<Pagamento> {
    return {
      infoBancariaId: dto.infoBancariaId,
      valor: dto.valor,
      dataLiberacao: dto.dataLiberacao,
      metodoPagamento: dto.metodoPagamento,
      observacoes: dto.observacoes,
    };
  }

  /**
   * Mapeia entidade para DTO de resposta
   */
  static toResponseDto(
    pagamento: Pagamento,
    incluirDadosSensiveis: boolean = false,
  ): PagamentoResponseDto {
    const dto: PagamentoResponseDto = {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId || '',
      valor: pagamento.valor,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      observacoes: pagamento.observacoes,
      numeroParcela: pagamento.numeroParcela || 1,
      totalParcelas: pagamento.totalParcelas || 1,
      dataLiberacao: pagamento.dataLiberacao,
      dataPagamento: pagamento.dataPagamento,
      responsavelLiberacao: {
        id: pagamento.liberadoPor || 'sistema',
        nome: 'Sistema',
        role: 'Sistema',
      },
      quantidadeComprovantes: 0,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at,
    };

    // Dados sensíveis apenas para usuários autorizados
    if (incluirDadosSensiveis) {
      // Campos de auditoria podem ser adicionados conforme necessário
    }

    // Campos condicionais
    if (pagamento.solicitacao) {
      dto.solicitacao = {
        id: pagamento.solicitacao.id,
        beneficiario: pagamento.solicitacao.beneficiario?.nome || 'N/A',
        tipoBeneficio: pagamento.solicitacao.tipo_beneficio?.nome || 'N/A',
      };
    }

    return dto;
  }

  /**
   * Mapeia lista de entidades para DTOs de resposta
   */
  static toResponseDtos(
    pagamentos: Pagamento[],
    incluirDadosSensiveis: boolean = false,
  ): PagamentoResponseDto[] {
    return pagamentos.map((pagamento) =>
      this.toResponseDto(pagamento, incluirDadosSensiveis),
    );
  }

  /**
   * Mapeia dados de filtros para critérios de busca
   */
  static mapFiltersToCriteria(filtros: any): {
    status?: StatusPagamentoEnum;
    solicitacaoId?: string;
    concessaoId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    valorMinimo?: number;
    valorMaximo?: number;
  } {
    return {
      status: filtros.status,
      solicitacaoId: filtros.solicitacaoId,
      concessaoId: filtros.concessaoId,
      dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
      dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
      valorMinimo: filtros.valorMinimo
        ? parseFloat(filtros.valorMinimo)
        : undefined,
      valorMaximo: filtros.valorMaximo
        ? parseFloat(filtros.valorMaximo)
        : undefined,
    };
  }

  /**
   * Constrói resposta paginada padronizada
   */
  static buildPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): {
    data: T[];
    pagination: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } {
    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Normaliza dados de entrada removendo campos vazios
   */
  static normalizeInput<T extends Record<string, any>>(data: T): Partial<T> {
    const normalized = { ...data };

    // Remove campos undefined, null ou strings vazias
    Object.keys(normalized).forEach((key) => {
      const value = normalized[key];
      if (value === undefined || value === null || value === '') {
        delete normalized[key];
      }
    });

    return normalized;
  }

  /**
   * Aplica máscara de dados sensíveis
   */
  static maskSensitiveData(data: any): any {
    if (!data) return data;

    const masked = { ...data };

    // Mascarar valores monetários se necessário
    if (masked.valor && typeof masked.valor === 'number') {
      // Mantém valores, mas pode ser configurado para mascarar
      masked.valor = masked.valor;
    }

    // Mascarar observações sensíveis
    if (masked.observacoes && typeof masked.observacoes === 'string') {
      // Remove possíveis dados pessoais das observações
      masked.observacoes = masked.observacoes
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '***.***.***-**') // CPF
        .replace(
          /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
          '**.***.***\/****-**',
        ); // CNPJ
    }

    return masked;
  }

  /**
   * Gera resumo de pagamento para notificações
   */
  static toNotificationSummary(pagamento: Pagamento): {
    id: string;
    valor: number;
    status: string;
    protocolo?: string;
    tipoBeneficio?: string;
  } {
    return {
      id: pagamento.id,
      valor: pagamento.valor,
      status: pagamento.status,
      protocolo: pagamento.solicitacao?.protocolo,
      tipoBeneficio: pagamento.solicitacao?.tipo_beneficio?.nome,
    };
  }

  /**
   * Calcula estatísticas básicas de uma lista de pagamentos
   */
  static calculateStats(pagamentos: Pagamento[]): {
    total: number;
    valorTotal: number;
    porStatus: Record<string, number>;
    valorMedio: number;
  } {
    const stats = {
      total: pagamentos.length,
      valorTotal: 0,
      porStatus: {} as Record<string, number>,
      valorMedio: 0,
    };

    pagamentos.forEach((pagamento) => {
      stats.valorTotal += pagamento.valor;

      const status = pagamento.status;
      stats.porStatus[status] = (stats.porStatus[status] || 0) + 1;
    });

    stats.valorMedio = stats.total > 0 ? stats.valorTotal / stats.total : 0;

    return stats;
  }
}
