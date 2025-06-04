import { ApiProperty } from '@nestjs/swagger';
import { WorkflowAcaoEnum } from '../../../../enums';

/**
 * DTO para resposta com informações de uma etapa de workflow.
 */
export class WorkflowEtapaResponseDto {
  @ApiProperty({
    description: 'ID único da etapa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Indica se esta é a etapa inicial do workflow',
    example: true,
  })
  inicial?: boolean;
  @ApiProperty({
    description: 'Ordem da etapa no fluxo de trabalho',
    example: 1,
  })
  ordem: number;

  @ApiProperty({
    description: 'Descrição da etapa',
    example: 'Análise inicial da solicitação',
  })
  descricao: string;

  @ApiProperty({
    description: 'Informações do setor responsável pela etapa',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Setor de Análise Técnica',
    },
  })
  setor: {
    id: string;
    nome: string;
  };

  @ApiProperty({
    description: 'ID do setor responsável (usado para compatibilidade interna)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  setor_id: string;

  @ApiProperty({
    description: 'Tipo de ação a ser realizada nesta etapa',
    enum: WorkflowAcaoEnum,
    example: WorkflowAcaoEnum.ANALISE,
  })
  acao: WorkflowAcaoEnum;

  @ApiProperty({
    description: 'Prazo em horas para cumprimento da etapa (SLA)',
    example: 48,
  })
  prazo_sla: number;

  @ApiProperty({
    description: 'ID do template de notificação associado à etapa',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  template_notificacao_id?: string;

  @ApiProperty({
    description: 'Lista de IDs das próximas etapas possíveis',
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      'FIM',
    ],
    required: false,
  })
  proximas_etapas?: string[];
}

/**
 * DTO para resposta com informações de um workflow de benefício.
 */
export class WorkflowResponseDto {
  @ApiProperty({
    description: 'ID único do workflow',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Informações do tipo de benefício associado ao workflow',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Auxílio Natalidade',
    },
  })
  tipo_beneficio: {
    id: string;
    nome: string;
  };

  @ApiProperty({
    description: 'Nome do workflow',
    example: 'Fluxo de Aprovação do Auxílio Natalidade',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição detalhada do workflow',
    example: 'Processo de aprovação para solicitações de Auxílio Natalidade',
  })
  descricao: string;

  @ApiProperty({
    description: 'Lista de etapas do workflow',
    type: [WorkflowEtapaResponseDto],
  })
  etapas: WorkflowEtapaResponseDto[];

  @ApiProperty({
    description: 'Status ativo/inativo do workflow',
    example: true,
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Data de criação do workflow',
    example: '2025-05-18T20:10:30.123Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização do workflow',
    example: '2025-05-18T20:15:45.678Z',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Usuário que realizou a última atualização',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Administrador',
    },
  })
  updated_by: {
    id: string;
    nome: string;
  };
}
