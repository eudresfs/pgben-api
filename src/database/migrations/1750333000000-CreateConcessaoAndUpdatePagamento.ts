import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class CreateConcessaoAndUpdatePagamento1750333000000 implements MigrationInterface {
  private readonly concessaoTable = 'concessao';
  private readonly concessaoStatusEnum = 'status_concessao_enum';
  private readonly pagamentoTable = 'pagamento';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enum status_concessao_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.concessaoStatusEnum}') THEN
          CREATE TYPE ${this.concessaoStatusEnum} AS ENUM (
            'pendente',
            'concedido',
            'suspenso',
            'bloqueado',
            'encerrado'
          );
        END IF;
      END$$;
    `);

    // 2. Criar tabela concessao
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${this.concessaoTable} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        solicitacao_id UUID NOT NULL,
        status ${this.concessaoStatusEnum} NOT NULL DEFAULT 'pendente',
        ordem_prioridade INTEGER NOT NULL DEFAULT 3,
        determinacao_judicial_flag BOOLEAN NOT NULL DEFAULT FALSE,
        data_inicio DATE NOT NULL,
        data_encerramento DATE,
        motivo_encerramento TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        removed_at TIMESTAMPTZ,
        CONSTRAINT fk_concessao_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id)
      );
    `);

    // 3. Adicionar coluna concessao_id em pagamento
    await queryRunner.query(`
      ALTER TABLE ${this.pagamentoTable}
        ADD COLUMN IF NOT EXISTS concessao_id UUID;
    `);

    // 4. Adicionar FK pagamento -> concessao
    await queryRunner.createForeignKey("pagamento", new TableForeignKey({
      name: "fk_pagamento_concessao",
      columnNames: ["concessao_id"],
      referencedTableName: "concessao",
      referencedColumnNames: ["id"],
      onDelete: "CASCADE", // ou SET NULL ou RESTRICT, dependendo da sua regra de negócio
    }));


    // 5. Tornar solicitacao_id opcional removendo NOT NULL constraint se existir
    await queryRunner.query(`
      ALTER TABLE ${this.pagamentoTable}
        ALTER COLUMN solicitacao_id DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Reverter NOT NULL em solicitacao_id
    await queryRunner.query(`
      ALTER TABLE ${this.pagamentoTable}
        ALTER COLUMN solicitacao_id SET NOT NULL;
    `);

    // 2. Remover FK e coluna concessao_id
    await queryRunner.query(`
      ALTER TABLE ${this.pagamentoTable}
        DROP CONSTRAINT IF EXISTS fk_pagamento_concessao,
        DROP COLUMN IF EXISTS concessao_id;
    `);

    // 3. Remover tabela concessao
    await queryRunner.query(`
      DROP TABLE IF EXISTS ${this.concessaoTable};
    `);

    // 4. Remover enum se não utilizado
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          JOIN pg_catalog.pg_attribute a ON a.atttypid = t.oid
          WHERE t.typname = '${this.concessaoStatusEnum}'
        ) THEN
          DROP TYPE IF EXISTS ${this.concessaoStatusEnum};
        END IF;
      END$$;
    `);
  }
}
