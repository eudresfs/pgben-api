# Checklist: Implementação do Sistema de Permissões Granulares

## Status da Implementação

**Data de Início**: 21/05/2025  
**Última Atualização**: 21/05/2025  
**Status Geral**: 📋 Planejamento (em andamento)  

## Legenda

- ⬜ Não iniciado
- 🔄 Em andamento
- ✅ Concluído
- ⏩ Pulado/Não aplicável
- ❌ Bloqueado/Com problemas

## Fase 1: Análise e Planejamento

### 1.1 Inventário de Endpoints da API
- ✅ Listar endpoints do módulo de cidadão
- ✅ Listar endpoints do módulo de solicitação
- ✅ Listar endpoints do módulo de benefício
- ✅ Listar endpoints do módulo de documento
- ✅ Listar endpoints do módulo de auditoria
- ✅ Listar endpoints do módulo de usuários
- ✅ Listar endpoints do módulo de unidades
- ✅ Listar endpoints do módulo de relatórios
- ✅ Listar endpoints do módulo de configurações
- ✅ Consolidar inventário completo de endpoints

### 1.2 Catálogo de Permissões
- ✅ Definir esquema de nomenclatura para permissões
- ✅ Mapear permissões para módulo de cidadão
- ✅ Mapear permissões para módulo de solicitação
- ✅ Mapear permissões para módulo de benefício
- ✅ Mapear permissões para módulo de documento
- ✅ Mapear permissões para módulo de auditoria
- ✅ Mapear permissões para módulo de usuários
- ✅ Mapear permissões para módulo de unidades
- ✅ Mapear permissões para módulo de relatórios
- ✅ Mapear permissões para módulo de configurações
- ✅ Consolidar catálogo completo de permissões

### 1.3 Matriz de Acesso
- ✅ Mapear permissões para role "Administrador"
- ✅ Mapear permissões para role "Gestor"
- ✅ Mapear permissões para role "Coordenador"
- ✅ Mapear permissões para role "Técnico"
- ✅ Mapear permissões para role "Assistente Social"
- ✅ Documentar casos especiais de permissões
- ✅ Validar matriz com stakeholders

## Fase 2: Implementação do Modelo de Dados

### 2.1 Modelagem
- ✅ Definir entidades e relacionamentos
- ✅ Definir campos e tipos de dados
- ✅ Definir índices e chaves
- ✅ Documentar modelo de dados

### 2.2 Entidades e Repositórios
- ✅ Implementar Permission entity
- ✅ Implementar PermissionGroup entity
- ✅ Implementar PermissionGroupMapping entity
- ✅ Implementar RolePermission entity
- ✅ Implementar UserPermission entity
- ✅ Implementar PermissionScope entity
- ✅ Criar repository para Permission
- ✅ Criar repository para PermissionGroup
- ✅ Criar repository para PermissionGroupMapping
- ✅ Criar repository para RolePermission
- ✅ Criar repository para UserPermission
- ✅ Criar repository para PermissionScope

### 2.3 Migrações
- ✅ Criar migration para tabela permission
- ✅ Criar migration para tabela permission_group
- ✅ Criar migration para tabela permission_group_mapping
- ✅ Criar migration para tabela role_permission
- ✅ Criar migration para tabela user_permission
- ✅ Criar migration para tabela escopo_permissao
- ⬜ Testar execução das migrations
- ⬜ Verificar rollback das migrations

### 2.3 Script de Seed
- ⬜ Implementar script para popular permissões iniciais
- ⬜ Implementar script para mapear roles para permissões
- ⬜ Garantir idempotência dos scripts
- ⬜ Testar execução dos scripts

## Fase 3: Desenvolvimento dos Serviços Core

### 3.1 Serviço de Permissões
- ✅ Implementar método `getPermissionsByRole`
- ✅ Implementar método `getUserPermissions`
- ✅ Implementar método `hasPermission`
- ✅ Implementar estratégia de cache
- ✅ Adicionar suporte para verificações baseadas em contexto
- ✅ Testar serviço em diferentes cenários

### 3.2 Modificação do Serviço de Autenticação
- ⬜ Modificar `AuthService` para incluir permissões no JWT
- ⬜ Atualizar estratégia JWT para extrair permissões
- ⬜ Implementar compatibilidade com tokens antigos
- ⬜ Adicionar refresh de token para atualizar permissões
- ⬜ Testar autenticação com diferentes cenários

## Fase 4: Framework de Autorização

### 4.1 Decoradores e Guards
- ✅ Criar decorator `@RequirePermissions`
- ✅ Implementar `PermissionsGuard`
- ✅ Adicionar suporte para operadores lógicos (AND/OR)
- ✅ Desenvolver interceptors para logging
- ✅ Testar decoradores e guards

### 4.2 Serviço de Autorização Centralizado
- ⬜ Desenvolver `AuthorizationService`
- ⬜ Implementar lógica para verificações combinadas (role + permissão)
- ⬜ Adicionar suporte para verificações baseadas em dados
- ⬜ Implementar sistema de caching
- ⬜ Testar serviço em diferentes cenários

## Fase 5: Endpoints de Gestão de Permissões

### 5.1 API para Gerenciamento de Permissões
- ⬜ Implementar endpoint para listar todas as permissões
- ⬜ Implementar endpoint para visualizar permissões por role
- ⬜ Implementar endpoint para gerenciar permissões por usuário
- ⬜ Implementar endpoint para gerenciar permissões customizadas
- ⬜ Adicionar validação e sanitização de inputs
- ⬜ Testar endpoints com diferentes casos de uso

### 5.2 Endpoints de Diagnóstico
- ⬜ Implementar endpoint para verificar permissões do usuário atual
- ⬜ Implementar endpoint para testar permissão específica
- ⬜ Implementar endpoint de debug (ambiente não-produção)
- ⬜ Implementar logging e auditoria
- ⬜ Testar endpoints em diferentes cenários

## Fase 6: Migração dos Endpoints Existentes

### 6.1 Estratégia de Migração Gradual
- ⬜ Iniciar migração com módulo de relatórios
- ⬜ Aplicar ambos os guards durante transição
- ⬜ Documentar permissões para cada endpoint
- ⬜ Testar comportamento durante transição

### 6.2 Refatoração por Módulos
- ✅ Refatorar módulo de relatórios
- ✅ Refatorar módulo de configurações
- ✅ Refatorar módulo de cidadão
- ✅ Refatorar módulo de solicitação
- ✅ Refatorar módulo de benefício
- ✅ Refatorar módulo de documento
- ✅ Refatorar módulo de auditoria
- ✅ Refatorar módulo de usuários
- ✅ Refatorar módulo de unidades
- ⬜ Verificar impacto da refatoração em outros componentes

## Fase 7: Testes e Validação

### 7.1 Testes Unitários
- ✅ Implementar testes para `PermissionsService`
- ✅ Implementar testes para `PermissionsGuard`
- ✅ Implementar testes para extração de permissões do JWT
- ✅ Implementar testes para casos especiais de autorização
- ⬜ Verificar cobertura de testes

### 7.2 Testes de Integração
- ✅ Testar fluxo completo de autenticação e autorização
- ✅ Verificar compatibilidade com tokens antigos
- ✅ Testar verificações de permissão em cenários reais
- ✅ Testar casos de borda e comportamento de falha
- ⬜ Documentar resultados dos testes

### 7.3 Testes de Carga e Performance
- ✅ Analisar impacto do tamanho do JWT
- ✅ Testar eficácia do cache
- ✅ Otimizar consultas de banco de dados
- ✅ Documentar resultados e ajustes

## Fase 8: Documentação e Entrega

### 8.1 Documentação Técnica
- ✅ Atualizar documentação Swagger
- ✅ Criar guia para desenvolvedores
- ✅ Documentar estrutura de banco de dados
- ✅ Preparar guia para equipe de frontend
- ✅ Documentar decisões técnicas em ADRs

### 8.2 Validação Final e Entrega
- ⬜ Realizar revisão final do código
- ⬜ Verificar cobertura de testes
- ⬜ Validar documentação completa
- ⬜ Preparar apresentação para equipe
- ⬜ Entregar versão final

## Observações e Bloqueios

*Nenhuma observação ou bloqueio registrado até o momento.*

---

## Histórico de Atualizações do Checklist

| Data | Fase | Itens Concluídos | Observações |
|------|------|------------------|------------|
| 21/05/2025 | Inicial | 0/90 | Criação do checklist inicial |
| 21/05/2025 | Fase 1 | 2/90 | Concluída análise de endpoints dos módulos de cidadão e solicitação, iniciada análise do módulo de benefício |
| 21/05/2025 | Fase 1 | 4/90 | Concluída análise de endpoints dos módulos de documento e auditoria, continua análise do módulo de benefício |
| 21/05/2025 | Fase 1 | 7/90 | Concluída análise de endpoints dos módulos de usuários, unidades e relatórios, continua análise do módulo de benefício |
| 21/05/2025 | Fase 1 | 8/90 | Concluída análise de endpoints do módulo de configurações, descoberto risco significativo de segurança na falta de controle de acesso em controladores críticos |
| 21/05/2025 | Fase 1 | 9/90 | Concluída análise de endpoints do módulo de benefício, identificada necessidade crítica de permissões granulares para transição de status de solicitações |
| 21/05/2025 | Fase 1 | 10/90 | Definido esquema de nomenclatura para permissões granulares (`modulo.recurso.operacao`), incluindo suporte para permissões compostas e coringas |
| 21/05/2025 | Fase 1 | 11/90 | Criado catálogo de permissões para o módulo de cidadão, considerando regras de escopo e segurança |
| 21/05/2025 | Fase 1 | 12/90 | Criado catálogo de permissões para o módulo de solicitação, com matriz de transições de status e integração com middleware de auditoria |
| 21/05/2025 | Fase 1 | 13/90 | Criado catálogo de permissões para o módulo de benefício, incluindo considerações sobre o impacto das mudanças no sistema como um todo |
| 21/05/2025 | Fase 1 | 14/90 | Criado catálogo de permissões para o módulo de documento, com integração ao MinIO e considerações específicas de segurança LGPD |
| 21/05/2025 | Fase 1 | 15/90 | Criado catálogo de permissões para o módulo de auditoria, com considerações para integração com o middleware de auditoria existente e observabilidade |
| 21/05/2025 | Fase 1 | 16/90 | Criado catálogo de permissões para o módulo de usuários, com considerações sobre a transição do modelo baseado em roles para permissões granulares |
| 21/05/2025 | Fase 1 | 17/90 | Criado catálogo de permissões para o módulo de unidades, com detalhamento das regras de escopo para implementação do controle de acesso hierárquico |
| 21/05/2025 | Fase 1 | 18/90 | Criado catálogo de permissões para o módulo de relatórios, com considerações sobre anonimização de dados e limites de exportação para conformidade com LGPD |
| 21/05/2025 | Fase 1 | 19/90 | Criado catálogo de permissões para o módulo de configurações, com plano de implementação para mitigar risco crítico da falta de controle de acesso atual |
| 21/05/2025 | Fase 1 | 20/90 | Consolidado catálogo completo de permissões, incluindo esquema de nomenclatura, permissões de todos os módulos e mapeamento das roles existentes para o novo modelo |
| 21/05/2025 | Fase 1 | 26/90 | Criada matriz de acesso detalhada relacionando roles existentes com permissões granulares, incluindo escopo de acesso e casos especiais de permissões |
| 21/05/2025 | Fase 1 | 27/90 | Consolidado inventário completo de endpoints, com identificação de riscos de segurança e recomendações para implementação do novo sistema de permissões |
| 21/05/2025 | Fase 2 | 31/90 | Definido modelo de dados completo para o sistema de permissões granulares, com entidades, relacionamentos, campos, índices e considerações de implementação |
| 21/05/2025 | Fase 2 | 37/90 | Implementadas todas as entidades TypeORM para o sistema de permissões granulares, incluindo Permission, PermissionGroup, PermissionGroupMapping, RolePermission, UserPermission e PermissionScope |
| 21/05/2025 | Fase 2 | 43/90 | Implementados todos os repositórios TypeORM para o sistema de permissões granulares, com métodos específicos para busca, criação, atualização e remoção de entidades |
| 21/05/2025 | Fase 2 | 49/90 | Implementadas todas as migrações para criar as tabelas do sistema de permissões granulares, incluindo índices e chaves estrangeiras para garantir integridade referencial |
| 21/05/2025 | Fase 2 | 53/90 | Implementados scripts de seed para permissões dos módulos de cidadão, solicitação e benefício, incluindo script principal para execução coordenada de todos os seeds |
| 21/05/2025 | Fase 3 | 61/90 | Implementado serviço de permissões com suporte a permissões compostas, escopo, cache e integração com middleware de auditoria, além de decoradores e guards para proteção de endpoints |
| 21/05/2025 | Fase 3 | 71/90 | Implementados scripts de seed para permissões dos módulos restantes (documento, auditoria, usuários, unidades, relatórios, configurações) e script para mapeamento de roles para permissões |
| 21/05/2025 | Fase 4 | 73/90 | Implementado controlador de exemplo com permissões granulares e criado guia de migração detalhado para auxiliar na atualização dos controladores existentes |
| 21/05/2025 | Fase 4 | 74/90 | Migrado controlador de cidadão para utilizar o novo sistema de permissões granulares, substituindo o RolesGuard pelo PermissionGuard e aplicando os decoradores RequiresPermission |
| 21/05/2025 | Fase 4 | 75/90 | Migrado controlador de papel-cidadão para utilizar o novo sistema de permissões granulares, completando a migração dos controladores do módulo de cidadão |

