import { ApiProperty } from '@nestjs/swagger';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * DTO para resposta contendo dados de um registro do histórico de pagamento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre o histórico de um pagamento específico.
 *
 * @author Equipe PGBen
 */
export class HistoricoPagamentoResponseDto {
  /**
   * Identificador único do registro de histórico
   */
  @ApiProperty({
    description: 'ID único do registro de histórico',
    example: 'uuid-historico-123',
  })
  id: string;

  /**
   * ID do pagamento relacionado
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado ao histórico',
    example: 'uuid-pagamento-123',
  })
  pagamento_id: string;

  /**
   * Data e hora do evento
   */
  @ApiProperty({
    description: 'Data e hora em que o evento ocorreu',
    example: '2024-01-15T10:30:00.000Z',
  })
  data_evento: Date;

  /**
   * ID do usuário responsável pelo evento
   */
  @ApiProperty({
    description: 'ID do usuário que executou a ação',
    example: 'uuid-usuario-123',
    required: false,
  })
  usuario_id?: string;

  /**
   * Tipo do evento registrado
   */
  @ApiProperty({
    description: 'Tipo do evento que foi registrado',
    enum: TipoEventoHistoricoEnum,
    example: TipoEventoHistoricoEnum.ALTERACAO_STATUS,
  })
  tipo_evento: TipoEventoHistoricoEnum;

  /**
   * Status anterior do pagamento
   */
  @ApiProperty({
    description: 'Status do pagamento antes da alteração',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.PENDENTE,
    required: false,
  })
  status_anterior?: StatusPagamentoEnum;

  /**
   * Status atual do pagamento
   */
  @ApiProperty({
    description: 'Status do pagamento após a alteração',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
    required: false,
  })
  status_atual?: StatusPagamentoEnum;

  /**
   * Observação sobre o evento
   */
  @ApiProperty({
    description: 'Observação detalhada sobre o evento',
    example: 'Status alterado de PENDENTE para LIBERADO',
    required: false,
  })
  observacao?: string;

  /**
   * Dados contextuais do evento
   */
  @ApiProperty({
    description: 'Dados adicionais sobre o contexto do evento',
    example: {
      valor: 1500.00,
      metodo_pagamento: 'pix',
      motivo: 'Aprovação automática'
    },
    required: false,
  })
  dados_contexto?: Record<string, any>;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do registro de histórico',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: Date;

  /**
   * Informações do usuário responsável (quando incluídas)
   */
  @ApiProperty({
    description: 'Dados do usuário responsável pelo evento',
    example: {
      id: 'uuid-usuario-123',
      nome: 'João Silva',
      email: 'joao.silva@exemplo.com'
    },
    required: false,
  })
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };

  /**
   * Informações resumidas do pagamento (quando incluídas)
   */
  @ApiProperty({
    description: 'Dados resumidos do pagamento',
    example: {
      id: 'uuid-pagamento-123',
      valor: 1500.00,
      status: 'LIBERADO',
      metodo_pagamento: 'pix'
    },
    required: false,
  })
  pagamento?: {
    id: string;
    valor: number;
    status: StatusPagamentoEnum;
    metodo_pagamento: string;
  };
}

/**
 * DTO para resposta paginada do histórico de pagamentos
 *
 * @author Equipe PGBen
 */
export class HistoricoPagamentoPaginadoResponseDto {
  /**
   * Lista de registros do histórico
   */
  @ApiProperty({
    description: 'Lista de registros do histórico de pagamentos',
    type: [HistoricoPagamentoResponseDto],
  })
  data: HistoricoPagamentoResponseDto[];

  /**
   * Informações de paginação
   */
  @ApiProperty({
    description: 'Metadados de paginação',
    example: {
      total: 150,
      page: 1,
      limit: 10,
      totalPages: 15
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Histórico de pagamentos recuperado com sucesso',
  })
  message: string;
}