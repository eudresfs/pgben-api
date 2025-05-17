import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { IsCEP } from '../validators/br-validators';
import { BaseDto } from './base.dto';
import { CREATE, UPDATE } from '../validators/validation-groups';

/**
 * DTO para endereço
 *
 * Contém todos os campos necessários para registrar um endereço completo,
 * com validações específicas para o formato brasileiro.
 */
export class EnderecoDto extends BaseDto {
  @IsString({
    message: 'Logradouro deve ser uma string',
    groups: [CREATE, UPDATE],
  })
  @IsNotEmpty({ message: 'Logradouro é obrigatório', groups: [CREATE] })
  @ApiProperty({
    example: 'Rua das Flores',
    description: 'Logradouro do endereço',
  })
  logradouro: string;

  @IsString({ message: 'Número deve ser uma string', groups: [CREATE, UPDATE] })
  @IsNotEmpty({ message: 'Número é obrigatório', groups: [CREATE] })
  @ApiProperty({
    example: '123',
    description: 'Número do endereço',
  })
  numero: string;

  @IsString({
    message: 'Complemento deve ser uma string',
    groups: [CREATE, UPDATE],
  })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Apto 101',
    description: 'Complemento do endereço',
    required: false,
  })
  complemento?: string;

  @IsString({ message: 'Bairro deve ser uma string', groups: [CREATE, UPDATE] })
  @IsNotEmpty({ message: 'Bairro é obrigatório', groups: [CREATE] })
  @ApiProperty({
    example: 'Centro',
    description: 'Bairro do endereço',
  })
  bairro: string;

  @IsString({ message: 'Cidade deve ser uma string', groups: [CREATE, UPDATE] })
  @IsNotEmpty({ message: 'Cidade é obrigatória', groups: [CREATE] })
  @ApiProperty({
    example: 'Natal',
    description: 'Cidade do endereço',
  })
  cidade: string;

  @IsString({ message: 'Estado deve ser uma string', groups: [CREATE, UPDATE] })
  @IsNotEmpty({ message: 'Estado é obrigatório', groups: [CREATE] })
  @ApiProperty({
    example: 'RN',
    description: 'Estado do endereço (sigla)',
  })
  estado: string;

  @IsCEP({ message: 'CEP inválido', groups: [CREATE, UPDATE] })
  @IsString({ message: 'CEP deve ser uma string', groups: [CREATE, UPDATE] })
  @IsNotEmpty({ message: 'CEP é obrigatório', groups: [CREATE] })
  @ApiProperty({
    example: '59000-000',
    description: 'CEP do endereço',
  })
  cep: string;

  /**
   * Verifica se o endereço está completo
   *
   * @returns true se todos os campos obrigatórios estão preenchidos
   */
  isCompleto(): boolean {
    return !!(
      this.logradouro &&
      this.numero &&
      this.bairro &&
      this.cidade &&
      this.estado &&
      this.cep
    );
  }

  /**
   * Retorna o endereço formatado como string
   *
   * @returns Endereço formatado
   */
  toString(): string {
    let endereco = `${this.logradouro}, ${this.numero}`;

    if (this.complemento) {
      endereco += ` - ${this.complemento}`;
    }

    endereco += ` - ${this.bairro}, ${this.cidade} - ${this.estado}, ${this.cep}`;

    return endereco;
  }
}
