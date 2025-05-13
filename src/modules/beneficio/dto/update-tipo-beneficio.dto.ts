import { PartialType } from '@nestjs/swagger';
import { CreateTipoBeneficioDto } from './create-tipo-beneficio.dto';

/**
 * DTO para atualização de tipo de benefício
 * 
 * Estende o DTO de criação, tornando todos os campos opcionais
 */
export class UpdateTipoBeneficioDto extends PartialType(CreateTipoBeneficioDto) {}
