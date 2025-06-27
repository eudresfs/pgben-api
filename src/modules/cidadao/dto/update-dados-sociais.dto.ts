import { PartialType } from '@nestjs/swagger';
import { CreateDadosSociaisDto } from './create-dados-sociais.dto';

export class UpdateDadosSociaisDto extends PartialType(CreateDadosSociaisDto) {}