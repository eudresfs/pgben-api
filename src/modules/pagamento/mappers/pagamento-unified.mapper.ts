import { Injectable } from '@nestjs/common';
import { Pagamento } from '../../../entities/pagamento.entity';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { ComprovanteResponseDto } from '../dtos/comprovante-response.dto';
import { ConfirmacaoResponseDto } from '../dtos/confirmacao-response.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Mapper unificado para todas as operações de mapeamento do módulo de pagamento
 * Consolida funcionalidades de PagamentoMappingService, PagamentoResponseService e outros mappers
 *
 * Responsabilidades:
 * - Mapeamento de DTOs para entidades
 * - Mapeamento de entidades para DTOs de resposta
 * - Transformações de dados específicas do domínio
 * - Validações de mapeamento
 */
@Injectable()
export class PagamentoUnifiedMapper {
  // ==========================================
  // MAPEAMENTO DE PAGAMENTOS
  // ==========================================

  /**
   * Mapeia DTO de criação para dados da entidade Pagamento
   *
   * @param dto - DTO com dados para criação
   * @param usuarioId - ID do usuário que está criando
   * @returns Dados parciais da entidade
   */
  static fromCreateDto(
    dto: PagamentoCreateDto,
    usuarioId: string,
  ): Partial<Pagamento> {
    return {
      solicitacao_id: dto.solicitacao_id,
      info_bancaria_id: dto.info_bancaria_id,
      valor: dto.valor,
      data_liberacao: dto.data_liberacao,
      metodo_pagamento: dto.metodo_pagamento,
      observacoes: dto.observacoes,
      status: StatusPagamentoEnum.PENDENTE,
      criado_por: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Mapeia entidade Pagamento para DTO de resposta
   *
   * @param pagamento - Entidade do pagamento
   * @param incluirDadosSensiveis - Se deve incluir dados sensíveis na resposta
   * @returns DTO de resposta formatado
   */
  static toResponseDto(
    pagamento: Pagamento,
    incluirDadosSensiveis: boolean = false,
  ): PagamentoResponseDto {
    const dto: PagamentoResponseDto = {
      id: pagamento.id,
      solicitacao_id: pagamento.solicitacao_id || '',
      info_bancaria_id: pagamento.info_bancaria_id,
      valor: pagamento.valor,
      status: pagamento.status,
      metodo_pagamento: pagamento.metodo_pagamento,
      data_liberacao: pagamento.data_liberacao,
      data_pagamento: pagamento.data_pagamento,
      observacoes: pagamento.observacoes,
      numero_parcela: pagamento.numero_parcela || 1,
      total_parcelas: pagamento.total_parcelas || 1,
      responsavel_liberacao: {
        id: pagamento.liberado_por || 'sistema',
        nome: 'Sistema',
        role: 'Sistema',
      },
      quantidade_comprovantes: 0,
      created_at: pagamento.created_at,
      updated_at: pagamento.updated_at,

      // Informações relacionadas
      solicitacao: pagamento.solicitacao
        ? {
            id: pagamento.solicitacao.id,
            beneficiario: pagamento.solicitacao.beneficiario?.nome || 'N/A',
            tipo_beneficio: {
              id: pagamento.solicitacao.tipo_beneficio?.id || '',
              nome: pagamento.solicitacao.tipo_beneficio?.nome || 'EVENTUAL',
            },
            unidade: {
              id: pagamento.solicitacao.unidade?.id || '',
              nome: pagamento.solicitacao.unidade?.nome || 'N/A',
            },
            tecnico: {
              id: pagamento.solicitacao.tecnico?.id || '',
              nome: pagamento.solicitacao.tecnico?.nome || 'N/A',
            },
          }
        : undefined,

      info_bancaria: pagamento.info_bancaria
        ? {
            tipo: pagamento.info_bancaria.tipo_conta || 'POUPANCA_SOCIAL',
            chave_pix: incluirDadosSensiveis
              ? pagamento.info_bancaria.chave_pix
              : undefined,
            pix_tipo: pagamento.info_bancaria.tipo_chave_pix?.toUpperCase() as
              | 'CPF'
              | 'CNPJ'
              | 'EMAIL'
              | 'TELEFONE'
              | 'ALEATORIA',
            banco: incluirDadosSensiveis
              ? pagamento.info_bancaria.banco
              : undefined,
            agencia: incluirDadosSensiveis
              ? pagamento.info_bancaria.agencia
              : undefined,
            conta: incluirDadosSensiveis
              ? pagamento.info_bancaria.conta
              : undefined,
          }
        : undefined,
    };

    return dto;
  }

  /**
   * Mapeia lista de entidades para lista de DTOs de resposta
   *
   * @param pagamentos - Lista de entidades
   * @param incluirDadosSensiveis - Se deve incluir dados sensíveis
   * @returns Lista de DTOs de resposta
   */
  static toResponseDtoList(
    pagamentos: Pagamento[],
    incluirDadosSensiveis: boolean = false,
  ): PagamentoResponseDto[] {
    if (!Array.isArray(pagamentos)) {
      return [];
    }

    return pagamentos.map((pagamento) =>
      this.toResponseDto(pagamento, incluirDadosSensiveis),
    );
  }

  // ==========================================
  // MÉTODOS DE VALIDAÇÃO E TRANSFORMAÇÃO
  // ==========================================

  /**
   * Valida e normaliza dados de entrada
   *
   * @param data - Dados a serem validados
   * @returns Dados normalizados
   */
  static validateAndNormalize(data: any): any {
    if (!data) {
      return null;
    }

    // Normalizar valores monetários
    if (data.valor) {
      data.valor = parseFloat(data.valor.toString());
    }

    // Normalizar datas
    if (data.dataVencimento && typeof data.dataVencimento === 'string') {
      data.dataVencimento = new Date(data.dataVencimento);
    }

    if (
      data.dataPrevistaPagamento &&
      typeof data.dataPrevistaPagamento === 'string'
    ) {
      data.dataPrevistaPagamento = new Date(data.dataPrevistaPagamento);
    }

    // Remover campos vazios ou nulos
    Object.keys(data).forEach((key) => {
      if (data[key] === null || data[key] === undefined || data[key] === '') {
        delete data[key];
      }
    });

    return data;
  }

  /**
   * Mapeia dados de auditoria
   *
   * @param entity - Entidade com dados de auditoria
   * @returns Dados de auditoria mapeados
   */
  static mapAuditData(entity: any): any {
    return {
      criadoPor: entity.criadoPor,
      criadoEm: entity.created_at,
      atualizadoPor: entity.atualizadoPor,
      atualizadoEm: entity.updated_at,
    };
  }

  // ==========================================
  // MAPEAMENTO DE CONFIRMAÇÕES
  // ==========================================

  /**
   * Mapeia entidade ConfirmacaoRecebimento para DTO de resposta
   *
   * @param confirmacao - Entidade da confirmação
   * @returns DTO de resposta da confirmação
   */
  static confirmacaoToResponseDto(
    confirmacao: ConfirmacaoRecebimento,
  ): ConfirmacaoResponseDto {
    if (!confirmacao) {
      throw new Error('Confirmação não pode ser nula');
    }

    return {
      // Campos herdados de ConfirmacaoBaseDto
      id: confirmacao.id,
      observacoes: confirmacao.observacoes,
      created_at: confirmacao.created_at,
      updated_at: confirmacao.updated_at,

      // Campos específicos do ConfirmacaoResponseDto
      pagamento_id: confirmacao.pagamento_id,
      data_confirmacao: confirmacao.data_confirmacao,
      metodo_confirmacao: confirmacao.metodo_confirmacao,

      responsavel_confirmacao: {
        id: confirmacao.responsavel_confirmacao?.id || 'sistema',
        nome: confirmacao.responsavel_confirmacao?.nome || 'Sistema',
        role: 'Sistema',
      },

      destinatario: confirmacao.destinatario
        ? {
            id: confirmacao.destinatario.id,
            nome: confirmacao.destinatario.nome,
            relacao: 'Beneficiário',
          }
        : undefined,
    };
  }

  /**
   * Mapeia lista de confirmações para DTOs de resposta
   *
   * @param confirmacoes - Lista de entidades de confirmação
   * @returns Lista de DTOs de resposta
   */
  static confirmacaoToResponseDtoList(
    confirmacoes: ConfirmacaoRecebimento[],
  ): ConfirmacaoResponseDto[] {
    if (!Array.isArray(confirmacoes)) {
      return [];
    }

    return confirmacoes.map((confirmacao) =>
      this.confirmacaoToResponseDto(confirmacao),
    );
  }

  // ==========================================
  // MAPEAMENTO DE COMPROVANTES
  // ==========================================

  /**
   * Mapeia entidade ComprovantePagamento para DTO de resposta
   *
   * @param comprovante - Entidade do comprovante
   * @returns DTO de resposta do comprovante
   */
  static comprovanteToResponseDto(
    comprovante: ComprovantePagamento,
  ): ComprovanteResponseDto {
    if (!comprovante) {
      throw new Error('Comprovante não pode ser nulo');
    }

    return {
      // Campos herdados de ComprovanteBaseDto
      id: comprovante.id,
      created_at: comprovante.created_at,
      updated_at: comprovante.updated_at,

      // Campos específicos do ComprovanteResponseDto
      pagamento_id: comprovante.pagamento_id,
      tipo_documento: comprovante.tipo_documento,
      nome_arquivo: comprovante.nome_arquivo || 'documento.pdf',
      url: comprovante.caminho_arquivo || '', // Usando caminho_arquivo como URL
      tamanho: comprovante.tamanho || 0,
      mime_type: comprovante.mime_type || 'application/pdf',
      data_upload: comprovante.data_upload || comprovante.created_at,
      responsavel_upload: {
        id: comprovante.uploaded_por,
        nome:
          comprovante.responsavel_upload?.nome || 'Usuário não identificado',
      },
    };
  }

  /**
   * Mapeia lista de comprovantes para DTOs de resposta
   *
   * @param comprovantes - Lista de entidades de comprovante
   * @returns Lista de DTOs de resposta
   */
  static comprovanteToResponseDtoList(
    comprovantes: ComprovantePagamento[],
  ): ComprovanteResponseDto[] {
    if (!Array.isArray(comprovantes)) {
      return [];
    }

    return comprovantes.map((comprovante) =>
      this.comprovanteToResponseDto(comprovante),
    );
  }

  // ==========================================
  // UTILITÁRIOS DE MAPEAMENTO
  // ==========================================

  /**
   * Aplica máscara em dados sensíveis
   *
   * @param valor - Valor a ser mascarado
   * @param mostrarUltimos - Quantos caracteres mostrar no final
   * @returns Valor mascarado
   */
  static aplicarMascara(valor: string, mostrarUltimos: number = 4): string {
    if (!valor || valor.length <= mostrarUltimos) {
      return '***';
    }

    const mascarados = '*'.repeat(valor.length - mostrarUltimos);
    const visiveis = valor.slice(-mostrarUltimos);
    return mascarados + visiveis;
  }

  /**
   * Formata valor monetário para exibição
   *
   * @param valor - Valor numérico
   * @returns Valor formatado como string
   */
  static formatarValorMonetario(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  /**
   * Sanitiza dados de resposta removendo campos nulos/undefined
   *
   * @param obj - Objeto a ser sanitizado
   * @returns Objeto sanitizado
   */
  static sanitizarResposta<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizarResposta(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitizado = {} as T;

      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          (sanitizado as any)[key] = this.sanitizarResposta(value);
        }
      }

      return sanitizado;
    }

    return obj;
  }
}
