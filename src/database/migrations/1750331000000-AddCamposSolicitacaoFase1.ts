import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCamposSolicitacaoFase11750331000000
  implements MigrationInterface
{
  private readonly table = 'solicitacao';
  private readonly subStatusEnum = 'sub_status_solicitacao_enum';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipo enum para sub-status, se ainda não existir
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.subStatusEnum}') THEN
          CREATE TYPE ${this.subStatusEnum} AS ENUM (
            'aguardando_dados',
            'aguardando_documentos',
            'aguardando_parecer_tecnico',
            'aguardando_solucao',
            'pendencias_resolvidas'
          );
        END IF;
      END$$;
    `);

    // 2. Adicionar colunas
    await queryRunner.query(`
      ALTER TABLE ${this.table}
        ADD COLUMN IF NOT EXISTS quantidade_parcelas INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS determinacao_judicial_id UUID,
        ADD COLUMN IF NOT EXISTS prioridade INTEGER NOT NULL DEFAULT 3,
        ADD COLUMN IF NOT EXISTS sub_status ${this.subStatusEnum};
    `);

    // 3. FK para determinação judicial
    await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'determinacao_judicial'
          ) AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_solicitacao_determinacao_judicial'
          ) THEN
            ALTER TABLE solicitacao
              ADD CONSTRAINT fk_solicitacao_determinacao_judicial
              FOREIGN KEY (determinacao_judicial_id) REFERENCES determinacao_judicial(id);
          END IF;
        END
        $$;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover FK e colunas
    await queryRunner.query(`
      ALTER TABLE ${this.table}
        DROP CONSTRAINT IF EXISTS fk_solicitacao_determinacao_judicial,
        DROP COLUMN IF EXISTS sub_status,
        DROP COLUMN IF EXISTS prioridade,
        DROP COLUMN IF EXISTS determinacao_judicial_id,
        DROP COLUMN IF EXISTS quantidade_parcelas;
    `);

    // Remover enum (somente se não houver mais colunas utilizando-o)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          JOIN pg_catalog.pg_attribute a ON a.atttypid = t.oid
          WHERE t.typname = '${this.subStatusEnum}'
            AND a.attrelid IN (SELECT oid FROM pg_class WHERE relname = '${this.table}')
        ) THEN
          DROP TYPE IF EXISTS ${this.subStatusEnum};
        END IF;
      END$$;
    `);
  }
}
