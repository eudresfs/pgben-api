import { ApiProperty } from '@nestjs/swagger';
import { PagamentoResponseBaseDto } from './base/pagamento-base.dto';

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
  solicitacao_id: string;

  /**
   * Informações sobre a solicitação (quando incluídas)
   */
  @ApiProperty({
    description: 'Dados resumidos da solicitação',
    example: {
      id: 'uuid',
      beneficiario: 'João Silva',
      tipo_beneficio: {
        id: 'uuid',
        nome: 'Auxílio Emergencial',
      },
      unidade: {
        id: 'uuid',
        nome: 'CRAS Centro',
      },
      tecnico: {
        id: 'uuid',
        nome: 'Maria Santos',
      },
    },
    required: false,
  })
  solicitacao?: {
    id: string;
    beneficiario: string;
    tipo_beneficio: {
      id: string;
      nome: string;
    };
    unidade: {
      id: string;
      nome: string;
    };
    tecnico: {
      id: string;
      nome: string;
    };
  };

  /**
   * Referência à informação bancária utilizada
   */
  @ApiProperty({
    description: 'ID da informação bancária utilizada',
    example: 'uuid',
    required: false,
  })
  info_bancaria_id?: string;

  /**
   * Informações bancárias (mascaramento aplicado via interceptor)
   */
  @ApiProperty({
    description: 'Dados bancários utilizados',
    example: {
      tipo: 'POUPANCA_SOCIAL',
      chave_pix: 'user@domain.com',
      pix_tipo: 'EMAIL',
      banco: '001',
      agencia: '12345',
      conta: '123456789',
    },
    required: false,
  })
  info_bancaria?: {
    tipo: string;
    chave_pix?: string;
    pix_tipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
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
  data_liberacao: Date;

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
  responsavel_liberacao: {
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
  quantidade_comprovantes: number;

  /**
   * Informações sobre confirmação de recebimento (quando existente)
   */
  @ApiProperty({
    description: 'Dados da confirmação de recebimento',
    example: {
      id: 'uuid',
      data_confirmacao: 'ISO 8601 date string',
      metodo_confirmacao: 'string',
      responsavel: {
        id: 'uuid',
        nome: 'string',
      },
    },
    required: false,
  })
  confirmacao_recebimento?: {
    id: string;
    data_confirmacao: Date;
    metodo_confirmacao: string;
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
