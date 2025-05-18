import { ApiProperty } from '@nestjs/swagger';
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../enums/metodo-pagamento.enum';

/**
 * DTO para resposta contendo dados de um pagamento
 * 
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre um pagamento específico. Inclui mascaramento para
 * dados sensíveis.
 * 
 * @author Equipe PGBen
 */
export class PagamentoResponseDto {
  /**
   * Identificador único do pagamento
   */
  @ApiProperty({
    description: 'ID único do pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  /**
   * Referência à solicitação que originou o pagamento
   */
  @ApiProperty({
    description: 'ID da solicitação que originou o pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  solicitacaoId: string;

  /**
   * Informações sobre a solicitação (quando incluídas)
   */
  @ApiProperty({
    description: 'Dados resumidos da solicitação',
    example: {
      numeroProceso: '2025.123456',
      cidadaoNome: 'Maria Silva',
      tipoBeneficio: 'Auxílio Moradia',
      unidade: 'CRAS Centro'
    },
    required: false
  })
  solicitacao?: {
    numeroProcesso: string;
    cidadaoNome: string;
    tipoBeneficio: string;
    unidade: string;
  };

  /**
   * Referência à informação bancária utilizada
   */
  @ApiProperty({
    description: 'ID da informação bancária utilizada',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  infoBancariaId?: string;

  /**
   * Informações bancárias com mascaramento de dados sensíveis
   */
  @ApiProperty({
    description: 'Dados bancários utilizados (com mascaramento)',
    example: {
      tipo: 'pix',
      chavePix: 'c****@****.com',
      banco: 'Banco do Brasil'
    },
    required: false
  })
  infoBancaria?: {
    tipo: string;
    chavePix?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
  };

  /**
   * Valor do pagamento
   */
  @ApiProperty({
    description: 'Valor do pagamento em reais',
    example: 250.00
  })
  valor: number;

  /**
   * Data de liberação do pagamento
   */
  @ApiProperty({
    description: 'Data em que o pagamento foi liberado',
    example: '2025-05-18T10:00:00.000Z'
  })
  dataLiberacao: Date;

  /**
   * Status atual do pagamento
   */
  @ApiProperty({
    description: 'Status atual do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO
  })
  status: StatusPagamentoEnum;

  /**
   * Método de pagamento utilizado
   */
  @ApiProperty({
    description: 'Método de pagamento utilizado',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX
  })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Informações sobre o responsável pela liberação
   */
  @ApiProperty({
    description: 'Dados sobre quem liberou o pagamento',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      nome: 'João Silva',
      cargo: 'Técnico SEMTAS'
    }
  })
  responsavelLiberacao: {
    id: string;
    nome: string;
    cargo: string;
  };

  /**
   * Quantidade de comprovantes anexados
   */
  @ApiProperty({
    description: 'Quantidade de comprovantes anexados',
    example: 2
  })
  quantidadeComprovantes: number;

  /**
   * Informações sobre confirmação de recebimento (quando existente)
   */
  @ApiProperty({
    description: 'Dados da confirmação de recebimento',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      dataConfirmacao: '2025-05-20T14:30:00Z',
      metodoConfirmacao: 'assinatura',
      responsavel: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nome: 'Ana Souza'
      }
    },
    required: false
  })
  confirmacaoRecebimento?: {
    id: string;
    dataConfirmacao: Date;
    metodoConfirmacao: string;
    responsavel: {
      id: string;
      nome: string;
    };
    destinatario?: {
      id: string;
      nome: string;
    };
  };

  /**
   * Observações sobre o pagamento
   */
  @ApiProperty({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento referente ao benefício eventual de auxílio moradia.',
    required: false
  })
  observacoes?: string;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-05-18T10:00:00.000Z'
  })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2025-05-18T10:00:00.000Z'
  })
  updatedAt: Date;
}
