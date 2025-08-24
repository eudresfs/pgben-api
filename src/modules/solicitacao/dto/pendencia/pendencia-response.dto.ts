import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { StatusPendencia } from '../../../../entities/pendencia.entity';
import { BaseResponseDto } from '../../../../shared/dtos/base-response.dto';
import { UsuarioSafeResponseDto } from '../../../documento/dto/documento-response.dto';

/**
 * DTO de resposta para pendência
 *
 * Utilizado para retornar dados de uma pendência
 */
export class PendenciaResponseDto {
  @ApiProperty({
    description: 'ID único da pendência',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID da solicitação relacionada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  solicitacao_id: string;

  @ApiProperty({
    description: 'Descrição da pendência',
    example:
      'Comprovante de residência desatualizado - necessário documento com data dos últimos 3 meses',
  })
  @Expose()
  descricao: string;

  @ApiProperty({
    description: 'Status atual da pendência',
    enum: StatusPendencia,
    example: StatusPendencia.ABERTA,
  })
  @Expose()
  status: StatusPendencia;

  @ApiProperty({
    description: 'Usuário que registrou a pendência',
    type: UsuarioSafeResponseDto,
  })
  @Expose()
  @Type(() => UsuarioSafeResponseDto)
  registrado_por: UsuarioSafeResponseDto;

  @ApiPropertyOptional({
    description: 'Usuário que resolveu a pendência',
    type: UsuarioSafeResponseDto,
  })
  @Expose()
  @Type(() => UsuarioSafeResponseDto)
  resolvido_por?: UsuarioSafeResponseDto;

  @ApiPropertyOptional({
    description: 'Data de resolução da pendência',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => (value ? new Date(value).toISOString() : null))
  data_resolucao?: string;

  @ApiPropertyOptional({
    description: 'Observação sobre a resolução',
    example: 'Documento validado pelo técnico responsável',
  })
  @Expose()
  observacao_resolucao?: string;

  @ApiPropertyOptional({
    description: 'Prazo para resolução da pendência',
    example: '2024-12-31',
  })
  @Expose()
  @Transform(({ value }) =>
    value ? new Date(value).toISOString().split('T')[0] : null,
  )
  prazo_resolucao?: string;

  @ApiProperty({
    description: 'Data de criação da pendência',
    example: '2024-01-10T08:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => new Date(value).toISOString())
  created_at: string;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => new Date(value).toISOString())
  updated_at: string;

  @ApiPropertyOptional({
    description: 'Indica se a pendência está vencida',
    example: false,
  })
  @Expose()
  get esta_vencida(): boolean {
    if (!this.prazo_resolucao || this.status !== StatusPendencia.ABERTA) {
      return false;
    }
    const prazo = new Date(this.prazo_resolucao);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return prazo < hoje;
  }

  @ApiPropertyOptional({
    description:
      'Indica se a pendência está próxima do vencimento (próximos 7 dias)',
    example: true,
  })
  @Expose()
  get proxima_vencimento(): boolean {
    if (!this.prazo_resolucao || this.status !== StatusPendencia.ABERTA) {
      return false;
    }
    const prazo = new Date(this.prazo_resolucao);
    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);

    hoje.setHours(0, 0, 0, 0);
    seteDias.setHours(23, 59, 59, 999);

    return prazo >= hoje && prazo <= seteDias;
  }

  @ApiPropertyOptional({
    description: 'Dias restantes para o vencimento (negativo se vencida)',
    example: 5,
  })
  @Expose()
  get dias_para_vencimento(): number | null {
    if (!this.prazo_resolucao) {
      return null;
    }
    const prazo = new Date(this.prazo_resolucao);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    prazo.setHours(0, 0, 0, 0);

    const diffTime = prazo.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
