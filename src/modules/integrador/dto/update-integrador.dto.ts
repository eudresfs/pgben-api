import { PartialType } from '@nestjs/swagger';
import { CreateIntegradorDto } from './create-integrador.dto';

/**
 * DTO para atualização de um integrador.
 * Estende o DTO de criação, tornando todos os campos opcionais.
 */
export class UpdateIntegradorDto extends PartialType(CreateIntegradorDto) {}
