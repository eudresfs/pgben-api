import { SwaggerDocumentOptions } from '@nestjs/swagger';

/**
 * Configurações avançadas para o documento Swagger
 * 
 * Este arquivo contém configurações técnicas para a geração do documento Swagger,
 * como operationIds, filtros e outras opções que afetam como a API é documentada.
 */
export const swaggerDocumentOptions: SwaggerDocumentOptions = {
  /**
   * Ignora prefixos globais nas rotas para melhor legibilidade
   * false = mantém o prefixo global nas rotas (ex: /api/usuarios)
   */
  ignoreGlobalPrefix: false,
  
  /**
   * Configura a geração de operationIds únicos para cada endpoint
   * Isso é importante para ferramentas de geração de código baseadas no OpenAPI
   */
  operationIdFactory: (controllerKey: string, methodKey: string) => {
    // Remove sufixos comuns e caracteres especiais
    const cleanController = controllerKey
      .replace('Controller', '')
      .replace(/[^a-zA-Z0-9]/g, '_');
      
    // Gera um operationId no formato: modulo_recurso_acao
    return `${cleanController}_${methodKey}`.toLowerCase();
  }
};

/**
 * Definição da ordenação padrão das tags no Swagger UI
 * Esta função é exportada para ser usada no arquivo swagger-pt.ts
 */
export const tagsSorterFunction = (a: string, b: string) => {
  const order = [
    'auth',
    'usuarios',
    'cidadaos',
    'beneficios',
    'solicitacoes',
    'documentos',
    'unidades',
    'notificacoes',
    'ocorrencias',
    'health',
    'metrics'
  ];
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
};
