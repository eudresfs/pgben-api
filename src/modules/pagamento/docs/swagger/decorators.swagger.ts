import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  getSchemaPath,
  ApiConsumes,
  ApiOkResponse,
} from '@nestjs/swagger';
import { StatusPagamentoEnum } from '../../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../../enums/metodo-pagamento.enum';

/**
 * Decoradores personalizados para documentação Swagger
 *
 * Define decoradores reutilizáveis para padronizar a documentação
 * das operações da API do módulo de pagamento.
 *
 * @author Equipe PGBen
 */

/**
 * Decorator para endpoints de listagem paginada
 * @param model Modelo de resposta
 * @param description Descrição da operação
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string,
) => {
  return applyDecorators(
    ApiOperation({ summary: description }),
    ApiOkResponse({
      description: 'Lista paginada obtida com sucesso',
      schema: {
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          total: {
            type: 'number',
            example: 42,
            description: 'Total de registros encontrados',
          },
          page: {
            type: 'number',
            example: 1,
            description: 'Número da página atual',
          },
          limit: {
            type: 'number',
            example: 10,
            description: 'Limite de itens por página',
          },
        },
      },
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Número da página para paginação',
      schema: {
        type: 'number',
        minimum: 1,
        default: 1,
      },
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Limite de itens por página',
      schema: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    }),
  );
};

/**
 * Decorator para endpoints de listagem de pagamentos
 */
export const ApiListarPagamentos = () => {
  return applyDecorators(
    ApiPaginatedResponse(Object, 'Listar pagamentos'),
    ApiQuery({
      name: 'status',
      required: false,
      description: 'Filtrar por status do pagamento',
      enum: StatusPagamentoEnum,
    }),
    ApiQuery({
      name: 'metodoPagamento',
      required: false,
      description: 'Filtrar por método de pagamento',
      enum: MetodoPagamentoEnum,
    }),
    ApiQuery({
      name: 'solicitacaoId',
      required: false,
      description: 'Filtrar por ID da solicitação',
      type: String,
    }),
    ApiQuery({
      name: 'unidadeId',
      required: false,
      description: 'Filtrar por ID da unidade',
      type: String,
    }),
    ApiQuery({
      name: 'cidadaoId',
      required: false,
      description: 'Filtrar por ID do cidadão',
      type: String,
    }),
    ApiQuery({
      name: 'dataLiberacaoInicio',
      required: false,
      description: 'Filtrar por data inicial de liberação',
      type: Date,
    }),
    ApiQuery({
      name: 'dataLiberacaoFim',
      required: false,
      description: 'Filtrar por data final de liberação',
      type: Date,
    }),
    ApiResponse({
      status: 200,
      description: 'Lista paginada de pagamentos obtida com sucesso',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de criação de pagamento
 */
export const ApiCriarPagamento = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Criar novo pagamento' }),
    ApiParam({
      name: 'solicitacaoId',
      required: true,
      description: 'ID da solicitação para a qual o pagamento será criado',
      type: String,
    }),
    ApiBody({
      description: 'Dados para criação do pagamento',
      required: true,
    }),
    ApiResponse({
      status: 201,
      description: 'Pagamento criado com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Solicitação não encontrada',
    }),
    ApiResponse({
      status: 409,
      description: 'Conflito - Solicitação não elegível para pagamento',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de detalhes de pagamento
 */
export const ApiDetalhesPagamento = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Obter detalhes de um pagamento' }),
    ApiParam({
      name: 'id',
      required: true,
      description: 'ID do pagamento',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Detalhes do pagamento obtidos com sucesso',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de atualização de status de pagamento
 */
export const ApiAtualizarStatusPagamento = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Atualizar status de um pagamento' }),
    ApiParam({
      name: 'id',
      required: true,
      description: 'ID do pagamento',
      type: String,
    }),
    ApiBody({
      description: 'Dados para atualização do status',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Status do pagamento atualizado com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 409,
      description: 'Conflito - Transição de status não permitida',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de cancelamento de pagamento
 */
export const ApiCancelarPagamento = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Cancelar um pagamento' }),
    ApiParam({
      name: 'id',
      required: true,
      description: 'ID do pagamento',
      type: String,
    }),
    ApiBody({
      description: 'Dados para cancelamento do pagamento',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Pagamento cancelado com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 409,
      description: 'Conflito - Cancelamento não permitido para o status atual',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de upload de comprovante
 */
export const ApiUploadComprovante = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Enviar comprovante de pagamento' }),
    ApiConsumes('multipart/form-data'),
    ApiParam({
      name: 'pagamentoId',
      required: true,
      description: 'ID do pagamento',
      type: String,
    }),
    ApiBody({
      description: 'Arquivo do comprovante',
      required: true,
      schema: {
        type: 'object',
        properties: {
          arquivo: {
            type: 'string',
            format: 'binary',
            description: 'Arquivo do comprovante (PDF, JPG, PNG)',
          },
          descricao: {
            type: 'string',
            description: 'Descrição do comprovante',
          },
        },
        required: ['arquivo'],
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Comprovante enviado com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos ou arquivo não suportado',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 413,
      description: 'Arquivo muito grande',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de listagem de comprovantes
 */
export const ApiListarComprovantes = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Listar comprovantes de um pagamento' }),
    ApiParam({
      name: 'pagamentoId',
      required: true,
      description: 'ID do pagamento',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Lista de comprovantes obtida com sucesso',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de remoção de comprovante
 */
export const ApiRemoverComprovante = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Remover comprovante de pagamento' }),
    ApiParam({
      name: 'id',
      required: true,
      description: 'ID do comprovante',
      type: String,
    }),
    ApiBody({
      description: 'Dados para remoção do comprovante',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Comprovante removido com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Comprovante não encontrado',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};

/**
 * Decorator para endpoints de criação de confirmação de recebimento
 */
export const ApiConfirmarRecebimento = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Confirmar recebimento de pagamento' }),
    ApiBody({
      description: 'Dados para confirmação de recebimento',
      required: true,
    }),
    ApiResponse({
      status: 201,
      description: 'Recebimento confirmado com sucesso',
    }),
    ApiResponse({
      status: 400,
      description: 'Dados inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'Não autorizado',
    }),
    ApiResponse({
      status: 403,
      description: 'Acesso proibido',
    }),
    ApiResponse({
      status: 404,
      description: 'Pagamento não encontrado',
    }),
    ApiResponse({
      status: 409,
      description:
        'Conflito - Pagamento não está em status que permita confirmação',
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
};
