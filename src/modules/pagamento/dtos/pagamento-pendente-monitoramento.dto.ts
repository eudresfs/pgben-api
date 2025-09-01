import { ApiProperty } from '@nestjs/swagger';
import { TipoVisita } from '../../../enums';

/**
 * DTO para dados do pagamento em resposta de pendentes de monitoramento
 */
export class DadosPagamentoDto {
  @ApiProperty({
    description: 'ID do pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Valor do pagamento',
    example: 500.00,
  })
  valor: number;

  @ApiProperty({
    description: 'Número da parcela atual',
    example: 1,
  })
  parcela: number;

  @ApiProperty({
    description: 'Total de parcelas',
    example: 12,
  })
  total_parcelas: number;

  @ApiProperty({
    description: 'Data do pagamento',
    example: '2025-01-15',
  })
  data: string;
}

/**
 * DTO para dados do beneficiário em resposta de pendentes de monitoramento
 */
export class BeneficiarioDto {
  @ApiProperty({
    description: 'Nome do beneficiário',
    example: 'Maria Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'CPF do beneficiário',
    example: '123.456.789-00',
  })
  cpf: string;

  @ApiProperty({
    description: 'Bairro do beneficiário',
    example: 'Centro',
  })
  bairro: string;
}

/**
 * DTO para dados da solicitação em resposta de pendentes de monitoramento
 */
export class SolicitacaoDto {
  @ApiProperty({
    description: 'Nome da unidade',
    example: 'Unidade Norte',
  })
  unidade: string;

  @ApiProperty({
    description: 'Nome do técnico responsável',
    example: 'João Souza',
  })
  tecnico: string;
}

/**
 * DTO de resposta para pagamentos pendentes de monitoramento
 */
export class PagamentoPendenteMonitoramentoDto {
  @ApiProperty({
    description: 'ID do pagamento',
    example: 12345,
  })
  pagamento_id: string;

  @ApiProperty({
    description: 'Dados do pagamento',
    type: DadosPagamentoDto,
  })
  dados_pagamento: DadosPagamentoDto;

  @ApiProperty({
    description: 'Dados do beneficiário',
    type: BeneficiarioDto,
  })
  beneficiario: BeneficiarioDto;

  @ApiProperty({
    description: 'Dados da solicitação',
    type: SolicitacaoDto,
  })
  solicitacao: SolicitacaoDto;

  @ApiProperty({
    description: 'Tipo de visita calculado baseado na parcela',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  tipo_visita: TipoVisita;
}