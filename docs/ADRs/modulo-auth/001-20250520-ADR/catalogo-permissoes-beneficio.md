# Catálogo de Permissões - Módulo de Benefício

## Visão Geral

Este documento define as permissões granulares para o módulo de Benefício, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Benefício é um componente central do sistema PGBen, pois define os tipos de benefícios disponíveis, seus requisitos documentais e fluxos de aprovação.

## Recursos Identificados

No módulo de Benefício, identificamos os seguintes recursos principais:

1. **beneficio** - Operações básicas para tipos de benefícios
2. **beneficio.requisito** - Operações relacionadas a requisitos documentais
3. **beneficio.fluxo** - Operações relacionadas ao fluxo de aprovação
4. **beneficio.campo** - Operações relacionadas a campos dinâmicos dos formulários

## Permissões Detalhadas

### Benefício (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `beneficio.listar` | Listar tipos de benefícios disponíveis | GET /v1/beneficio |
| `beneficio.ler` | Obter detalhes de um tipo de benefício específico | GET /v1/beneficio/:id |
| `beneficio.criar` | Criar um novo tipo de benefício | POST /v1/beneficio |
| `beneficio.atualizar` | Atualizar um tipo de benefício existente | PUT /v1/beneficio/:id |

### Requisitos Documentais

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `beneficio.requisito.listar` | Listar requisitos documentais de um benefício | GET /v1/beneficio/:id/requisitos |
| `beneficio.requisito.criar` | Adicionar requisito documental a um benefício | POST /v1/beneficio/:id/requisitos |
| `beneficio.requisito.atualizar` | Atualizar requisito documental (não mapeado) | - |
| `beneficio.requisito.excluir` | Remover requisito documental (não mapeado) | - |

### Fluxo de Aprovação

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `beneficio.fluxo.configurar` | Configurar fluxo de aprovação de um benefício | PUT /v1/beneficio/:id/fluxo |
| `beneficio.fluxo.ler` | Visualizar configuração de fluxo (parte do detalhe do benefício) | GET /v1/beneficio/:id |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `beneficio.*` | Todas as permissões do módulo de benefício | Todas listadas acima |
| `beneficio.requisito.*` | Todas as permissões relacionadas a requisitos | `beneficio.requisito.listar`, `beneficio.requisito.criar`, `beneficio.requisito.atualizar`, `beneficio.requisito.excluir` |
| `beneficio.fluxo.*` | Todas as permissões relacionadas a fluxos | `beneficio.fluxo.configurar`, `beneficio.fluxo.ler` |
| `beneficio.ler.*` | Todas as permissões de leitura | `beneficio.listar`, `beneficio.ler`, `beneficio.requisito.listar`, `beneficio.fluxo.ler` |

## Considerações de Segurança

1. **Auditoria Obrigatória**: Todas as operações de criação, atualização e configuração de benefícios devem ser registradas pelo middleware de auditoria para fins de compliance com LGPD, rastreabilidade e segurança.

2. **Separação de Responsabilidades**: A criação de tipos de benefícios e a configuração de seus fluxos são operações críticas que impactam diretamente o funcionamento do sistema. Recomenda-se manter estas operações restritas aos perfis ADMIN e GESTOR, como já implementado.

3. **Comunicação Segura**: Considerando o armazenamento e transmissão de dados sensíveis, todas as operações devem ser realizadas sobre HTTPS com certificados válidos e criptografia adequada.

4. **Verificações de Integridade**: Antes de aplicar mudanças em tipos de benefícios existentes, o sistema deve verificar se existem solicitações ativas para o tipo de benefício, para evitar inconsistências.

5. **Análise de Segurança**: Qualquer modificação no código que implementa estas permissões deve passar pelo processo de Análise Estática de Segurança (SAST) com SonarQube e pela Análise Dinâmica de Segurança (DAST) com OWASP ZAP, como já implementado no pipeline de CI/CD.

## Impacto no Sistema

A modificação nos tipos de benefícios e seus fluxos pode ter impacto significativo no sistema como um todo:

1. **Solicitações em Andamento**: Mudanças em fluxos de aprovação não devem afetar solicitações já em andamento.

2. **Notificações**: Quando um tipo de benefício é atualizado ou seus requisitos são modificados, o sistema deve notificar usuários relevantes.

3. **Validação**: Após a atualização de regras ou requisitos, o sistema deve revalidar todas as solicitações em andamento para garantir que ainda cumprem os critérios.
