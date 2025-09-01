import { Pagamento } from '../../../entities/pagamento.entity';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { number } from 'joi';

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
      metodo_pagamento: dto.metodo_pagamento,
      observacoes: dto.observacoes,
      status: StatusPagamentoEnum.PENDENTE,
      criado_por: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Mapeia DTO para entidade (versão simplificada)
   */
  static toEntity(dto: PagamentoCreateDto): Partial<Pagamento> {
    return {
      info_bancaria_id: dto.info_bancaria_id,
      valor: dto.valor,
      data_liberacao: dto.data_liberacao,
      metodo_pagamento: dto.metodo_pagamento,
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
      solicitacao_id: pagamento.solicitacao_id || '',
      valor: pagamento.valor,
      status: pagamento.status,
      metodo_pagamento: pagamento.metodo_pagamento,
      observacoes: pagamento.observacoes,
      numero_parcela: pagamento.numero_parcela || 1,
      total_parcelas: pagamento.total_parcelas || 1,
      data_liberacao: pagamento.data_liberacao,
      data_pagamento: pagamento.data_pagamento,
      responsavel_liberacao: pagamento.responsavel_liberacao
        ? {
            id: pagamento.responsavel_liberacao?.id,
            nome: pagamento.responsavel_liberacao?.nome,
            role: pagamento.responsavel_liberacao?.role?.toString(),
          }
        : null,
      quantidade_comprovantes: 0,
      created_at: pagamento.created_at,
      updated_at: pagamento.updated_at,
      pode_liberar: false,
      motivo_liberacao: 'Dados insuficientes para análise',
    };

    // Dados sensíveis apenas para usuários autorizados
    if (incluirDadosSensiveis) {
      // Campos de auditoria podem ser adicionados conforme necessário
    }

    // Campos condicionais
    if (pagamento.solicitacao) {
      dto.solicitacao = {
        id: pagamento.solicitacao.id,
        beneficiario: {
          id: pagamento.solicitacao.beneficiario?.id || '',
          nome: pagamento.solicitacao.beneficiario?.nome || 'N/A',
          cpf: pagamento.solicitacao.beneficiario?.cpf || 'N/A',
        },
        tipo_beneficio: {
          id: pagamento.solicitacao.tipo_beneficio?.id || '',
          nome: pagamento.solicitacao.tipo_beneficio?.nome || 'N/A',
        },
        unidade: {
          id: pagamento.solicitacao.unidade?.id || '',
          nome: pagamento.solicitacao.unidade?.nome || 'N/A',
        },
        tecnico: {
          id: pagamento.solicitacao.tecnico?.id || '',
          nome: pagamento.solicitacao.tecnico?.nome || 'N/A',
        },
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
    solicitacao_id?: string;
    concessao_id?: string;
    data_inicio?: Date;
    data_fim?: Date;
    valorMinimo?: number;
    valorMaximo?: number;
  } {
    return {
      status: filtros.status,
      solicitacao_id: filtros.solicitacao_id,
      concessao_id: filtros.concessao_id,
      data_inicio: filtros.data_inicio
        ? new Date(filtros.data_inicio)
        : undefined,
      data_fim: filtros.data_fim ? new Date(filtros.data_fim) : undefined,
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
      page: number;
      itemsPerPage: number;
      totalItems: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const pages = Math.ceil(total / limit);

    return {
      data: items,
      pagination: {
        page: page,
        itemsPerPage: limit,
        totalItems: total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
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
