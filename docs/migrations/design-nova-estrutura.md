# Design da Nova Estrutura de Migrations - PGBen

## Visão Geral

Este documento detalha o design da nova estrutura de migrations para o Sistema de Gestão de Benefícios Eventuais da SEMTAS. A estrutura proposta organiza as migrations por domínios de negócio, seguindo um padrão de nomenclatura consistente e implementando otimizações importantes para performance e segurança.

## Hierarquia de Migrations por Domínio

```
migrations/
├── 1000000-CreateBaseStructure.ts          // Estrutura base (extensões, schemas)
├── 1010000-CreateAuthSchema.ts             // Autenticação e autorização
├── 1020000-CreateCidadaoSchema.ts          // Módulo de cidadão
├── 1030000-CreateBeneficioSchema.ts        // Definição de benefícios
├── 1040000-CreateSolicitacaoSchema.ts      // Solicitações de benefícios
├── 1050000-CreateDocumentoSchema.ts        // Gestão de documentos
├── 1060000-CreateAuditoriaSchema.ts        // Auditoria e logs
├── 1070000-CreateRelatorioSchema.ts        // Relatórios e dashboards
└── 1080000-CreateIntegracaoSchema.ts       // Integrações externas
```

## Padrão de Nomenclatura

Cada migration seguirá o padrão:

```typescript
export class CreateAuthSchema1010000 implements MigrationInterface {
  name = 'CreateAuthSchema20250512122000';
  
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Implementação coesa por domínio
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversão completa e testada
  }
}
```

## Estrutura de Seeds

```
seeds/
├── core/                          
│   ├── 001-roles.seed.ts          // Papéis de usuário
│   ├── 002-unidades.seed.ts       // Unidades da SEMTAS
│   └── 003-setores.seed.ts        // Setores por unidade
├── reference/                     
│   ├── 001-tipos-beneficio.seed.ts // Tipos de benefícios
│   ├── 002-criterios.seed.ts      // Critérios de elegibilidade
│   └── 003-documentos.seed.ts     // Tipos de documentos
├── development/                   
│   ├── 001-usuarios.seed.ts       // Usuários para desenvolvimento
│   ├── 002-cidadaos.seed.ts       // Cidadãos para testes
│   └── 003-solicitacoes.seed.ts   // Solicitações de exemplo
└── utils/                         
    ├── seed-runner.ts             // Executor de seeds
    └── data-generator.ts          // Gerador de dados aleatórios
```

## Template para Novas Migrations

```typescript
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: [Nome da Migration]
 * 
 * Descrição: [Descrição detalhada do propósito da migration]
 * 
 * Domínio: [Domínio de negócio]
 * Dependências: [Outras migrations que devem ser executadas antes]
 * 
 * @author [Nome do autor]
 * @date [Data de criação]
 */
export class NomeMigration1000000 implements MigrationInterface {
  name = 'NomeMigration20250512000000';

  /**
   * Cria as estruturas de banco de dados
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    
    // 2. Criar tabelas
    
    // 3. Criar índices
    
    // 4. Criar chaves estrangeiras
    
    // 5. Criar triggers e funções
    
    // 6. Configurar políticas RLS
    
    // 7. Inserir dados iniciais (se necessário)
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter na ordem inversa da criação
    
    // 1. Remover políticas RLS
    
    // 2. Remover triggers e funções
    
    // 3. Remover chaves estrangeiras
    
    // 4. Remover índices
    
    // 5. Remover tabelas
    
    // 6. Remover tipos enumerados
  }
}
```

## Estratégias de Otimização

### 1. Indexação Estratégica

```typescript
// Índice B-tree padrão
await queryRunner.createIndex(
  'cidadao',
  new TableIndex({
    name: 'IDX_CIDADAO_CPF',
    columnNames: ['cpf'],
    where: "removed_at IS NULL", // Índice parcial
  }),
);

// Índice para busca por nome (usando índice GIN para busca textual)
await queryRunner.query(`
  CREATE INDEX IDX_CIDADAO_NOME_GIN ON cidadao 
  USING gin(to_tsvector('portuguese', nome));
`);

// Índice para campos JSON (para campos dinâmicos de benefícios)
await queryRunner.query(`
  CREATE INDEX IDX_SOLICITACAO_DADOS_DINAMICOS ON solicitacao_beneficio 
  USING gin(dados_dinamicos jsonb_path_ops);
`);

// Índice para consultas específicas em campos JSON
await queryRunner.query(`
  CREATE INDEX IDX_SOLICITACAO_TIPO_BENEFICIO ON solicitacao_beneficio 
  ((dados_dinamicos->>'tipo_beneficio'));
`);
```

### 2. Particionamento de Tabelas

```typescript
// Particionamento da tabela de auditoria por mês
await queryRunner.query(`
  CREATE TABLE log_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entidade VARCHAR NOT NULL,
    entidade_id UUID NOT NULL,
    operacao VARCHAR NOT NULL,
    dados JSONB,
    usuario_id UUID,
    ip_address VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  ) PARTITION BY RANGE (created_at);
  
  -- Partições iniciais (12 meses)
  CREATE TABLE log_auditoria_y2025m05 PARTITION OF log_auditoria
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
  
  CREATE TABLE log_auditoria_y2025m06 PARTITION OF log_auditoria
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
`);

// Função para criar partições automaticamente
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION criar_particao_log_auditoria()
  RETURNS TRIGGER AS $$
  DECLARE
    particao_data TEXT;
    particao_nome TEXT;
    data_inicio DATE;
    data_fim DATE;
  BEGIN
    particao_data := to_char(NEW.created_at, 'YYYY_MM');
    particao_nome := 'log_auditoria_' || particao_data;
    data_inicio := date_trunc('month', NEW.created_at);
    data_fim := data_inicio + interval '1 month';
    
    -- Verificar se a partição já existe
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = particao_nome AND n.nspname = 'public'
    ) THEN
      -- Criar nova partição
      EXECUTE format('
        CREATE TABLE %I PARTITION OF log_auditoria
        FOR VALUES FROM (%L) TO (%L)',
        particao_nome, data_inicio, data_fim
      );
      
      -- Criar índices na nova partição
      EXECUTE format('
        CREATE INDEX %I ON %I (entidade, entidade_id)',
        'idx_' || particao_nome || '_entidade', particao_nome
      );
      
      EXECUTE format('
        CREATE INDEX %I ON %I (usuario_id)',
        'idx_' || particao_nome || '_usuario', particao_nome
      );
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger para criar partições automaticamente
  CREATE TRIGGER trigger_criar_particao_log_auditoria
  BEFORE INSERT ON log_auditoria
  FOR EACH ROW EXECUTE FUNCTION criar_particao_log_auditoria();
`);
```

### 3. Políticas RLS para Segurança

```typescript
// Habilitar RLS na tabela de cidadãos
await queryRunner.query(`
  ALTER TABLE cidadao ENABLE ROW LEVEL SECURITY;
  
  -- Política para administradores (acesso total)
  CREATE POLICY admin_cidadao_policy ON cidadao
    USING (true)
    WITH CHECK (true);
    
  -- Política para técnicos (acesso apenas à sua unidade)
  CREATE POLICY tecnico_cidadao_policy ON cidadao
    USING (unidade_id IN (
      SELECT unidade_id FROM usuario_unidade WHERE usuario_id = current_setting('app.current_user_id')::uuid
    ))
    WITH CHECK (unidade_id IN (
      SELECT unidade_id FROM usuario_unidade WHERE usuario_id = current_setting('app.current_user_id')::uuid
    ));
`);

// Habilitar RLS na tabela de solicitações
await queryRunner.query(`
  ALTER TABLE solicitacao_beneficio ENABLE ROW LEVEL SECURITY;
  
  -- Política para administradores (acesso total)
  CREATE POLICY admin_solicitacao_policy ON solicitacao_beneficio
    USING (true)
    WITH CHECK (true);
    
  -- Política para técnicos (acesso apenas às solicitações da sua unidade)
  CREATE POLICY tecnico_solicitacao_policy ON solicitacao_beneficio
    USING (
      cidadao_id IN (
        SELECT id FROM cidadao 
        WHERE unidade_id IN (
          SELECT unidade_id FROM usuario_unidade 
          WHERE usuario_id = current_setting('app.current_user_id')::uuid
        )
      )
    )
    WITH CHECK (
      cidadao_id IN (
        SELECT id FROM cidadao 
        WHERE unidade_id IN (
          SELECT unidade_id FROM usuario_unidade 
          WHERE usuario_id = current_setting('app.current_user_id')::uuid
        )
      )
    );
`);
```

### 4. Constraints e Validações

```typescript
// Validação de CPF
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION validar_cpf(cpf TEXT) RETURNS BOOLEAN AS $$
  DECLARE
    soma INTEGER := 0;
    resto INTEGER;
    digito1 INTEGER;
    digito2 INTEGER;
    cpf_limpo TEXT;
  BEGIN
    -- Remover caracteres não numéricos
    cpf_limpo := regexp_replace(cpf, '[^0-9]', '', 'g');
    
    -- Verificar se tem 11 dígitos
    IF length(cpf_limpo) != 11 THEN
      RETURN FALSE;
    END IF;
    
    -- Verificar se todos os dígitos são iguais
    IF cpf_limpo ~ '^(.)\\1+$' THEN
      RETURN FALSE;
    END IF;
    
    -- Cálculo do primeiro dígito verificador
    soma := 0;
    FOR i IN 1..9 LOOP
      soma := soma + (substr(cpf_limpo, i, 1)::INTEGER * (11 - i));
    END LOOP;
    
    resto := soma % 11;
    IF resto < 2 THEN
      digito1 := 0;
    ELSE
      digito1 := 11 - resto;
    END IF;
    
    -- Cálculo do segundo dígito verificador
    soma := 0;
    FOR i IN 1..10 LOOP
      IF i < 10 THEN
        soma := soma + (substr(cpf_limpo, i, 1)::INTEGER * (12 - i));
      ELSE
        soma := soma + (digito1 * 2);
      END IF;
    END LOOP;
    
    resto := soma % 11;
    IF resto < 2 THEN
      digito2 := 0;
    ELSE
      digito2 := 11 - resto;
    END IF;
    
    -- Verificar se os dígitos calculados são iguais aos dígitos informados
    RETURN substr(cpf_limpo, 10, 1)::INTEGER = digito1 AND substr(cpf_limpo, 11, 1)::INTEGER = digito2;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
  
  -- Aplicar constraint
  ALTER TABLE cidadao ADD CONSTRAINT check_cpf_valido 
    CHECK (validar_cpf(cpf) OR cpf IS NULL);
`);

// Validação de NIS
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION validar_nis(nis TEXT) RETURNS BOOLEAN AS $$
  DECLARE
    soma INTEGER := 0;
    resto INTEGER;
    dv INTEGER;
    nis_limpo TEXT;
    pesos INTEGER[] := ARRAY[3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  BEGIN
    -- Remover caracteres não numéricos
    nis_limpo := regexp_replace(nis, '[^0-9]', '', 'g');
    
    -- Verificar se tem 11 dígitos
    IF length(nis_limpo) != 11 THEN
      RETURN FALSE;
    END IF;
    
    -- Verificar se todos os dígitos são iguais
    IF nis_limpo ~ '^(.)\\1+$' THEN
      RETURN FALSE;
    END IF;
    
    -- Cálculo do dígito verificador
    soma := 0;
    FOR i IN 1..10 LOOP
      soma := soma + (substr(nis_limpo, i, 1)::INTEGER * pesos[i]);
    END LOOP;
    
    resto := soma % 11;
    IF resto = 0 OR resto = 1 THEN
      dv := 0;
    ELSE
      dv := 11 - resto;
    END IF;
    
    -- Verificar se o dígito calculado é igual ao dígito informado
    RETURN substr(nis_limpo, 11, 1)::INTEGER = dv;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
  
  -- Aplicar constraint
  ALTER TABLE cidadao ADD CONSTRAINT check_nis_valido 
    CHECK (validar_nis(nis) OR nis IS NULL);
`);
```

## Diagrama ER da Nova Estrutura

O diagrama ER completo está disponível no arquivo `diagrama-er-nova-estrutura.png`. Abaixo está uma representação textual simplificada dos principais relacionamentos:

```
usuario (1) --- (*) usuario_unidade (*) --- (1) unidade (1) --- (*) setor
    |                                           |
    |                                           |
    v                                           v
log_auditoria                                cidadao
                                                |
                                                |
                                  +-------------+-------------+
                                  |             |             |
                                  v             v             v
                         situacao_moradia  beneficio_social  papel_cidadao
                                                              |
                                                              |
                                                              v
                                                        grupo_familiar
                                                        
tipos_beneficio
    |
    |
    +----------------+----------------+
    |                |                |
    v                v                v
requisito_documento  fluxo_beneficio  campo_dinamico_beneficio
    |                |                |
    |                |                |
    v                v                v
documento      solicitacao_beneficio  versao_schema_beneficio
                    |
                    |
    +--------------+---------------+
    |              |               |
    v              v               v
historico_solicitacao  pendencia  ocorrencia
```

## Próximos Passos

- [x] 2.1 Definir hierarquia de migrations por domínio
- [x] 2.2 Criar template para novas migrations
- [x] 2.3 Projetar esquema otimizado com índices
- [x] 2.4 Definir estratégia de particionamento para tabelas grandes
- [x] 2.5 Projetar políticas RLS para segurança
- [x] 2.6 Definir estrutura de seeds por categoria
- [ ] 2.7 Criar diagrama ER da nova estrutura
- [x] 2.8 Documentar estratégias de otimização
