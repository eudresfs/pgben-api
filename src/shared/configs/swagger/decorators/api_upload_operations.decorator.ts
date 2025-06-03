import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';
import {
  DocumentoResponseDto,
  UploadMultiploResponseDto,
  ApiErrorResponse,
  ValidationErrorResponse,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse
} from '../schemas';

/**
 * Decorator para operação de upload de documento único
 */
export function ApiUploadDocumento() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload de documento',
      description: 'Realiza o upload de um documento para o sistema. O arquivo deve ser enviado como multipart/form-data junto com os metadados do documento.',
      operationId: 'uploadDocumento'
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Dados do documento e arquivo para upload',
      schema: {
        type: 'object',
        properties: {
          tipoDocumento: {
            type: 'string',
            description: 'Tipo do documento',
            enum: [
              'CPF',
              'RG',
              'COMPROVANTE_RESIDENCIA',
              'COMPROVANTE_RENDA',
              'CERTIDAO_NASCIMENTO',
              'CERTIDAO_CASAMENTO',
              'DECLARACAO_MEDICA',
              'LAUDO_MEDICO',
              'COMPROVANTE_ESCOLARIDADE',
              'CARTEIRA_TRABALHO',
              'EXTRATO_BANCARIO',
              'CONTA_LUZ',
              'CONTA_AGUA',
              'IPTU',
              'CONTRATO_ALUGUEL',
              'DECLARACAO_ESCOLA',
              'OUTROS'
            ],
            example: 'COMPROVANTE_RENDA'
          },
          arquivo: {
            type: 'string',
            format: 'binary',
            description: 'Arquivo do documento (PDF, JPG, PNG)'
          },
          descricao: {
            type: 'string',
            description: 'Descrição adicional do documento',
            maxLength: 200,
            example: 'Comprovante de renda referente ao mês de janeiro/2025'
          },
          solicitacaoId: {
            type: 'string',
            description: 'ID da solicitação relacionada',
            example: '507f1f77bcf86cd799439013'
          },
          cidadaoId: {
            type: 'string',
            description: 'ID do cidadão proprietário',
            example: '507f1f77bcf86cd799439012'
          }
        },
        required: ['tipoDocumento', 'arquivo']
      }
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 201,
      description: 'Documento enviado com sucesso',
      type: DocumentoResponseDto
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos ou arquivo não suportado',
      type: ValidationErrorResponse
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 413,
      description: 'Arquivo muito grande (limite: 10MB)',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 415,
      description: 'Tipo de arquivo não suportado',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}

/**
 * Decorator para operação de upload múltiplo de documentos
 */
export function ApiUploadMultiplosDocumentos() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload múltiplo de documentos',
      description: 'Realiza o upload de múltiplos documentos de uma vez. Cada arquivo deve ser acompanhado de seus metadados correspondentes.',
      operationId: 'uploadMultiplosDocumentos'
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Array de documentos para upload',
      schema: {
        type: 'object',
        properties: {
          documentos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipoDocumento: {
                  type: 'string',
                  enum: [
                    'CPF',
                    'RG',
                    'COMPROVANTE_RESIDENCIA',
                    'COMPROVANTE_RENDA',
                    'CERTIDAO_NASCIMENTO',
                    'CERTIDAO_CASAMENTO',
                    'DECLARACAO_MEDICA',
                    'LAUDO_MEDICO',
                    'COMPROVANTE_ESCOLARIDADE',
                    'CARTEIRA_TRABALHO',
                    'EXTRATO_BANCARIO',
                    'CONTA_LUZ',
                    'CONTA_AGUA',
                    'IPTU',
                    'CONTRATO_ALUGUEL',
                    'DECLARACAO_ESCOLA',
                    'OUTROS'
                  ]
                },
                arquivo: {
                  type: 'string',
                  format: 'binary'
                },
                descricao: {
                  type: 'string',
                  maxLength: 200
                }
              },
              required: ['tipoDocumento', 'arquivo']
            }
          },
          solicitacaoId: {
            type: 'string',
            description: 'ID da solicitação relacionada',
            example: '507f1f77bcf86cd799439013'
          },
          cidadaoId: {
            type: 'string',
            description: 'ID do cidadão proprietário',
            example: '507f1f77bcf86cd799439012'
          }
        },
        required: ['documentos']
      }
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 201,
      description: 'Upload múltiplo processado (pode conter sucessos e falhas)',
      type: UploadMultiploResponseDto
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos ou nenhum arquivo válido enviado',
      type: ValidationErrorResponse
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}

/**
 * Decorator para operação de download de documento
 */
export function ApiDownloadDocumento() {
  return applyDecorators(
    ApiOperation({
      summary: 'Download de documento',
      description: 'Realiza o download de um documento específico. Retorna o arquivo binário com headers apropriados para download.',
      operationId: 'downloadDocumento'
    }),
    ApiParam({
      name: 'id',
      description: 'ID único do documento',
      type: 'string',
      example: '507f1f77bcf86cd799439015'
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Arquivo do documento',
      content: {
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        },
        'image/jpeg': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        },
        'image/png': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        }
      },
      headers: {
        'Content-Disposition': {
          description: 'Nome do arquivo para download',
          schema: {
            type: 'string',
            example: 'attachment; filename="documento.pdf"'
          }
        },
        'Content-Type': {
          description: 'Tipo MIME do arquivo',
          schema: {
            type: 'string',
            example: 'application/pdf'
          }
        },
        'Content-Length': {
          description: 'Tamanho do arquivo em bytes',
          schema: {
            type: 'integer',
            example: 2048576
          }
        }
      }
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para acessar este documento',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 404,
      description: 'Documento não encontrado',
      type: NotFoundErrorResponse
    }),
    ApiResponse({
      status: 410,
      description: 'Documento expirado ou removido',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}

/**
 * Decorator para operação de validação de documento
 */
export function ApiValidarDocumento() {
  return applyDecorators(
    ApiOperation({
      summary: 'Validar documento',
      description: 'Valida ou rejeita um documento enviado. Esta operação é restrita a usuários com perfil de analista ou superior.',
      operationId: 'validarDocumento'
    }),
    ApiParam({
      name: 'id',
      description: 'ID único do documento a ser validado',
      type: 'string',
      example: '507f1f77bcf86cd799439015'
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Documento validado com sucesso',
      type: DocumentoResponseDto
    }),
    ApiResponse({
      status: 400,
      description: 'Dados de validação inválidos',
      type: ValidationErrorResponse
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para validar documentos',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 404,
      description: 'Documento não encontrado',
      type: NotFoundErrorResponse
    }),
    ApiResponse({
      status: 409,
      description: 'Documento já foi validado anteriormente',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}

/**
 * Decorator para operação de listagem de documentos
 */
export function ApiListarDocumentos() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar documentos',
      description: 'Lista documentos com filtros opcionais. Suporta paginação e diversos critérios de busca.',
      operationId: 'listarDocumentos'
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Lista de documentos retornada com sucesso',
      schema: {
        allOf: [
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/DocumentoResponseDto' }
              }
            }
          },
          { $ref: '#/components/schemas/PaginatedResponse' }
        ]
      }
    }),
    ApiResponse({
      status: 400,
      description: 'Parâmetros de filtro inválidos',
      type: ValidationErrorResponse
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}

/**
 * Decorator para operação de exclusão de documento
 */
export function ApiExcluirDocumento() {
  return applyDecorators(
    ApiOperation({
      summary: 'Excluir documento',
      description: 'Remove um documento do sistema. Esta operação é irreversível e requer permissões especiais.',
      operationId: 'excluirDocumento'
    }),
    ApiParam({
      name: 'id',
      description: 'ID único do documento a ser excluído',
      type: 'string',
      example: '507f1f77bcf86cd799439015'
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 204,
      description: 'Documento excluído com sucesso'
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para excluir documentos',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 404,
      description: 'Documento não encontrado',
      type: NotFoundErrorResponse
    }),
    ApiResponse({
      status: 409,
      description: 'Documento não pode ser excluído (vinculado a solicitação aprovada)',
      type: ApiErrorResponse
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse
    })
  );
}