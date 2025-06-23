import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadSessionStatus } from '../entities/upload-session.entity';
import { UploadTokenResponseDto } from './upload-token-response.dto';

/**
 * DTO de resposta para status da sessão
 */
export class SessionStatusResponseDto {
  @ApiProperty({
    description: 'ID da sessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  session_id: string;

  @ApiProperty({
    description: 'Status atual da sessão',
    enum: UploadSessionStatus,
    example: UploadSessionStatus.ATIVA,
  })
  status: UploadSessionStatus;

  @ApiProperty({
    description: 'Se a sessão está ativa',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Progresso atual em porcentagem',
    example: 75,
  })
  progress_percentage: number;

  @ApiProperty({
    description: 'Arquivos enviados vs total permitido',
    example: '3/5',
  })
  files_status: string;

  @ApiProperty({
    description: 'Tamanho total formatado',
    example: '2.5 MB',
  })
  total_size_formatted: string;

  @ApiProperty({
    description: 'Duração da sessão em minutos',
    example: 15,
  })
  duration_minutes: number;

  @ApiPropertyOptional({
    description: 'Tempo restante estimado em minutos',
    example: 45,
  })
  time_remaining_minutes?: number;

  @ApiPropertyOptional({
    description: 'Mensagem de status',
    example: 'Upload em andamento - 3 de 5 arquivos enviados',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Próximas ações disponíveis',
    example: ['upload_file', 'complete_session', 'cancel_session'],
  })
  available_actions?: string[];

  @ApiPropertyOptional({
    description: 'Token associado à sessão',
    type: () => UploadTokenResponseDto,
  })
  token?: UploadTokenResponseDto;
}
