import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UnidadeResponseDto {
  @ApiProperty({ description: 'ID da unidade' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Nome da unidade' })
  @Expose()
  nome: string;

  @ApiProperty({ description: 'Código da unidade', required: false })
  @Expose()
  codigo?: string;

  @ApiProperty({ description: 'Endereço da unidade', required: false })
  @Expose()
  endereco?: string;

  @ApiProperty({ description: 'Telefone da unidade', required: false })
  @Expose()
  telefone?: string;
}
