# Mapeamento de Tabelas do PGBen

## Visão Geral

Este documento contém o mapeamento completo das tabelas existentes no sistema PGBen, seus relacionamentos, constraints, índices e domínios de negócio. Este mapeamento é parte da Fase 1 do Plano de Reestruturação de Migrations.

## Domínios de Negócio Identificados

1. **Autenticação e Autorização**
   - Usuários, perfis, permissões e tokens

2. **Cidadão**
   - Dados pessoais, composição familiar, situação socioeconômica

3. **Benefício**
   - Tipos de benefício, requisitos, fluxos de aprovação

4. **Solicitação**
   - Solicitações de benefício, histórico de status, dados dinâmicos

5. **Documento**
   - Documentos anexados, requisitos documentais

6. **Auditoria**
   - Logs de auditoria, histórico de alterações

7. **Relatório**
   - Visões e funções para geração de relatórios

8. **Integração**
   - Interfaces com sistemas externos

## Tabelas por Domínio

### 1. Autenticação e Autorização

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `usuario` | Usuários do sistema | id, nome, email, senha_hash, cpf, role, status | usuario_unidade |
| `setor` | Setores da SEMTAS | id, nome, descricao, sigla, unidade_id | usuario_unidade |
| `unidade` | Unidades da SEMTAS | id, nome, codigo, endereco, tipo_unidade | usuario_unidade, setor |
| `usuario_unidade` | Relação entre usuários e unidades | id, usuario_id, unidade_id, setor_id | usuario, unidade, setor |
| `refresh_tokens` | Tokens de renovação | id, usuario_id, token, expires_at | usuario |

### 2. Cidadão

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `cidadao` | Dados dos cidadãos | id, nome, cpf, nis, data_nascimento, sexo | situacao_moradia, composicao_familiar |
| `situacao_moradia` | Informações de moradia | id, cidadao_id, tipo_moradia, tempo_moradia | cidadao |
| `composicao_familiar` | Membros da família | id, cidadao_id, nome_membro, parentesco | cidadao |
| `beneficio_social` | Benefícios sociais recebidos | id, cidadao_id, tipo_beneficio, valor | cidadao |
| `info_bancaria` | Dados bancários | id, cidadao_id, banco, agencia, conta | cidadao |
| `papel_cidadao` | Papéis do cidadão | id, cidadao_id, tipo_papel, composicao_familiar_id | cidadao, composicao_familiar |
| `composicao_familiar` | Grupos familiares | id, responsavel_id, endereco, dados_socioeconomicos | cidadao, papel_cidadao |

### 3. Benefício

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `tipos_beneficio` | Tipos de benefício | id, nome, descricao, periodicidade, valor | requisito_documento, fluxo_beneficio |
| `requisito_documento` | Requisitos documentais | id, tipo_beneficio_id, nome, fase, obrigatorio | tipos_beneficio |
| `fluxo_beneficio` | Fluxo de aprovação | id, tipo_beneficio_id, setor_id, ordem | tipos_beneficio, setor |
| `campo_dinamico_beneficio` | Campos dinâmicos | id, tipo_beneficio_id, nome, tipo, obrigatorio | tipos_beneficio |
| `versao_schema_beneficio` | Versões de schema | id, tipo_beneficio_id, versao, schema | tipos_beneficio |

### 4. Solicitação

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `solicitacao_beneficio` | Solicitações | id, cidadao_id, tipo_beneficio_id, status, dados_dinamicos | cidadao, tipos_beneficio |
| `historico_solicitacao` | Histórico de status | id, solicitacao_id, status_anterior, status_novo, justificativa | solicitacao_beneficio |
| `pendencia` | Pendências | id, solicitacao_id, descricao, status | solicitacao_beneficio |
| `ocorrencia` | Ocorrências | id, solicitacao_id, tipo, descricao | solicitacao_beneficio |

### 5. Documento

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `documento` | Documentos anexados | id, solicitacao_id, requisito_id, nome_arquivo, mime_type | solicitacao_beneficio, requisito_documento |
| `historico_documento` | Histórico de documentos | id, documento_id, acao, usuario_id | documento, usuario |

### 6. Auditoria

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `log_auditoria` | Logs de auditoria | id, entidade, entidade_id, operacao, dados, usuario_id | usuario |
| `notificacao` | Notificações | id, usuario_id, titulo, conteudo, lida | usuario |

### 7. Relatório

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `view_solicitacoes_completas` | View de solicitações | (view) | - |
| `view_beneficios_por_bairro` | View de benefícios por bairro | (view) | - |

### 8. Integração

| Tabela | Descrição | Colunas Principais | Relacionamentos |
|--------|-----------|-------------------|-----------------|
| `integracao_externa` | Configurações de integração | id, nome, url, token, ativo | - |
| `log_integracao` | Logs de integração | id, integracao_id, requisicao, resposta, status | integracao_externa |

## Tipos Enumerados

| Tipo | Valores |
|------|---------|
| `sexo_enum` | masculino, feminino |
| `tipo_cidadao_enum` | beneficiario, solicitante, representante_legal |
| `parentesco_enum` | pai, mae, filho, filha, irmao, irma, avô, avó, outro |
| `escolaridade_enum` | Infantil, Fundamental_Incompleto, Fundamental_Completo, Medio_Incompleto, Medio_Completo, Superior_Incompleto, Superior_Completo, Pos_Graduacao, Mestrado, Doutorado |
| `tipo_beneficio_social_enum` | pbf, bpc |
| `tipo_bpc_enum` | idoso, deficiente |
| `pix_tipo_enum` | cpf, email, telefone, chave_aleatoria |
| `tipo_moradia_enum` | propria, alugada, cedida, ocupacao, situacao_rua, outro, abrigo |
| `periodicidade_enum` | unico, mensal |
| `fase_requisito_enum` | solicitacao, analise, liberacao |
| `status_solicitacao_enum` | pendente, em_analise, aprovado, rejeitado, cancelado |

## Índices Existentes

| Tabela | Índice | Colunas | Tipo |
|--------|--------|---------|------|
| `usuario` | IDX_USUARIOS_EMAIL | email | B-tree |
| `usuario` | IDX_USUARIOS_CPF | cpf | B-tree |
| `usuario` | IDX_USUARIOS_MATRICULA | matricula | B-tree |
| `unidade` | IDX_UNIDADE_CODIGO | codigo | B-tree |
| `cidadao` | IDX_CIDADAO_CPF | cpf | B-tree |
| `cidadao` | IDX_CIDADAO_NIS | nis | B-tree |
| `cidadao` | IDX_CIDADAO_NOME | nome | B-tree |
| `tipos_beneficio` | idx_tipos_beneficio_nome | nome | B-tree |
| `tipos_beneficio` | idx_tipos_beneficio_ativo | ativo | B-tree |
| `solicitacao_beneficio` | idx_solicitacao_cidadao | cidadao_id | B-tree |
| `solicitacao_beneficio` | idx_solicitacao_tipo_beneficio | tipo_beneficio_id | B-tree |
| `solicitacao_beneficio` | idx_solicitacao_status | status | B-tree |
| `solicitacao_beneficio` | idx_solicitacao_dados_dinamicos | dados_dinamicos | GIN |

## Constraints Principais

| Tabela | Constraint | Tipo | Descrição |
|--------|------------|------|-----------|
| `usuario_unidade` | FK_USUARIO_UNIDADE_USUARIOS | Foreign Key | Referência a usuario(id) |
| `usuario_unidade` | FK_USUARIO_UNIDADE_UNIDADE | Foreign Key | Referência a unidade(id) |
| `usuario_unidade` | FK_USUARIO_UNIDADE_SETOR | Foreign Key | Referência a setor(id) |
| `situacao_moradia` | FK_situacao_moradia_cidadao | Foreign Key | Referência a cidadao(id) |
| `composicao_familiar` | FK_membro_familia_cidadao | Foreign Key | Referência a cidadao(id) |
| `requisito_documento` | fk_requisito_documento_tipo_beneficio | Foreign Key | Referência a tipos_beneficio(id) |
| `fluxo_beneficio` | fk_fluxo_beneficio_tipo_beneficio | Foreign Key | Referência a tipos_beneficio(id) |
| `fluxo_beneficio` | fk_fluxo_beneficio_setor | Foreign Key | Referência a setor(id) |
| `solicitacao_beneficio` | fk_solicitacao_cidadao | Foreign Key | Referência a cidadao(id) |
| `solicitacao_beneficio` | fk_solicitacao_tipo_beneficio | Foreign Key | Referência a tipos_beneficio(id) |
| `historico_solicitacao` | fk_historico_solicitacao | Foreign Key | Referência a solicitacao_beneficio(id) |

## Políticas RLS Existentes

| Tabela | Política | Descrição |
|--------|----------|-----------|
| `cidadao` | admin_cidadao_policy | Acesso total para administradores |
| `cidadao` | tecnico_cidadao_policy | Acesso apenas à unidade do técnico |
| `solicitacao_beneficio` | admin_solicitacao_policy | Acesso total para administradores |
| `solicitacao_beneficio` | tecnico_solicitacao_policy | Acesso apenas às solicitações da unidade |

## Queries Críticas Identificadas

1. **Busca de cidadãos por CPF/NIS/Nome**:
   ```sql
   SELECT * FROM cidadao WHERE cpf = ? OR nis = ? OR nome ILIKE ?
   ```

2. **Listagem de solicitações com filtros**:
   ```sql
   SELECT s.*, c.nome, c.cpf, tb.nome as tipo_beneficio
   FROM solicitacao_beneficio s
   JOIN cidadao c ON s.cidadao_id = c.id
   JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
   WHERE s.status = ? AND s.created_at BETWEEN ? AND ?
   ```

3. **Consulta de campos dinâmicos**:
   ```sql
   SELECT * FROM solicitacao_beneficio
   WHERE dados_dinamicos->>'campo_especifico' = ?
   ```

4. **Relatório de benefícios por bairro**:
   ```sql
   SELECT c.bairro, COUNT(*) as total, SUM(tb.valor) as valor_total
   FROM solicitacao_beneficio s
   JOIN cidadao c ON s.cidadao_id = c.id
   JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
   WHERE s.status = 'aprovado'
   GROUP BY c.bairro
   ```

5. **Auditoria de acessos a dados sensíveis**:
   ```sql
   SELECT * FROM log_auditoria
   WHERE entidade = 'cidadao' AND operacao = 'acesso_dados_sensiveis'
   AND created_at BETWEEN ? AND ?
   ```

## Próximos Passos

- [x] 1.1 Mapear todas as tabelas existentes
- [x] 1.2 Documentar relacionamentos entre tabelas
- [x] 1.3 Identificar constraints e índices atuais
- [x] 1.4 Mapear tipos de dados e enumerações
- [x] 1.5 Identificar domínios de negócio
- [x] 1.6 Documentar dependências entre tabelas
- [x] 1.7 Analisar queries críticas para otimização
- [ ] 1.8 Criar diagrama ER da estrutura atual
