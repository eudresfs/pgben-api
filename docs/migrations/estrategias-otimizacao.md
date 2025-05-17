# Estratégias de Otimização do Banco de Dados

## Introdução

Este documento descreve as estratégias de otimização implementadas no banco de dados do sistema PGBen durante a reestruturação das migrations. Estas estratégias visam melhorar a performance, escalabilidade e segurança do sistema, garantindo uma experiência eficiente para os usuários finais.

## Índices

Os índices são estruturas de dados que melhoram a velocidade de recuperação de registros em uma tabela. Eles foram implementados estrategicamente em todas as tabelas do sistema, seguindo estas diretrizes:

### Tipos de Índices Implementados

1. **Índices em Chaves Primárias**
   - Todas as tabelas possuem índices automáticos em suas chaves primárias (colunas `id`)
   - Exemplo: Índice na coluna `id` da tabela `usuario`

2. **Índices em Chaves Estrangeiras**
   - Todas as chaves estrangeiras foram indexadas para otimizar JOINs
   - Exemplo: `IDX_SOLICITACAO_CIDADAO` na coluna `cidadao_id` da tabela `solicitacao`

3. **Índices em Colunas de Filtro Frequente**
   - Colunas frequentemente usadas em cláusulas WHERE foram indexadas
   - Exemplo: `IDX_CIDADAO_CPF` na coluna `cpf` da tabela `cidadao`

4. **Índices em Colunas de Ordenação**
   - Colunas frequentemente usadas em cláusulas ORDER BY foram indexadas
   - Exemplo: `IDX_SOLICITACAO_DATA` na coluna `data_solicitacao` da tabela `solicitacao`

5. **Índices Compostos**
   - Para consultas que filtram por múltiplas colunas simultaneamente
   - Exemplo: `IDX_SOLICITACAO_STATUS_DATA` nas colunas `status` e `data_solicitacao` da tabela `solicitacao`

### Estratégia de Nomeação de Índices

Os índices seguem um padrão de nomenclatura consistente:
- Prefixo `IDX_`
- Nome da tabela em maiúsculas
- Nome da(s) coluna(s) em maiúsculas
- Exemplo: `IDX_USUARIO_EMAIL`

### Exemplo de Implementação

```typescript
// Criar índice simples
await queryRunner.createIndex(
  'cidadao',
  new TableIndex({
    name: 'IDX_CIDADAO_CPF',
    columnNames: ['cpf'],
  })
);

// Criar índice composto
await queryRunner.createIndex(
  'solicitacao',
  new TableIndex({
    name: 'IDX_SOLICITACAO_STATUS_DATA',
    columnNames: ['status', 'data_solicitacao'],
  })
);
```

## Particionamento de Tabelas

O particionamento de tabelas foi implementado para tabelas que armazenam grandes volumes de dados, especialmente logs e históricos. Esta estratégia melhora a performance de consultas e facilita a manutenção dos dados.

### Tabelas Particionadas

1. **log_acao**
   - Particionada por mês com base na coluna `created_at`
   - Cada partição contém os logs de um mês específico

2. **log_alteracao**
   - Particionada por mês com base na coluna `created_at`
   - Cada partição contém os registros de alterações de um mês específico

3. **historico_status_solicitacao**
   - Particionada por mês com base na coluna `data_alteracao`
   - Cada partição contém os históricos de status de um mês específico

### Estratégia de Particionamento

Foi utilizado o particionamento por RANGE (intervalo) baseado em data, com as seguintes características:

- Partições mensais para facilitar a manutenção
- Criação automática de novas partições conforme necessário
- Política de retenção para dados antigos (arquivamento ou exclusão após período definido)

### Exemplo de Implementação

```sql
-- Criar tabela particionada
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

-- Criar partições iniciais
CREATE TABLE log_acao_y2025m01 PARTITION OF log_acao
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
  
CREATE TABLE log_acao_y2025m02 PARTITION OF log_acao
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Criar índices na tabela particionada
CREATE INDEX IDX_LOG_ACAO_CREATED_AT ON log_acao(created_at);
CREATE INDEX IDX_LOG_ACAO_USUARIO ON log_acao(usuario_id);
CREATE INDEX IDX_LOG_ACAO_ENTIDADE ON log_acao(entidade, entidade_id);
```

## Otimização de Consultas

Além dos índices e particionamento, foram implementadas outras estratégias para otimizar as consultas ao banco de dados:

### Views Materializadas

Views materializadas foram criadas para consultas analíticas complexas que são executadas com frequência, mas não necessitam de dados em tempo real:

1. **view_resumo_solicitacoes**
   - Resumo de solicitações por status, tipo de benefício e período
   - Atualizada diariamente através de um job agendado

2. **view_estatisticas_beneficios**
   - Estatísticas sobre benefícios concedidos por tipo, região e período
   - Atualizada diariamente através de um job agendado

### Exemplo de Implementação

```sql
-- Criar view materializada
CREATE MATERIALIZED VIEW view_resumo_solicitacoes AS
SELECT 
  tipo_beneficio_id,
  tb.nome AS nome_beneficio,
  s.status,
  COUNT(*) AS total,
  SUM(valor_beneficio) AS valor_total,
  DATE_TRUNC('month', data_solicitacao) AS mes
FROM 
  solicitacao s
JOIN 
  tipo_beneficio tb ON s.tipo_beneficio_id = tb.id
GROUP BY 
  tipo_beneficio_id, tb.nome, s.status, DATE_TRUNC('month', data_solicitacao);

-- Criar índice na view materializada
CREATE INDEX IDX_VIEW_RESUMO_SOLICITACOES_MES ON view_resumo_solicitacoes(mes);
CREATE INDEX IDX_VIEW_RESUMO_SOLICITACOES_TIPO ON view_resumo_solicitacoes(tipo_beneficio_id);
```

### Consultas Otimizadas

Foram criadas funções no banco de dados para consultas complexas frequentemente utilizadas:

1. **buscar_solicitacoes_por_filtro**
   - Função que aceita múltiplos parâmetros de filtro e retorna solicitações paginadas
   - Utiliza índices compostos para otimizar a performance

2. **buscar_cidadaos_por_criterio**
   - Função que implementa busca avançada de cidadãos com múltiplos critérios
   - Utiliza índices e técnicas de otimização de texto para melhorar a performance

### Exemplo de Implementação

```sql
-- Criar função para busca otimizada
CREATE OR REPLACE FUNCTION buscar_solicitacoes_por_filtro(
  p_status varchar DEFAULT NULL,
  p_tipo_beneficio_id uuid DEFAULT NULL,
  p_data_inicio timestamp DEFAULT NULL,
  p_data_fim timestamp DEFAULT NULL,
  p_cidadao_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  numero varchar,
  cidadao_id uuid,
  nome_cidadao varchar,
  tipo_beneficio_id uuid,
  nome_beneficio varchar,
  status varchar,
  data_solicitacao timestamp,
  valor_beneficio numeric,
  total_registros bigint
) AS $$
DECLARE
  v_where text := '';
  v_count text;
  v_query text;
BEGIN
  -- Construir cláusula WHERE dinamicamente
  IF p_status IS NOT NULL THEN
    v_where := v_where || ' AND s.status = ' || quote_literal(p_status);
  END IF;
  
  IF p_tipo_beneficio_id IS NOT NULL THEN
    v_where := v_where || ' AND s.tipo_beneficio_id = ' || quote_literal(p_tipo_beneficio_id);
  END IF;
  
  IF p_data_inicio IS NOT NULL THEN
    v_where := v_where || ' AND s.data_solicitacao >= ' || quote_literal(p_data_inicio);
  END IF;
  
  IF p_data_fim IS NOT NULL THEN
    v_where := v_where || ' AND s.data_solicitacao <= ' || quote_literal(p_data_fim);
  END IF;
  
  IF p_cidadao_id IS NOT NULL THEN
    v_where := v_where || ' AND s.cidadao_id = ' || quote_literal(p_cidadao_id);
  END IF;
  
  -- Remover o AND inicial se houver condições
  IF length(v_where) > 0 THEN
    v_where := ' WHERE ' || substring(v_where from 5);
  END IF;
  
  -- Contar total de registros
  v_count := 'SELECT COUNT(*) FROM solicitacao s' || v_where;
  EXECUTE v_count INTO total_registros;
  
  -- Construir query principal
  v_query := '
    SELECT 
      s.id,
      s.numero,
      s.cidadao_id,
      c.nome AS nome_cidadao,
      s.tipo_beneficio_id,
      tb.nome AS nome_beneficio,
      s.status,
      s.data_solicitacao,
      s.valor_beneficio,
      ' || total_registros || ' AS total_registros
    FROM 
      solicitacao s
    JOIN 
      cidadao c ON s.cidadao_id = c.id
    JOIN 
      tipo_beneficio tb ON s.tipo_beneficio_id = tb.id
    ' || v_where || '
    ORDER BY 
      s.data_solicitacao DESC
    LIMIT ' || p_limit || ' OFFSET ' || p_offset;
  
  -- Executar query
  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;
```

## Otimização de Estrutura de Dados

### Tipos de Dados Otimizados

Foram utilizados tipos de dados apropriados para cada coluna, considerando o tamanho e a natureza dos dados:

1. **UUID para Identificadores**
   - Todas as chaves primárias utilizam UUID em vez de inteiros sequenciais
   - Vantagens: distribuição uniforme, segurança, facilidade em ambientes distribuídos

2. **Tipos Enumerados**
   - Utilização de tipos enumerados do PostgreSQL para valores predefinidos
   - Exemplo: `status_solicitacao_enum`, `tipo_beneficio_enum`

3. **JSONB para Dados Flexíveis**
   - Utilização de JSONB para armazenar dados com estrutura variável
   - Exemplo: `dados_especificos` na tabela `solicitacao`
   - Índices GIN para consultas eficientes em campos JSONB

### Normalização e Desnormalização Estratégica

1. **Normalização**
   - Tabelas principais seguem o princípio de normalização para evitar redundância
   - Exemplo: Separação de `cidadao`, `endereco`, `contato`

2. **Desnormalização Estratégica**
   - Algumas informações são desnormalizadas para otimizar consultas frequentes
   - Exemplo: `valor_total` na tabela `solicitacao` (calculado a partir das parcelas)

### Exemplo de Implementação

```typescript
// Criar tipo enumerado
await queryRunner.query(`
  CREATE TYPE status_solicitacao_enum AS ENUM (
    'pendente',
    'analise',
    'aprovado',
    'reprovado',
    'cancelado'
  );
`);

// Utilizar JSONB para dados flexíveis
await queryRunner.query(`
  ALTER TABLE solicitacao
  ADD COLUMN dados_especificos JSONB;
`);

// Criar índice GIN para consultas em JSONB
await queryRunner.query(`
  CREATE INDEX IDX_SOLICITACAO_DADOS_ESPECIFICOS ON solicitacao USING GIN (dados_especificos);
`);
```

## Segurança com Row Level Security (RLS)

A segurança em nível de linha (RLS) foi implementada para garantir que os usuários só possam acessar os dados aos quais têm permissão, melhorando tanto a segurança quanto a performance:

### Políticas RLS Implementadas

1. **Política para Usuários**
   - Administradores podem ver todos os usuários
   - Usuários comuns só podem ver seu próprio registro

2. **Política para Cidadãos**
   - Administradores e gestores podem ver todos os cidadãos
   - Técnicos só podem ver cidadãos cadastrados em sua unidade

3. **Política para Solicitações**
   - Administradores podem ver todas as solicitações
   - Gestores podem ver solicitações de suas unidades
   - Técnicos só podem ver solicitações que cadastraram ou que estão em sua unidade

### Exemplo de Implementação

```sql
-- Habilitar RLS na tabela
ALTER TABLE solicitacao ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY solicitacao_policy ON solicitacao
USING (
  (current_setting('app.current_user_role', true)::text = 'administrador') OR
  (current_setting('app.current_user_role', true)::text = 'gestor_semtas' AND
   EXISTS (
     SELECT 1 FROM usuario u
     WHERE u.id = current_setting('app.current_user_id', true)::uuid
     AND u.unidade_id = (SELECT c.unidade_id FROM cidadao c WHERE c.id = solicitacao.cidadao_id)
   )) OR
  (created_by = current_setting('app.current_user_id', true)::uuid)
);
```

## Triggers e Funções Automatizadas

Foram implementados triggers e funções para automatizar tarefas comuns e garantir a integridade dos dados:

### Triggers Implementados

1. **Atualização Automática de Timestamps**
   - Trigger que atualiza automaticamente a coluna `updated_at` em todas as tabelas

2. **Registro de Alterações**
   - Trigger que registra automaticamente alterações em tabelas importantes na tabela `log_alteracao`

3. **Atualização de Valores Calculados**
   - Trigger que atualiza valores calculados quando os dados relacionados são alterados

### Exemplo de Implementação

```sql
-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
CREATE TRIGGER set_solicitacao_updated_at
BEFORE UPDATE ON solicitacao
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

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
    NEW.id,
    TG_ARGV[0],
    OLD.status,
    NEW.status,
    current_setting('app.current_user_id', true)::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar alterações de status
CREATE TRIGGER registrar_alteracao_status_solicitacao
AFTER UPDATE OF status ON solicitacao
FOR EACH ROW
EXECUTE FUNCTION registrar_alteracao('status');
```

## Monitoramento e Manutenção

Foram implementadas estratégias para facilitar o monitoramento e a manutenção do banco de dados:

### Estatísticas e Análise

1. **Coleta de Estatísticas**
   - Configuração para coleta automática de estatísticas do banco de dados
   - Utilização dessas estatísticas pelo planejador de consultas

2. **Análise de Performance**
   - Criação de views para análise de performance de consultas
   - Monitoramento de consultas lentas

### Manutenção Automatizada

1. **Vacuum Automático**
   - Configuração de vacuum automático para recuperar espaço e atualizar estatísticas

2. **Arquivamento de Dados Antigos**
   - Estratégia para arquivamento de dados antigos em partições históricas
   - Procedimento para exclusão segura de dados obsoletos

## Conclusão

As estratégias de otimização implementadas no banco de dados do sistema PGBen garantem:

1. **Alta Performance**: Consultas rápidas mesmo com grande volume de dados
2. **Escalabilidade**: Estrutura preparada para crescimento contínuo dos dados
3. **Segurança**: Controle de acesso granular com Row Level Security
4. **Manutenção Simplificada**: Particionamento e automação facilitam a manutenção
5. **Integridade dos Dados**: Triggers e constraints garantem a consistência

Estas estratégias foram implementadas seguindo as melhores práticas do PostgreSQL e do TypeORM, resultando em um banco de dados robusto, eficiente e seguro para o sistema PGBen.

## Referências

- [Documentação do PostgreSQL sobre Índices](https://www.postgresql.org/docs/current/indexes.html)
- [Documentação do PostgreSQL sobre Particionamento](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Documentação do PostgreSQL sobre RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentação do TypeORM sobre Índices](https://typeorm.io/#/indices)
- [Documentação do Projeto PGBen](../../docs/migrations/plano-reestruturacao.md)
