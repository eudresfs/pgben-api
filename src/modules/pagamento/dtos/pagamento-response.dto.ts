import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import {
  PagamentoResponseBaseDto,
  ResponsavelInfo,
  SolicitacaoResumo,
} from './base/pagamento-base.dto';

/**
 * DTO para resposta contendo dados de um pagamento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre um pagamento específico. Estende PagamentoResponseBaseDto
 * para reutilizar campos comuns.
 *
 * @author Equipe PGBen
 */
export class PagamentoResponseDto extends PagamentoResponseBaseDto {
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
    id: string;
    beneficiario: string;
    tipoBeneficio: any;
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
   * Informações bancárias (mascaramento aplicado via interceptor)
   */
  @ApiProperty({
    description: 'Dados bancários utilizados',
    example: {
      tipo: 'POUPANCA_SOCIAL',
      chavePix: 'user@domain.com',
      banco: '001',
      agencia: '12345',
      conta: '123456789',
    },
    required: false,
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
   * Data de liberação do pagamento
   */
  @ApiProperty({
    description: 'Data em que o pagamento foi liberado',
    example: '2025-05-18T10:00:00.000Z',
  })
  dataLiberacao: Date;

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
}
