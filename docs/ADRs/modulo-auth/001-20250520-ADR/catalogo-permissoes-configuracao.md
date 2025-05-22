# Catálogo de Permissões - Módulo de Configurações

## Visão Geral

Este documento define as permissões granulares para o módulo de Configurações, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Configurações é extremamente crítico para o sistema PGBen, pois gerencia configurações fundamentais que controlam o comportamento do sistema, integrações externas, templates de comunicação e definições de workflows.

## Recursos Identificados

No módulo de Configurações, identificamos os seguintes recursos principais:

1. **configuracao.parametro** - Operações relacionadas a parâmetros do sistema
2. **configuracao.integracao** - Operações relacionadas a configurações de integração com sistemas externos
3. **configuracao.template** - Operações relacionadas a templates de comunicação
4. **configuracao.workflow** - Operações relacionadas a configurações de workflow
5. **configuracao.limites** - Operações relacionadas a limitações de uso

## Permissões Detalhadas

### Parâmetros do Sistema

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `configuracao.parametro.listar` | Listar todos os parâmetros do sistema | GET /configuracao/parametros |
| `configuracao.parametro.ler` | Obter detalhes de um parâmetro específico | GET /configuracao/parametros/:chave |
| `configuracao.parametro.criar` | Criar um novo parâmetro no sistema | POST /configuracao/parametros |
| `configuracao.parametro.atualizar` | Atualizar um parâmetro existente | PUT /configuracao/parametros/:chave |
| `configuracao.parametro.excluir` | Remover um parâmetro do sistema | DELETE /configuracao/parametros/:chave |
| `configuracao.parametro.cache.limpar` | Limpar o cache de parâmetros | POST /configuracao/parametros/cache/limpar |

### Integrações

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `configuracao.integracao.listar` | Listar todas as configurações de integração | GET /configuracao/integracoes |
| `configuracao.integracao.ler` | Obter detalhes de uma integração específica | GET /configuracao/integracoes/:codigo |
| `configuracao.integracao.ler.ativa` | Obter configuração ativa por tipo | GET /configuracao/integracoes/ativa/:tipo |
| `configuracao.integracao.atualizar` | Criar ou atualizar uma configuração de integração | PUT /configuracao/integracoes/:codigo |
| `configuracao.integracao.excluir` | Remover uma configuração de integração | DELETE /configuracao/integracoes/:codigo |
| `configuracao.integracao.testar` | Testar uma configuração de integração | POST /configuracao/integracoes/testar |
| `configuracao.integracao.status.atualizar` | Ativar/desativar uma configuração de integração | PUT /configuracao/integracoes/:codigo/status |

### Templates

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `configuracao.template.listar` | Listar todos os templates | GET /configuracao/templates |
| `configuracao.template.listar.por.tipo` | Listar templates por tipo | GET /configuracao/templates/tipo/:tipo |
| `configuracao.template.ler` | Obter detalhes de um template específico | GET /configuracao/templates/:codigo |
| `configuracao.template.criar` | Criar um novo template | POST /configuracao/templates |
| `configuracao.template.atualizar` | Atualizar um template existente | PUT /configuracao/templates/:codigo |
| `configuracao.template.excluir` | Remover um template | DELETE /configuracao/templates/:codigo |
| `configuracao.template.testar` | Testar a renderização de um template | POST /configuracao/templates/testar |
| `configuracao.template.status.atualizar` | Ativar/desativar um template | PUT /configuracao/templates/:codigo/status |

### Workflows

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `configuracao.workflow.listar` | Listar todos os workflows | GET /configuracao/workflows |
| `configuracao.workflow.ler` | Obter workflow para um tipo de benefício | GET /configuracao/workflows/:tipoBeneficioId |
| `configuracao.workflow.atualizar` | Criar ou atualizar um workflow | PUT /configuracao/workflows/:tipoBeneficioId |
| `configuracao.workflow.excluir` | Remover um workflow | DELETE /configuracao/workflows/:tipoBeneficioId |
| `configuracao.workflow.status.atualizar` | Ativar/desativar um workflow | PUT /configuracao/workflows/:tipoBeneficioId/status |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `configuracao.*` | Todas as permissões do módulo de configuração | Todas listadas acima |
| `configuracao.parametro.*` | Todas as permissões de parâmetros | `configuracao.parametro.listar`, `configuracao.parametro.ler`, `configuracao.parametro.criar`, `configuracao.parametro.atualizar`, `configuracao.parametro.excluir`, `configuracao.parametro.cache.limpar` |
| `configuracao.integracao.*` | Todas as permissões de integrações | Todas as permissões de integração listadas |
| `configuracao.template.*` | Todas as permissões de templates | Todas as permissões de template listadas |
| `configuracao.workflow.*` | Todas as permissões de workflows | Todas as permissões de workflow listadas |
| `configuracao.ler.*` | Todas as permissões de leitura | Todas as permissões com operações `listar`, `ler` |

## Considerações de Segurança

1. **Risco Crítico**: Os endpoints deste módulo foram identificados como extremamente críticos por não possuírem qualquer proteção de autenticação ou autorização na implementação atual. A primeira medida na implementação do sistema de permissões granulares deve ser a adição de guardas de autenticação (JwtAuthGuard) e autorização (PermissionGuard) a todos estes endpoints.

2. **Restrição de Acesso**: Todas as permissões deste módulo devem ser restritas a perfis administrativos (principalmente ADMIN) devido ao alto impacto potencial de modificações nas configurações do sistema:
   - Modificações em parâmetros podem afetar o comportamento global do sistema
   - Alterações em integrações podem expor dados a sistemas externos
   - Mudanças em templates podem afetar a comunicação oficial do sistema
   - Modificações em workflows podem alterar o fluxo de aprovação de benefícios

3. **Auditoria Obrigatória**: Todas as operações neste módulo devem ser registradas pelo middleware de auditoria, com detalhes específicos:
   - Usuário que realizou a alteração
   - Valores antigos e novos (para operações de atualização)
   - Razão da alteração (pode ser obrigatório para certas operações)

4. **Validação de Conteúdo**: Implementar validação adicional para:
   - Templates (evitar injeção de código malicioso em templates)
   - Parâmetros (validar conforme tipo e intervalo aceitável)
   - Integrações (verificar segurança de endpoints e credenciais)

5. **Proteção de Dados Sensíveis**: Garantir que informações sensíveis como:
   - Credenciais de integração
   - Chaves de API
   - Tokens de acesso
   Sejam armazenadas de forma segura, utilizando criptografia quando necessário.

6. **Exigir Confirmação para Operações Críticas**: Para certas operações consideradas de alto impacto, como:
   - Alterar parâmetros críticos do sistema
   - Modificar configurações de integração em produção
   - Alterar workflows de benefícios existentes
   Considerar a implementação de um mecanismo de confirmação adicional ou aprovação por múltiplos usuários.

## Plano de Implementação

Devido à criticidade deste módulo, a implementação das medidas de segurança deve ser priorizada:

1. **Curto Prazo (Imediato)**:
   - Adicionar JwtAuthGuard a todos os endpoints
   - Adicionar PermissionGuard com permissões restritas a ADMIN
   - Implementar validação básica de entradas
   - Ativar auditoria completa para todas as operações

2. **Médio Prazo**:
   - Implementar permissões granulares conforme definido neste catálogo
   - Adicionar validações específicas por tipo de operação
   - Implementar mecanismos de confirmação para operações críticas

3. **Longo Prazo**:
   - Separar as permissões administrativas por subdomínio (ex: permissões específicas para gerenciar integrações vs. gerenciar workflows)
   - Implementar mecanismo de aprovação multi-usuário para operações críticas
   - Adicionar controle de versão para configurações, permitindo rollback em caso de problemas
