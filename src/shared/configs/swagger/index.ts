/**
 * Índice centralizado para exportação dos componentes essenciais do Swagger
 */

// Configuração principal do Swagger
export {
  swaggerConfig,
  swaggerDocumentOptions,
  swaggerSetupOptions,
  setupSwagger,
} from './swagger.config';

// Schemas (DTOs) básicos
export * from './schemas/index';

// Decorators personalizados
export * from './decorators/index';

// Tags configuration
export * from './tags.config';

// Respostas padronizadas
export * from './responses/index';
