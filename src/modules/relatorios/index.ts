/**
 * Módulo unificado de relatórios para o Sistema de Gestão de Benefícios Eventuais
 *
 * Este módulo consolida as funcionalidades dos antigos módulos 'relatorio' e 'relatorios',
 * implementando o padrão Strategy para gerar relatórios em diferentes formatos (PDF, Excel, CSV)
 * e otimizando as consultas para melhor desempenho.
 *
 * Características principais:
 * - Implementação do padrão Strategy para flexibilidade nos formatos de relatórios
 * - Cache integrado para melhorar a performance
 * - Integração com auditoria para conformidade com LGPD
 * - Otimização de consultas para grandes volumes de dados
 * - Segurança reforçada com validação de permissões
 */

// Exporta o módulo principal
export * from './relatorios.module';

// Exporta controllers
export * from './controllers';

// Exporta services
export * from './services';

// Exporta DTOs
export * from './dto';

// Exporta estratégias
export * from './strategies';

// Exporta interfaces
export * from './interfaces';

// Exporta configurações
export * from './config';

// Exporta interceptors
export * from './interceptors';

// Exporta utilitários
export * from './utils';

// Exporta tipos comuns
export * from './relatorios.types';
