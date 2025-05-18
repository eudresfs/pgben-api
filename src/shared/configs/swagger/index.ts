/**
 * Índice centralizado para exportação de todos os componentes do Swagger
 * 
 * Este arquivo serve como ponto único de exportação para todos os schemas,
 * exemplos e respostas utilizados na documentação da API.
 */

// Configuração principal do Swagger
export { swaggerConfig, swaggerDocumentOptions, swaggerSetupOptions } from './swagger.config';

// Decorators personalizados
export * from './swagger-decorator';

// Schemas (DTOs)
export * from './schemas/index';

// Exemplos de requisições/respostas - usando importações diretas para evitar erros de resolução de módulos
export * from './examples/beneficio';

// Tipos e utilitários legados (migrar para a nova estrutura)
export * from './swagger-entidades';
export * from './swagger-payloads';

// Internacionalização (alterado para usar imports nomeados para evitar conflitos)
import * as ptBR from './swagger-pt';
export { ptBR };

// Utilitários de resposta legados (migrar para a nova estrutura)
export * from './swagger-respostas';
export * from './swagger-respostas-padrao';

// Export type for backward compatibility
import { PaginatedResponse } from './schemas/common';
export { PaginatedResponse };
