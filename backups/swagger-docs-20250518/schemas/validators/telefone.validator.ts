import { ApiProperty } from '@nestjs/swagger';

/**
 * Validador para Telefone
 * 
 * Utilizado para documentar e validar campos de telefone na API
 */
export class TelefoneValidator {
  @ApiProperty({
    description: 'Telefone válido no formato (DDD) 00000-0000',
    example: '(84) 98765-4321',
    pattern: '^\\([0-9]{2}\\) [0-9]{5}-[0-9]{4}$',
  })
  telefone: string;
}
