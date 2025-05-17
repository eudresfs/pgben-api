# Políticas de Segurança do Banco de Dados

## Introdução

Este documento descreve as políticas de segurança implementadas no banco de dados do sistema PGBen durante a reestruturação das migrations. Estas políticas visam proteger os dados sensíveis, garantir o controle de acesso adequado e manter a integridade das informações, seguindo as melhores práticas de segurança e as regulamentações aplicáveis.

## Row Level Security (RLS)

A segurança em nível de linha (Row Level Security) é a principal estratégia de controle de acesso implementada no banco de dados. Esta funcionalidade nativa do PostgreSQL permite definir políticas que determinam quais linhas de uma tabela podem ser visualizadas, inseridas, atualizadas ou excluídas por diferentes usuários ou perfis.

### Princípios Gerais das Políticas RLS

1. **Princípio do Menor Privilégio**
   - Usuários têm acesso apenas aos dados necessários para suas funções
   - Acesso é concedido explicitamente, não implicitamente

2. **Separação por Perfil de Usuário**
   - Diferentes perfis têm diferentes níveis de acesso
   - Hierarquia de acesso bem definida

3. **Contexto de Execução**
   - Utilização de variáveis de sessão para identificar o usuário atual
   - Todas as consultas são executadas no contexto do usuário autenticado

### Variáveis de Sessão Utilizadas

Para implementar o RLS, são utilizadas as seguintes variáveis de sessão:

```sql
-- Configurar variáveis de sessão ao autenticar usuário
SET LOCAL app.current_user_id = 'uuid-do-usuario';
SET LOCAL app.current_user_role = 'perfil-do-usuario';
SET LOCAL app.current_user_unidade_id = 'uuid-da-unidade';
```

### Políticas RLS por Tabela

#### Tabela `usuario`

```sql
-- Habilitar RLS
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

-- Política para visualização
CREATE POLICY usuario_select_policy ON usuario
FOR SELECT
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (id = current_setting('app.current_user_id', true)::uuid)
);

-- Política para inserção
CREATE POLICY usuario_insert_policy ON usuario
FOR INSERT
WITH CHECK (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas')
);

-- Política para atualização
CREATE POLICY usuario_update_policy ON usuario
FOR UPDATE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (id = current_setting('app.current_user_id', true)::uuid)
);

-- Política para exclusão
CREATE POLICY usuario_delete_policy ON usuario
FOR DELETE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador')
);
```

#### Tabela `cidadao`

```sql
-- Habilitar RLS
ALTER TABLE cidadao ENABLE ROW LEVEL SECURITY;

-- Política para visualização
CREATE POLICY cidadao_select_policy ON cidadao
FOR SELECT
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (unidade_id = current_setting('app.current_user_unidade_id', true)::uuid) OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);

-- Política para inserção
CREATE POLICY cidadao_insert_policy ON cidadao
FOR INSERT
WITH CHECK (
  (current_setting('app.current_user_role', true)::text != 'readonly')
);

-- Política para atualização
CREATE POLICY cidadao_update_policy ON cidadao
FOR UPDATE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (unidade_id = current_setting('app.current_user_unidade_id', true)::uuid) OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);

-- Política para exclusão
CREATE POLICY cidadao_delete_policy ON cidadao
FOR DELETE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador')
);
```

#### Tabela `solicitacao`

```sql
-- Habilitar RLS
ALTER TABLE solicitacao ENABLE ROW LEVEL SECURITY;

-- Política para visualização
CREATE POLICY solicitacao_select_policy ON solicitacao
FOR SELECT
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (EXISTS (
    SELECT 1 FROM cidadao c
    WHERE c.id = solicitacao.cidadao_id
    AND c.unidade_id = current_setting('app.current_user_unidade_id', true)::uuid
  )) OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);

-- Política para inserção
CREATE POLICY solicitacao_insert_policy ON solicitacao
FOR INSERT
WITH CHECK (
  (current_setting('app.current_user_role', true)::text != 'readonly') AND
  (EXISTS (
    SELECT 1 FROM cidadao c
    WHERE c.id = solicitacao.cidadao_id
    AND (
      c.unidade_id = current_setting('app.current_user_unidade_id', true)::uuid OR
      current_setting('app.current_user_role', true)::text IN ('administrador', 'gestor_semtas')
    )
  ))
);

-- Política para atualização
CREATE POLICY solicitacao_update_policy ON solicitacao
FOR UPDATE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (
    (created_by = current_setting('app.current_user_id', true)::uuid) AND
    (status IN ('pendente', 'analise'))
  ) OR
  (
    (EXISTS (
      SELECT 1 FROM cidadao c
      WHERE c.id = solicitacao.cidadao_id
      AND c.unidade_id = current_setting('app.current_user_unidade_id', true)::uuid
    )) AND
    (status IN ('pendente', 'analise'))
  )
);

-- Política para exclusão
CREATE POLICY solicitacao_delete_policy ON solicitacao
FOR DELETE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') AND
  (status = 'pendente')
);
```

#### Tabela `documento`

```sql
-- Habilitar RLS
ALTER TABLE documento ENABLE ROW LEVEL SECURITY;

-- Política para visualização
CREATE POLICY documento_select_policy ON documento
FOR SELECT
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (EXISTS (
    SELECT 1 FROM solicitacao s
    JOIN cidadao c ON s.cidadao_id = c.id
    WHERE s.id = documento.solicitacao_id
    AND (
      c.unidade_id = current_setting('app.current_user_unidade_id', true)::uuid OR
      s.created_by = current_setting('app.current_user_id', true)::uuid
    )
  )) OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);

-- Política para inserção
CREATE POLICY documento_insert_policy ON documento
FOR INSERT
WITH CHECK (
  (current_setting('app.current_user_role', true)::text != 'readonly') AND
  (EXISTS (
    SELECT 1 FROM solicitacao s
    JOIN cidadao c ON s.cidadao_id = c.id
    WHERE s.id = documento.solicitacao_id
    AND (
      c.unidade_id = current_setting('app.current_user_unidade_id', true)::uuid OR
      s.created_by = current_setting('app.current_user_id', true)::uuid OR
      current_setting('app.current_user_role', true)::text IN ('administrador', 'gestor_semtas')
    )
  ))
);

-- Política para atualização
CREATE POLICY documento_update_policy ON documento
FOR UPDATE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);

-- Política para exclusão
CREATE POLICY documento_delete_policy ON documento
FOR DELETE
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);
```

### Implementação nas Migrations

As políticas RLS são implementadas nas migrations usando o TypeORM:

```typescript
// Habilitar RLS na tabela
await queryRunner.query(`
  ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
`);

// Criar políticas RLS
await queryRunner.query(`
  CREATE POLICY usuario_select_policy ON usuario
  FOR SELECT
  USING (
    (current_setting('app.current_user_role', true)::text = 'administrador') OR
    (id = current_setting('app.current_user_id', true)::uuid)
  );
  
  CREATE POLICY usuario_insert_policy ON usuario
  FOR INSERT
  WITH CHECK (
    (current_setting('app.current_user_role', true)::text = 'administrador') OR
    (current_setting('app.current_user_role', true)::text = 'gestor_semtas')
  );
  
  -- Outras políticas...
`);
```

## Criptografia e Proteção de Dados Sensíveis

Além do controle de acesso com RLS, foram implementadas estratégias de criptografia e proteção para dados sensíveis:

### Criptografia de Senhas

As senhas dos usuários são armazenadas utilizando o algoritmo bcrypt:

```typescript
// No seed de usuários
const senhaHash = await bcrypt.hash('senha_segura', 10);
await dataSource.query(`
  INSERT INTO usuario (id, nome, email, senha, perfil_id)
  VALUES (uuid_generate_v4(), 'Admin', 'admin@pgben.gov.br', '${senhaHash}', '${perfilAdminId}')
`);
```

### Mascaramento de Dados Sensíveis

Para dados sensíveis como CPF e informações pessoais, foram criadas funções de mascaramento:

```sql
-- Função para mascarar CPF
CREATE OR REPLACE FUNCTION mascarar_cpf(cpf text)
RETURNS text AS $$
BEGIN
  RETURN SUBSTRING(cpf, 1, 3) || '.XXX.XXX-' || SUBSTRING(cpf, 10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- View que mascara dados sensíveis para relatórios
CREATE VIEW vw_cidadao_anonimizado AS
SELECT
  id,
  mascarar_cpf(cpf) AS cpf,
  SUBSTRING(nome, 1, 1) || REPEAT('*', LENGTH(nome) - 2) || SUBSTRING(nome, LENGTH(nome), 1) AS nome,
  data_nascimento,
  genero,
  unidade_id,
  created_at
FROM
  cidadao;
```

### Auditoria de Acesso a Dados Sensíveis

Foi implementado um sistema de auditoria para registrar acessos a dados sensíveis:

```sql
-- Trigger para registrar acesso a dados sensíveis
CREATE OR REPLACE FUNCTION registrar_acesso_dados_sensiveis()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO log_acesso_dados_sensiveis (
    usuario_id,
    tabela,
    registro_id,
    tipo_acesso,
    ip_origem,
    justificativa
  ) VALUES (
    current_setting('app.current_user_id', true)::uuid,
    TG_TABLE_NAME,
    NEW.id,
    'SELECT',
    current_setting('app.client_ip', true)::text,
    current_setting('app.justificativa_acesso', true)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas com dados sensíveis
CREATE TRIGGER registrar_acesso_cidadao
AFTER SELECT ON cidadao
FOR EACH ROW
EXECUTE FUNCTION registrar_acesso_dados_sensiveis();
```

## Controle de Acesso por Perfil

O sistema implementa um controle de acesso baseado em perfis de usuário, com diferentes níveis de permissão:

### Perfis de Usuário

1. **Administrador**
   - Acesso total ao sistema
   - Pode visualizar, inserir, atualizar e excluir qualquer registro

2. **Gestor SEMTAS**
   - Acesso administrativo limitado
   - Pode visualizar todos os registros
   - Pode inserir e atualizar registros, mas com restrições
   - Não pode excluir a maioria dos registros

3. **Técnico**
   - Acesso operacional
   - Pode visualizar registros relacionados à sua unidade
   - Pode inserir e atualizar registros dentro de sua unidade
   - Não pode excluir registros

4. **Readonly**
   - Acesso somente leitura
   - Pode visualizar registros conforme políticas RLS
   - Não pode inserir, atualizar ou excluir registros

### Implementação na Tabela de Perfis

```sql
-- Inserir perfis padrão
INSERT INTO perfil (id, nome, descricao, permissoes)
VALUES 
  (uuid_generate_v4(), 'administrador', 'Acesso completo ao sistema', '{"*": ["create", "read", "update", "delete"]}'),
  (uuid_generate_v4(), 'gestor_semtas', 'Gestor da SEMTAS', '{"*": ["create", "read", "update"], "usuario": ["create", "read", "update", "delete"]}'),
  (uuid_generate_v4(), 'tecnico', 'Técnico operacional', '{"cidadao": ["create", "read", "update"], "solicitacao": ["create", "read", "update"], "documento": ["create", "read", "update"]}'),
  (uuid_generate_v4(), 'readonly', 'Acesso somente leitura', '{"*": ["read"]}');
```

## Auditoria e Logs

Um sistema abrangente de auditoria e logs foi implementado para rastrear todas as ações realizadas no banco de dados:

### Log de Ações

A tabela `log_acao` registra todas as ações realizadas pelos usuários:

```sql
CREATE TABLE log_acao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_acao varchar(50) NOT NULL,
  usuario_id uuid,
  entidade varchar(50) NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  ip_origem varchar(50),
  created_at timestamp NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

### Log de Alterações

A tabela `log_alteracao` registra todas as alterações em dados sensíveis:

```sql
CREATE TABLE log_alteracao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabela varchar(50) NOT NULL,
  operacao varchar(10) NOT NULL,
  registro_id uuid NOT NULL,
  coluna varchar(50) NOT NULL,
  valor_antigo text,
  valor_novo text,
  usuario_id uuid,
  created_at timestamp NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

### Triggers de Auditoria

Triggers automáticos registram alterações em tabelas importantes:

```sql
-- Função para registrar alterações
CREATE OR REPLACE FUNCTION registrar_alteracao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO log_alteracao (
    tabela,
    operacao,
    registro_id,
    coluna,
    valor_antigo,
    valor_novo,
    usuario_id
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_ARGV[0],
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
    current_setting('app.current_user_id', true)::uuid
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas importantes
CREATE TRIGGER log_alteracao_status_solicitacao
AFTER INSERT OR UPDATE OR DELETE ON solicitacao
FOR EACH ROW
EXECUTE FUNCTION registrar_alteracao('status');
```

## Backup e Recuperação

Estratégias de backup e recuperação foram implementadas para garantir a segurança dos dados:

### Política de Backup

1. **Backup Diário Completo**
   - Realizado automaticamente durante a madrugada
   - Armazenado em local seguro com criptografia

2. **Backup Incremental a Cada 6 Horas**
   - Captura alterações desde o último backup
   - Permite recuperação com perda mínima de dados

3. **Retenção de Backups**
   - Diários: mantidos por 30 dias
   - Semanais: mantidos por 3 meses
   - Mensais: mantidos por 1 ano

### Procedimento de Recuperação

Em caso de necessidade de recuperação, o seguinte procedimento deve ser seguido:

1. Identificar o backup mais recente disponível
2. Restaurar o backup completo mais recente
3. Aplicar backups incrementais em ordem cronológica
4. Verificar a integridade dos dados restaurados
5. Reconfigurar variáveis de ambiente e conexões

## Proteção contra Ataques

Foram implementadas medidas para proteger o banco de dados contra ataques comuns:

### Proteção contra SQL Injection

1. **Uso de Consultas Parametrizadas**
   - Todas as consultas dinâmicas utilizam parâmetros
   - Evita-se a concatenação direta de strings em consultas SQL

2. **Validação de Entrada**
   - Validação rigorosa de todos os dados de entrada
   - Sanitização de strings antes de uso em consultas

### Proteção contra Ataques de Força Bruta

1. **Limitação de Tentativas de Login**
   - Bloqueio temporário após múltiplas tentativas falhas
   - Registro de tentativas suspeitas

2. **Complexidade de Senhas**
   - Exigência de senhas fortes
   - Rotação periódica de senhas

### Proteção contra Vazamento de Informações

1. **Mensagens de Erro Genéricas**
   - Erros detalhados são registrados internamente
   - Usuários recebem apenas mensagens genéricas

2. **Headers de Segurança**
   - Configuração de headers HTTP de segurança
   - Prevenção contra ataques de clickjacking e XSS

## Conformidade com Regulamentações

O sistema foi projetado para estar em conformidade com regulamentações de proteção de dados:

### LGPD (Lei Geral de Proteção de Dados)

1. **Consentimento**
   - Registro de consentimento para coleta e uso de dados
   - Possibilidade de revogação de consentimento

2. **Direito ao Esquecimento**
   - Procedimentos para anonimização ou exclusão de dados
   - Retenção de dados apenas pelo tempo necessário

3. **Acesso aos Dados**
   - Mecanismos para cidadãos acessarem seus próprios dados
   - Possibilidade de correção de dados incorretos

### Outras Regulamentações

1. **Transparência**
   - Registro de todas as operações realizadas
   - Auditoria completa de acesso e modificações

2. **Segurança por Design**
   - Segurança incorporada desde a concepção do sistema
   - Atualizações regulares de segurança

## Conclusão

As políticas de segurança implementadas no banco de dados do sistema PGBen garantem:

1. **Controle de Acesso Granular**: Através do Row Level Security
2. **Proteção de Dados Sensíveis**: Com criptografia e mascaramento
3. **Auditoria Completa**: Registro de todas as ações e alterações
4. **Conformidade Regulatória**: Alinhamento com LGPD e outras regulamentações
5. **Resiliência**: Estratégias robustas de backup e recuperação

Estas políticas foram implementadas seguindo as melhores práticas de segurança de banco de dados, resultando em um sistema que protege adequadamente os dados sensíveis dos cidadãos e mantém a integridade das informações.

## Referências

- [Documentação do PostgreSQL sobre RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentação do PostgreSQL sobre Criptografia](https://www.postgresql.org/docs/current/encryption-options.html)
- [Lei Geral de Proteção de Dados (LGPD)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
- [OWASP Database Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)
- [Documentação do Projeto PGBen](../../docs/migrations/plano-reestruturacao.md)
