# Catálogo de Permissões - Módulo de Auditoria

## Visão Geral

Este documento define as permissões granulares para o módulo de Auditoria, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Auditoria é fundamental para garantir a compliance com a LGPD e a segurança do sistema PGBen, pois registra todas as operações sensíveis realizadas por usuários.

## Recursos Identificados

No módulo de Auditoria, identificamos os seguintes recursos principais:

1. **auditoria** - Operações básicas para gerenciamento de logs de auditoria
2. **auditoria.exportacao** - Operações relacionadas à exportação de logs
3. **auditoria.monitoramento** - Operações relacionadas ao monitoramento e estatísticas
4. **auditoria.relatorio** - Operações relacionadas à geração de relatórios específicos

## Permissões Detalhadas

### Auditoria (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `auditoria.listar` | Buscar logs de auditoria com filtros e paginação | GET /v1/auditoria |
| `auditoria.ler` | Obter detalhes de um log específico | GET /v1/auditoria/:id |
| `auditoria.criar` | Criar log de auditoria manualmente | POST /v1/auditoria |
| `auditoria.listar.por.entidade` | Buscar logs relacionados a uma entidade específica | GET /v1/auditoria/entidade/:entidade/:id |
| `auditoria.listar.por.usuario` | Buscar logs gerados por um usuário específico | GET /v1/auditoria/usuario/:id |

### Exportação de Logs

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `auditoria.exportacao.criar` | Iniciar processo de exportação de logs | POST /v1/auditoria/exportacao |
| `auditoria.exportacao.baixar` | Baixar arquivo de exportação | GET /v1/auditoria/exportacao/download |
| `auditoria.exportacao.listar` | Listar arquivos de exportação disponíveis | GET /v1/auditoria/exportacao/arquivos |

### Monitoramento e Estatísticas

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `auditoria.monitoramento.estatisticas` | Obter estatísticas de auditoria | GET /v1/auditoria/monitoramento/estatisticas |
| `auditoria.monitoramento.saude` | Verificar saúde do sistema de auditoria | GET /v1/auditoria/monitoramento/saude |
| `auditoria.monitoramento.atualizar` | Forçar atualização de estatísticas | GET /v1/auditoria/monitoramento/atualizar |

### Relatórios Específicos

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `auditoria.relatorio.dados.sensiveis` | Gerar relatório de acessos a dados sensíveis | GET /v1/auditoria/relatorios/dados-sensiveis |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `auditoria.*` | Todas as permissões do módulo de auditoria | Todas listadas acima |
| `auditoria.exportacao.*` | Todas as permissões relacionadas à exportação | `auditoria.exportacao.criar`, `auditoria.exportacao.baixar`, `auditoria.exportacao.listar` |
| `auditoria.monitoramento.*` | Todas as permissões relacionadas ao monitoramento | `auditoria.monitoramento.estatisticas`, `auditoria.monitoramento.saude`, `auditoria.monitoramento.atualizar` |
| `auditoria.relatorio.*` | Todas as permissões relacionadas a relatórios | `auditoria.relatorio.dados.sensiveis` |
| `auditoria.ler.*` | Todas as permissões de leitura | `auditoria.listar`, `auditoria.ler`, `auditoria.listar.por.entidade`, `auditoria.listar.por.usuario`, `auditoria.exportacao.listar`, `auditoria.monitoramento.estatisticas`, `auditoria.monitoramento.saude` |

## Considerações de Segurança

1. **Acesso Restrito**: As permissões do módulo de Auditoria devem ser restritas a perfis específicos (principalmente ADMIN e eventualmente GESTOR com escopo limitado), devido à sensibilidade das informações.

2. **Auto-Auditoria**: O próprio sistema de auditoria deve registrar quem acessou os logs de auditoria, criando meta-logs para garantir rastreabilidade completa. Esta é uma prática esperada em sistemas com compliance LGPD.

3. **Retenção de Dados**: Implementar política de retenção de logs, mantendo-os pelo período exigido pela LGPD e outras regulamentações aplicáveis, com rotação automatizada.

4. **Inalterabilidade**: Os logs de auditoria devem ser imutáveis. Uma vez criados, não devem poder ser alterados ou excluídos, mesmo por administradores do sistema.

5. **Criptografia**: Os logs de auditoria contendo dados sensíveis devem ser armazenados com criptografia adequada (AES-256-GCM, conforme já implementado).

6. **Separação de Papéis**: Implementar separação de papéis (segregation of duties) para que o mesmo usuário que realiza uma operação não possa alterar/remover o log da auditoria correspondente.

7. **Hash de Verificação**: Implementar mecanismo de hash para garantir a integridade dos logs, permitindo detectar qualquer tentativa de adulteração.

## Integração com Middleware de Auditoria

Como já existe um middleware de auditoria implementado para compliance com LGPD, é fundamental que este módulo se integre corretamente com ele. Recomenda-se:

1. Garantir que todas as operações sensíveis no sistema sejam interceptadas pelo middleware
2. Padronizar o formato dos logs para facilitar análise e relatórios
3. Implementar enriquecimento dos logs com metadados relevantes (IP, dispositivo, localização, etc.)
4. Configurar alertas para tentativas de acesso não autorizado ou padrões suspeitos
5. Revisar periodicamente a eficácia do sistema de auditoria através de análises de logs

## Integração com Observabilidade

Considerando que a observabilidade está sendo implementada no PGBen, recomenda-se:

1. Integrar logs de auditoria com o sistema de observabilidade
2. Utilizar identificadores de correlação para rastrear fluxos completos
3. Implementar dashboards específicos para monitoramento de segurança
4. Configurar alertas automáticos para eventos de segurança críticos
