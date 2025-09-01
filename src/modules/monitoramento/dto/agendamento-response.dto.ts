import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatusAgendamento,
  TipoVisita,
  PrioridadeVisita,
} from '../../../enums';

/**
 * DTO de resposta para dados de agendamento de visita
 * 
 * @description
 * Define a estrutura de dados retornada nas consultas de agendamentos,
 * incluindo informações do beneficiário, técnico e status.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export class AgendamentoResponseDto {
  /**
   * ID único do agendamento
   */
  @ApiProperty({
    description: 'Identificador único do agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Identificador único do pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  pagamento_id: string;

  /**
   * Dados básicos do beneficiário
   */
  @ApiProperty({
    description: 'Informações básicas do beneficiário',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      nome: { type: 'string' },
      cpf: { type: 'string' },
      telefone: { type: 'string' },
    },
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      nome: 'João Silva Santos',
      cpf: '123.456.789-00',
      telefone: '(84) 99999-9999',
    },
  })
  beneficiario: {
    id: string;
    nome: string;
    cpf: string;
    telefone?: string;
  };

  /**
   * Dados da concessão relacionada
   */
  @ApiProperty({
    description: 'Informações da concessão que motivou o agendamento',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      numero_protocolo: { type: 'string' },
      tipo_beneficio: { type: 'string' },
      data_inicio: { type: 'string', format: 'date-time' },
      data_fim: { type: 'string', format: 'date-time' },
    },
    example: {
      id: '789e0123-e89b-12d3-a456-426614174002',
      numero_protocolo: 'PGBEN-2025-001234',
      tipo_beneficio: 'Aluguel Social',
      data_inicio: '2025-01-01T00:00:00.000Z',
      data_fim: '2025-06-30T23:59:59.999Z',
    },
  })
  concessao?: {
    id: string;
    numero_protocolo: string;
    tipo_beneficio: string;
    data_inicio: string;
    data_fim: string;
  };

  /**
   * Dados do técnico responsável
   */
  @ApiProperty({
    description: 'Informações do técnico responsável pela visita',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      nome: { type: 'string' },
      matricula: { type: 'string' },
      cargo: { type: 'string' },
    },
    example: {
      id: '012e3456-e89b-12d3-a456-426614174003',
      nome: 'Maria Oliveira',
      matricula: '12345',
      cargo: 'Assistente Social',
    },
  })
  tecnico: {
    id: string;
    nome: string;
    matricula: string;
    email: string;
  };

  /**
   * Dados da unidade responsável
   */
  @ApiProperty({
    description: 'Informações da unidade responsável pelo agendamento',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      nome: { type: 'string' },
      codigo: { type: 'string' },
      endereco: { type: 'string' },
    },
    example: {
      id: '345e6789-e89b-12d3-a456-426614174004',
      nome: 'CRAS Norte',
      codigo: 'CRAS-001',
      endereco: 'Rua das Palmeiras, 100 - Potengi',
    },
  })
  unidade: {
    id: string;
    nome: string;
  };

  /**
   * Data e hora agendada para a visita
   */
  @ApiProperty({
    description: 'Data e hora programadas para a realização da visita',
    example: '2025-01-20T14:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  data_agendamento: Date;

  /**
   * Tipo da visita agendada
   */
  @ApiProperty({
    description: 'Tipo da visita que foi agendada',
    enum: TipoVisita,
    example: TipoVisita.CONTINUIDADE,
    enumName: 'TipoVisita',
  })
  tipo_visita: TipoVisita;

  /**
   * Rótulo legível do tipo de visita
   */
  @ApiProperty({
    description: 'Descrição legível do tipo de visita',
    example: 'Visita de Acompanhamento',
  })
  tipo_visita_label: string;

  /**
   * Prioridade do agendamento
   */
  @ApiProperty({
    description: 'Nível de prioridade do agendamento',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
    enumName: 'PrioridadeVisita',
  })
  prioridade: PrioridadeVisita;

  /**
   * Rótulo legível da prioridade
   */
  @ApiProperty({
    description: 'Descrição legível da prioridade',
    example: 'Prioridade Normal',
  })
  prioridade_label: string;

  /**
   * Cor associada à prioridade
   */
  @ApiProperty({
    description: 'Cor hexadecimal para representação visual da prioridade',
    example: '#28a745',
  })
  prioridade_cor: string;

  /**
   * Status atual do agendamento
   */
  @ApiProperty({
    description: 'Status atual do agendamento',
    enum: StatusAgendamento,
    example: StatusAgendamento.AGENDADO,
    enumName: 'StatusAgendamento',
  })
  status: StatusAgendamento;

  /**
   * Rótulo legível do status
   */
  @ApiProperty({
    description: 'Descrição legível do status',
    example: 'Agendado',
  })
  status_label: string;

  /**
   * Observações sobre o agendamento
   */
  @ApiPropertyOptional({
    description: 'Observações ou instruções especiais para a visita',
    example: 'Beneficiário prefere atendimento no período da manhã',
  })
  observacoes?: string;

  /**
   * Endereço onde será realizada a visita
   */
  @ApiProperty({
    description: 'Endereço completo onde a visita será realizada',
    example: 'Rua das Flores, 123, Apt 45 - Bairro Centro - Natal/RN',
  })
  endereco_visita: string;

  /**
   * Telefone de contato para a visita
   */
  @ApiPropertyOptional({
    description: 'Telefone de contato para agendamento/confirmação',
    example: '(84) 99999-9999',
  })
  telefone_contato?: string;

  /**
   * Indica se o beneficiário foi notificado
   */
  @ApiProperty({
    description: 'Indica se o beneficiário foi notificado sobre a visita',
    example: true,
  })
  notificar_beneficiario: boolean;

  /**
   * Motivo da visita
   */
  @ApiPropertyOptional({
    description: 'Motivo específico que gerou o agendamento',
    example: 'Acompanhamento de rotina - 3º mês de benefício',
  })
  motivo_visita?: string;

  /**
   * Indica se o agendamento está em atraso
   */
  @ApiProperty({
    description: 'Indica se a data agendada já passou sem realização',
    example: false,
  })
  em_atraso: boolean;

  /**
   * Dias de atraso (se aplicável)
   */
  @ApiPropertyOptional({
    description: 'Número de dias de atraso (se em_atraso for true)',
    example: 0,
  })
  dias_atraso?: number;

  /**
   * Prazo limite para realização
   */
  @ApiPropertyOptional({
    description: 'Data limite para realização da visita baseada na prioridade',
    example: '2025-01-25T23:59:59.999Z',
    type: 'string',
    format: 'date-time',
  })
  prazo_limite?: Date;

  /**
   * Dados da visita realizada (se houver)
   */
  @ApiPropertyOptional({
    description: 'Dados da visita domiciliar realizada (quando status for REALIZADO)',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      data_visita: { type: 'string', format: 'date-time' },
      resultado: { type: 'string' },
      beneficiario_presente: { type: 'boolean' },
      nota_avaliacao: { type: 'number' },
    },
    example: {
      id: '678e9012-e89b-12d3-a456-426614174005',
      data_visita: '2025-01-20T15:30:00.000Z',
      resultado: 'CONFORME',
      beneficiario_presente: true,
      nota_avaliacao: 8,
    },
  })
  visita_realizada?: {
    id: string;
    data_visita: string;
    resultado: string;
    beneficiario_presente: boolean;
    nota_avaliacao?: number;
  };

  /**
   * Data de criação do agendamento
   */
  @ApiProperty({
    description: 'Data e hora de criação do agendamento',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  created_at: Date;

  /**
   * Data da última atualização
   */
  @ApiProperty({
    description: 'Data e hora da última atualização do agendamento',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updated_at: Date;

  /**
   * Dados complementares
   */
  @ApiPropertyOptional({
    description: 'Dados complementares específicos do agendamento',
    example: {
      origem_agendamento: 'sistema_automatico',
      tentativas_contato: 1,
      observacoes_tecnicas: 'Primeira visita do beneficiário'
    },
  })
  dados_complementares?: Record<string, any>;
}