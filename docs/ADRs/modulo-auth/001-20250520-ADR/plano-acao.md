# Plano de Ação: Implementação de Sistema de Permissões Granulares

## Visão Geral

Este documento detalha o plano de ação para implementar o sistema de permissões granulares no PGBen, substituindo gradualmente o sistema atual baseado em roles fixas por um sistema mais flexível e detalhado.

**Data de Início**: 21/05/2025  
**Prazo Estimado**: 8 semanas  
**Responsável**: Equipe de Backend  

## Objetivos

1. Implementar um sistema de permissões granulares mantendo compatibilidade com o sistema atual
2. Minimizar interrupções nos serviços durante a transição
3. Garantir que todas as operações da API sejam corretamente protegidas
4. Fornecer ferramentas para gerenciamento de permissões
5. Criar documentação completa para facilitar a integração com o frontend

## Fases de Implementação

### Fase 1: Análise e Planejamento (1 semana)

#### 1.1 Inventário de Endpoints da API
- Listar todos os endpoints da API agrupados por módulos
- Identificar para cada endpoint:
  - Método HTTP
  - Rota
  - Descrição da operação
  - Role atualmente exigida
  - Controller e método responsável

#### 1.2 Catálogo de Permissões
- Definir esquema de nomenclatura padronizado para permissões (formato: `modulo.recurso.operacao`)
- Criar lista completa de códigos de permissão mapeando todos os endpoints
- Documentar descrição detalhada de cada permissão
- Agrupar permissões logicamente por módulos e funcionalidades

#### 1.3 Matriz de Acesso
- Criar matriz relacionando cada role existente às novas permissões granulares
- Documentar quais permissões cada role possui por padrão
- Identificar casos especiais que exigirão lógica adicional

### Fase 2: Implementação do Modelo de Dados (1 semana)

#### 2.1 Entidades e Repositórios
- Implementar as seguintes entidades TypeORM:
  - `Permission`: armazena definições de permissões
  - `RolePermission`: relaciona roles a permissões
  - `UserPermission`: armazena permissões específicas por usuário
- Desenvolver repositories correspondentes
- Implementar índices para otimização de consultas

#### 2.2 Migrações
- Criar migrações TypeORM para:
  - Criar novas tabelas de permissões
  - Modificar tabelas existentes conforme necessário
  - Adicionar índices e chaves estrangeiras

#### 2.3 Script de Seed
- Desenvolver script para popular a tabela de permissões com dados iniciais
- Implementar mapeamento das roles existentes para suas permissões padrão
- Garantir que o script seja idempotente (possa ser executado múltiplas vezes)

### Fase 3: Desenvolvimento dos Serviços Core (1,5 semana)

#### 3.1 Serviço de Permissões
- Implementar `PermissionsService` com métodos essenciais:
  - `getPermissionsByRole(roleId: string): Promise<Permission[]>`
  - `getUserPermissions(userId: string, roleId: string): Promise<Permission[]>`
  - `hasPermission(userId: string, permissionCode: string): Promise<boolean>`
- Implementar estratégia de cache para otimizar consultas frequentes
- Adicionar suporte para verificações baseadas em contexto (ex: restrições por unidade)

#### 3.2 Modificação do Serviço de Autenticação
- Modificar `AuthService` para incluir permissões no payload JWT
- Atualizar estratégia JWT para extrair e validar permissões
- Implementar lógica para manter compatibilidade com tokens antigos
- Adicionar refresh de token para atualizar permissões quando alteradas

### Fase 4: Framework de Autorização (1 semana)

#### 4.1 Decoradores e Guards
- Criar decorator `@RequirePermissions(...permissionCodes: string[])`
- Implementar `PermissionsGuard` para verificar permissões nos endpoints
- Adicionar suporte para operadores lógicos entre permissões (AND/OR)
- Desenvolver interceptors para logging de ações de autorização

#### 4.2 Serviço de Autorização Centralizado
- Desenvolver `AuthorizationService` para centralizar verificações de permissão
- Implementar lógica para combinar verificações de role e permissão
- Adicionar suporte para verificações complexas baseadas em dados
- Incluir sistema de caching para otimizar desempenho

### Fase 5: Endpoints de Gestão de Permissões (1 semana)

#### 5.1 API para Gerenciamento de Permissões
- Criar endpoints para:
  - Listar todas as permissões disponíveis
  - Visualizar permissões por role
  - Gerenciar permissões por usuário (adicionar/remover)
  - Criar/atualizar/remover permissões customizadas
- Implementar validação e sanitização de inputs

#### 5.2 Endpoints de Diagnóstico
- Desenvolver endpoints para:
  - Verificar permissões do usuário atual
  - Testar verificação direta de permissão específica
  - Endpoint de debug (somente em ambiente não-produção)
- Implementar logging e auditoria de verificações de permissão

### Fase 6: Migração dos Endpoints Existentes (1,5 semana)

#### 6.1 Estratégia de Migração Gradual
- Iniciar com um módulo não crítico (ex: relatórios)
- Manter decorators `@Roles` existentes e adicionar `@RequirePermissions`
- Aplicar ambos os guards durante o período de transição
- Documentar permissões necessárias para cada endpoint

#### 6.2 Refatoração de Endpoints
- Refatorar endpoints gradualmente, priorizando por importância
- Implementar testes para cada endpoint refatorado
- Atualizar documentação Swagger com requisitos de permissão
- Verificar impacto da refatoração em outros componentes

### Fase 7: Testes e Validação (1,5 semana)

#### 7.1 Testes Unitários
- Desenvolver testes para:
  - `PermissionsService` e métodos relacionados
  - `PermissionsGuard` em diferentes cenários
  - Lógica de extração de permissões do JWT
- Implementar mocks e fixtures para testes isolados

#### 7.2 Testes de Integração
- Testar fluxo completo: autenticação → obtenção de permissões → autorização
- Verificar retrocompatibilidade com tokens antigos
- Validar todas as verificações de permissão em cenários reais
- Testar casos de borda e comportamento de falha

#### 7.3 Testes de Carga e Performance
- Analisar impacto na performance com tokens JWT maiores
- Testar eficácia do cache implementado
- Otimizar consultas de banco de dados conforme necessário
- Documentar resultados e ajustes realizados

### Fase 8: Documentação e Entrega (0,5 semana)

#### 8.1 Documentação Técnica
- Atualizar documentação Swagger com requisitos de permissão
- Criar guia para desenvolvedores sobre uso do novo sistema
- Documentar estrutura de banco de dados e padrões adotados
- Preparar guia de transição para equipe de frontend

#### 8.2 Validação Final e Entrega
- Realizar revisão final do código implementado
- Validar cobertura de testes
- Verificar documentação
- Preparar apresentação do sistema para equipe

## Considerações Importantes

### Segurança
- Minimizar tamanho do token incluindo apenas códigos de permissão
- Implementar validação rigorosa em todas as entradas
- Garantir que falhas de autorização não revelem informações sensíveis
- Implementar logging detalhado para auditoria de segurança

### Performance
- Otimizar consultas de banco de dados para evitar múltiplos joins
- Implementar estratégias de cache eficientes
- Monitorar tamanho dos tokens JWT e impacto na rede
- Utilizar índices apropriados nas tabelas de permissão

### Compatibilidade
- Manter suporte para tokens existentes durante a transição
- Implementar fallback para verificações baseadas em roles
- Garantir que todas as integrações existentes continuem funcionando
- Criar estratégia clara para migração gradual

## Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|--------------|-----------|
| Tamanho excessivo do JWT | Médio | Médio | Incluir apenas códigos de permissão, não descrições completas |
| Degradação de performance | Alto | Médio | Implementar estratégias de cache eficientes |
| Incompatibilidade com sistema existente | Alto | Baixo | Manter suporte para verificações baseadas em roles |
| Falhas de segurança durante transição | Alto | Baixo | Testes rigorosos e implementação gradual |
| Cobertura incompleta de endpoints | Médio | Médio | Inventário detalhado e validação cruzada |

## Métricas de Sucesso

1. 100% dos endpoints protegidos corretamente com permissões granulares
2. Nenhuma degradação significativa de performance (< 50ms adicional por requisição)
3. Zero falhas de segurança introduzidas pela nova implementação
4. Cobertura de testes acima de 90% para o novo código
5. Documentação completa e atualizada

## Próximos Passos

1. Iniciar inventário de endpoints da API
2. Desenvolver catálogo de permissões
3. Criar matriz de acesso relacionando roles e permissões
4. Implementar modelo de dados e migrações
