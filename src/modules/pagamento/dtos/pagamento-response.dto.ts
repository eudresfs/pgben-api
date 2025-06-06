import { ApiProperty } from '@nestjs/swagger';
import { Transform, Expose } from 'class-transformer';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { DataMaskingUtil } from '../utils/data-masking.util';

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
    example: 'uuid',
  })
  id: string;

  /**
   * Referência à solicitação que originou o pagamento
   */
  @ApiProperty({
    description: 'ID da solicitação que originou o pagamento',
    example: 'uuid',
  })
  solicitacaoId: string;

  /**
   * Informações sobre a solicitação (quando incluídas)
   */
  @ApiProperty({
    description: 'Dados resumidos da solicitação',
    example: {
      numeroProcesso: 'string',
      cidadaoNome: 'string',
      tipoBeneficio: 'string',
      unidade: 'string',
    },
    required: false,
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
    example: 'uuid',
    required: false,
  })
  infoBancariaId?: string;

  /**
   * Informações bancárias com mascaramento de dados sensíveis
   */
  @ApiProperty({
    description: 'Dados bancários utilizados (com mascaramento)',
    example: {
      tipo: 'PIX',
      chavePix: '***@domain.com',
      banco: '001',
      agencia: '***123',
      conta: '****5678'
    },
    required: false,
  })
  @Transform(({ value, obj }) => {
    if (!value) return value;
    
    // Aplica mascaramento nos dados bancários sensíveis
    const maskedData = DataMaskingUtil.maskDadosBancarios({
      pixKey: value.chavePix,
      pixTipo: value.pixTipo,
      banco: value.banco, // Código do banco não é mascarado (informação pública)
      agencia: value.agencia,
      conta: value.conta
    });
    
    // Retorna o objeto completo com o campo 'tipo' preservado
    return {
      tipo: value.tipo,
      chavePix: maskedData.pixKey,
      pixTipo: maskedData.pixTipo,
      banco: maskedData.banco,
      agencia: maskedData.agencia,
      conta: maskedData.conta
    };
  })
  infoBancaria?: {
    tipo: string;
    chavePix?: string;
    pixTipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
    banco?: string;
    agencia?: string;
    conta?: string;
  };

  /**
   * Valor do pagamento
   */
  @ApiProperty({
    description: 'Valor do pagamento em reais',
    example: 250.0,
  })
  valor: number;

  /**
   * Data de liberação do pagamento
   */
  @ApiProperty({
    description: 'Data em que o pagamento foi liberado',
    example: '2025-05-18T10:00:00.000Z',
  })
  dataLiberacao: Date;

  /**
   * Status atual do pagamento
   */
  @ApiProperty({
    description: 'Status atual do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
  })
  status: StatusPagamentoEnum;

  /**
   * Método de pagamento utilizado
   */
  @ApiProperty({
    description: 'Método de pagamento utilizado',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
  })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Informações sobre o responsável pela liberação
   */
  @ApiProperty({
    description: 'Dados sobre quem liberou o pagamento',
    example: {
      id: 'uuid',
      nome: 'string',
      role: 'string',
    },
  })
  responsavelLiberacao: {
    id: string;
    nome: string;
    role: string;
  };

  /**
   * Quantidade de comprovantes anexados
   */
  @ApiProperty({
    description: 'Quantidade de comprovantes anexados',
    example: 2,
  })
  quantidadeComprovantes: number;

  /**
   * Informações sobre confirmação de recebimento (quando existente)
   */
  @ApiProperty({
    description: 'Dados da confirmação de recebimento',
    example: {
      id: 'uuid',
      dataConfirmacao: 'ISO 8601 date string',
      metodoConfirmacao: 'string',
      responsavel: {
        id: 'uuid',
        nome: 'string',
      },
    },
    required: false,
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
    example: 'string',
    required: false,
  })
  observacoes?: string;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do registro',
    example: 'ISO 8601 date string',
  })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: 'ISO 8601 date string',
  })
  updatedAt: Date;
}
