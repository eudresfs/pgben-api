import { ApiProperty } from '@nestjs/swagger';

/**
 * Validador para CEP
 * 
 * Utilizado para documentar e validar campos de CEP na API
 */
export class CepValidator {
  @ApiProperty({
    description: 'CEP válido no formato 00000-000',
    example: '59000-000',
    pattern: '^[0-9]{5}-[0-9]{3}$',
  })
  cep: string;
}
