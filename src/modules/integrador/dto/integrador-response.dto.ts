import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Integrador } from '../../../entities/integrador.entity';

/**
 * DTO para resposta padronizada de informações de integrador.
 */
export class IntegradorResponseDto {
  @ApiProperty({ description: 'Identificador único do integrador' })
  id: string;

  @ApiProperty({ description: 'Nome do integrador' })
  nome: string;

  @ApiPropertyOptional({ description: 'Descrição do integrador' })
  descricao?: string;

  @ApiPropertyOptional({ description: 'Nome do responsável pelo integrador' })
  responsavel?: string;

  @ApiPropertyOptional({ description: 'Email de contato do responsável' })
  emailContato?: string;

  @ApiPropertyOptional({ description: 'Telefone de contato do responsável' })
  telefoneContato?: string;

  @ApiProperty({ description: 'Status de ativação do integrador' })
  ativo: boolean;

  @ApiPropertyOptional({ description: 'Lista de permissões de escopo disponíveis' })
  permissoesEscopo?: string[];

  @ApiPropertyOptional({ description: 'Lista de endereços IP permitidos' })
  ipPermitidos?: string[];

  @ApiPropertyOptional({ description: 'Data do último acesso' })
  ultimoAcesso?: Date;

  @ApiProperty({ description: 'Data de criação do registro' })
  dataCriacao: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  dataAtualizacao: Date;

  constructor(integrador: Integrador) {
    this.id = integrador.id;
    this.nome = integrador.nome;
    this.descricao = integrador.descricao;
    this.responsavel = integrador.responsavel;
    this.emailContato = integrador.emailContato;
    this.telefoneContato = integrador.telefoneContato;
    this.ativo = integrador.ativo;
    this.permissoesEscopo = integrador.permissoesEscopo;
    this.ipPermitidos = integrador.ipPermitidos;
    this.ultimoAcesso = integrador.ultimoAcesso;
    this.dataCriacao = integrador.dataCriacao;
    this.dataAtualizacao = integrador.dataAtualizacao;
  }
}
