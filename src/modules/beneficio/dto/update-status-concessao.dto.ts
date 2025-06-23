import { IsEnum } from 'class-validator';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

export class UpdateStatusConcessaoDto {
  @IsEnum(StatusConcessao)
  status: StatusConcessao;
}
