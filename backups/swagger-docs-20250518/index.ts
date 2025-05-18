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

// Validadores
export * from './schemas/validators';

// Exemplos de requisições/respostas
export * from './examples/beneficio';
export * from './examples/utils';

// Tipos e utilitários legados (migrar para a nova estrutura)
export * from './swagger-entidades';
export * from './swagger-payloads';

// Internacionalização (alterado para usar imports nomeados para evitar conflitos)
import * as ptBR from './swagger-pt';
export { ptBR };

// Utilitários de resposta legados (migrar para a nova estrutura)
export * from './swagger-respostas';
export * from './swagger-respostas-padrao';

// Respostas de erro padronizadas
export * from './responses/errors';

// Guias de uso
export * from './guides';

// Informações de versionamento
export * from './versioning';

// Informações de segurança
export * from './security';

// Componentes HATEOAS
export * from './schemas/common/hateoas';

// Modelo de erro padronizado
export * from './schemas/common/error';

// Export type for backward compatibility
import { PaginatedResponse } from './schemas/common';
export { PaginatedResponse };
