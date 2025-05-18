import { ApiProperty } from '@nestjs/swagger';

/**
 * Validador para CPF
 * 
 * Utilizado para documentar e validar campos de CPF na API
 */
export class CpfValidator {
  @ApiProperty({
    description: 'CPF válido no formato 00000000000 (apenas números)',
    example: '12345678900',
    pattern: '^[0-9]{11}$',
    minLength: 11,
    maxLength: 11,
  })
  cpf: string;
}
