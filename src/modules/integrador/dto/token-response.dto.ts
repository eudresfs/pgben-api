import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegradorToken } from '../../../entities/integrador-token.entity';

/**
 * DTO para resposta padronizada de informações de token.
 * Não inclui o token em si, apenas metadados para gestão.
 */
export class TokenResponseDto {
  @ApiProperty({ description: 'Identificador único do token' })
  id: string;

  @ApiProperty({ description: 'ID do integrador a que pertence o token' })
  integradorId: string;

  @ApiProperty({ description: 'Nome do token' })
  nome: string;

  @ApiPropertyOptional({ description: 'Descrição do token' })
  descricao?: string;

  @ApiPropertyOptional({ description: 'Lista de escopos de permissão' })
  escopos?: string[];

  @ApiPropertyOptional({
    description: 'Data de expiração (null se não expira)',
  })
  dataExpiracao?: Date;

  @ApiProperty({ description: 'Indica se o token foi revogado' })
  revogado: boolean;

  @ApiPropertyOptional({ description: 'Data da revogação (se aplicável)' })
  dataRevogacao?: Date;

  @ApiPropertyOptional({ description: 'Motivo da revogação (se aplicável)' })
  motivoRevogacao?: string;

  @ApiPropertyOptional({ description: 'Data do último uso' })
  ultimoUso?: Date;

  @ApiProperty({ description: 'Data de criação do token' })
  dataCriacao: Date;

  constructor(token: IntegradorToken) {
    this.id = token.id;
    this.integradorId = token.integradorId;
    this.nome = token.nome;
    this.descricao = token.descricao;
    this.escopos = token.escopos;
    this.dataExpiracao = token.dataExpiracao;
    this.revogado = token.revogado;
    this.dataRevogacao = token.dataRevogacao;
    this.motivoRevogacao = token.motivoRevogacao;
    this.ultimoUso = token.ultimoUso;
    this.dataCriacao = token.dataCriacao;
  }
}
