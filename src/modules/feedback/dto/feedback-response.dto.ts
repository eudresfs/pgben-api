import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { TipoFeedbackEnum, PrioridadeFeedbackEnum } from '../enums';
import { TagResponseDto } from './tag.dto';

/**
 * DTO para resposta de anexo do feedback
 */
export class FeedbackAnexoResponseDto {
  @ApiProperty({
    description: 'ID único do anexo',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'screenshot.png'
  })
  @Expose()
  nome_original: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'image/png'
  })
  @Expose()
  tipo_mime: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1024000
  })
  @Expose()
  tamanho: number;

  @ApiProperty({
    description: 'Tamanho formatado para exibição',
    example: '1.00 MB'
  })
  @Expose()
  @Transform(({ obj }) => {
    const bytes = obj.tamanho;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  })
  tamanho_formatado: string;

  @ApiPropertyOptional({
    description: 'URL pública para acesso ao arquivo',
    example: 'https://storage.example.com/feedbacks/anexos/550e8400-e29b-41d4-a716-446655440000.png'
  })
  @Expose()
  url_publica?: string;

  @ApiProperty({
    description: 'Indica se o arquivo está ativo/disponível',
    example: true
  })
  @Expose()
  ativo: boolean;

  @ApiProperty({
    description: 'Data e hora do upload do arquivo',
    example: '2024-01-15T10:30:00Z'
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Indica se o arquivo é uma imagem',
    example: true
  })
  @Expose()
  @Transform(({ obj }) => obj.tipo_mime?.startsWith('image/'))
  is_imagem: boolean;

  @ApiProperty({
    description: 'Indica se o arquivo é um vídeo',
    example: false
  })
  @Expose()
  @Transform(({ obj }) => obj.tipo_mime?.startsWith('video/'))
  is_video: boolean;

  @ApiProperty({
    description: 'Indica se o arquivo é um documento',
    example: false
  })
  @Expose()
  @Transform(({ obj }) => {
    const tiposDocumento = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    return tiposDocumento.includes(obj.tipo_mime);
  })
  is_documento: boolean;
}

/**
 * DTO para resposta de feedback completo
 */
export class FeedbackResponseDto {
  @ApiProperty({
    description: 'ID único do feedback',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Tipo do feedback',
    enum: TipoFeedbackEnum,
    example: TipoFeedbackEnum.SUGESTAO
  })
  @Expose()
  tipo: TipoFeedbackEnum;

  @ApiProperty({
    description: 'Label do tipo de feedback',
    example: 'Sugestão'
  })
  @Expose()
  tipo_label: string;

  @ApiProperty({
    description: 'Título do feedback',
    example: 'Sugestão para melhorar a interface'
  })
  @Expose()
  titulo: string;

  @ApiProperty({
    description: 'Descrição detalhada do feedback',
    example: 'Seria interessante adicionar um modo escuro para melhorar a experiência do usuário.'
  })
  @Expose()
  descricao: string;

  @ApiProperty({
    description: 'Prioridade do feedback',
    enum: PrioridadeFeedbackEnum,
    example: PrioridadeFeedbackEnum.ALTA
  })
  @Expose()
  prioridade: PrioridadeFeedbackEnum;

  @ApiProperty({
    description: 'Label da prioridade',
    example: 'Alta'
  })
  @Expose()
  prioridade_label: string;

  @ApiProperty({
    description: 'Cor da prioridade',
    example: '#fd7e14'
  })
  @Expose()
  prioridade_cor: string;

  @ApiPropertyOptional({
    description: 'Página ou seção do sistema onde o feedback foi gerado',
    example: '/dashboard/usuarios'
  })
  @Expose()
  pagina_origem?: string;

  @ApiPropertyOptional({
    description: 'Versão do sistema quando o feedback foi enviado',
    example: '1.2.3'
  })
  @Expose()
  versao_sistema?: string;

  @ApiProperty({
    description: 'Informações técnicas adicionais do feedback',
    example: 'Browser: Chrome 91.0, OS: Windows 10'
  })
  @Expose()
  informacoes_tecnicas: string;

  @ApiProperty({
    description: 'Endereço IP do usuário que enviou o feedback',
    example: '192.168.1.1'
  })
  @Expose()
  ip_origem: string;

  @ApiProperty({
    description: 'ID do usuário que respondeu ao feedback',
    example: 'uuid-do-usuario-admin',
    required: false
  })
  @Expose()
  respondido_por?: string;

  @ApiProperty({
    description: 'Indica se o feedback foi lido pela equipe',
    example: false
  })
  @Expose()
  lido: boolean;

  @ApiProperty({
    description: 'Indica se o feedback foi resolvido',
    example: false
  })
  @Expose()
  resolvido: boolean;

  @ApiPropertyOptional({
    description: 'Resposta da equipe ao feedback',
    example: 'Obrigado pela sugestão! Vamos avaliar a implementação do modo escuro.'
  })
  @Expose()
  resposta?: string;

  @ApiPropertyOptional({
    description: 'Data e hora da resposta ao feedback',
    example: '2024-01-16T14:30:00Z'
  })
  @Expose()
  data_resposta?: Date;

  @ApiProperty({
    description: 'Data e hora de criação do feedback',
    example: '2024-01-15T10:30:00Z'
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Data e hora da última atualização',
    example: '2024-01-15T10:30:00Z'
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'ID do usuário que enviou o feedback',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  usuario_id: string;

  @ApiProperty({
    description: 'Lista de anexos do feedback',
    type: [FeedbackAnexoResponseDto],
    isArray: true
  })
  @Expose()
  @Type(() => FeedbackAnexoResponseDto)
  anexos: FeedbackAnexoResponseDto[];

  @ApiProperty({
    description: 'Lista de tags associadas ao feedback',
    type: [TagResponseDto],
    isArray: true
  })
  @Expose()
  @Type(() => TagResponseDto)
  tags: TagResponseDto[];

  @ApiProperty({
    description: 'Quantidade total de anexos',
    example: 2
  })
  @Expose()
  @Transform(({ obj }) => obj.anexos?.length || 0)
  total_anexos: number;

  @ApiProperty({
    description: 'Quantidade total de tags',
    example: 3
  })
  @Expose()
  @Transform(({ obj }) => obj.tags?.length || 0)
  total_tags: number;
}

/**
 * DTO para resposta resumida de feedback (para listagens)
 */
export class FeedbackResumoResponseDto {
  @ApiProperty({
    description: 'ID único do feedback',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Tipo do feedback',
    enum: TipoFeedbackEnum,
    example: TipoFeedbackEnum.SUGESTAO
  })
  @Expose()
  tipo: TipoFeedbackEnum;

  @ApiProperty({
    description: 'Label do tipo de feedback',
    example: 'Sugestão'
  })
  @Expose()
  tipo_label: string;

  @ApiProperty({
    description: 'Título do feedback',
    example: 'Sugestão para melhorar a interface'
  })
  @Expose()
  titulo: string;

  @ApiProperty({
    description: 'Prioridade do feedback',
    enum: PrioridadeFeedbackEnum,
    example: PrioridadeFeedbackEnum.ALTA
  })
  @Expose()
  prioridade: PrioridadeFeedbackEnum;

  @ApiProperty({
    description: 'Label da prioridade',
    example: 'Alta'
  })
  @Expose()
  prioridade_label: string;

  @ApiProperty({
    description: 'Cor da prioridade',
    example: '#fd7e14'
  })
  @Expose()
  prioridade_cor: string;

  @ApiProperty({
    description: 'Indica se o feedback foi lido pela equipe',
    example: false
  })
  @Expose()
  lido: boolean;

  @ApiProperty({
    description: 'Indica se o feedback foi resolvido',
    example: false
  })
  @Expose()
  resolvido: boolean;

  @ApiProperty({
    description: 'Data e hora de criação do feedback',
    example: '2024-01-15T10:30:00Z'
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'ID do usuário que enviou o feedback',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  usuario_id: string;

  @ApiProperty({
    description: 'Quantidade total de anexos',
    example: 2
  })
  @Expose()
  @Transform(({ obj }) => obj.anexos?.length || 0)
  total_anexos: number;

  @ApiProperty({
    description: 'Quantidade total de tags',
    example: 3
  })
  @Expose()
  @Transform(({ obj }) => obj.tags?.length || 0)
  total_tags: number;
}