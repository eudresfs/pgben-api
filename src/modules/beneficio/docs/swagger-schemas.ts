import { ApiProperty } from '@nestjs/swagger';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';

/**
 * Schemas Swagger específicos para documentação conforme SUAS
 * 
 * Baseado na Lei nº 8.742/1993 (LOAS) e regulamentações do CNAS:
 * - Resolução CNAS nº 212/2006 (Benefícios Eventuais)
 * - Resolução CNAS nº 33/2012 (Tipificação Nacional de Serviços Socioassistenciais)
 * - NOB-SUAS/2012 (Norma Operacional Básica do SUAS)
 */

export class DocumentoComprobatorioSwaggerSchema {
  @ApiProperty({
    description: 'Tipo do documento comprobatório conforme classificação SUAS',
    enum: TipoDocumentoComprobatorio,
    example: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
    enumName: 'TipoDocumentoComprobatorio',
  })
  tipo: TipoDocumentoComprobatorio;

  @ApiProperty({
    description: 'Descrição detalhada do documento para identificação técnica',
    example: 'Carteira de trabalho assinada comprovando vínculo empregatício formal',
    minLength: 10,
    maxLength: 500,
  })
  descricao: string;

  @ApiProperty({
    description: 'Nome do arquivo digital do documento',
    example: 'carteira_trabalho_joao_silva.pdf',
    pattern: '^[a-zA-Z0-9_.-]+\\.(pdf|jpg|jpeg|png)$',
  })
  arquivo: string;
}

export class CreateResultadoBeneficioCessadoSwaggerSchema {
  @ApiProperty({
    description: 'ID único da concessão de benefício que foi cessada',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  concessaoId: string;

  @ApiProperty({
    description: `Motivo técnico do encerramento do benefício conforme LOAS.
    
    **Classificação SUAS:**
    - SUPERACAO_VULNERABILIDADE: Família superou situação de vulnerabilidade
    - MUDANCA_TERRITORIO: Mudança para território fora da abrangência
    - OBITO_BENEFICIARIO: Óbito do beneficiário principal
    - DESCUMPRIMENTO_CONDICIONALIDADES: Não cumprimento das contrapartidas
    - AGRAVAMENTO_SITUACAO: Agravamento que requer outro tipo de intervenção
    - ALTERACAO_RENDA_FAMILIAR: Alteração na composição/renda familiar
    - OUTROS: Outros motivos devidamente justificados`,
    enum: MotivoEncerramentoBeneficio,
    example: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    enumName: 'MotivoEncerramentoBeneficio',
  })
  motivoEncerramento: MotivoEncerramentoBeneficio;

  @ApiProperty({
    description: `Status atual da vulnerabilidade familiar conforme avaliação técnica.
    
    **Classificação SUAS:**
    - SUPERADA: Vulnerabilidade completamente superada
    - EM_SUPERACAO: Em processo de superação, com melhorias evidentes
    - MANTIDA: Vulnerabilidade mantida no mesmo nível
    - AGRAVADA: Vulnerabilidade agravada, necessita intervenção
    - TRANSFERIDA: Responsabilidade transferida para outro território/serviço
    - TEMPORARIAMENTE_RESOLVIDA: Situação resolvida temporariamente
    - NECESSITA_REAVALIACAO: Requer nova avaliação técnica especializada
    - NAO_APLICAVEL: Não se aplica (ex: casos de óbito)`,
    enum: StatusVulnerabilidade,
    example: StatusVulnerabilidade.SUPERADA,
    enumName: 'StatusVulnerabilidade',
  })
  statusVulnerabilidade: StatusVulnerabilidade;

  @ApiProperty({
    description: `Observações técnicas detalhadas sobre o encerramento.
    
    **Requisitos SUAS:**
    - Mínimo 10 caracteres para garantir informação substantiva
    - Para superação: mínimo 50 caracteres com detalhamento
    - Para descumprimento: deve mencionar tentativas de acompanhamento
    - Para reavaliação: deve justificar necessidade de nova análise
    - Para agravamento: deve descrever o agravamento observado`,
    example: 'Família conseguiu emprego formal com carteira assinada, aumentando significativamente a renda familiar (de R$ 200 para R$ 1.400). Superação confirmada através de acompanhamento técnico e documentação comprobatória.',
    minLength: 10,
    maxLength: 2000,
  })
  observacoesTecnicas: string;

  @ApiProperty({
    description: `Documentos comprobatórios obrigatórios conforme motivo de encerramento.
    
    **Documentos obrigatórios por motivo:**
    
    **SUPERACAO_VULNERABILIDADE:**
    - Comprovante de renda (obrigatório)
    - Fotografia (obrigatório)
    
    **MUDANCA_TERRITORIO:**
    - Comprovante de residência (obrigatório)
    - Fotografia (obrigatório)
    
    **OBITO_BENEFICIARIO:**
    - Certidão de óbito OU Atestado médico (obrigatório)
    
    **DESCUMPRIMENTO_CONDICIONALIDADES:**
    - Relatório técnico (obrigatório)
    - Fotografia (obrigatório)
    
    **ALTERACAO_RENDA_FAMILIAR:**
    - Comprovante de renda OU Declaração de renda (obrigatório)`,
    type: [DocumentoComprobatorioSwaggerSchema],
    minItems: 1,
    maxItems: 10,
  })
  documentosComprobatorios: DocumentoComprobatorioSwaggerSchema[];
}

export class ResultadoBeneficioCessadoResponseSwaggerSchema {
  @ApiProperty({
    description: 'ID único do resultado registrado',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'ID da concessão relacionada',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  concessaoId: string;

  @ApiProperty({
    description: 'Motivo do encerramento conforme classificação SUAS',
    enum: MotivoEncerramentoBeneficio,
    example: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
  })
  motivoEncerramento: MotivoEncerramentoBeneficio;

  @ApiProperty({
    description: 'Status da vulnerabilidade conforme avaliação técnica',
    enum: StatusVulnerabilidade,
    example: StatusVulnerabilidade.SUPERADA,
  })
  statusVulnerabilidade: StatusVulnerabilidade;

  @ApiProperty({
    description: 'Observações técnicas registradas',
    example: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
  })
  observacoesTecnicas: string;

  @ApiProperty({
    description: 'ID do técnico responsável pelo registro',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  tecnicoResponsavelId: string;

  @ApiProperty({
    description: 'Data e hora do registro',
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
  })
  dataRegistro: Date;

  @ApiProperty({
    description: 'Dados da concessão relacionada',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: { type: 'string' },
      beneficiario: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
        },
      },
    },
  })
  concessao: any;

  @ApiProperty({
    description: 'Dados do técnico responsável',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      nome: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
  })
  tecnicoResponsavel: any;

  @ApiProperty({
    description: 'Lista de documentos comprobatórios anexados',
    type: [DocumentoComprobatorioSwaggerSchema],
  })
  documentosComprobatorios: DocumentoComprobatorioSwaggerSchema[];
}

export class ListagemResultadosSwaggerSchema {
  @ApiProperty({
    description: 'Lista de resultados encontrados',
    type: [ResultadoBeneficioCessadoResponseSwaggerSchema],
  })
  resultados: ResultadoBeneficioCessadoResponseSwaggerSchema[];

  @ApiProperty({
    description: 'Total de registros encontrados (para paginação)',
    example: 150,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Página atual da listagem',
    example: 1,
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Quantidade de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  limit: number;
}

export class ErroValidacaoSUASSwaggerSchema {
  @ApiProperty({
    description: 'Código HTTP do erro',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro específica conforme validações SUAS',
    examples: [
      'Combinação inválida: motivo "SUPERACAO_VULNERABILIDADE" não é compatível com status "AGRAVADA"',
      'Para superação de vulnerabilidade são obrigatórios: Comprovante de renda, Fotografia',
      'Para descumprimento, observações devem mencionar tentativas de acompanhamento',
      'Status "Necessita Reavaliação" requer justificativa nas observações',
    ],
  })
  message: string;

  @ApiProperty({
    description: 'Tipo do erro',
    example: 'Bad Request',
  })
  error: string;
}

export class ErroPermissaoSUASSwaggerSchema {
  @ApiProperty({
    description: 'Código HTTP do erro',
    example: 403,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro de permissão',
    examples: [
      'Usuário não possui permissão para registrar resultados',
      'Acesso negado: usuário não tem competência territorial para esta concessão',
      'Perfil insuficiente: apenas técnicos sociais, coordenadores e gestores podem registrar resultados',
    ],
  })
  message: string;

  @ApiProperty({
    description: 'Tipo do erro',
    example: 'Forbidden',
  })
  error: string;
}