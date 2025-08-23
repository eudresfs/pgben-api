import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta de usuário com apenas campos essenciais
 * Evita exposição de dados sigilosos como senhaHash, cpf, etc.
 */
export class UsuarioResponseDto {
  @ApiProperty({
    description: 'ID único do usuário',
    example: 'c11cd3dc-33b4-4664-9875-6f705f2c3c17'
  })
  id: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva'
  })
  nome: string;
}

/**
 * DTO para resposta de unidade com apenas campos essenciais
 */
export class UnidadeResponseDto {
  @ApiProperty({
    description: 'ID único da unidade',
    example: '98dc3294-eca3-4b6e-aa3c-c61baca4cb63'
  })
  id: string;

  @ApiProperty({
    description: 'Nome da unidade',
    example: 'Secretaria Municipal'
  })
  nome: string;
}

/**
 * DTO para resposta de usuário com unidade
 */
export class UsuarioComUnidadeResponseDto extends UsuarioResponseDto {
  @ApiProperty({
    description: 'Unidade do usuário',
    type: UnidadeResponseDto
  })
  unidade: UnidadeResponseDto;
}