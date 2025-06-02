import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class InvalidateUserTokensDto {
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}