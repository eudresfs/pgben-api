import { ApiProperty } from '@nestjs/swagger';

/**
 * Validador para NIS/PIS/PASEP
 * 
 * Utilizado para documentar e validar campos de NIS na API
 */
export class NisValidator {
  @ApiProperty({
    description: 'NIS/PIS/PASEP válido no formato 00000000000 (apenas números)',
    example: '12345678901',
    pattern: '^[0-9]{11}$',
    minLength: 11,
    maxLength: 11,
  })
  nis: string;
}
