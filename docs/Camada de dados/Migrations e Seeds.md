# Migrations e Seeds

## 5.1 Estratégia de Migrations

As migrations são essenciais para gerenciar a evolução do banco de dados ao longo do tempo, permitindo versionamento de schema de forma controlada e reversível. O Sistema de Gestão de Benefícios Eventuais utiliza o TypeORM para gerenciar migrations, seguindo uma abordagem baseada em arquivos organizados cronologicamente.

### 5.1.1 Arquitetura de Migrations

A arquitetura de migrations segue uma estrutura padronizada:

```jboss-cli
/src
  /database
    /migrations
      /0001-create-base-tables
        1620000000000-CreateUsers.ts
        1620000000001-Createunidade.ts
        1620000000002-Createsetor.ts
        ...
      /0002-add-indices-constraints
        1620100000000-AddIndicesUsers.ts
        1620100000001-AddConstraintsSolicitacoes.ts
        ...
      /0003-add-features
        1620200000000-AddDadosSociaisTable.ts
        ...
    /seeds
      initial-data.seed.ts
      test-data.seed.ts
      ...
```

Esta estrutura agrupa migrations relacionadas em pastas numeradas, facilitando a compreensão do histórico evolutivo do banco de dados e mantendo alterações relacionadas juntas.

### 5.1.2 Nomenclatura de Migrations

As migrations seguem uma convenção de nomenclatura consistente:

*   `{timestamp}-{DescriptionInCamelCase}.ts`

O timestamp é em formato Unix (normalmente gerado pelo TypeORM CLI) para garantir a ordem correta de execução. A descrição em formato CamelCase descreve sucintamente a finalidade da migration.

### 5.1.3 Comandos e Scripts

Scripts executados via npm para gerenciar migrations:

```awk
// package.json (scripts section)
{
  "scripts": {
    // Generate a new migration automatically based on entity changes
    "typeorm:migration:generate": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -n",
    
    // Create a new empty migration file
    "typeorm:migration:create": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:create -n",
    
    // Run pending migrations
    "typeorm:migration:run": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run",
    
    // Revert the last executed migration
    "typeorm:migration:revert": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert",
    
    // Show migration status
    "typeorm:migration:show": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show"
  }
}
```

## 5.2 Migrations Principais

### 5.2.1 Criação de Tabelas Base

#### CreateUsersTable

```pgsql
// src/database/migrations/0001-create-base-tables/1620000000000-CreateUsers.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1620000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum types first
        await queryRunner.query(`
            CREATE TYPE "user_role_enum" AS ENUM (
                'administrador',
                'gestor_semtas',
                'tecnico_semtas',
                'tecnico_unidade'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "user_status_enum" AS ENUM (
                'ativo',
                'inativo'
            )
        `);

        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nome',
                        type: 'varchar',
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'senha_hash',
                        type: 'varchar',
                    },
                    {
                        name: 'cpf',
                        type: 'varchar',
                        isUnique: true,
                        isNullable: true,
                    },
                    {
                        name: 'telefone',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'role',
                        type: 'user_role_enum',
                        default: "'tecnico_unidade'",
                    },
                    {
                        name: 'unidade_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'setor_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'user_status_enum',
                        default: "'ativo'",
                    },
                    {
                        name: 'primeiro_acesso',
                        type: 'boolean',
                        default: true,
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
                        name: 'removed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );
        
        // Add indexes for performance
        await queryRunner.query(`
            CREATE INDEX "idx_users_role_status" ON "users" ("role", "status");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('users', 'idx_users_role_status');
        await queryRunner.dropTable('users');
        await queryRunner.query(`DROP TYPE "user_status_enum"`);
        await queryRunner.query(`DROP TYPE "user_role_enum"`);
    }
}
```

#### CreateunidadeTable

```pgsql
// src/database/migrations/0001-create-base-tables/1620000000001-Createunidade.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Createunidade1620000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type first
        await queryRunner.query(`
            CREATE TYPE "unidade_tipo_enum" AS ENUM (
                'cras',
                'creas',
                'centro_pop',
                'semtas',
                'outro'
            )
        `);
        
        await queryRunner.query(`
            CREATE TYPE "unidade_status_enum" AS ENUM (
                'ativo',
                'inativo'
            )
        `);

        await queryRunner.createTable(
            new Table({
                name: 'unidade',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nome',
                        type: 'varchar',
                    },
                    {
                        name: 'sigla',
                        type: 'varchar',
                    },
                    {
                        name: 'tipo',
                        type: 'unidade_tipo_enum',
                    },
                    {
                        name: 'endereco',
                        type: 'varchar',
                    },
                    {
                        name: 'bairro',
                        type: 'varchar',
                    },
                    {
                        name: 'cidade',
                        type: 'varchar',
                        default: "'Natal'",
                    },
                    {
                        name: 'estado',
                        type: 'char(2)',
                        default: "'RN'",
                    },
                    {
                        name: 'cep',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'telefone',
                        type: 'varchar',
                    },
                    {
                        name: 'whatsapp',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'unidade_status_enum',
                        default: "'ativo'",
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
                        name: 'removed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );
        
        // Add indexes
        await queryRunner.query(`
            CREATE INDEX "idx_unidade_tipo_status" ON "unidade" ("tipo", "status");
            CREATE INDEX "idx_unidade_bairro" ON "unidade" ("bairro");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('unidade', 'idx_unidade_bairro');
        await queryRunner.dropIndex('unidade', 'idx_unidade_tipo_status');
        await queryRunner.dropTable('unidade');
        await queryRunner.query(`DROP TYPE "unidade_status_enum"`);
        await queryRunner.query(`DROP TYPE "unidade_tipo_enum"`);
    }
}
```

#### CreatesetorTable

```pgsql
// src/database/migrations/0001-create-base-tables/1620000000002-Createsetor.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Createsetor1620000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type first
        await queryRunner.query(`
            CREATE TYPE "setor_status_enum" AS ENUM (
                'ativo',
                'inativo'
            )
        `);

        await queryRunner.createTable(
            new Table({
                name: 'setor',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nome',
                        type: 'varchar',
                    },
                    {
                        name: 'descricao',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'setor_status_enum',
                        default: "'ativo'",
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
                        name: 'removed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );
        
        // Create the junction table for many-to-many relationship between setor and unidade
        await queryRunner.createTable(
            new Table({
                name: 'setor_unidade',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'setor_id',
                        type: 'uuid',
                    },
                    {
                        name: 'unidade_id',
                        type: 'uuid',
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
                ],
                foreignKeys: [
                    {
                        columnNames: ['setor_id'],
                        referencedTableName: 'setor',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['unidade_id'],
                        referencedTableName: 'unidade',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );
        
        // Add unique constraint to prevent duplicates
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_setor_unidade_unique" ON "setor_unidade" ("setor_id", "unidade_id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('setor_unidade', 'idx_setor_unidade_unique');
        await queryRunner.dropTable('setor_unidade');
        await queryRunner.dropTable('setor');
        await queryRunner.query(`DROP TYPE "setor_status_enum"`);
    }
}
```

### 5.2.2 Criação de Foreign Keys e Relações

```typescript
// src/database/migrations/0001-create-base-tables/1620000000010-AddUsersForeignKeys.ts
import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddUsersForeignKeys1620000000010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add foreign key for unidade_id in users table
        await queryRunner.createForeignKey(
            'users',
            new TableForeignKey({
                name: 'UserUnidade',
                columnNames: ['unidade_id'],
                referencedTableName: 'unidade',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
            }),
        );
        
        // Add foreign key for setor_id in users table
        await queryRunner.createForeignKey(
            'users',
            new TableForeignKey({
                name: 'UserSetor',
                columnNames: ['setor_id'],
                referencedTableName: 'setor',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('users', 'UserSetor');
        await queryRunner.dropForeignKey('users', 'UserUnidade');
    }
}
```

### 5.2.3 Criação de Tabelas de Cidadãos e Dados Sociais

```pgsql
// src/database/migrations/0001-create-base-tables/1620000000003-CreateCidadaos.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCidadaos1620000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum types first
        await queryRunner.query(`
            CREATE TYPE "cidadao_sexo_enum" AS ENUM (
                'masculino',
                'feminino'
            )
        `);
        
        await queryRunner.query(`
            CREATE TYPE "cidadao_parentesco_enum" AS ENUM (
                'pai',
                'mae',
                'filho',
                'filha',
                'irmao',
                'irma',
                'avô',
                'avó',
                'outro'
            )
        `);
        
        await queryRunner.query(`
            CREATE TYPE "cidadao_pix_tipo_enum" AS ENUM (
                'cpf',
                'email',
                'telefone',
                'chave_aleatoria'
            )
        `);

        await queryRunner.createTable(
            new Table({
                name: 'cidadao',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nome',
                        type: 'varchar',
                    },
                    {
                        name: 'nome_social',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'cpf',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'rg',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'nis',
                        type: 'varchar',
                        isNullable: true,
                        isUnique: true,
                    },
                    {
                        name: 'data_nascimento',
                        type: 'date',
                    },
                    {
                        name: 'sexo',
                        type: 'cidadao_sexo_enum',
                    },
                    {
                        name: 'nome_mae',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'naturalidade',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'endereco',
                        type: 'varchar',
                    },
                    {
                        name: 'numero',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'complemento',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'bairro',
                        type: 'varchar',
                    },
                    {
                        name: 'cidade',
                        type: 'varchar',
                        default: "'Natal'",
                    },
                    {
                        name: 'estado',
                        type: 'char(2)',
                        default: "'RN'",
                    },
                    {
                        name: 'cep',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'telefone',
                        type: 'varchar',
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'parentesco',
                        type: 'cidadao_parentesco_enum',
                        isNullable: true,
                    },
                    {
                        name: 'pix_tipo',
                        type: 'cidadao_pix_tipo_enum',
                    },
                    {
                        name: 'pix_chave',
                        type: 'varchar',
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
                        name: 'removed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );
        
        // Add indexes for performance
        await queryRunner.query(`
            CREATE INDEX "idx_cidadaos_cpf" ON "cidadao" ("cpf");
            CREATE INDEX "idx_cidadaos_nis" ON "cidadao" ("nis");
            CREATE INDEX "idx_cidadaos_nome" ON "cidadao" ("nome");
            CREATE INDEX "idx_cidadaos_bairro" ON "cidadao" ("bairro");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('cidadao', 'idx_cidadaos_bairro');
        await queryRunner.dropIndex('cidadao', 'idx_cidadaos_nome');
        await queryRunner.dropIndex('cidadao', 'idx_cidadaos_nis');
        await queryRunner.dropIndex('cidadao', 'idx_cidadaos_cpf');
        await queryRunner.dropTable('cidadao');
        await queryRunner.query(`DROP TYPE "cidadao_pix_tipo_enum"`);
        await queryRunner.query(`DROP TYPE "cidadao_parentesco_enum"`);
        await queryRunner.query(`DROP TYPE "cidadao_sexo_enum"`);
    }
}
```

## 5.3 Seeds

### 5.3.1 Seed Inicial para Configuração

```typescript
// src/database/seeds/initial-data.seed.ts
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Unidade } from '../../modules/unidade/entities/unidade.entity';
import { Setor } from '../../modules/setor/entities/setor.entity';
import { TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../../modules/beneficio/entities/requisito-documento.entity';
import { SituacaoMoradia } from '../../modules/cidadao/entities/situacao-moradia.entity';
import { DemandaMotivo } from '../../modules/ocorrencia/entities/demanda-motivo.entity';
import * as bcrypt from 'bcrypt';

export default class InitialDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // 1. Criar situações de moradia
    const situacoesMoradia = [
      { nome: 'Própria', slug: 'propria' },
      { nome: 'Alugada', slug: 'alugada' },
      { nome: 'Cedida', slug: 'cedida' },
      { nome: 'Ocupada', slug: 'ocupada' },
      { nome: 'Situação de Rua', slug: 'situacao-de-rua' },
      { nome: 'Abrigo', slug: 'abrigo' },
      { nome: 'Casa de Parentes/Amigos', slug: 'casa-de-parentes-amigos' },
    ];

    await Promise.all(
      situacoesMoradia.map(async (situacao) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(SituacaoMoradia)
          .values(situacao)
          .orIgnore()
          .execute();
      }),
    );

    // 2. Criar motivos de demanda
    const motivosDemanda = [
      { nome: 'Solicitação de Benefício', slug: 'solicitacao-de-beneficio' },
      { nome: 'Acompanhamento Social', slug: 'acompanhamento-social' },
      { nome: 'Violação de Direitos', slug: 'violacao-de-direitos' },
      { nome: 'Violência Doméstica', slug: 'violencia-domestica' },
      { nome: 'Trabalho Infantil', slug: 'trabalho-infantil' },
      { nome: 'Abuso/Violência Sexual', slug: 'abuso-violencia-sexual' },
      { nome: 'Negligência', slug: 'negligencia' },
      { nome: 'Situação de Rua', slug: 'situacao-de-rua' },
      { nome: 'Calamidade Pública', slug: 'calamidade-publica' },
      { nome: 'Outros', slug: 'outros' },
    ];

    await Promise.all(
      motivosDemanda.map(async (motivo) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DemandaMotivo)
          .values(motivo)
          .orIgnore()
          .execute();
      }),
    );

    // 3. Criar setor
    const setorData = [
      { nome: 'Administrativo', descricao: 'Setor administrativo', sigla: 'ADM'  },
      { nome: 'Atendimento', descricao: 'Setor de atendimento ao público', sigla: 'ATD'  },
      { nome: 'Análise Técnica', descricao: 'Setor técnico de análise', sigla: 'TEC'   },
      { nome: 'Gestão', descricao: 'Setor de gestão e coordenação', sigla: 'GST' },
    ];

    const setor = await Promise.all(
      setorData.map(async (setorData) => {
        const setor = await connection
          .createQueryBuilder()
          .insert()
          .into(Setor)
          .values(setorData)
          .returning('*')
          .execute();
        return setor.raw[0];
      }),
    );

    // 4. Criar unidade
    const unidadeData = [
      { 
        nome: 'CRAS Guarapes', 
        sigla: 'CRAS-GUA', 
        tipo: 'cras', 
        endereco: 'Rua Principal, 123', 
        bairro: 'Guarapes', 
        cidade: 'Natal', 
        estado: 'RN',
        telefone: '84999999999'
      },
      { 
        nome: 'CRAS Ponta Negra', 
        sigla: 'CRAS-PN', 
        tipo: 'cras', 
        endereco: 'Rua da Praia, 456', 
        bairro: 'Ponta Negra', 
        cidade: 'Natal', 
        estado: 'RN',
        telefone: '84999999998'
      },
      { 
        nome: 'CREAS Oeste', 
        sigla: 'CREAS-O', 
        tipo: 'creas', 
        endereco: 'Avenida Central, 789', 
        bairro: 'Centro', 
        cidade: 'Natal', 
        estado: 'RN',
        telefone: '84999999997'
      },
      { 
        nome: 'SEMTAS Sede', 
        sigla: 'SEMTAS', 
        tipo: 'semtas', 
        endereco: 'Avenida Principal, 1000', 
        bairro: 'Centro', 
        cidade: 'Natal', 
        estado: 'RN',
        telefone: '84999999996'
      },
    ];

    const unidade = await Promise.all(
      unidadeData.map(async (unidadeData) => {
        const unidade = await connection
          .createQueryBuilder()
          .insert()
          .into(Unidade)
          .values(unidadeData)
          .returning('*')
          .execute();
        return unidade.raw[0];
      }),
    );

    // 5. Vincular setor a unidade
    const setorUnidadeData = [
      { setor_id: setor[0].id, unidade_id: unidade[3].id }, // Administrativo na SEMTAS
      { setor_id: setor[1].id, unidade_id: unidade[0].id }, // Atendimento no CRAS Guarapes
      { setor_id: setor[1].id, unidade_id: unidade[1].id }, // Atendimento no CRAS Ponta Negra
      { setor_id: setor[1].id, unidade_id: unidade[2].id }, // Atendimento no CREAS Oeste
      { setor_id: setor[2].id, unidade_id: unidade[3].id }, // Análise Técnica na SEMTAS
      { setor_id: setor[3].id, unidade_id: unidade[3].id }, // Gestão na SEMTAS
    ];

    await Promise.all(
      setorUnidadeData.map(async (vinculo) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into('setor_unidade')
          .values(vinculo)
          .execute();
      }),
    );

    // 6. Criar usuários iniciais
    const senha_hash = await bcrypt.hash('Senha@123', 10);
    
    const usersData = [
      {
        nome: 'Administrador',
        email: 'admin@semtas.gov.br',
        senha_hash,
        role: 'administrador',
        unidade_id: unidade[3].id,
        setor_id: setor[3].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Gestor SEMTAS',
        email: 'gestor@semtas.gov.br',
        senha_hash,
        role: 'gestor_semtas',
        unidade_id: unidade[3].id,
        setor_id: setor[3].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico SEMTAS',
        email: 'tecnico@semtas.gov.br',
        senha_hash,
        role: 'tecnico_semtas',
        unidade_id: unidade[3].id,
        setor_id: setor[2].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CRAS Guarapes',
        email: 'tecnico.guarapes@semtas.gov.br',
        senha_hash,
        role: 'tecnico_unidade',
        unidade_id: unidade[0].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CRAS Ponta Negra',
        email: 'tecnico.pontanegra@semtas.gov.br',
        senha_hash,
        role: 'tecnico_unidade',
        unidade_id: unidade[1].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CREAS Oeste',
        email: 'tecnico.creas@semtas.gov.br',
        senha_hash,
        role: 'tecnico_unidade',
        unidade_id: unidade[2].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
    ];

    await Promise.all(
      usersData.map(async (userData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(User)
          .values(userData)
          .execute();
      }),
    );

    // 7. Criar tipos de benefício
    const tiposBeneficioData = [
      {
        nome: 'Auxílio Natalidade',
        descricao: 'Kit enxoval para recém-nascidos',
        base_legal: 'Arts. 9º-16 da Lei Municipal 7.205/2021',
        periodicidade: 'unico',
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        ativo: true,
      },
      {
        nome: 'Aluguel Social',
        descricao: 'Auxílio para pagamento de aluguel por período temporário',
        base_legal: 'Arts. 32-34 da Lei Municipal 7.205/2021',
        periodicidade: 'mensal',
        periodo_maximo: 6,
        permite_renovacao: true,
        permite_prorrogacao: true,
        valor_maximo: 1000.00,
        ativo: true,
      },
    ];

    const tiposBeneficio = await Promise.all(
      tiposBeneficioData.map(async (tipoData) => {
        const tipo = await connection
          .createQueryBuilder()
          .insert()
          .into(TipoBeneficio)
          .values(tipoData)
          .returning('*')
          .execute();
        return tipo.raw[0];
      }),
    );

    // 8. Criar requisitos de documentos para Auxílio Natalidade
    const requisitosNatalidade = [
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'RG',
        descricao: 'Documento de identidade',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 1,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'CPF',
        descricao: 'Cadastro de Pessoa Física',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 2,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Cartão de Gestante',
        descricao: 'Cartão de acompanhamento pré-natal',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 3,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Residência',
        descricao: 'Comprovante de residência em Natal (últimos 3 meses)',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 4,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Renda',
        descricao: 'Comprovante de renda familiar',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 5,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Certidão de Nascimento',
        descricao: 'Certidão de nascimento da criança (caso já tenha nascido)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 6,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Termo de Responsabilidade',
        descricao: 'Termo de responsabilidade assinado pelo beneficiário',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 7,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Recebimento',
        descricao: 'Comprovante de recebimento do benefício assinado',
        fase: 'liberacao',
        obrigatorio: true,
        ordem: 8,
      },
    ];

    // 9. Criar requisitos de documentos para Aluguel Social
    const requisitosAluguel = [
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'RG',
        descricao: 'Documento de identidade',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 1,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'CPF',
        descricao: 'Cadastro de Pessoa Física',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 2,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Residência Atual',
        descricao: 'Comprovante de residência atual',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 3,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Residência Anterior',
        descricao: 'Comprovante de residência em Natal há pelo menos 2 anos',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 4,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Renda',
        descricao: 'Comprovante de renda familiar',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 5,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Laudo de Interdição',
        descricao: 'Laudo de interdição ou documento similar (quando aplicável)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 6,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Contrato de Aluguel',
        descricao: 'Contrato de aluguel ou declaração do proprietário',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 7,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Recibo de Aluguel Anterior',
        descricao: 'Recibo do aluguel do mês anterior (para renovação/prorrogação)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 8,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Pagamento',
        descricao: 'Comprovante de pagamento do aluguel',
        fase: 'liberacao',
        obrigatorio: true,
        ordem: 9,
      },
    ];

    await Promise.all([
      ...requisitosNatalidade,
      ...requisitosAluguel,
    ].map(async (requisitoData) => {
      await connection
        .createQueryBuilder()
        .insert()
        .into(RequisitoDocumento)
        .values(requisitoData)
        .execute();
    }));

    // 10. Criar fluxo de trabalho para benefícios
    const fluxoNatalidade = [
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[1].id,
        ordem: 1,
        tipo_acao: 'cadastro',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[2].id,
        ordem: 2,
        tipo_acao: 'analise',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[3].id,
        ordem: 3,
        tipo_acao: 'aprovacao',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[1].id,
        ordem: 4,
        tipo_acao: 'liberacao',
      },
    ];

    const fluxoAluguel = [
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[1].id,
        ordem: 1,
        tipo_acao: 'cadastro',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[2].id,
        ordem: 2,
        tipo_acao: 'analise',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[3].id,
        ordem: 3,
        tipo_acao: 'aprovacao',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[1].id,
        ordem: 4,
        tipo_acao: 'liberacao',
      },
    ];

    await Promise.all([
      ...fluxoNatalidade,
      ...fluxoAluguel,
    ].map(async (fluxoData) => {
      await connection
        .createQueryBuilder()
        .insert()
        .into('fluxo_beneficio')
        .values(fluxoData)
        .execute();
    }));
  }
}
```

### 5.3.2 Seed para Dados de Teste

```yaml
// src/database/seeds/test-data.seed.ts
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { Cidadao } from '../../modules/cidadao/entities/cidadao.entity';
import { ComposicaoFamiliar } from '../../modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from '../../modules/cidadao/entities/dados-sociais.entity';
import { Solicitacao } from '../../modules/solicitacao/entities/solicitacao.entity';
import { DadosBeneficios } from '../../modules/solicitacao/entities/dados-beneficios.entity';
import { User } from '../../modules/users/entities/user.entity';
import { TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';
import { Unidade } from '../../modules/unidade/entities/unidade.entity';
import { SituacaoMoradia } from '../../modules/cidadao/entities/situacao-moradia.entity';
import { v4 as uuidv4 } from 'uuid';

export default class TestDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // Obter os IDs necessários
    const users = await connection
      .createQueryBuilder()
      .select('id, role, unidade_id')
      .from(User, 'user')
      .getRawMany();

    const tecnicoUnidade = users.find(user => user.role === 'tecnico_unidade');
    const gestorSemtas = users.find(user => user.role === 'gestor_semtas');
    
    const tiposBeneficio = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(TipoBeneficio, 'tipo')
      .getRawMany();
    
    const unidade = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(Unidade, 'unidade')
      .getRawMany();

    const situacoesMoradia = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(SituacaoMoradia, 'situacao')
      .getRawMany();

    // Gerar dados de cidadãos
    const cidadaosData = [
      {
        id: uuidv4(),
        nome: 'Maria da Silva',
        cpf: '12345678901',
        rg: '1234567',
        data_nascimento: new Date('1985-03-10'),
        sexo: 'feminino',
        nome_mae: 'Joana da Silva',
        endereco: 'Rua das Flores, 123',
        bairro: 'Alecrim',
        cidade: 'Natal',
        estado: 'RN',
        telefone: '84999998888',
        email: 'maria@email.com',
        pix_tipo: 'cpf',
        pix_chave: '12345678901',
      },
      {
        id: uuidv4(),
        nome: 'João Santos',
        cpf: '98765432101',
        rg: '7654321',
        data_nascimento: new Date('1990-06-15'),
        sexo: 'masculino',
        nome_mae: 'Ana Santos',
        endereco: 'Avenida Central, 456',
        bairro: 'Ponta Negra',
        cidade: 'Natal',
        estado: 'RN',
        telefone: '84988887777',
        email: 'joao@email.com',
        pix_tipo: 'email',
        pix_chave: 'joao@email.com',
      },
      {
        id: uuidv4(),
        nome: 'Ana Oliveira',
        cpf: '45678912301',
        rg: '4567891',
        data_nascimento: new Date('1988-11-20'),
        sexo: 'feminino',
        nome_mae: 'Marta Oliveira',
        endereco: 'Rua dos Coqueiros, 789',
        bairro: 'Lagoa Nova',
        cidade: 'Natal',
        estado: 'RN',
        telefone: '84977776666',
        email: 'ana@email.com',
        pix_tipo: 'telefone',
        pix_chave: '84977776666',
      },
      {
        id: uuidv4(),
        nome: 'Pedro Souza',
        cpf: '78912345601',
        rg: '7891234',
        data_nascimento: new Date('1982-04-05'),
        sexo: 'masculino',
        nome_mae: 'Lucia Souza',
        endereco: 'Avenida das Dunas, 1011',
        bairro: 'Candelária',
        cidade: 'Natal',
        estado: 'RN',
        telefone: '84966665555',
        email: 'pedro@email.com',
        pix_tipo: 'cpf',
        pix_chave: '78912345601',
      },
      {
        id: uuidv4(),
        nome: 'Juliana Lima',
        cpf: '32165498701',
        rg: '3216549',
        data_nascimento: new Date('1995-07-25'),
        sexo: 'feminino',
        nome_mae: 'Sandra Lima',
        endereco: 'Rua das Palmeiras, 1213',
        bairro: 'Capim Macio',
        cidade: 'Natal',
        estado: 'RN',
        telefone: '84955554444',
        email: 'juliana@email.com',
        pix_tipo: 'chave_aleatoria',
        pix_chave: '87654321-abcd-1234-efgh-1234567890ab',
      },
    ];

    // Inserir cidadãos
    await Promise.all(
      cidadaosData.map(async (cidadaoData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(Cidadao)
          .values(cidadaoData)
          .execute();
      }),
    );

    // Inserir composição familiar para Maria
    const composicaoFamiliarMaria = [
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'José da Silva',
        idade: 40,
        parentesco: 'cônjuge',
        ocupacao: 'Pedreiro',
        escolaridade: 'Medio_Completo',
        renda: 1200.00,
      },
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'Pedro da Silva',
        idade: 10,
        parentesco: 'filho',
        escolaridade: 'Fundamental_Incompleto',
        renda: 0,
      },
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'Carla da Silva',
        idade: 8,
        parentesco: 'filha',
        escolaridade: 'Fundamental_Incompleto',
        renda: 0,
      },
    ];

    await Promise.all(
      composicaoFamiliarMaria.map(async (membro) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(ComposicaoFamiliar)
          .values(membro)
          .execute();
      }),
    );

    // Inserir dados sociais para cada cidadão
    const dadosSociaisData = [
      {
        cidadao_id: cidadaosData[0].id,
        prontuario_suas: '123456789',
        publico_prioritario: true,
        recebe_beneficio: true,
        tipo_beneficio: 'pbf',
        valor_beneficio: 600.00,
        situacao_moradia_id: situacoesMoradia[1].id, // Alugada
        escolaridade: 'Medio_Completo',
        tem_filhos: true,
        quantidade_filhos: 2,
        numero_moradores: 4,
        renda_familiar: 1800.00,
      },
      {
        cidadao_id: cidadaosData[1].id,
        prontuario_suas: '987654321',
        publico_prioritario: false,
        recebe_beneficio: false,
        situacao_moradia_id: situacoesMoradia[0].id, // Própria
        escolaridade: 'Superior_Incompleto',
        tem_filhos: false,
        quantidade_filhos: 0,
        numero_moradores: 1,
        renda_familiar: 1500.00,
      },
      {
        cidadao_id: cidadaosData[2].id,
        prontuario_suas: '654321987',
        publico_prioritario: true,
        recebe_beneficio: false,
        situacao_moradia_id: situacoesMoradia[1].id, // Alugada
        escolaridade: 'Medio_Completo',
        tem_filhos: true,
        quantidade_filhos: 1,
        numero_moradores: 2,
        renda_familiar: 1300.00,
      },
      {
        cidadao_id: cidadaosData[3].id,
        prontuario_suas: '123987456',
        publico_prioritario: false,
        recebe_beneficio: true,
        tipo_beneficio: 'bpc',
        valor_beneficio: 1100.00,
        situacao_moradia_id: situacoesMoradia[2].id, // Cedida
        escolaridade: 'Fundamental_Completo',
        tem_filhos: true,
        quantidade_filhos: 3,
        numero_moradores: 5,
        renda_familiar: 2500.00,
      },
      {
        cidadao_id: cidadaosData[4].id,
        prontuario_suas: '456789123',
        publico_prioritario: true,
        recebe_beneficio: false,
        situacao_moradia_id: situacoesMoradia[1].id, // Alugada
        escolaridade: 'Superior_Completo',
        tem_filhos: false,
        quantidade_filhos: 0,
        numero_moradores: 2,
        renda_familiar: 2000.00,
      },
    ];

    await Promise.all(
      dadosSociaisData.map(async (dados) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DadosSociais)
          .values(dados)
          .execute();
      }),
    );

    // Criar solicitações de exemplo
    const solicitacoesData = [
      {
        id: uuidv4(),
        protocolo: `AN${new Date().getFullYear()}001`,
        solicitante_id: cidadaosData[0].id,
        tipo_beneficio_id: tiposBeneficio.find(t => t.nome === 'Auxílio Natalidade').id,
        unidade_id: unidade[0].id, // CRAS Guarapes
        tecnico_id: tecnicoUnidade.id,
        tipo_solicitacao: 'novo',
        quantidade_parcelas: 1,
        data_abertura: new Date(),
        status: 'em_analise',
        origem: 'presencial',
        parecer_tecnico: 'Beneficiária gestante no 8º mês, com documentação completa.',
        destinatario_pagamento_id: cidadaosData[0].id,
      },
      {
        id: uuidv4(),
        protocolo: `AS${new Date().getFullYear()}001`,
        solicitante_id: cidadaosData[2].id,
        tipo_beneficio_id: tiposBeneficio.find(t => t.nome === 'Aluguel Social').id,
        unidade_id: unidade[1].id, // CRAS Ponta Negra
        tecnico_id: tecnicoUnidade.id,
        tipo_solicitacao: 'novo',
        quantidade_parcelas: 6,
        data_abertura: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
        status: 'aprovada',
        origem: 'presencial',
        parecer_tecnico: 'Beneficiária em situação de vulnerabilidade, necessita de auxílio para pagamento de aluguel.',
        parecer_semtas: 'Aprovado conforme critérios estabelecidos.',
        aprovador_id: gestorSemtas.id,
        data_aprovacao: new Date(),
        destinatario_pagamento_id: cidadaosData[2].id,
      },
      {
        id: uuidv4(),
        protocolo: `AN${new Date().getFullYear()}002`,
        solicitante_id: cidadaosData[4].id,
        tipo_beneficio_id: tiposBeneficio.find(t => t.nome === 'Auxílio Natalidade').id,
        unidade_id: unidade[2].id, // CREAS Oeste
        tecnico_id: tecnicoUnidade.id,
        tipo_solicitacao: 'novo',
        quantidade_parcelas: 1,
        data_abertura: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 dias atrás
        status: 'liberada',
        origem: 'presencial',
        parecer_tecnico: 'Beneficiária com recém-nascido de 1 mês, documentação completa.',
        parecer_semtas: 'Aprovado conforme critérios estabelecidos.',
        aprovador_id: gestorSemtas.id,
        data_aprovacao: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
        data_liberacao: new Date(),
        liberador_id: tecnicoUnidade.id,
        destinatario_pagamento_id: cidadaosData[4].id,
        valor_pago: 0, // Auxílio Natalidade é em espécie (kit)
      },
      {
        id: uuidv4(),
        protocolo: `AS${new Date().getFullYear()}002`,
        solicitante_id: cidadaosData[3].id,
        tipo_beneficio_id: tiposBeneficio.find(t => t.nome === 'Aluguel Social').id,
        unidade_id: unidade[0].id, // CRAS Guarapes
        tecnico_id: tecnicoUnidade.id,
        tipo_solicitacao: 'novo',
        quantidade_parcelas: 6,
        data_abertura: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
        status: 'pendente',
        origem: 'whatsapp',
        parecer_tecnico: 'Beneficiário necessita de auxílio para pagamento de aluguel.',
        parecer_semtas: 'Pendente: falta comprovação de residência anterior que demonstre o tempo mínimo de 2 anos em Natal.',
        destinatario_pagamento_id: cidadaosData[3].id,
      },
    ];

    // Inserir solicitações
    await Promise.all(
      solicitacoesData.map(async (solicitacaoData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(Solicitacao)
          .values(solicitacaoData)
          .execute();
      }),
    );

    // Inserir dados específicos de benefícios
    const dadosBeneficiosData = [
      {
        solicitacao_id: solicitacoesData[0].id,
        tipo_beneficio: 'auxilio_natalidade',
        data_prevista_parto: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
        pre_natal: true,
        psf_ubs: true,
        gravidez_risco: false,
        gravidez_gemelar: false,
        possui_filhos: true,
      },
      {
        solicitacao_id: solicitacoesData[1].id,
        tipo_beneficio: 'aluguel_social',
        valor_solicitado: 800.00,
        periodo_meses: 6,
        motivo: 'violencia_domestica',
        detalhes_motivo: 'Beneficiária em situação de violência doméstica, precisou sair de casa.',
      },
      {
        solicitacao_id: solicitacoesData[2].id,
        tipo_beneficio: 'auxilio_natalidade',
        data_nascimento: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 dias atrás
        pre_natal: true,
        psf_ubs: true,
        gravidez_risco: false,
        gravidez_gemelar: false,
        possui_filhos: false,
      },
      {
        solicitacao_id: solicitacoesData[3].id,
        tipo_beneficio: 'aluguel_social',
        valor_solicitado: 750.00,
        periodo_meses: 6,
        motivo: 'risco_habitacional',
        detalhes_motivo: 'Residência em área de risco com laudo da Defesa Civil.',
      },
    ];

    await Promise.all(
      dadosBeneficiosData.map(async (dados) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DadosBeneficios)
          .values(dados)
          .execute();
      }),
    );
  }
}
```

## 5.4 Scripts para Execução de Migrations e Seeds

Para facilitar o processo de execução de migrations e seeds, os seguintes scripts são adicionados ao `package.json`:

```awk
{
  "scripts": {
    // TypeORM Migrations
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "typeorm:migration:generate": "npm run typeorm migration:generate -- -n",
    "typeorm:migration:create": "npm run typeorm migration:create -- -n",
    "typeorm:migration:run": "npm run typeorm migration:run",
    "typeorm:migration:revert": "npm run typeorm migration:revert",
    "typeorm:migration:show": "npm run typeorm migration:show",
    
    // Seeds
    "seed:run": "ts-node -r tsconfig-paths/register ./node_modules/typeorm-seeding/dist/cli.js seed",
    "seed:run:initial": "ts-node -r tsconfig-paths/register ./node_modules/typeorm-seeding/dist/cli.js seed -s InitialDataSeed",
    "seed:run:test": "ts-node -r tsconfig-paths/register ./node_modules/typeorm-seeding/dist/cli.js seed -s TestDataSeed",
    
    // Combo scripts
    "db:reset": "npm run typeorm schema:drop && npm run typeorm:migration:run && npm run seed:run:initial",
    "db:setup": "npm run typeorm:migration:run && npm run seed:run:initial",
    "db:setup:test": "npm run typeorm:migration:run && npm run seed:run:initial && npm run seed:run:test",
    
    // Development
    "db:dev:reset": "env NODE_ENV=development npm run db:reset",
    "db:dev:setup": "env NODE_ENV=development npm run db:setup",
    "db:dev:setup:test": "env NODE_ENV=development npm run db:setup:test"
  }
}
```

  

## 5.5 Estratégias de Gerenciamento de Migrations

### 5.5.1 Práticas Recomendadas para Migrations

O gerenciamento eficaz de migrations é crucial para manter a evolução do esquema de banco de dados de forma controlada e segura. Seguem algumas práticas recomendadas:

1. **Versionamento semântico para pastas de migrations**:
    *   Utilize uma estrutura de versionamento clara, como exemplificado na seção 5.1.1
    *   Mantenha a hierarquia `/0001-feature`, `/0002-feature`, etc., para agrupar migrations relacionadas
2. **Princípio da imutabilidade**:
    *   Uma vez que uma migration tenha sido aplicada ao ambiente de produção, ela nunca deve ser modificada
    *   Se correções forem necessárias, crie uma nova migration para corrigir a anterior
3. **Atomicidade**:
    *   Cada migration deve representar uma alteração lógica e atômica no esquema
    *   Evite migrations muito grandes que afetam múltiplas funcionalidades não relacionadas
4. **Teste de rollback**:
    *   Sempre teste o método `down()` das migrations para garantir que o rollback funcione corretamente
    *   Inclua a restauração de dados críticos no método `down()` quando apropriado
5. **Documentação inline**:
    *   Documente o propósito da migration com comentários no código
    *   Inclua quaisquer considerações especiais sobre ordem de execução ou dependências

### 5.5.2 Lidando com Alterações em Produção

Para alterações em um banco de dados de produção, é necessário um cuidado especial:

```typescript
// Exemplo de migration para adicionar uma coluna sem downtime
// src/database/migrations/0004-feature-additions/1630000000000-AddNovaColunaSemDowntime.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNovaColunaSemDowntime1630000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna já existe (para tornar a migration idempotente)
        const table = await queryRunner.getTable('solicitacao');
        const hasColumn = table?.findColumnByName('nova_coluna');
        
        if (!hasColumn) {
            // Adicionar coluna nullable primeiro para não bloquear operações de INSERT
            await queryRunner.addColumn(
                'solicitacao',
                new TableColumn({
                    name: 'nova_coluna',
                    type: 'varchar',
                    isNullable: true,
                }),
            );
            
            // Atualizar dados existentes com valor padrão em batches para reduzir impacto
            await queryRunner.query(`
                UPDATE solicitacao 
                SET nova_coluna = 'valor_padrao' 
                WHERE nova_coluna IS NULL
                LIMIT 1000
            `);
            
            // Se necessário, tornar a coluna NOT NULL em uma migration posterior
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('solicitacao', 'nova_coluna');
    }
}
```

### 5.5.3 Lidando com Large Datasets

Para tabelas que já contêm grande volume de dados, operações como adição de índices ou alteração de colunas podem causar bloqueios prolongados:

```pgsql
// Exemplo de migration para adicionar índice em tabela com muitos dados
// src/database/migrations/0005-performance-improvements/1640000000000-AddIndexCidadaosComConcurrently.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexCidadaosComConcurrently1640000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Usando CREATE INDEX CONCURRENTLY para evitar bloqueios de escrita
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY idx_cidadaos_data_nasc_bairro 
            ON cidadao (data_nascimento, bairro)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX CONCURRENTLY IF EXISTS idx_cidadaos_data_nasc_bairro
        `);
    }
}
```

### 5.5.4 Validação de Migrations

Antes de executar migrations em produção, é importante validá-las em ambientes de desenvolvimento e teste:

```javascript
// Script de validação de migrations (scripts/validate-migrations.ts)
import { createConnection } from 'typeorm';
import { configService } from '../src/config/config.service';

(async () => {
    const connection = await createConnection({
        ...configService.getTypeOrmConfig(),
        migrationsRun: false,
    });

    try {
        // Verifica se há migrations pendentes
        const pendingMigrations = await connection.showMigrations();
        
        if (pendingMigrations) {
            console.log('Pendências encontradas. Testando migrations...');
            
            // Testa aplicação das migrations
            await connection.runMigrations();
            console.log('✅ Migrations aplicadas com sucesso');
            
            // Testa rollback das migrations
            await connection.undoLastMigration();
            console.log('✅ Rollback da última migration executado com sucesso');
            
            // Reaplicando para deixar o banco em estado consistente
            await connection.runMigrations();
        } else {
            console.log('✅ Sem migrations pendentes.');
        }
    } catch (error) {
        console.error('❌ Erro na validação de migrations:', error);
        process.exit(1);
    } finally {
        await connection.close();
    }
})();
```

## 5.6 Integração Contínua (CI/CD) para Migrations

### 5.6.1 Scripts para CI/CD

O processo de CI/CD deve incluir validação e execução automática de migrations. Abaixo um exemplo de script para integração com GitHub Actions ou outro sistema de CI:

```nestedtext
# .github/workflows/database-migrations.yml
name: Database Migrations

on:
  push:
    branches:
      - develop
      - staging
      - main
    paths:
      - 'src/database/migrations/**'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Validate migrations
        run: npm run typeorm:migration:validate
        env:
          NODE_ENV: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db

  apply-migrations-staging:
    needs: validate-migrations
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run migrations
        run: npm run typeorm:migration:run
        env:
          NODE_ENV: staging
          # Usar secrets do GitHub para variáveis de ambiente de produção
          POSTGRES_HOST: ${{ secrets.STAGING_DB_HOST }}
          POSTGRES_PORT: ${{ secrets.STAGING_DB_PORT }}
          POSTGRES_USER: ${{ secrets.STAGING_DB_USER }}
          POSTGRES_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
          POSTGRES_DB: ${{ secrets.STAGING_DB_NAME }}

  apply-migrations-production:
    needs: validate-migrations
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run migrations
        run: npm run typeorm:migration:run
        env:
          NODE_ENV: production
          # Usar secrets do GitHub para variáveis de ambiente de produção
          POSTGRES_HOST: ${{ secrets.PROD_DB_HOST }}
          POSTGRES_PORT: ${{ secrets.PROD_DB_PORT }}
          POSTGRES_USER: ${{ secrets.PROD_DB_USER }}
          POSTGRES_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
          POSTGRES_DB: ${{ secrets.PROD_DB_NAME }}
```

### 5.6.2 Backup automático antes de migrations

É uma boa prática fazer backup do banco de dados antes de executar migrations, especialmente em produção:

```javascript
// src/scripts/backup-before-migration.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { format } from 'date-fns';
import { configService } from '../config/config.service';

const execAsync = promisify(exec);

async function backupDatabase() {
    const config = configService.getTypeOrmConfig();
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const backupFilename = `backup-${config.database}-${timestamp}.sql`;
    
    console.log(`Iniciando backup do banco ${config.database}...`);
    
    try {
        await execAsync(`PGPASSWORD="${config.password}" pg_dump -h ${config.host} -U ${config.username} -d ${config.database} -F c -f ${backupFilename}`);
        console.log(`✅ Backup criado com sucesso: ${backupFilename}`);
        return backupFilename;
    } catch (error) {
        console.error(`❌ Erro ao criar backup: ${error.message}`);
        throw error;
    }
}

// Export a função para usar no script de migrations
export { backupDatabase };

// Executar diretamente se chamado como script
if (require.main === module) {
    backupDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
```

## 5.7 Monitoramento de Migrations

### 5.7.1 Logging de Migrations

É importante manter um log detalhado das migrations executadas, incluindo quando e por quem foram aplicadas:

```typescript
// src/database/migrations-logger.ts
import { Logger, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

export class MigrationsLogger implements Logger {
    private logPath: string;
    
    constructor() {
        this.logPath = path.join(process.cwd(), 'logs', 'migrations');
        
        // Criar diretório de logs se não existir
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }
    
    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): void {
        if (level === 'info' && message.includes('Migration')) {
            this.logMigration(message);
        }
        console.log(`[${level.toUpperCase()}] ${message}`);
    }
    
    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void {
        // Não logar queries para evitar volume excessivo
    }
    
    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): void {
        this.logError(`Query Error: ${error}\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}`);
    }
    
    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void {
        this.logWarning(`Slow Query (${time}ms): ${query}\nParameters: ${JSON.stringify(parameters)}`);
    }
    
    logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
        this.logMigration(`Schema Build: ${message}`);
    }
    
    logMigration(message: string): void {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const logEntry = `[${timestamp}] ${message}\n`;
        const logFile = path.join(this.logPath, `migrations-${format(new Date(), 'yyyy-MM-dd')}.log`);
        
        fs.appendFileSync(logFile, logEntry);
    }
    
    logError(message: string): void {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const logEntry = `[${timestamp}] ERROR: ${message}\n`;
        const logFile = path.join(this.logPath, `migrations-error-${format(new Date(), 'yyyy-MM-dd')}.log`);
        
        fs.appendFileSync(logFile, logEntry);
    }
    
    logWarning(message: string): void {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const logEntry = `[${timestamp}] WARNING: ${message}\n`;
        const logFile = path.join(this.logPath, `migrations-warning-${format(new Date(), 'yyyy-MM-dd')}.log`);
        
        fs.appendFileSync(logFile, logEntry);
    }
}
```

Para utilizar este logger, adicione-o na configuração do TypeORM:

```javascript
// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MigrationsLogger } from '../database/migrations-logger';

export const typeOrmConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/database/migrations/**/*{.ts,.js}'],
    cli: {
        migrationsDir: 'src/database/migrations',
    },
    synchronize: false,
    logging: true,
    logger: process.env.NODE_ENV === 'production' ? new MigrationsLogger() : undefined,
};
```

## 5.8 Gerenciamento de Seeds Avançado

Os seeds são essenciais não apenas para a configuração inicial, mas também para testes e ambientes de desenvolvimento.

### 5.8.1 Seeds Condicionais por Ambiente

```typescript
// src/database/seeds/environment-data.seed.ts
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export default class EnvironmentDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const environment = process.env.NODE_ENV || 'development';
    
    // Dados comuns a todos os ambientes
    const commonData = async () => {
      // Implementação comum
    };
    
    // Dados específicos por ambiente
    switch (environment) {
      case 'development':
        await commonData();
        await this.seedDevelopmentData(connection);
        break;
      case 'staging':
        await commonData();
        await this.seedStagingData(connection);
        break;
      case 'production':
        await commonData();
        await this.seedProductionData(connection);
        break;
      case 'test':
        await this.seedTestData(connection);
        break;
      default:
        await commonData();
        break;
    }
  }
  
  private async seedDevelopmentData(connection: Connection): Promise<void> {
    // Gerar muitos dados para desenvolvimento
    const senha_hash = await bcrypt.hash('dev123', 10);
    
    // Criar 20 usuários de teste
    for (let i = 1; i <= 20; i++) {
      await connection
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          nome: `Usuário Teste ${i}`,
          email: `teste${i}@dev.semtas.gov.br`,
          senha_hash,
          role: i % 4 === 0 ? 'administrador' : 
                i % 3 === 0 ? 'gestor_semtas' : 
                i % 2 === 0 ? 'tecnico_semtas' : 'tecnico_unidade',
          unidade_id: i % 4 + 1, // Seleciona uma das unidade (IDs 1-4)
          setor_id: i % 4 + 1,   // Seleciona um dos setor (IDs 1-4)
          primeiro_acesso: false,
        })
        .execute();
    }
    
    // Adicionar outros dados de desenvolvimento...
  }
  
  private async seedStagingData(connection: Connection): Promise<void> {
    // Dados limitados para staging
    const senha_hash = await bcrypt.hash('Staging@123', 10);
    
    await connection
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        nome: 'Usuário Staging',
        email: 'staging@semtas.gov.br',
        senha_hash,
        role: 'administrador',
        primeiro_acesso: false,
      })
      .execute();
  }
  
  private async seedProductionData(connection: Connection): Promise<void> {
    // Apenas o necessário para produção
    // Normalmente, apenas usuário admin inicial e configurações essenciais
  }
  
  private async seedTestData(connection: Connection): Promise<void> {
    // Conjunto de dados para testes automatizados
    // Dados consistentes para facilitar a escrita de testes
  }
}
```

### 5.8.2 Factories para TypeORM-Seeding

As factories são úteis para gerar grandes volumes de dados de teste de forma consistente:

```sqf
// src/database/factories/cidadao.factory.ts
import * as Faker from 'faker/locale/pt_BR';
import { define } from 'typeorm-seeding';
import { Cidadao } from '../../modules/cidadao/entities/cidadao.entity';

define(Cidadao, (faker: typeof Faker) => {
  const sexo = faker.random.arrayElement(['masculino', 'feminino']);
  const nome = sexo === 'masculino' ? 
               faker.name.firstName(0) + ' ' + faker.name.lastName() : 
               faker.name.firstName(1) + ' ' + faker.name.lastName();
  
  const cidadao = new Cidadao();
  cidadao.nome = nome;
  cidadao.cpf = faker.random.number({ min: 10000000000, max: 99999999999 }).toString();
  cidadao.rg = faker.random.number({ min: 1000000, max: 9999999 }).toString();
  cidadao.data_nascimento = faker.date.between('1950-01-01', '2003-12-31');
  cidadao.sexo = sexo;
  cidadao.nome_mae = faker.name.firstName(1) + ' ' + faker.name.lastName();
  cidadao.endereco = faker.address.streetAddress();
  cidadao.numero = faker.random.number({ min: 1, max: 9999 }).toString();
  cidadao.complemento = faker.random.arrayElement([null, 'Apto', 'Casa', 'Fundos']) + 
                       (faker.random.arrayElement([null, ' ' + faker.random.number({ min: 1, max: 100 }).toString()]));
  cidadao.bairro = faker.address.county();
  cidadao.cidade = 'Natal';
  cidadao.estado = 'RN';
  cidadao.cep = faker.address.zipCode();
  cidadao.telefone = faker.phone.phoneNumber('84########');
  cidadao.email = faker.internet.email();
  cidadao.pix_tipo = faker.random.arrayElement(['cpf', 'email', 'telefone', 'chave_aleatoria']);
  cidadao.pix_chave = cidadao.pix_tipo === 'cpf' ? cidadao.cpf : 
                     cidadao.pix_tipo === 'email' ? cidadao.email :
                     cidadao.pix_tipo === 'telefone' ? cidadao.telefone :
                     faker.random.uuid();
  
  return cidadao;
});
```

Exemplo de uso da factory em um seed:

```typescript
// src/database/seeds/large-test-data.seed.ts
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { Cidadao } from '../../modules/cidadao/entities/cidadao.entity';
import { ComposicaoFamiliar } from '../../modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from '../../modules/cidadao/entities/dados-sociais.entity';

export default class LargeTestDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // Criar 1000 cidadãos com factories
    const cidadao = await factory(Cidadao)().createMany(1000);
    
    // Para cada cidadão, criar alguns membros familiares
    for (const cidadao of cidadao) {
      const familiaSize = Math.floor(Math.random() * 5) + 1; // 1 a 5 membros
      
      for (let i = 0; i < familiaSize; i++) {
        const parentescos = ['cônjuge', 'filho', 'filha', 'irmão', 'irmã', 'pai', 'mãe'];
        const escolaridades = ['Fundamental_Incompleto', 'Fundamental_Completo', 'Medio_Incompleto', 
                              'Medio_Completo', 'Superior_Incompleto', 'Superior_Completo'];
        
        await connection
          .createQueryBuilder()
          .insert()
          .into(ComposicaoFamiliar)
          .values({
            cidadao_id: cidadao.id,
            nome: i === 0 ? 'Cônjuge de ' + cidadao.nome : 'Filho ' + (i) + ' de ' + cidadao.nome,
            idade: Math.floor(Math.random() * 70) + 1,
            parentesco: parentescos[Math.min(i, parentescos.length - 1)],
            ocupacao: Math.random() > 0.3 ? 'Autônomo' : Math.random() > 0.5 ? 'Desempregado' : 'Estudante',
            escolaridade: escolaridades[Math.floor(Math.random() * escolaridades.length)],
            renda: Math.random() > 0.5 ? Math.floor(Math.random() * 2000) + 500 : 0,
          })
          .execute();
      }
      
      // Criar dados sociais para cada cidadão
      await connection
        .createQueryBuilder()
        .insert()
        .into(DadosSociais)
        .values({
          cidadao_id: cidadao.id,
          prontuario_suas: Math.floor(Math.random() * 900000 + 100000).toString(),
          publico_prioritario: Math.random() > 0.7,
          recebe_beneficio: Math.random() > 0.6,
          tipo_beneficio: Math.random() > 0.5 ? 'pbf' : 'bpc',
          valor_beneficio: Math.floor(Math.random() * 500) + 200,
          situacao_moradia_id: Math.floor(Math.random() * 5) + 1, // Assumindo 5 situações de moradia
          escolaridade: escolaridades[Math.floor(Math.random() * escolaridades.length)],
          tem_filhos: familiaSize > 1,
          quantidade_filhos: familiaSize > 1 ? familiaSize - 1 : 0,
          numero_moradores: familiaSize,
          renda_familiar: Math.floor(Math.random() * 3000) + 500,
        })
        .execute();
    }

    // Gerar solicitações de benefícios aleatórias
    // ... (código para geração de solicitações)
  }
}
```

## 5.9 Exemplos de Scripts para Manutenção de Banco de Dados

### 5.9.1 Script para Exportação e Importação de Dados

```typescript
// src/scripts/data-export-import.ts
import { createConnection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { configService } from '../config/config.service';

async function exportData(entity: string, outputDir: string = './data-exports'): Promise<string> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = path.join(outputDir, `${entity}-${timestamp}.json`);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
        const data = await connection
            .createQueryBuilder()
            .select()
            .from(entity, entity)
            .where('removed_at IS NULL')
            .getRawMany();
            
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Exportados ${data.length} registros de ${entity} para ${filename}`);
        
        return filename;
    } catch (error) {
        console.error(`❌ Erro ao exportar ${entity}: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

async function importData(entity: string, filename: string): Promise<number> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    
    try {
        if (!fs.existsSync(filename)) {
            throw new Error(`Arquivo não encontrado: ${filename}`);
        }
        
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        
        if (!Array.isArray(data)) {
            throw new Error('Formato de dados inválido. Esperado array de objetos.');
        }
        
        let insertedCount = 0;
        
        // Inserir em batches para melhor performance
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            const result = await connection
                .createQueryBuilder()
                .insert()
                .into(entity)
                .values(batch)
                .orIgnore() // Ignorar conflitos de chave primária
                .execute();
                
            insertedCount += result.identifiers.length;
            console.log(`Progresso: ${Math.min(i + batchSize, data.length)}/${data.length}`);
        }
        
        console.log(`✅ Importados ${insertedCount} registros para ${entity}`);
        return insertedCount;
    } catch (error) {
        console.error(`❌ Erro ao importar para ${entity}: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Exemplo de uso
// Para exportar: npm run ts-node src/scripts/data-export-import.ts export cidadao
// Para importar: npm run ts-node src/scripts/data-export-import.ts import cidadao ./data-exports/cidadao-20250101-120000.json

const [operation, entity, filePath] = process.argv.slice(2);

if (operation === 'export' && entity) {
    exportData(entity)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else if (operation === 'import' && entity && filePath) {
    importData(entity, filePath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    console.log('Uso: npm run ts-node src/scripts/data-export-import.ts [export|import] [entity] [filePath?]');
    process.exit(1);
}
```

### 5.9.2 Script para Verificação de Integridade

```pgsql
// src/scripts/verify-data-integrity.ts
import { createConnection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { configService } from '../config/config.service';

async function verifyDataIntegrity(): Promise<void> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    const outputDir = './data-integrity-reports';
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = path.join(outputDir, `integridade-${timestamp}.log`);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const log = (message: string) => {
        console.log(message);
        fs.appendFileSync(filename, message + '\n');
    };
    
    log(`=== Relatório de Integridade de Dados (${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}) ===\n`);
    
    try {
        // 1. Verificar relacionamentos órfãos
        log('Verificando solicitações com beneficiário inexistente...');
        const solicitacoesOrfas = await connection.query(`
            SELECT s.id, s.protocolo 
            FROM solicitacao s
            LEFT JOIN cidadao c ON s.solicitante_id = c.id
            WHERE s.solicitante_id IS NOT NULL AND c.id IS NULL
        `);
        
        if (solicitacoesOrfas.length > 0) {
            log(`❌ Encontradas ${solicitacoesOrfas.length} solicitações com beneficiário inexistente.`);
            solicitacoesOrfas.forEach(s => {
                log(`  - Solicitação ID: ${s.id}, Protocolo: ${s.protocolo}`);
            });
        } else {
            log('✅ Nenhuma solicitação com beneficiário inexistente encontrada.');
        }
        
        // 2. Verificar duplicidade de CPF
        log('\nVerificando CPFs duplicados em cidadãos...');
        const cpfsDuplicados = await connection.query(`
            SELECT cpf, COUNT(*) as count
            FROM cidadao
            WHERE removed_at IS NULL
            GROUP BY cpf
            HAVING COUNT(*) > 1
        `);
        
        if (cpfsDuplicados.length > 0) {
            log(`❌ Encontrados ${cpfsDuplicados.length} CPFs duplicados.`);
            cpfsDuplicados.forEach(c => {
                log(`  - CPF: ${c.cpf}, Quantidade: ${c.count}`);
            });
        } else {
            log('✅ Nenhum CPF duplicado encontrado.');
        }
        
        // 3. Verificar integridade de status de solicitações
        log('\nVerificando inconsistências de status em solicitações...');
        const statusInconsistentes = await connection.query(`
            SELECT s.id, s.protocolo, s.status, s.data_aprovacao, s.data_liberacao
            FROM solicitacao s
            WHERE (s.status = 'aprovada' AND s.data_aprovacao IS NULL)
               OR (s.status = 'liberada' AND s.data_liberacao IS NULL)
               OR (s.status IN ('rascunho', 'aberta', 'em_analise', 'pendente') AND s.data_aprovacao IS NOT NULL)
        `);
        
        if (statusInconsistentes.length > 0) {
            log(`❌ Encontradas ${statusInconsistentes.length} solicitações com status inconsistente.`);
            statusInconsistentes.forEach(s => {
                log(`  - Solicitação ID: ${s.id}, Protocolo: ${s.protocolo}, Status: ${s.status}`);
                log(`    Aprovação: ${s.data_aprovacao || 'NULL'}, Liberação: ${s.data_liberacao || 'NULL'}`);
            });
        } else {
            log('✅ Nenhuma inconsistência de status encontrada.');
        }
        
        // 4. Verificar documentos sem arquivo real
        log('\nVerificando documentos sem arquivo físico correspondente...');
        const documentos = await connection.query(`
            SELECT id, nome_arquivo, caminho_arquivo
            FROM documentos
            WHERE removed_at IS NULL
        `);
        
        let documentosSemArquivo = 0;
        for (const doc of documentos) {
            if (!fs.existsSync(doc.caminho_arquivo)) {
                documentosSemArquivo++;
                log(`  - Documento ID: ${doc.id}, Nome: ${doc.nome_arquivo}, Caminho: ${doc.caminho_arquivo}`);
            }
        }
        
        if (documentosSemArquivo > 0) {
            log(`❌ Encontrados ${documentosSemArquivo} documentos sem arquivo físico correspondente.`);
        } else {
            log(`✅ Todos os ${documentos.length} documentos têm arquivo físico correspondente.`);
        }
        
        log('\n=== Fim do Relatório ===');
    } catch (error) {
        log(`❌ Erro durante verificação: ${error.message}`);
    } finally {
        await connection.close();
    }
}

// Executar diretamente se chamado como script
if (require.main === module) {
    verifyDataIntegrity()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

// Export a função para uso em outros módulos
export { verifyDataIntegrity };

### 5.9.3 Script para Limpeza de Dados Temporários

```typescript
// src/scripts/clean-temporary-data.ts
import { createConnection } from 'typeorm';
import { format, subDays } from 'date-fns';
import { configService } from '../config/config.service';

async function cleanTemporaryData(daysOld: number = 30): Promise<void> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    const cutoffDate = subDays(new Date(), daysOld);
    
    console.log(`Iniciando limpeza de dados temporários mais antigos que ${format(cutoffDate, 'dd/MM/yyyy')}`);
    
    try {
        // 1. Limpar rascunhos de solicitações
        const rascunhosResult = await connection.query(`
            UPDATE solicitacao
            SET removed_at = NOW()
            WHERE status = 'rascunho'
            AND created_at < $1
            AND removed_at IS NULL
            RETURNING id, protocolo
        `, [cutoffDate]);
        
        console.log(`✅ Removidos ${rascunhosResult.length} rascunhos de solicitações.`);
        
        // 2. Limpar logs de auditoria antigos (se aplicável)
        if (await connection.getRepository('logs_auditoria').hasColumn('timestamp')) {
            const logsResult = await connection.query(`
                DELETE FROM logs_auditoria
                WHERE timestamp < $1
                RETURNING id
            `, [cutoffDate]);
            
            console.log(`✅ Removidos ${logsResult.length} registros de log antigos.`);
        }
        
        // 3. Limpar notificações lidas
        const notificacoesResult = await connection.query(`
            DELETE FROM notificacao
            WHERE lida = true
            AND data_leitura < $1
            RETURNING id
        `, [cutoffDate]);
        
        console.log(`✅ Removidas ${notificacoesResult.length} notificações lidas antigas.`);
        
        // 4. Limpar arquivos temporários de documentos
        const documentosTempResult = await connection.query(`
            SELECT id, caminho_arquivo
            FROM documentos
            WHERE caminho_arquivo LIKE '%/temp/%'
            AND created_at < $1
            AND removed_at IS NULL
        `, [cutoffDate]);
        
        console.log(`Encontrados ${documentosTempResult.length} arquivos temporários antigos.`);
        
        // Aqui você pode adicionar lógica para remover os arquivos físicos também
        // usando fs.unlink() para cada caminho_arquivo encontrado
        
        // Marcar como removidos no banco de dados
        if (documentosTempResult.length > 0) {
            const documentoIds = documentosTempResult.map(d => d.id);
            await connection.query(`
                UPDATE documentos
                SET removed_at = NOW()
                WHERE id = ANY($1)
            `, [documentoIds]);
            
            console.log(`✅ Documentos temporários marcados como removidos no banco de dados.`);
        }
        
    } catch (error) {
        console.error(`❌ Erro durante limpeza: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Executar diretamente se chamado como script
if (require.main === module) {
    const daysArg = process.argv[2];
    const days = daysArg ? parseInt(daysArg, 10) : 30;
    
    if (isNaN(days) || days < 1) {
        console.error('Erro: Número de dias inválido. Use um número inteiro positivo.');
        process.exit(1);
    }
    
    cleanTemporaryData(days)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { cleanTemporaryData };
```

### 5.9.4 Script para Correção de Inconsistências

```pgsql
// src/scripts/fix-data-inconsistencies.ts
import { createConnection } from 'typeorm';
import { configService } from '../config/config.service';

async function fixDataInconsistencies(dryRun: boolean = true): Promise<void> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    
    console.log(`Iniciando correção de inconsistências de dados (${dryRun ? 'simulação' : 'execução real'})`);
    
    try {
        // 1. Corrigir relacionamentos órfãos
        console.log('Verificando solicitações com beneficiário inexistente...');
        
        const solicitacoesOrfas = await connection.query(`
            SELECT s.id, s.protocolo 
            FROM solicitacao s
            LEFT JOIN cidadao c ON s.solicitante_id = c.id
            WHERE s.solicitante_id IS NOT NULL AND c.id IS NULL
        `);
        
        if (solicitacoesOrfas.length > 0) {
            console.log(`Encontradas ${solicitacoesOrfas.length} solicitações com beneficiário inexistente.`);
            
            if (!dryRun) {
                // Marcar como removidas (soft delete)
                await connection.query(`
                    UPDATE solicitacao
                    SET removed_at = NOW(), 
                        observacoes = CONCAT(observacoes, ' | Removido automaticamente devido a beneficiário inexistente.')
                    WHERE id = ANY($1)
                `, [solicitacoesOrfas.map(s => s.id)]);
                
                console.log(`✅ ${solicitacoesOrfas.length} solicitações marcadas como removidas.`);
            } else {
                console.log(`(Simulação) Seriam removidas ${solicitacoesOrfas.length} solicitações.`);
            }
        } else {
            console.log('✅ Nenhuma solicitação com beneficiário inexistente encontrada.');
        }
        
        // 2. Corrigir inconsistências de status
        console.log('\nVerificando inconsistências de status em solicitações...');
        
        const statusInconsistentes = await connection.query(`
            SELECT s.id, s.protocolo, s.status, s.data_aprovacao, s.data_liberacao
            FROM solicitacao s
            WHERE (s.status = 'aprovada' AND s.data_aprovacao IS NULL)
               OR (s.status = 'liberada' AND s.data_liberacao IS NULL)
        `);
        
        if (statusInconsistentes.length > 0) {
            console.log(`Encontradas ${statusInconsistentes.length} solicitações com status inconsistente.`);
            
            if (!dryRun) {
                // Corrigir datas ausentes
                for (const s of statusInconsistentes) {
                    if (s.status === 'aprovada' && !s.data_aprovacao) {
                        await connection.query(`
                            UPDATE solicitacao
                            SET data_aprovacao = updated_at
                            WHERE id = $1
                        `, [s.id]);
                        
                        console.log(`✅ Solicitação ${s.protocolo}: data de aprovação definida para a data de atualização.`);
                    }
                    
                    if (s.status === 'liberada' && !s.data_liberacao) {
                        await connection.query(`
                            UPDATE solicitacao
                            SET data_liberacao = updated_at
                            WHERE id = $1
                        `, [s.id]);
                        
                        console.log(`✅ Solicitação ${s.protocolo}: data de liberação definida para a data de atualização.`);
                    }
                }
                
                console.log(`✅ ${statusInconsistentes.length} solicitações corrigidas.`);
            } else {
                console.log(`(Simulação) Seriam corrigidas ${statusInconsistentes.length} solicitações.`);
            }
        } else {
            console.log('✅ Nenhuma inconsistência de status encontrada.');
        }
        
        // 3. Remover registros duplicados
        console.log('\nVerificando CPFs duplicados em cidadãos...');
        
        const cpfsDuplicados = await connection.query(`
            SELECT cpf, array_agg(id) as ids, array_agg(nome) as nomes
            FROM cidadao
            WHERE removed_at IS NULL
            GROUP BY cpf
            HAVING COUNT(*) > 1
        `);
        
        if (cpfsDuplicados.length > 0) {
            console.log(`Encontrados ${cpfsDuplicados.length} CPFs duplicados.`);
            
            if (!dryRun) {
                for (const duplicado of cpfsDuplicados) {
                    // Manter o primeiro registro, marcar os outros como removidos
                    const idAManter = duplicado.ids[0];
                    const idsARemover = duplicado.ids.slice(1);
                    
                    await connection.query(`
                        UPDATE cidadao
                        SET removed_at = NOW()
                        WHERE id = ANY($1)
                    `, [idsARemover]);
                    
                    console.log(`✅ CPF ${duplicado.cpf}: mantido registro ${idAManter} (${duplicado.nomes[0]}), removidos ${idsARemover.length} registros duplicados.`);
                }
                
                console.log(`✅ Tratados ${cpfsDuplicados.length} casos de CPFs duplicados.`);
            } else {
                console.log(`(Simulação) Seriam tratados ${cpfsDuplicados.length} casos de CPFs duplicados.`);
            }
        } else {
            console.log('✅ Nenhum CPF duplicado encontrado.');
        }
        
    } catch (error) {
        console.error(`❌ Erro durante correção de inconsistências: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Executar diretamente se chamado como script
if (require.main === module) {
    const dryRunArg = process.argv[2];
    const dryRun = dryRunArg !== 'execute'; // Se não for "execute", mantém como dryRun=true
    
    if (dryRun) {
        console.log('MODO SIMULAÇÃO: Nenhuma alteração será realizada no banco de dados.');
        console.log('Para executar realmente as correções, use: npm run ts-node src/scripts/fix-data-inconsistencies.ts execute');
    } else {
        console.log('MODO DE EXECUÇÃO REAL: As correções serão aplicadas ao banco de dados!');
    }
    
    fixDataInconsistencies(dryRun)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { fixDataInconsistencies };
```

## 5.10 Automatização de Migrations com Node Schedule

Para automatizar a execução de tarefas de manutenção de banco de dados, podemos criar um serviço que utiliza o Node Schedule:

```typescript
// src/services/database-maintenance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { verifyDataIntegrity } from '../scripts/verify-data-integrity';
import { cleanTemporaryData } from '../scripts/clean-temporary-data';
import { backupDatabase } from '../scripts/backup-before-migration';

@Injectable()
export class DatabaseMaintenanceService {
  private readonly logger = new Logger(DatabaseMaintenanceService.name);

  constructor(private schedulerRegistry: SchedulerRegistry) {
    this.setupMaintenanceTasks();
  }

  private setupMaintenanceTasks(): void {
    // Verificação diária de integridade (23:00)
    const integrityCheckJob = new CronJob('0 23 * * *', () => {
      this.logger.log('Executando verificação de integridade diária');
      this.runIntegrityCheck();
    });
    
    // Limpeza semanal de dados temporários (domingo, 02:00)
    const cleanupJob = new CronJob('0 2 * * 0', () => {
      this.logger.log('Executando limpeza semanal de dados temporários');
      this.runTemporaryDataCleanup();
    });
    
    // Backup diário (04:00)
    const backupJob = new CronJob('0 4 * * *', () => {
      this.logger.log('Executando backup diário do banco de dados');
      this.runDatabaseBackup();
    });
    
    // Registrar as tarefas no scheduler
    this.schedulerRegistry.addCronJob('integrityCheck', integrityCheckJob);
    this.schedulerRegistry.addCronJob('dataCleanup', cleanupJob);
    this.schedulerRegistry.addCronJob('databaseBackup', backupJob);
    
    // Iniciar as tarefas
    integrityCheckJob.start();
    cleanupJob.start();
    backupJob.start();
    
    this.logger.log('Tarefas de manutenção de banco de dados programadas');
  }
  
  async runIntegrityCheck(): Promise<void> {
    try {
      await verifyDataIntegrity();
      this.logger.log('Verificação de integridade concluída com sucesso');
    } catch (error) {
      this.logger.error(`Erro durante verificação de integridade: ${error.message}`, error.stack);
    }
  }
  
  async runTemporaryDataCleanup(): Promise<void> {
    try {
      // Limpar dados com mais de 30 dias
      await cleanTemporaryData(30);
      this.logger.log('Limpeza de dados temporários concluída com sucesso');
    } catch (error) {
      this.logger.error(`Erro durante limpeza de dados temporários: ${error.message}`, error.stack);
    }
  }
  
  async runDatabaseBackup(): Promise<void> {
    try {
      const backupFile = await backupDatabase();
      this.logger.log(`Backup do banco de dados concluído: ${backupFile}`);
    } catch (error) {
      this.logger.error(`Erro durante backup do banco de dados: ${error.message}`, error.stack);
    }
  }
}
```

Para registrar este serviço na aplicação NestJS:

```python
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseMaintenanceService } from './services/database-maintenance.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        migrations: ['dist/database/migrations/**/*{.ts,.js}'],
        cli: {
          migrationsDir: 'src/database/migrations',
        },
        synchronize: false,
      }),
    }),
    // Outros módulos...
  ],
  providers: [
    DatabaseMaintenanceService,
    // Outros providers...
  ],
})
export class AppModule {}
```

## 5.11 Melhores Práticas para Migrations e Seeds em Produção

### 5.11.1 Checklist para Execução de Migrations em Produção

Antes de executar migrations em ambiente de produção, é importante seguir um checklist de segurança:

1. **Backup do banco de dados**
    *   Realizar backup completo antes de qualquer migration
    *   Verificar se o backup está íntegro e pode ser restaurado
2. **Teste em ambiente de homologação**
    *   Testar todas as migrations em ambiente similar ao de produção
    *   Verificar o tempo de execução e impacto em tabelas grandes
3. **Janela de manutenção**
    *   Programar execução para períodos de baixo uso do sistema
    *   Comunicar usuários sobre possível indisponibilidade
4. **Plano de rollback**
    *   Ter um plano de rollback documentado e testado
    *   Preparar scripts para reverter alterações caso necessário
5. **Monitoramento**
    *   Monitorar a execução das migrations em tempo real
    *   Verificar logs e métricas de performance durante a execução
6. **Verificação pós-migration**
    *   Executar testes automatizados após as migrations
    *   Verificar integridade dos dados e funcionamento do sistema

### 5.11.2 Automatizando o Processo com Scripts

```awk
#!/bin/bash
# deploy-migrations-prod.sh

# Definir variáveis
APP_DIR="/path/to/application"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_backup_$DATE.sql"
LOG_FILE="$BACKUP_DIR/migration_log_$DATE.log"

# Função para enviar notificação
send_notification() {
  echo "Enviando notificação: $1"
  # Implementar envio de notificação (e-mail, Slack, etc.)
}

# 1. Backup do banco de dados
echo "Iniciando backup do banco de dados..." | tee -a $LOG_FILE
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE
if [ $? -ne 0 ]; then
  echo "ERRO: Falha no backup do banco de dados." | tee -a $LOG_FILE
  send_notification "ERRO: Falha no backup do banco de dados para migrations."
  exit 1
fi
echo "Backup concluído: $BACKUP_FILE" | tee -a $LOG_FILE

# 2. Verificar migrations pendentes
cd $APP_DIR
echo "Verificando migrations pendentes..." | tee -a $LOG_FILE
PENDING=$(npm run typeorm:migration:show | grep "not applied" | wc -l)
if [ $PENDING -eq 0 ]; then
  echo "Nenhuma migration pendente. Finalizando." | tee -a $LOG_FILE
  send_notification "Nenhuma migration pendente para aplicação."
  exit 0
fi
echo "Existem $PENDING migrations pendentes para aplicação." | tee -a $LOG_FILE

# 3. Executar migrations
echo "Iniciando execução de migrations..." | tee -a $LOG_FILE
send_notification "Iniciando aplicação de $PENDING migrations no ambiente de produção."

npm run typeorm:migration:run 2>&1 | tee -a $LOG_FILE
if [ $? -ne 0 ]; then
  echo "ERRO: Falha na execução das migrations." | tee -a $LOG_FILE
  send_notification "ERRO CRÍTICO: Falha na aplicação de migrations. Restauração do backup necessária!"
  exit 1
fi

# 4. Verificar integridade após migrations
echo "Verificando integridade dos dados..." | tee -a $LOG_FILE
node dist/scripts/verify-data-integrity.js 2>&1 | tee -a $LOG_FILE
if [ $? -ne 0 ]; then
  echo "AVISO: Verificação de integridade reportou problemas. Verifique o log." | tee -a $LOG_FILE
  send_notification "AVISO: Migrations aplicadas, mas verificação de integridade reportou problemas."
  exit 2
fi

# 5. Finalizar com sucesso
echo "Migrations aplicadas com sucesso." | tee -a $LOG_FILE
send_notification "Migrations aplicadas com sucesso no ambiente de produção."
exit 0
```

### 5.11.3 Manutenção Regular do Banco de Dados

Para manter o banco de dados saudável e com boa performance, é recomendável a execução regular de tarefas de manutenção:

```awk
// src/scripts/database-maintenance.ts
import { createConnection } from 'typeorm';
import { configService } from '../config/config.service';

async function performDatabaseMaintenance(): Promise<void> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    
    try {
        console.log('Iniciando manutenção do banco de dados...');
        
        // 1. VACUUM ANALYZE para recuperar espaço e atualizar estatísticas
        console.log('Executando VACUUM ANALYZE...');
        await connection.query('VACUUM ANALYZE');
        
        // 2. REINDEX para otimizar índices
        console.log('Executando REINDEX...');
        await connection.query('REINDEX DATABASE current_database()');
        
        // 3. Limpeza de bloat em tabelas grandes
        console.log('Verificando bloat em tabelas grandes...');
        const tablesWithBloat = await connection.query(`
            SELECT schemaname, tablename, n_live_tup, n_dead_tup
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 10000
            ORDER BY n_dead_tup DESC
        `);
        
        for (const table of tablesWithBloat) {
            console.log(`Executando VACUUM FULL em ${table.schemaname}.${table.tablename} (${table.n_dead_tup} tuplas mortas)...`);
            await connection.query(`VACUUM FULL ${table.schemaname}.${table.tablename}`);
        }
        
        // 4. Atualizar estatísticas para o planejador de queries
        console.log('Atualizando estatísticas...');
        await connection.query('ANALYZE');
        
        // 5. Verificar e corrigir problemas de sequência
        console.log('Verificando sequências...');
        const sequences = await connection.query(`
            SELECT 
                sequencename,
                schemaname,
                last_value,
                start_value,
                increment_by
            FROM pg_sequences
        `);
        
        for (const sequence of sequences) {
            // Verificar tabelas que usam esta sequência
            const tableQuery = await connection.query(`
                SELECT pg_get_serial_sequence('"' || table_name || '"', column_name) as sequence_path
                FROM information_schema.columns
                WHERE table_schema = '${sequence.schemaname}'
                AND column_default LIKE 'nextval%'
                GROUP BY sequence_path, table_name, column_name
                HAVING pg_get_serial_sequence('"' || table_name || '"', column_name) = '${sequence.schemaname}.${sequence.sequencename}'
            `);
            
            if (tableQuery.length > 0) {
                const tableName = tableQuery[0].sequence_path.split('.')[0].replace(/"/g, '');
                const columnName = tableQuery[0].sequence_path.split('.')[1].replace(/"/g, '');
                
                // Verificar maior valor atual na tabela
                const maxValueQuery = await connection.query(`
                    SELECT MAX("${columnName}") as max_value
                    FROM "${sequence.schemaname}"."${tableName}"
                `);
                
                const maxValue = maxValueQuery[0].max_value;
                
                if (maxValue && maxValue > sequence.last_value) {
                    console.log(`Corrigindo sequência ${sequence.sequencename} (valor atual: ${sequence.last_value}, maior valor na tabela: ${maxValue})`);
                    
                    // Ajustar a sequência para 1 após o maior valor atual
                    await connection.query(`
                        SELECT setval('${sequence.schemaname}.${sequence.sequencename}', ${maxValue} + 1, false)
                    `);
                }
            }
        }
        
        console.log('Manutenção do banco de dados concluída com sucesso.');
    } catch (error) {
        console.error(`Erro durante manutenção do banco de dados: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Executar diretamente se chamado como script
if (require.main === module) {
    performDatabaseMaintenance()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { performDatabaseMaintenance };

## 5.12 Estratégias para Migrations em Grande Escala

Quando o sistema crescer e o número de migrations aumentar significativamente, será necessário adotar estratégias para manter a organização e a performance:

### 5.12.1 Consolidação de Migrations Históricas

Após um período de desenvolvimento ativo, o número de migrations pode tornar-se grande demais, resultando em:
- Tempo de inicialização mais lento
- Dificuldade em manter a rastreabilidade
- Complexidade para novos desenvolvedores entenderem o histórico

Uma solução é consolidar migrations históricas periodicamente:

```typescript
// src/scripts/consolidate-migrations.ts
import { createConnection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { configService } from '../config/config.service';

const execAsync = promisify(exec);

async function consolidateMigrations(targetVersion: string): Promise<void> {
    console.log(`Iniciando consolidação de migrations até a versão ${targetVersion}...`);
    
    const connection = await createConnection(configService.getTypeOrmConfig());
    const timestamp = new Date().getTime();
    const migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
    const consolidatedDir = path.join(migrationsDir, '0000-consolidated');
    
    try {
        // 1. Criar diretório de consolidação se não existir
        if (!fs.existsSync(consolidatedDir)) {
            fs.mkdirSync(consolidatedDir, { recursive: true });
        }
        
        // 2. Obter lista de migrations aplicadas
        const appliedMigrations = await connection.query(`
            SELECT * FROM migrations
            WHERE name <= $1
            ORDER BY id ASC
        `, [targetVersion]);
        
        if (appliedMigrations.length === 0) {
            console.log('Nenhuma migration encontrada para consolidar.');
            return;
        }
        
        console.log(`Encontradas ${appliedMigrations.length} migrations para consolidar.`);
        
        // 3. Criar migration consolidada
        const consolidatedFilename = `${timestamp}-ConsolidatedSchema.ts`;
        const consolidatedPath = path.join(consolidatedDir, consolidatedFilename);
        
        // 4. Exportar schema atual
        console.log('Exportando schema atual...');
        await execAsync(`pg_dump -h ${connection.options.host} -U ${connection.options.username} -d ${connection.options.database} -s -f schema_dump.sql`);
        
        // Ler o schema exportado
        const schemaSql = fs.readFileSync('schema_dump.sql', 'utf8');
        
        // 5. Criar arquivo de migration consolidada
        const consolidatedContent = `
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidação de migrations até a versão ${targetVersion}
 * Inclui as seguintes migrations:
 * ${appliedMigrations.map(m => '- ' + m.name).join('\n * ')}
 */
export class ConsolidatedSchema${timestamp} implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Esta migration não faz nada, pois o schema já está aplicado
        // Serve apenas para registrar a consolidação na tabela de migrations
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        throw new Error(
            'Não é possível reverter uma migration consolidada. ' + 
            'Restaure o banco de dados a partir de um backup se necessário.'
        );
    }
}
`;
        
        fs.writeFileSync(consolidatedPath, consolidatedContent);
        console.log(`Migration consolidada criada em ${consolidatedPath}`);
        
        // 6. Salvar schema completo para referência
        const schemaPath = path.join(consolidatedDir, `schema_${timestamp}.sql`);
        fs.writeFileSync(schemaPath, schemaSql);
        console.log(`Schema completo salvo em ${schemaPath}`);
        
        // 7. Remover entradas de migrations antigas da tabela (opcional)
        if (process.env.REMOVE_OLD_MIGRATIONS === 'true') {
            console.log('Removendo registros de migrations antigas da tabela...');
            await connection.query(`
                DELETE FROM migrations
                WHERE name <= $1
            `, [targetVersion]);
            
            // Inserir a migration consolidada
            await connection.query(`
                INSERT INTO migrations (timestamp, name) 
                VALUES ($1, $2)
            `, [timestamp, `ConsolidatedSchema${timestamp}`]);
            
            console.log('Registros de migrations antigas removidos e substituídos pela consolidada.');
        } else {
            console.log('AVISO: Registros de migrations antigas mantidos na tabela.');
            console.log('Para remover, execute novamente com a variável REMOVE_OLD_MIGRATIONS=true');
        }
        
        // 8. Aviso sobre as migrations antigas
        console.log('\nIMPORTANTE:');
        console.log('1. As migrations físicas antigas podem ser arquivadas, mas recomenda-se não excluí-las.');
        console.log('2. Crie um diretório "archived-migrations" e mova as migrations consolidadas para lá.');
        console.log('3. Atualize a documentação informando sobre esta consolidação.');
        
        // Remover arquivo temporário
        fs.unlinkSync('schema_dump.sql');
        
    } catch (error) {
        console.error(`Erro durante consolidação: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Executar diretamente se chamado como script
if (require.main === module) {
    const targetVersion = process.argv[2];
    
    if (!targetVersion) {
        console.error('Erro: Versão alvo não especificada.');
        console.log('Uso: npm run ts-node src/scripts/consolidate-migrations.ts <target-version>');
        process.exit(1);
    }
    
    consolidateMigrations(targetVersion)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { consolidateMigrations };
```

### 5.12.2 Migrations para Grandes Volumes de Dados

Para tabelas com milhões de registros, são necessárias estratégias especiais em migrations:

```pgsql
// src/database/migrations/0006-large-data-operations/1650000000000-AddIndexToLargeTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexToLargeTable1650000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Verificar tamanho da tabela
        const tableSize = await queryRunner.query(`
            SELECT pg_size_pretty(pg_total_relation_size('solicitacao')) as size,
                   pg_total_relation_size('solicitacao') as size_bytes
        `);
        
        console.log(`Tamanho da tabela solicitacao: ${tableSize[0].size}`);
        
        // Para tabelas muito grandes, usar CREATE INDEX CONCURRENTLY
        // que não bloqueia operações de escrita durante a criação
        if (tableSize[0].size_bytes > 1000000000) { // > 1GB
            console.log('Tabela grande detectada, usando CREATE INDEX CONCURRENTLY');
            
            // Evitar transação para CREATE INDEX CONCURRENTLY
            await queryRunner.query(`COMMIT`);
            
            await queryRunner.query(`
                CREATE INDEX CONCURRENTLY idx_solicitacoes_data_status 
                ON solicitacao (data_abertura, status)
            `);
            
            // Reiniciar transação
            await queryRunner.query(`BEGIN`);
        } else {
            // Para tabelas menores, o método padrão é suficiente
            await queryRunner.query(`
                CREATE INDEX idx_solicitacoes_data_status 
                ON solicitacao (data_abertura, status)
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Verificar se o índice existe
        const indexExists = await queryRunner.query(`
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_solicitacoes_data_status'
        `);
        
        if (indexExists.length > 0) {
            // Para índices criados com CONCURRENTLY, também é recomendado usar DROP CONCURRENTLY
            await queryRunner.query(`COMMIT`);
            await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_solicitacoes_data_status`);
            await queryRunner.query(`BEGIN`);
        }
    }
}
```

Para alterações de schema em tabelas muito grandes:

```pgsql
// src/database/migrations/0006-large-data-operations/1650000000001-AddColumnToLargeTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnToLargeTable1650000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Adicionar coluna com opção NULL
        await queryRunner.query(`
            ALTER TABLE solicitacao 
            ADD COLUMN prioridade VARCHAR(20) NULL
        `);
        
        // 2. Preencher a coluna em batches para evitar bloqueios longos
        const batchSize = 5000;
        let processed = 0;
        let total = 0;
        
        // Obter contagem total
        const countResult = await queryRunner.query(`
            SELECT COUNT(*) as count FROM solicitacao WHERE prioridade IS NULL
        `);
        total = parseInt(countResult[0].count, 10);
        
        console.log(`Total de registros a processar: ${total}`);
        
        // Processar em batches até concluir
        while (processed < total) {
            await queryRunner.query(`
                UPDATE solicitacao
                SET prioridade = 'normal'
                WHERE id IN (
                    SELECT id FROM solicitacao
                    WHERE prioridade IS NULL
                    LIMIT ${batchSize}
                )
            `);
            
            processed += batchSize;
            console.log(`Processados ${Math.min(processed, total)} de ${total} registros`);
        }
        
        // 3. Depois que todos os registros forem atualizados, definir restrição NOT NULL
        await queryRunner.query(`
            ALTER TABLE solicitacao 
            ALTER COLUMN prioridade SET NOT NULL
        `);
        
        // 4. Adicionar check constraint
        await queryRunner.query(`
            ALTER TABLE solicitacao 
            ADD CONSTRAINT chk_solicitacoes_prioridade 
            CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'))
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover na ordem inversa
        await queryRunner.query(`
            ALTER TABLE solicitacao 
            DROP CONSTRAINT IF EXISTS chk_solicitacoes_prioridade
        `);
        
        await queryRunner.query(`
            ALTER TABLE solicitacao 
            DROP COLUMN IF EXISTS prioridade
        `);
    }
}
```

## 5.13 Monitoramento e Diagnóstico de Performance de Migrations

### 5.13.1 Medição de Tempo de Execução

```typescript
// src/database/migration-performance-logger.ts
import { MigrationExecutor } from 'typeorm';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

export class MigrationPerformanceLogger {
    private static instance: MigrationPerformanceLogger;
    private migrations: Map<string, { start: number, end?: number }> = new Map();
    private logDir: string;
    
    private constructor() {
        this.logDir = path.join(process.cwd(), 'logs', 'migrations');
        
        // Criar diretório de logs se não existir
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    public static getInstance(): MigrationPerformanceLogger {
        if (!MigrationPerformanceLogger.instance) {
            MigrationPerformanceLogger.instance = new MigrationPerformanceLogger();
        }
        return MigrationPerformanceLogger.instance;
    }
    
    public startMeasuring(migrationName: string): void {
        this.migrations.set(migrationName, { start: performance.now() });
        console.log(`[${format(new Date(), 'HH:mm:ss')}] Iniciando migration: ${migrationName}`);
    }
    
    public stopMeasuring(migrationName: string): void {
        const migration = this.migrations.get(migrationName);
        
        if (migration) {
            migration.end = performance.now();
            const duration = (migration.end - migration.start) / 1000;
            console.log(`[${format(new Date(), 'HH:mm:ss')}] Concluída migration: ${migrationName} em ${duration.toFixed(2)}s`);
            
            // Registrar no log
            this.logMigrationPerformance(migrationName, duration);
        }
    }
    
    private logMigrationPerformance(migrationName: string, duration: number): void {
        const logFile = path.join(this.logDir, `performance-${format(new Date(), 'yyyy-MM-dd')}.log`);
        const logEntry = `${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}|${migrationName}|${duration.toFixed(2)}s\n`;
        
        fs.appendFileSync(logFile, logEntry);
    }
    
    public printSummary(): void {
        console.log('\n=== Resumo de Performance de Migrations ===');
        
        let totalDuration = 0;
        let slowestMigration = { name: '', duration: 0 };
        
        this.migrations.forEach((timing, name) => {
            if (timing.end) {
                const duration = (timing.end - timing.start) / 1000;
                totalDuration += duration;
                
                if (duration > slowestMigration.duration) {
                    slowestMigration = { name, duration };
                }
                
                console.log(`${name}: ${duration.toFixed(2)}s`);
            } else {
                console.log(`${name}: Não concluída`);
            }
        });
        
        console.log(`\nTotal migrations executadas: ${this.migrations.size}`);
        console.log(`Tempo total de execução: ${totalDuration.toFixed(2)}s`);
        
        if (slowestMigration.name) {
            console.log(`Migration mais lenta: ${slowestMigration.name} (${slowestMigration.duration.toFixed(2)}s)`);
        }
        
        console.log('=========================================\n');
    }
}

// Monkey patch do MigrationExecutor para capturar eventos de migration
export function patchMigrationExecutor(): void {
    const originalExecuteMigration = MigrationExecutor.prototype.executeMigration;
    
    MigrationExecutor.prototype.executeMigration = async function(migration: any, direction: 'up' | 'down') {
        const logger = MigrationPerformanceLogger.getInstance();
        const migrationName = migration.constructor.name;
        
        logger.startMeasuring(migrationName);
        
        try {
            // Executar a migration original
            return await originalExecuteMigration.call(this, migration, direction);
        } finally {
            logger.stopMeasuring(migrationName);
        }
    };
}
```

Para utilizar o logger de performance, é necessário registrá-lo na inicialização da aplicação:

```javascript
// src/database/data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { patchMigrationExecutor } from './migration-performance-logger';

// Patch do MigrationExecutor para logging de performance
patchMigrationExecutor();

config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: true,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/**/*.ts'],
    subscribers: [],
});
```

### 5.13.2 Análise de Performance de Queries das Migrations

```typescript
// src/scripts/analyze-migration-queries.ts
import { createConnection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { configService } from '../config/config.service';

async function analyzeMigrationQueries(migrationPath: string): Promise<void> {
    const connection = await createConnection(configService.getTypeOrmConfig());
    
    try {
        console.log(`Analisando queries da migration: ${migrationPath}...`);
        
        // Ler o arquivo da migration
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        
        // Extrair queries usando regex (simplificado)
        const queries = extractQueries(migrationContent);
        
        if (queries.length === 0) {
            console.log('Nenhuma query SQL explícita encontrada nesta migration.');
            return;
        }
        
        console.log(`Encontradas ${queries.length} queries para análise.`);
        
        // Analisar cada query
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            console.log(`\nQuery #${i + 1}:`);
            console.log(query.substring(0, 100) + (query.length > 100 ? '...' : ''));
            
            // Usar EXPLAIN ANALYZE para análise detalhada
            try {
                const explainResult = await connection.query(`EXPLAIN ANALYZE ${query}`);
                
                // Formatar saída do EXPLAIN
                console.log('\nPlano de execução:');
                explainResult.forEach((row: any) => {
                    const planLine = Object.values(row)[0];
                    console.log(`  ${planLine}`);
                    
                    // Destacar operações caras
                    if (planLine.includes('cost=') && !planLine.includes('Index Scan')) {
                        const costMatch = planLine.match(/cost=([0-9.]+)\.\.([0-9.]+)/);
                        if (costMatch && parseFloat(costMatch[2]) > 1000) {
                            console.log(`  ⚠️ Alta complexidade detectada! Considere otimizar esta query.`);
                        }
                    }
                    
                    // Destacar sequential scans
                    if (planLine.includes('Seq Scan') && !planLine.includes('ON pg_')) {
                        console.log(`  ⚠️ Sequential Scan detectado! Considere adicionar um índice.`);
                    }
                    
                    // Destacar operações de longa duração
                    if (planLine.includes('actual time=')) {
                        const timeMatch = planLine.match(/actual time=([0-9.]+)\.\.([0-9.]+)/);
                        if (timeMatch && parseFloat(timeMatch[2]) > 1000) {
                            console.log(`  ⚠️ Tempo de execução longo detectado: ${parseFloat(timeMatch[2]).toFixed(2)} ms`);
                        }
                    }
                });
            } catch (error) {
                console.log(`Não foi possível analisar a query: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error(`Erro durante análise: ${error.message}`);
        throw error;
    } finally {
        await connection.close();
    }
}

// Função para extrair queries de um arquivo de migration
function extractQueries(content: string): string[] {
    const queries: string[] = [];
    
    // Extrair queries de queryRunner.query
    const queryRegex = /queryRunner\.query\(\s*(`|'|")([\s\S]*?)\1\s*\)/g;
    let match;
    
    while ((match = queryRegex.exec(content)) !== null) {
        queries.push(match[2]);
    }
    
    // Extrair queries de connection.query
    const connQueryRegex = /connection\.query\(\s*(`|'|")([\s\S]*?)\1\s*\)/g;
    while ((match = connQueryRegex.exec(content)) !== null) {
        queries.push(match[2]);
    }
    
    return queries;
}

// Executar diretamente se chamado como script
if (require.main === module) {
    const migrationPath = process.argv[2];
    
    if (!migrationPath) {
        console.error('Erro: Caminho da migration não especificado.');
        console.log('Uso: npm run ts-node src/scripts/analyze-migration-queries.ts <migration-path>');
        process.exit(1);
    }
    
    analyzeMigrationQueries(migrationPath)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { analyzeMigrationQueries };
```

## 5.14 Considerações de Segurança

### 5.14.1 Proteção de Dados Sensíveis em Seeds

Para evitar vazamento de dados sensíveis em seeds de desenvolvimento e testes:

```typescript
// src/database/seeds/secure-test-data.seed.ts
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { Cidadao } from '../../modules/cidadao/entities/cidadao.entity';
import { User } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as faker from 'faker/locale/pt_BR';

// Função para anonimizar CPF
function generateFakeCPF(): string {
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    const n3 = Math.floor(Math.random() * 10);
    return `${n1}${n2}${n3}.${n1}${n2}${n3}.${n1}${n2}${n3}-${n2}${n1}`;
}

export default class SecureTestDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // Uso seguro de credenciais
    // Nunca armazenar senhas reais, mesmo em ambiente de desenvolvimento
    const commonPassword = await bcrypt.hash('Teste@123', 10);
    
    // Gerar usuários de teste
    const users = [];
    for (let i = 1; i <= 5; i++) {
      users.push({
        nome: `Usuário Teste ${i}`,
        email: `teste${i}@example.com`,
        senha_hash: commonPassword,
        role: i === 1 ? 'administrador' : 'tecnico_unidade',
        unidade_id: i % 4 + 1,
        setor_id: i % 4 + 1,
        primeiro_acesso: false,
      });
    }
    
    // Inserir usuários
    await connection
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .execute();
    
    // Gerar cidadãos de teste com dados anonimizados
    const cidadao = [];
    for (let i = 1; i <= 20; i++) {
      const firstName = faker.name.firstName();
      const lastName = faker.name.lastName();
      
      cidadao.push({
        nome: `${firstName} ${lastName}`,
        cpf: generateFakeCPF(), // CPF fictício
        rg: faker.random.alphaNumeric(8),
        data_nascimento: faker.date.past(50, new Date('2000-01-01')),
        sexo: i % 2 === 0 ? 'masculino' : 'feminino',
        nome_mae: `Mãe de ${firstName}`,
        endereco: `Rua Teste, ${i}`,
        bairro: faker.address.county(),
        cidade: 'Natal',
        estado: 'RN',
        telefone: faker.phone.phoneNumber('84########'),
        email: `teste${i}@example.com`, // Email fictício
        pix_tipo: 'cpf',
        pix_chave: generateFakeCPF(),
      });
    }
    
    // Inserir cidadãos
    await connection
      .createQueryBuilder()
      .insert()
      .into(Cidadao)
      .values(cidadao)
      .execute();
      
    console.log(`✅ Dados de teste seguros gerados.`);
    console.log(`  - ${users.length} usuários`);
    console.log(`  - ${cidadao.length} cidadãos`);
  }
}
```

### 5.14.2 Auditoria de Alterações de Schema

Para manter um registro de segurança das alterações no schema:

```typescript
// src/services/schema-audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

@Injectable()
export class SchemaAuditService {
  private readonly logger = new Logger(SchemaAuditService.name);
  private auditDir: string;

  constructor(
    @InjectConnection()
    private connection: Connection,
  ) {
    this.auditDir = path.join(process.cwd(), 'logs', 'schema-audit');
    
    // Criar diretório de auditoria se não existir
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  async captureSchema(): Promise<string> {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const auditFile = path.join(this.auditDir, `schema-${timestamp}.json`);
    
    try {
      this.logger.log('Capturando schema atual do banco de dados para auditoria...');
      
      // Obter lista de tabelas
      const tables = await this.connection.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name
      `);
      
      const schema: Record<string, any> = {};
      
      // Para cada tabela, obter detalhes de colunas, índices e constraints
      for (const table of tables) {
        const fullTableName = `${table.table_schema}.${table.table_name}`;
        
        // Obter detalhes de colunas
        const columns = await this.connection.query(`
          SELECT column_name, data_type, character_maximum_length, 
                 column_default, is_nullable
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [table.table_schema, table.table_name]);
        
        // Obter índices
        const indices = await this.connection.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
        `, [table.table_schema, table.table_name]);
        
        // Obter constraints
        const constraints = await this.connection.query(`
          SELECT c.conname as constraint_name,
                 c.contype as constraint_type,
                 CASE WHEN c.contype = 'f' THEN
                   (SELECT table_name FROM information_schema.tables
                    WHERE table_schema = r.nspname AND
                          table_name = r.relname)
                 END as referenced_table
          FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          JOIN pg_class t ON t.oid = c.conrelid
          LEFT JOIN pg_class r ON r.oid = c.confrelid
          LEFT JOIN pg_namespace r ON r.oid = r.relnamespace
          WHERE n.nspname = $1 AND t.relname = $2
        `, [table.table_schema, table.table_name]);
        
        // Mapear tipo de constraint para descrições legíveis
        const constraintTypes: Record<string, string> = {
          'p': 'PRIMARY KEY',
          'f': 'FOREIGN KEY',
          'u': 'UNIQUE',
          'c': 'CHECK',
        };
        
        const mappedConstraints = constraints.map((c: any) => ({
          ...c,
          constraint_type: constraintTypes[c.constraint_type] || c.constraint_type,
        }));
        
        // Adicionar tabela ao schema
        schema[fullTableName] = {
          columns,
          indices,
          constraints: mappedConstraints,
        };
      }
      
      // Salvar schema em formato JSON
      fs.writeFileSync(auditFile, JSON.stringify(schema, null, 2));
      
      this.logger.log(`Schema capturado e salvo em ${auditFile}`);
      return auditFile;
    } catch (error) {
      this.logger.error(`Erro ao capturar schema: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async compareSchemas(oldSchemaFile: string, newSchemaFile: string): Promise<string> {
    try {
      this.logger.log(`Comparando schemas: ${oldSchemaFile} vs ${newSchemaFile}`);
      
      // Ler arquivos de schema
      const oldSchema = JSON.parse(fs.readFileSync(oldSchemaFile, 'utf8'));
      const newSchema = JSON.parse(fs.readFileSync(newSchemaFile, 'utf8'));
      
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
      const diffFile = path.join(this.auditDir, `diff-${timestamp}.txt`);
      
      const differences: string[] = [];
      
      // Comparar tabelas
      const allTables = new Set([
        ...Object.keys(oldSchema),
        ...Object.keys(newSchema),
      ]);
      
      for (const table of allTables) {
        // Tabela adicionada
        if (!oldSchema[table]) {
          differences.push(`+ TABELA: ${table}`);
          continue;
        }
        
        // Tabela removida
        if (!newSchema[table]) {
          differences.push(`- TABELA: ${table}`);
          continue;
        }
        
        // Comparar colunas
        const oldColumns = oldSchema[table].columns;
        const newColumns = newSchema[table].columns;
        
        // Mapear colunas por nome para facilitar a comparação
        const oldColumnMap = oldColumns.reduce((map: any, col: any) => {
          map[col.column_name] = col;
          return map;
        }, {});
        
        const newColumnMap = newColumns.reduce((map: any, col: any) => {
          map[col.column_name] = col;
          return map;
        }, {});
        
        const allColumnNames = new Set([
          ...oldColumns.map((c: any) => c.column_name),
          ...newColumns.map((c: any) => c.column_name),
        ]);
        
        for (const colName of allColumnNames) {
          // Coluna adicionada
          if (!oldColumnMap[colName]) {
            differences.push(`  + COLUNA: ${table}.${colName} (${newColumnMap[colName].data_type})`);
            continue;
          }
          
          // Coluna removida
          if (!newColumnMap[colName]) {
            differences.push(`  - COLUNA: ${table}.${colName} (${oldColumnMap[colName].data_type})`);
            continue;
          }
          
          // Verificar alterações em colunas existentes
          const oldCol = oldColumnMap[colName];
          const newCol = newColumnMap[colName];
          
          if (oldCol.data_type !== newCol.data_type) {
            differences.push(`  ~ COLUNA: ${table}.${colName} tipo alterado de ${oldCol.data_type} para ${newCol.data_type}`);
          }
          
          if (oldCol.is_nullable !== newCol.is_nullable) {
            differences.push(`  ~ COLUNA: ${table}.${colName} nullable alterado de ${oldCol.is_nullable} para ${newCol.is_nullable}`);
          }
          
          if (oldCol.column_default !== newCol.column_default) {
            differences.push(`  ~ COLUNA: ${table}.${colName} default alterado de ${oldCol.column_default || 'NULL'} para ${newCol.column_default || 'NULL'}`);
          }
        }
        
        // Comparar índices
        const oldIndices = oldSchema[table].indices;
        const newIndices = newSchema[table].indices;
        
        const oldIndexMap = oldIndices.reduce((map: any, idx: any) => {
          map[idx.indexname] = idx;
          return map;
        }, {});
        
        const newIndexMap = newIndices.reduce((map: any, idx: any) => {
          map[idx.indexname] = idx;
          return map;
        }, {});
        
        const allIndexNames = new Set([
          ...oldIndices.map((i: any) => i.indexname),
          ...newIndices.map((i: any) => i.indexname),
        ]);
        
        for (const idxName of allIndexNames) {
          // Índice adicionado
          if (!oldIndexMap[idxName]) {
            differences.push(`  + ÍNDICE: ${table}.${idxName} (${newIndexMap[idxName].indexdef})`);
            continue;
          }
          
          // Índice removido
          if (!newIndexMap[idxName]) {
            differences.push(`  - ÍNDICE: ${table}.${idxName} (${oldIndexMap[idxName].indexdef})`);
            continue;
          }
          
          // Verificar alterações em índices existentes
          if (oldIndexMap[idxName].indexdef !== newIndexMap[idxName].indexdef) {
            differences.push(`  ~ ÍNDICE: ${table}.${idxName} definição alterada`);
          }
        }
        
        // Comparar constraints
        const oldConstraints = oldSchema[table].constraints;
        const newConstraints = newSchema[table].constraints;
        
        const oldConstraintMap = oldConstraints.reduce((map: any, con: any) => {
          map[con.constraint_name] = con;
          return map;
        }, {});
        
        const newConstraintMap = newConstraints.reduce((map: any, con: any) => {
          map[con.constraint_name] = con;
          return map;
        }, {});
        
        const allConstraintNames = new Set([
          ...oldConstraints.map((c: any) => c.constraint_name),
          ...newConstraints.map((c: any) => c.constraint_name),
        ]);
        
        for (const conName of allConstraintNames) {
          // Constraint adicionada
          if (!oldConstraintMap[conName]) {
            differences.push(`  + CONSTRAINT: ${table}.${conName} (${newConstraintMap[conName].constraint_type})`);
            continue;
          }
          
          // Constraint removida
          if (!newConstraintMap[conName]) {
            differences.push(`  - CONSTRAINT: ${table}.${conName} (${oldConstraintMap[conName].constraint_type})`);
            continue;
          }
          
          // Verificar alterações em constraints existentes
          if (oldConstraintMap[conName].constraint_type !== newConstraintMap[conName].constraint_type) {
            differences.push(`  ~ CONSTRAINT: ${table}.${conName} tipo alterado de ${oldConstraintMap[conName].constraint_type} para ${newConstraintMap[conName].constraint_type}`);
          }
          
          if (oldConstraintMap[conName].referenced_table !== newConstraintMap[conName].referenced_table) {
            differences.push(`  ~ CONSTRAINT: ${table}.${conName} referência alterada de ${oldConstraintMap[conName].referenced_table || 'NULL'} para ${newConstraintMap[conName].referenced_table || 'NULL'}`);
          }
        }
      }
      
      // Salvar diferenças encontradas
      if (differences.length > 0) {
        const content = `Comparação de schemas: ${oldSchemaFile} vs ${newSchemaFile}\n` +
                        `Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n\n` +
                        differences.join('\n');
        
        fs.writeFileSync(diffFile, content);
        this.logger.log(`Diferenças encontradas e salvas em ${diffFile}`);
      } else {
        fs.writeFileSync(diffFile, 'Nenhuma diferença encontrada entre os schemas.');
        this.logger.log('Nenhuma diferença encontrada entre os schemas.');
      }
      
      return diffFile;
    } catch (error) {
      this.logger.error(`Erro ao comparar schemas: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

O serviço pode ser utilizado antes e depois de cada execução de migrations para manter um histórico verificável de alterações no schema:

```awk
// src/scripts/audit-migrations.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SchemaAuditService } from '../services/schema-audit.service';

async function auditBeforeMigrations(): Promise<string> {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const schemaAuditService = app.get(SchemaAuditService);
    return await schemaAuditService.captureSchema();
  } finally {
    await app.close();
  }
}

async function auditAfterMigrations(beforeSchemaFile: string): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const schemaAuditService = app.get(SchemaAuditService);
    const afterSchemaFile = await schemaAuditService.captureSchema();
    
    // Comparar schemas e gerar relatório de diferenças
    await schemaAuditService.compareSchemas(beforeSchemaFile, afterSchemaFile);
  } finally {
    await app.close();
  }
}

export { auditBeforeMigrations, auditAfterMigrations };

// Executar diretamente se chamado como script
if (require.main === module) {
  const mode = process.argv[2];
  const schemaFile = process.argv[3];
  
  if (mode === 'before') {
    auditBeforeMigrations()
      .then((file) => {
        console.log(`Schema capturado: ${file}`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('Erro:', error);
        process.exit(1);
      });
  } else if (mode === 'after' && schemaFile) {
    auditAfterMigrations(schemaFile)
      .then(() => {
        console.log('Auditoria de migrations concluída.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Erro:', error);
        process.exit(1);
      });
  } else {
    console.log('Uso:');
    console.log('  npm run ts-node src/scripts/audit-migrations.ts before');
    console.log('  npm run ts-node src/scripts/audit-migrations.ts after <schema-file-from-before>');
    process.exit(1);
  }
}
```

## 5.15 Considerações Finais

### 5.15.1 Melhores Práticas Consolidadas

1. **Organização e Nomenclatura**
    *   Organize migrations em diretórios por funcionalidade ou versão
    *   Use nomenclatura clara e descritiva para arquivos de migration
    *   Adicione comentários explicativos no código das migrations
2. **Qualidade e Segurança**
    *   Sempre teste migrations em ambientes não-produtivos antes da aplicação
    *   Mantenha um esquema de backup automatizado antes de aplicar migrations
    *   Implemente testes automatizados para validar o resultado das migrations
    *   Audite e registre todas as alterações de schema para compliance
3. **Performance e Escala**
    *   Use CREATE INDEX CONCURRENTLY para índices em tabelas grandes
    *   Adicione colunas inicialmente como NULL e depois altere para NOT NULL
    *   Atualize dados em lotes para evitar bloqueios prolongados
    *   Consolide migrations históricas periodicamente para manter a performance
4. **Manutenção Contínua**
    *   Execute tarefas regulares de manutenção (VACUUM, ANALYZE, REINDEX)
    *   Monitore o crescimento de tabelas e ajuste estratégias conforme necessário
    *   Periodicamente revise e otimize índices baseados em padrões de uso

### 5.15.2 Processo Recomendado para Atualização de Banco de Dados

O processo recomendado para aplicar atualizações de banco de dados em produção é:

1. **Preparação**
    *   Desenvolvimento e teste das migrations em ambiente local
    *   Validação em ambientes de desenvolvimento e homologação
    *   Agendamento da janela de manutenção se necessário
2. **Pré-execução**
    *   Backup completo do banco de dados
    *   Captura do schema atual para auditoria
    *   Verificação de migrations pendentes
3. **Execução**
    *   Aplicação das migrations com monitoramento em tempo real
    *   Registro de logs de performance e execução
4. **Pós-execução**
    *   Verificação de integridade dos dados
    *   Testes de funcionalidade da aplicação
    *   Geração de relatório de comparação de schema
    *   Backup pós-migration
5. **Documentação**
    *   Registro da execução (quem, quando, o que)
    *   Arquivamento dos arquivos de log e auditoria
    *   Atualização da documentação do banco de dados

### 5.15.3 Kit de Ferramentas para Gestão de Banco de Dados

Resumo das ferramentas desenvolvidas neste documento:

1. **Scripts para Desenvolvimento**
    *   Geração de migrations (`typeorm:migration:generate`)
    *   Criação manual de migrations (`typeorm:migration:create`)
    *   Execução de migrations (`typeorm:migration:run`)
2. **Scripts para Produção**
    *   Backup automatizado (`backup-before-migration.ts`)
    *   Auditoria de alterações (`audit-migrations.ts`)
    *   Monitoramento de performance (`migration-performance-logger.ts`)
3. **Scripts para Manutenção**
    *   Verificação de integridade (`verify-data-integrity.ts`)
    *   Limpeza de dados temporários (`clean-temporary-data.ts`)
    *   Correção de inconsistências (`fix-data-inconsistencies.ts`)
    *   Manutenção de banco de dados (`database-maintenance.ts`)
    *   Consolidação de migrations históricas (`consolidate-migrations.ts`)
4. **Scripts para Análise**
    *   Análise de queries (`analyze-migration-queries.ts`)
    *   Exportação e importação de dados (`data-export-import.ts`)

Estas ferramentas formam um kit completo para gestão eficiente e segura do banco de dados durante todo seu ciclo de vida, desde o desenvolvimento até a operação em produção.

## 5.16 Recursos e Referências

### 5.16.1 Documentação Oficial

*   [TypeORM - Migrations](https://typeorm.io/#/migrations)
*   [TypeORM - Connection](https://typeorm.io/#/connection)
*   [TypeORM-Seeding](https://github.com/w3tecch/typeorm-seeding)
*   [PostgreSQL - Documentação Oficial](https://www.postgresql.org/docs/)

### 5.16.2 Ferramentas Úteis

*   [pgAdmin 4](https://www.pgadmin.org/) - Interface gráfica para administração PostgreSQL
*   [DBeaver](https://dbeaver.io/) - Cliente de banco de dados universal
*   [pg\_stat\_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - Extensão do PostgreSQL para monitoramento de queries
*   [pg\_repack](https://reorg.github.io/pg_repack/) - Ferramenta para reorganização de tabelas sem bloqueios

### 5.16.3 Artigos e Guias Recomendados

*   [Estratégias para migrations sem downtime](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
*   [Otimização de Performance do PostgreSQL](https://wiki.postgresql.org/wiki/Performance_Optimization)
*   [Gerenciamento de Migrations em Projetos de Larga Escala](https://medium.com/better-programming/database-migration-strategies-for-large-scale-applications-22ff284c9ca)