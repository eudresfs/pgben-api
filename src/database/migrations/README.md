# Migrations do Sistema PGBen

## Visão Geral

Este diretório contém as migrations do sistema PGBen, responsáveis por criar e manter a estrutura do banco de dados PostgreSQL. As migrations são gerenciadas pelo TypeORM e seguem uma estrutura organizada para facilitar a manutenção e evolução do banco de dados.

## Nova Estrutura de Migrations

As migrations foram reestruturadas para seguir um padrão mais organizado e modular, dividindo o schema do banco de dados em domínios funcionais. Cada migration é responsável por um domínio específico do sistema e implementa todas as tabelas, índices, chaves estrangeiras e políticas de segurança relacionadas a esse domínio.

### Organização das Migrations

As migrations estão organizadas no diretório `/nova-estrutura` e seguem uma numeração sequencial que indica a ordem de execução:

```
/nova-estrutura/
├── 1000000-CreateBaseStructure.ts      # Estrutura base e extensões
├── 1010000-CreateAuthSchema.ts         # Esquema de autenticação
├── 1020000-CreateCidadaoSchema.ts      # Esquema de cidadão
├── 1030000-CreateBeneficioSchema.ts    # Esquema de benefício
├── 1040000-CreateSolicitacaoSchema.ts  # Esquema de solicitação
├── 1050000-CreateDocumentoSchema.ts    # Esquema de documento
├── 1060000-CreateAuditoriaSchema.ts    # Esquema de auditoria
├── 1070000-CreateRelatorioSchema.ts    # Esquema de relatório
└── 1080000-CreateIntegracaoSchema.ts   # Esquema de integração
```

### Detalhes de Cada Migration

#### 1. Base Structure (1000000)
- Cria extensões necessárias (`uuid-ossp`, `pgcrypto`)
- Configura funções utilitárias básicas
- Configura variáveis de ambiente para RLS (Row Level Security)

#### 2. Auth Schema (1010000)
- Cria tabelas de autenticação (`usuario`, `perfil`, `sessao`)
- Implementa políticas RLS para controle de acesso
- Configura índices para otimização de consultas de autenticação

#### 3. Cidadão Schema (1020000)
- Cria tabelas para gestão de cidadãos (`cidadao`, `endereco`, `contato`)
- Implementa tabelas para dados socioeconômicos
- Configura políticas RLS para proteção de dados pessoais (LGPD)

#### 4. Benefício Schema (1030000)
- Cria tabelas para tipos de benefícios e suas configurações
- Implementa tabelas para requisitos e regras de concessão
- Configura índices para otimização de consultas de benefícios

#### 5. Solicitação Schema (1040000)
- Cria tabelas para solicitações de benefícios
- Implementa tabelas para histórico de status e avaliações
- Configura políticas RLS para controle de acesso às solicitações

#### 6. Documento Schema (1050000)
- Cria tabelas para gestão de documentos e modelos
- Implementa tabelas para versionamento e assinaturas
- Configura políticas RLS para proteção de documentos sensíveis

#### 7. Auditoria Schema (1060000)
- Cria tabelas para log de ações e alterações
- Implementa funções para registro automático de alterações
- Configura particionamento de tabelas para otimização de performance

#### 8. Relatório Schema (1070000)
- Cria tabelas para configuração e armazenamento de relatórios
- Implementa views para facilitar a geração de relatórios comuns
- Configura índices para otimização de consultas analíticas

#### 9. Integração Schema (1080000)
- Cria tabelas para integração com sistemas externos
- Implementa tabelas para registro de eventos de integração
- Configura políticas de segurança para dados de integração

## Padrões Implementados

### Nomenclatura
- Tabelas: substantivos no singular, em minúsculas, com underscores (ex: `usuario`, `tipo_beneficio`)
- Colunas: substantivos em minúsculas, com underscores (ex: `data_nascimento`, `valor_beneficio`)
- Índices: prefixo `IDX_` seguido do nome da tabela e coluna(s) (ex: `IDX_USUARIO_EMAIL`)
- Chaves estrangeiras: prefixo `FK_` seguido da relação (ex: `FK_SOLICITACAO_CIDADAO`)
- Políticas RLS: sufixo `_policy` após o nome da tabela (ex: `usuario_policy`)

### Estrutura Padrão das Tabelas
Todas as tabelas seguem uma estrutura básica que inclui:

1. **Identificador Único**:
   - Coluna `id` do tipo UUID, gerado automaticamente

2. **Metadados de Auditoria**:
   - `created_at`: timestamp de criação
   - `updated_at`: timestamp de última atualização
   - `created_by`: referência ao usuário que criou o registro (quando aplicável)
   - `updated_by`: referência ao usuário que atualizou o registro (quando aplicável)

3. **Controle de Status**:
   - `ativo`: boolean para indicar se o registro está ativo

### Segurança com Row Level Security (RLS)
Todas as tabelas com dados sensíveis implementam políticas RLS para garantir que os usuários só possam acessar os dados aos quais têm permissão. As políticas são baseadas nas variáveis de sessão:

- `app.current_user_id`: ID do usuário atual
- `app.current_user_role`: Papel do usuário atual

## Como Executar as Migrations

### Executar Todas as Migrations
```bash
npm run migration:run
```

### Reverter a Última Migration
```bash
npm run migration:revert
```

### Gerar uma Nova Migration
```bash
npm run migration:create -- -n NomeDaMigration
```

### Verificar Status das Migrations
```bash
npm run migration:show
```

## Estratégias de Otimização

### Índices
Índices são criados estrategicamente para otimizar consultas frequentes:
- Índices em chaves primárias e estrangeiras
- Índices em colunas frequentemente usadas em cláusulas WHERE
- Índices compostos para consultas que envolvem múltiplas colunas

### Particionamento
Tabelas com grande volume de dados (como logs e históricos) são particionadas por data para melhorar a performance:
- `log_acao`: particionada por mês
- `log_alteracao`: particionada por mês
- `historico_status_solicitacao`: particionada por mês

### Constraints e Validações
Constraints são implementadas no nível do banco de dados para garantir a integridade dos dados:
- Chaves primárias e estrangeiras
- Constraints CHECK para validações de dados
- Constraints UNIQUE para garantir unicidade

## Guia para Adicionar Novas Migrations

Ao adicionar uma nova migration, siga estas diretrizes:

1. **Numeração**: Use o próximo número sequencial disponível, mantendo o padrão de numeração
2. **Nomenclatura**: Use nomes descritivos no formato `XXXXXXX-NomeDaMigration.ts`
3. **Estrutura**: Implemente tanto o método `up()` quanto o `down()`
4. **Documentação**: Adicione comentários explicando o propósito da migration
5. **Segurança**: Implemente políticas RLS para tabelas com dados sensíveis
6. **Otimização**: Adicione índices apropriados para consultas frequentes
7. **Testes**: Teste a migration em ambiente de desenvolvimento antes de aplicá-la em produção

### Exemplo de Nova Migration

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNovaTabelaSchema1090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela
    await queryRunner.createTable(
      new Table({
        name: 'nova_tabela',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
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
            name: 'ativo',
            type: 'boolean',
            default: true,
          },
        ],
      }),
      true
    );

    // Criar índice
    await queryRunner.createIndex(
      'nova_tabela',
      new TableIndex({
        name: 'IDX_NOVA_TABELA_NOME',
        columnNames: ['nome'],
      })
    );

    // Criar política RLS
    await queryRunner.query(`
      ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY nova_tabela_policy ON nova_tabela
      USING (
        (current_setting('app.current_user_role', true)::text = 'administrador') OR
        (current_setting('app.current_user_role', true)::text = 'gestor_semtas')
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover política RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS nova_tabela_policy ON nova_tabela;
    `);

    // Remover índice
    await queryRunner.dropIndex('nova_tabela', 'IDX_NOVA_TABELA_NOME');

    // Remover tabela
    await queryRunner.dropTable('nova_tabela');
  }
}
```

## Boas Práticas

1. **Sempre teste as migrations antes de aplicá-las em produção**
2. **Mantenha o método `down()` atualizado para permitir rollbacks**
3. **Documente alterações significativas no schema**
4. **Evite alterações que possam causar perda de dados**
5. **Considere o impacto de performance ao adicionar índices ou constraints**
6. **Implemente políticas RLS para proteger dados sensíveis**
7. **Mantenha a consistência na nomenclatura e estrutura das tabelas**

## Referências

- [Documentação do TypeORM sobre Migrations](https://typeorm.io/#/migrations)
- [Documentação do PostgreSQL sobre RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentação do PostgreSQL sobre Particionamento](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Documentação do Projeto PGBen](../../docs/migrations/plano-reestruturacao.md)
