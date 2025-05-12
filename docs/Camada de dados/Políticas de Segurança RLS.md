# Documentação de Políticas de Segurança RLS (Row Level Security)

## 1. Visão Geral

Este documento detalha as políticas de segurança em nível de linha (RLS) implementadas no sistema PGBEN para garantir o acesso controlado aos dados sensíveis dos beneficiários e operações do sistema.

## 2. Função Auxiliar de Verificação de Acesso

### 2.1 check_user_access()

```sql
CREATE OR REPLACE FUNCTION check_user_access()
RETURNS boolean
```

**Propósito**: Função central para verificação de permissões de acesso baseada no contexto do usuário.

**Variáveis de Contexto Utilizadas**:
- `app.current_user_id`: UUID do usuário atual
- `app.current_user_role`: Papel do usuário (ADMIN, GESTOR, etc.)
- `app.current_user_unidade_id`: UUID da unidade do usuário

**Comportamento**:
- Administradores (ADMIN) têm acesso total ao sistema
- Demais regras são customizadas por política específica

## 3. Políticas por Tabela

### 3.1 Tabela "user"

**Política**: user_access_policy

**Regras de Acesso**:
- Usuários podem ver/editar apenas seu próprio registro
- ADMINs e GESTOREs podem acessar todos os registros

### 3.2 Tabela "cidadao"

**Política**: cidadao_access_policy

**Regras de Acesso**:
- Usuários podem acessar apenas cidadãos de sua unidade
- ADMINs e GESTOREs podem acessar todos os registros

### 3.3 Tabela "solicitacao"

**Política**: solicitacao_access_policy

**Regras de Acesso**:
- Usuários podem acessar apenas solicitações de sua unidade
- ADMINs e GESTOREs podem acessar todas as solicitações

## 4. Sistema de Auditoria

### 4.1 Função audit_changes()

**Propósito**: Registrar automaticamente metadados de criação e atualização de registros.

**Campos Rastreados**:
- `created_by`: UUID do usuário que criou o registro
- `created_at`: Timestamp da criação
- `updated_by`: UUID do usuário que atualizou o registro
- `updated_at`: Timestamp da última atualização

**Tabelas com Auditoria Ativa**:
- cidadao
- solicitacao

## 5. Considerações de Segurança

### 5.1 Configuração do Contexto

- O contexto do usuário (ID, role, unidade) deve ser configurado no início de cada sessão
- Utilizar `SET app.current_user_id`, `SET app.current_user_role`, etc.
- Validar a presença das variáveis de contexto antes das operações

### 5.2 Performance

- As políticas RLS são avaliadas em cada operação de leitura/escrita
- Índices apropriados devem ser mantidos nos campos de unidade_id
- Monitorar o impacto das políticas em consultas complexas

### 5.3 Manutenção

- Revisar políticas ao adicionar novas funcionalidades
- Manter documentação atualizada sobre novas políticas
- Realizar testes de segurança periódicos

## 6. Exemplos de Uso

### 6.1 Configuração de Contexto

```sql
-- Configurar contexto para sessão
SET app.current_user_id = '123e4567-e89b-12d3-a456-426614174000';
SET app.current_user_role = 'TECNICO';
SET app.current_user_unidade_id = '123e4567-e89b-12d3-a456-426614174001';
```

### 6.2 Verificação de Políticas

```sql
-- Testar acesso a registros
SELECT * FROM cidadao WHERE id = 'some-uuid';
-- RLS aplicará automaticamente as restrições baseadas no contexto
```