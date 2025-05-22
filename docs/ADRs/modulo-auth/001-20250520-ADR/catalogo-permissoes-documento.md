# Catálogo de Permissões - Módulo de Documento

## Visão Geral

Este documento define as permissões granulares para o módulo de Documento, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Documento é particularmente sensível no sistema PGBen, pois lida com o armazenamento, processamento e criptografia de documentos potencialmente confidenciais dos cidadãos, exigindo atenção especial às questões de LGPD.

## Recursos Identificados

No módulo de Documento, identificamos os seguintes recursos principais:

1. **documento** - Operações básicas para gerenciamento de documentos
2. **documento.verificacao** - Operações relacionadas à verificação de documentos
3. **documento.seguranca** - Operações relacionadas à segurança de documentos

## Permissões Detalhadas

### Documento (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `documento.listar` | Listar documentos de uma solicitação | GET /v1/documento/solicitacao/:solicitacaoId |
| `documento.ler` | Obter detalhes de um documento específico | GET /v1/documento/:id |
| `documento.baixar` | Baixar o conteúdo de um documento | GET /v1/documento/:id/download |
| `documento.visualizar.miniatura` | Obter a miniatura de um documento | GET /v1/documento/:id/thumbnail |
| `documento.criar` | Fazer upload de um novo documento | POST /v1/documento/upload |
| `documento.excluir` | Remover um documento existente | DELETE /v1/documento/:id |

### Verificação de Documentos

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `documento.verificacao.validar` | Verificar autenticidade/validade de um documento | POST /v1/documento/:id/verificar |

### Segurança de Documentos

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `documento.seguranca.scan` | Verificar documento em busca de malware | POST /v1/documento/:id/scan-malware |
| `documento.seguranca.administrar` | Gerenciar configurações de segurança relacionadas a documentos | Não mapeado diretamente |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `documento.*` | Todas as permissões do módulo de documento | Todas listadas acima |
| `documento.verificacao.*` | Todas as permissões relacionadas à verificação | `documento.verificacao.validar` |
| `documento.seguranca.*` | Todas as permissões relacionadas à segurança | `documento.seguranca.scan`, `documento.seguranca.administrar` |
| `documento.ler.*` | Todas as permissões de leitura | `documento.listar`, `documento.ler`, `documento.baixar`, `documento.visualizar.miniatura` |

## Considerações de Segurança

1. **Criptografia de Dados Sensíveis**: Todos os documentos sensíveis devem continuar sendo armazenados com criptografia AES-256-GCM, conforme já implementado no sistema.

2. **Auditoria LGPD**: Todas as operações deste módulo devem ser registradas pelo middleware de auditoria, especialmente:
   - Upload de documentos
   - Download/visualização de documentos
   - Remoção de documentos
   - Verificações de segurança e autenticidade

3. **Escopo de Acesso**: Implementar verificações adicionais para garantir que um usuário só possa acessar documentos relacionados a:
   - Solicitações criadas pelo próprio usuário (no caso de cidadãos)
   - Solicitações vinculadas à unidade do usuário (no caso de técnicos, coordenadores)
   - Qualquer solicitação (apenas para administradores, gestores, com auditoria completa)

4. **Verificação de Malware**: A permissão `documento.seguranca.scan` deve ser restrita a perfis administrativos, mas o processo de verificação anti-malware deve ser automático para todos os documentos enviados, independentemente do usuário.

5. **Período de Retenção**: Implementar políticas de retenção de documentos conforme requisitos da LGPD, permitindo a exclusão automática após o término do período legal de armazenamento.

6. **Transmissão Segura**: Garantir que todos os endpoints deste módulo utilizem HTTPS com certificados válidos para proteger a transmissão de documentos potencialmente sensíveis.

7. **Análise de Segurança**: Qualquer modificação no código que implementa estas permissões deve passar pelo processo de Análise Estática de Segurança (SAST) com SonarQube e pela Análise Dinâmica de Segurança (DAST) com OWASP ZAP, como já implementado no pipeline de CI/CD.

## Integração com MinIO

O módulo de Documento utiliza o MinIO para armazenamento de objetos. As permissões definidas neste catálogo devem se traduzir em políticas de acesso adequadas no MinIO, com as seguintes considerações:

1. Utilizar o cliente MinIO com autenticação apropriada
2. Implementar políticas de bucket seguindo o princípio de menor privilégio
3. Configurar a criptografia no lado do servidor para buckets contendo documentos sensíveis
4. Implementar rotação periódica de chaves de criptografia
5. Configurar logs de auditoria para o MinIO, integrados ao sistema de auditoria central
