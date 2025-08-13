import { Injectable } from '@nestjs/common';
import { Pagamento } from '../../../entities/pagamento.entity';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { Documento } from '../../../entities/documento.entity';
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
   * Mapeia entidade Documento para DTO de resposta
   *
   * @param documento - Entidade do documento
   * @returns DTO de resposta do comprovante
   */
  static comprovanteToResponseDto(
    documento: Documento,
  ): ComprovanteResponseDto {
    if (!documento) {
      throw new Error('Documento não pode ser nulo');
    }

    return {
      id: documento.id,
      pagamento_id: this.extrairPagamentoId(documento),
      nome_original: documento.nome_original,
      tamanho: documento.tamanho,
      mimetype: documento.mimetype,
      data_upload: documento.data_upload,
      observacoes: documento.observacoes_verificacao,
      usuario_upload_id: documento.usuario_upload_id,
    };
  }

  /**
   * Mapeia lista de documentos para DTOs de resposta
   *
   * @param documentos - Lista de entidades de documento
   * @returns Lista de DTOs de resposta
   */
  static comprovanteToResponseDtoList(
    documentos: Documento[],
  ): ComprovanteResponseDto[] {
    if (!Array.isArray(documentos)) {
      return [];
    }

    return documentos.map((documento) =>
      this.comprovanteToResponseDto(documento),
    );
  }

  // ==========================================
  // MÉTODOS AUXILIARES PARA PAGAMENTO
  // ==========================================

  /**
   * Extrai o ID do pagamento associado ao documento
   *
   * @param documento - Entidade do documento
   * @returns ID do pagamento ou string vazia se não encontrado
   */
  private static extrairPagamentoId(documento: Documento): string {
    // 1. Verificar se há referência nos metadados do documento
    if (documento.metadados) {
      const pagamentoId = this.extrairPagamentoDosMetadados(
        documento.metadados,
      );
      if (pagamentoId) {
        return pagamentoId;
      }
    }

    // 2. Verificar se há referência nas observações
    if (documento.observacoes_verificacao) {
      const pagamentoId = this.extrairPagamentoDasObservacoes(
        documento.observacoes_verificacao,
      );
      if (pagamentoId) {
        return pagamentoId;
      }
    }

    // 3. Verificar se o nome do arquivo contém referência ao pagamento
    if (documento.nome_original) {
      const pagamentoId = this.extrairPagamentoDoNomeArquivo(
        documento.nome_original,
      );
      if (pagamentoId) {
        return pagamentoId;
      }
    }

    return '';
  }

  /**
   * Extrai pagamento_id do contexto de referência
   */
  private static extrairPagamentoDoContexto(contexto: string): string {
    try {
      const contextoObj = JSON.parse(contexto);
      return contextoObj.pagamento_id || contextoObj.pagamentoId || '';
    } catch {
      // Se não for JSON válido, tentar extrair por regex
      const match = contexto.match(/pagamento[_-]?id[:\s]*([a-f0-9-]{36})/i);
      return match ? match[1] : '';
    }
  }

  /**
   * Extrai pagamento_id das observações
   */
  private static extrairPagamentoDasObservacoes(observacoes: string): string {
    const patterns = [
      /pagamento[_\s-]*id[:\s]*([a-f0-9-]{36})/i,
      /comprovante[_\s-]*pagamento[:\s]*([a-f0-9-]{36})/i,
      /ref[_\s-]*pagamento[:\s]*([a-f0-9-]{36})/i,
    ];

    for (const pattern of patterns) {
      const match = observacoes.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Extrai pagamento_id do nome do arquivo
   */
  private static extrairPagamentoDoNomeArquivo(nomeArquivo: string): string {
    const patterns = [
      /comprovante[_-]([a-f0-9-]{36})/i,
      /pagamento[_-]([a-f0-9-]{36})/i,
      /pag[_-]([a-f0-9-]{36})/i,
    ];

    for (const pattern of patterns) {
      const match = nomeArquivo.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Extrai pagamento_id dos metadados
   */
  private static extrairPagamentoDosMetadados(metadados: any): string {
    if (typeof metadados === 'string') {
      try {
        metadados = JSON.parse(metadados);
      } catch {
        return '';
      }
    }

    if (typeof metadados === 'object' && metadados !== null) {
      return (
        metadados.pagamento_id ||
        metadados.pagamentoId ||
        metadados.payment_id ||
        metadados.ref_pagamento ||
        ''
      );
    }

    return '';
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
