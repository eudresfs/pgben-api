# Guia para Adição de Novas Migrations

## Introdução

Este guia descreve o processo para adicionar novas migrations ao sistema PGBen, seguindo as melhores práticas e padrões estabelecidos na reestruturação do banco de dados.

## Pré-requisitos

Antes de criar uma nova migration, certifique-se de:

1. Ter o ambiente de desenvolvimento configurado corretamente
2. Entender a estrutura atual do banco de dados
3. Conhecer os padrões de nomenclatura e design adotados
4. Ter uma compreensão clara das alterações que deseja implementar

## Processo de Criação de Migrations

### 1. Definir o Escopo da Migration

Antes de começar a codificar, defina claramente:

- Qual o propósito da migration?
- Quais tabelas serão afetadas?
- Quais relações precisam ser estabelecidas?
- Quais índices são necessários para otimização?
- Quais políticas de segurança devem ser implementadas?

### 2. Escolher a Numeração Adequada

As migrations seguem um padrão de numeração que indica sua ordem de execução e domínio funcional:

```
XXXXXXX-NomeDaMigration.ts
```

Onde:
- `XXXXXXX` é um número sequencial que indica a ordem de execução
- `NomeDaMigration` é um nome descritivo que indica o propósito da migration

Para novas migrations que estendem um domínio existente, use a mesma faixa de numeração com um incremento:

| Domínio Funcional | Faixa de Numeração |
|-------------------|-------------------|
| Base Structure    | 1000000 - 1009999 |
| Auth Schema       | 1010000 - 1019999 |
| Cidadão Schema    | 1020000 - 1029999 |
| Benefício Schema  | 1030000 - 1039999 |
| Solicitação Schema| 1040000 - 1049999 |
| Documento Schema  | 1050000 - 1059999 |
| Auditoria Schema  | 1060000 - 1069999 |
| Relatório Schema  | 1070000 - 1079999 |
| Integração Schema | 1080000 - 1089999 |

Para um novo domínio funcional, use a próxima faixa de numeração disponível (1090000+).

### 3. Criar o Arquivo de Migration

Use o comando do TypeORM para gerar o arquivo base da migration:

```bash
npm run migration:create -- -n NomeDaMigration
```

Isso criará um arquivo com a estrutura básica no diretório `src/database/migrations`.

### 4. Implementar a Migration

Edite o arquivo gerado seguindo estas diretrizes:

#### Estrutura Básica

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class NomeDaMigration1090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Implementação do método up
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Implementação do método down
  }
}
```

#### Método `up()`

O método `up()` deve implementar todas as alterações desejadas no banco de dados, na seguinte ordem:

1. Criação de tipos enumerados
2. Criação de tabelas
3. Criação de índices
4. Criação de chaves estrangeiras
5. Criação de triggers e funções
6. Implementação de políticas RLS

#### Método `down()`

O método `down()` deve reverter todas as alterações feitas pelo método `up()`, na ordem inversa:

1. Remoção de políticas RLS
2. Remoção de triggers e funções
3. Remoção de chaves estrangeiras
4. Remoção de índices
5. Remoção de tabelas
6. Remoção de tipos enumerados

### 5. Seguir Padrões de Nomenclatura

#### Tabelas
- Use substantivos no singular, em minúsculas, com underscores (ex: `usuario`, `tipo_beneficio`)

#### Colunas
- Use substantivos em minúsculas, com underscores (ex: `data_nascimento`, `valor_beneficio`)
- Inclua sempre as colunas de auditoria: `created_at`, `updated_at`, `created_by`, `updated_by` (quando aplicável)

#### Índices
- Use o prefixo `IDX_` seguido do nome da tabela e coluna(s) (ex: `IDX_USUARIO_EMAIL`)

#### Chaves Estrangeiras
- Use o prefixo `FK_` seguido da relação (ex: `FK_SOLICITACAO_CIDADAO`)

#### Políticas RLS
- Use o nome da tabela seguido do sufixo `_policy` (ex: `usuario_policy`)

### 6. Implementar Segurança com Row Level Security (RLS)

Para tabelas com dados sensíveis, implemente políticas RLS:

```typescript
// Habilitar RLS na tabela
await queryRunner.query(`
  ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;
`);

// Criar política RLS
await queryRunner.query(`
  CREATE POLICY nome_tabela_policy ON nome_tabela
  USING (
    (current_setting('app.current_user_role', true)::text = 'administrador') OR
    (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
    (created_by = current_setting('app.current_user_id', true)::uuid)
  );
`);
```

### 7. Otimizar Performance com Índices

Adicione índices para otimizar consultas frequentes:

```typescript
// Criar índice simples
await queryRunner.createIndex(
  'nome_tabela',
  new TableIndex({
    name: 'IDX_NOME_TABELA_COLUNA',
    columnNames: ['coluna'],
  })
);

// Criar índice composto
await queryRunner.createIndex(
  'nome_tabela',
  new TableIndex({
    name: 'IDX_NOME_TABELA_COLUNA1_COLUNA2',
    columnNames: ['coluna1', 'coluna2'],
  })
);
```

### 8. Implementar Particionamento (quando necessário)

Para tabelas que armazenarão grandes volumes de dados, considere o particionamento:

```typescript
// Criar tabela particionada
await queryRunner.query(`
  CREATE TABLE nome_tabela (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp NOT NULL,
    -- outras colunas
  ) PARTITION BY RANGE (created_at);
  
  -- Criar partições
  CREATE TABLE nome_tabela_y2025m01 PARTITION OF nome_tabela
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
  CREATE TABLE nome_tabela_y2025m02 PARTITION OF nome_tabela
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
    
  -- Adicionar mais partições conforme necessário
`);
```

## Exemplo Completo de Migration

Aqui está um exemplo completo de uma migration que cria uma nova tabela com índices, chaves estrangeiras e políticas RLS:

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNotificacaoSchema1090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipo enumerado
    await queryRunner.query(`
      CREATE TYPE tipo_notificacao_enum AS ENUM (
        'email',
        'sms',
        'push',
        'sistema'
      );
    `);
    
    // 2. Criar tabela
    await queryRunner.createTable(
      new Table({
        name: 'notificacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tipo',
            type: 'tipo_notificacao_enum',
            isNullable: false,
          },
          {
            name: 'titulo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'conteudo',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'lida',
            type: 'boolean',
            default: false,
          },
          {
            name: 'data_envio',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'data_leitura',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true
    );
    
    // 3. Criar índices
    await queryRunner.createIndex(
      'notificacao',
      new TableIndex({
        name: 'IDX_NOTIFICACAO_USUARIO',
        columnNames: ['usuario_id'],
      })
    );
    
    await queryRunner.createIndex(
      'notificacao',
      new TableIndex({
        name: 'IDX_NOTIFICACAO_CIDADAO',
        columnNames: ['cidadao_id'],
      })
    );
    
    await queryRunner.createIndex(
      'notificacao',
      new TableIndex({
        name: 'IDX_NOTIFICACAO_DATA_ENVIO',
        columnNames: ['data_envio'],
      })
    );
    
    // 4. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'notificacao',
      new TableForeignKey({
        name: 'FK_NOTIFICACAO_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
    
    await queryRunner.createForeignKey(
      'notificacao',
      new TableForeignKey({
        name: 'FK_NOTIFICACAO_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
    
    // 5. Criar trigger para atualização automática de updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_notificacao_updated_at
      BEFORE UPDATE ON notificacao
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
    
    // 6. Implementar políticas RLS
    await queryRunner.query(`
      ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY notificacao_policy ON notificacao
      USING (
        (current_setting('app.current_user_role', true)::text = 'administrador') OR
        (current_setting('app.current_user_role', true)::text = 'gestor_semtas') OR
        (usuario_id = current_setting('app.current_user_id', true)::uuid)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS notificacao_policy ON notificacao;
    `);
    
    // 2. Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS set_notificacao_updated_at ON notificacao;
    `);
    
    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey('notificacao', 'FK_NOTIFICACAO_CIDADAO');
    await queryRunner.dropForeignKey('notificacao', 'FK_NOTIFICACAO_USUARIO');
    
    // 4. Remover índices
    await queryRunner.dropIndex('notificacao', 'IDX_NOTIFICACAO_DATA_ENVIO');
    await queryRunner.dropIndex('notificacao', 'IDX_NOTIFICACAO_CIDADAO');
    await queryRunner.dropIndex('notificacao', 'IDX_NOTIFICACAO_USUARIO');
    
    // 5. Remover tabela
    await queryRunner.dropTable('notificacao');
    
    // 6. Remover tipo enumerado
    await queryRunner.query(`DROP TYPE IF EXISTS tipo_notificacao_enum;`);
  }
}
```

## Teste da Migration

Antes de aplicar a migration em ambientes de produção, teste-a em ambiente de desenvolvimento:

1. Execute a migration:
   ```bash
   npm run migration:run
   ```

2. Verifique se as alterações foram aplicadas corretamente:
   ```bash
   npm run migration:show
   ```

3. Teste o método `down()` revertendo a migration:
   ```bash
   npm run migration:revert
   ```

4. Verifique se todas as alterações foram revertidas corretamente.

5. Execute novamente a migration para garantir que o método `up()` funciona após o `down()`.

## Boas Práticas

1. **Mantenha as migrations atômicas**: Cada migration deve ter um propósito claro e específico.

2. **Documente suas migrations**: Adicione comentários explicando o propósito e as decisões de design.

3. **Teste ambos os métodos `up()` e `down()`**: Garanta que a migration pode ser aplicada e revertida corretamente.

4. **Considere a performance**: Adicione índices apropriados e considere o impacto das alterações em tabelas grandes.

5. **Implemente segurança**: Utilize políticas RLS para proteger dados sensíveis.

6. **Mantenha a consistência**: Siga os padrões de nomenclatura e estrutura estabelecidos.

7. **Evite alterações destrutivas**: Tenha cuidado com operações que podem resultar em perda de dados.

## Resolução de Problemas

### Migration falha ao executar

1. Verifique se não há erros de sintaxe no código da migration.
2. Verifique se todas as tabelas e colunas referenciadas existem.
3. Verifique se não há conflitos de nome com objetos existentes no banco de dados.

### Migration não pode ser revertida

1. Verifique se o método `down()` implementa corretamente a reversão de todas as alterações feitas pelo método `up()`.
2. Verifique se a ordem de reversão está correta (inversa à ordem de criação).

### Problemas de performance após aplicar a migration

1. Verifique se foram adicionados índices apropriados para as consultas frequentes.
2. Considere o particionamento para tabelas que armazenarão grandes volumes de dados.
3. Analise o plano de execução das consultas afetadas e otimize conforme necessário.

## Conclusão

Seguindo este guia, você poderá criar migrations robustas, seguras e otimizadas para o sistema PGBen, mantendo a consistência e a qualidade do banco de dados.

Para mais informações, consulte:
- [Documentação do TypeORM sobre Migrations](https://typeorm.io/#/migrations)
- [Documentação do PostgreSQL sobre RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentação do PostgreSQL sobre Particionamento](https://www.postgresql.org/docs/current/ddl-partitioning.html)
