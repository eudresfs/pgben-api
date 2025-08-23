import { ApiProperty } from '@nestjs/swagger';
import { UsuarioComUnidadeResponseDto } from './usuario-response.dto';
import { StatusSolicitacao, TipoAcaoCritica, EstrategiaAprovacao } from '../../enums';
import { Status } from '../../../../enums/status.enum';

/**
 * DTO para resposta de ação de aprovação
 */
export class AcaoAprovacaoResponseDto {
  @ApiProperty({
    description: 'ID único da ação de aprovação',
    example: '953439e7-f3f8-4fa6-9c58-a5ab5208afa8'
  })
  id: string;

  @ApiProperty({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS
  })
  tipo_acao: TipoAcaoCritica;

  @ApiProperty({
    description: 'Nome da ação',
    example: 'Alteração de Dados Críticos'
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição da ação',
    example: 'Alteração de dados sensíveis como CPF, RG, dados bancários'
  })
  descricao: string;

  @ApiProperty({
    description: 'Estratégia de aprovação',
    enum: EstrategiaAprovacao,
    example: EstrategiaAprovacao.SIMPLES
  })
  estrategia: EstrategiaAprovacao;
}

/**
 * DTO para resposta de aprovador de solicitação
 */
export class SolicitacaoAprovadorResponseDto {
  @ApiProperty({
    description: 'ID único do aprovador',
    example: 'c68ffb91-fa9d-4a84-828a-a0eea096bef3'
  })
  id: string;

  @ApiProperty({
    description: 'ID do usuário aprovador',
    example: 'c11cd3dc-33b4-4664-9875-6f705f2c3c17'
  })
  usuario_id: string;

  @ApiProperty({
    description: 'Se foi aprovado (true), rejeitado (false) ou pendente (null)',
    example: true,
    nullable: true
  })
  aprovado: boolean | null;

  @ApiProperty({
    description: 'Justificativa da decisão',
    example: 'Aprovado conforme procedimentos',
    nullable: true
  })
  justificativa_decisao: string | null;

  @ApiProperty({
    description: 'Data da decisão',
    example: '2025-08-22T17:08:20.912Z',
    nullable: true
  })
  decidido_em: Date | null;

  @ApiProperty({
    description: 'Ordem de aprovação',
    example: 1,
    required: false
  })
  ordem_aprovacao?: number;

  @ApiProperty({
    description: 'Status do aprovador',
    enum: Status,
    example: Status.ATIVO,
    required: false
  })
  status?: Status;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-08-22T14:07:57.964Z',
    required: false
  })
  created_at?: Date;

  @ApiProperty({
    description: 'Dados do usuário aprovador',
    type: UsuarioComUnidadeResponseDto
  })
  usuario: UsuarioComUnidadeResponseDto;
}

/**
 * DTO para resposta de solicitação de aprovação
 */
export class SolicitacaoAprovacaoResponseDto {
  @ApiProperty({
    description: 'ID único da solicitação',
    example: 'd74162d4-2fad-4ae0-b80d-7fe85ffbc7c6'
  })
  id: string;

  @ApiProperty({
    description: 'Código único da solicitação',
    example: 'SOL-MEKBLL5P-5EE72S'
  })
  codigo: string;

  @ApiProperty({
    description: 'Status da solicitação',
    enum: StatusSolicitacao,
    example: StatusSolicitacao.EXECUTADA
  })
  status: StatusSolicitacao;

  @ApiProperty({
    description: 'ID do solicitante',
    example: 'd68c2993-645a-47a1-a94b-e4c1befc1332',
    required: false
  })
  solicitante_id?: string;

  @ApiProperty({
    description: 'Justificativa da solicitação',
    example: 'Solicitação de Reativação de benefício'
  })
  justificativa: string;

  @ApiProperty({
    description: 'Dados da ação a ser executada',
    example: {
      url: '/api/v1/concessoes/f8a53bf8-bb5c-487d-a570-2b506a8c1cc4/reativar',
      method: 'PATCH',
      body: { motivo: 'Finalização de processo administrativo' }
    }
  })
  dados_acao: Record<string, any>;

  @ApiProperty({
    description: 'Método de execução',
    example: 'PATCH /api/v1/concessoes/:id/reativar',
    required: false
  })
  metodo_execucao?: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-08-20T21:42:48.604Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2025-08-22T17:08:21.164Z',
    required: false
  })
  updated_at?: Date;

  @ApiProperty({
    description: 'Ação de aprovação associada',
    type: AcaoAprovacaoResponseDto
  })
  acao: AcaoAprovacaoResponseDto;

  @ApiProperty({
    description: 'Lista de aprovadores',
    type: [SolicitacaoAprovadorResponseDto]
  })
  aprovadores: SolicitacaoAprovadorResponseDto[];

  @ApiProperty({
    description: 'Dados do solicitante',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid-v4' },
      nome: { type: 'string', example: 'João Silva' },
      unidade: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid-v4' },
          nome: { type: 'string', example: 'Departamento de TI' }
        }
      }
    }
  })
  solicitante: {
    id: string;
    nome: string;
    unidade: {
      id: string;
      nome: string;
    };
  };
}

/**
 * DTO para resposta de lista de aprovações pendentes
 */
export class ListaAprovacoesPendentesResponseDto {
  @ApiProperty({
    description: 'Lista de solicitações pendentes',
    type: [SolicitacaoAprovacaoResponseDto]
  })
  solicitacoes: SolicitacaoAprovacaoResponseDto[];

  @ApiProperty({
    description: 'Total de registros',
    example: 25
  })
  total: number;

  @ApiProperty({
    description: 'Página atual',
    example: 1
  })
  pagina: number;

  @ApiProperty({
    description: 'Limite por página',
    example: 10
  })
  limite: number;
}