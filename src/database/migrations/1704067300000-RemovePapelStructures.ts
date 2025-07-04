import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para remover todas as estruturas relacionadas a papéis do sistema
 * Remove tabelas, triggers, funções e enums relacionados ao conceito de "papel"
 */
export class RemovePapelStructures1704067300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers relacionados a papéis
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_papel ON papel_cidadao;
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_composicao ON composicao_familiar;
      DROP TRIGGER IF EXISTS trigger_papel_cidadao_update_timestamp ON papel_cidadao;
    `);

    // Remover funções relacionadas a papéis
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_papel();
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_composicao();
    `);

    // Remover tabelas relacionadas a papéis
    await queryRunner.query(`
      DROP TABLE IF EXISTS historico_conversao_papel;
      DROP TABLE IF EXISTS regra_conflito_papel;
      DROP TABLE IF EXISTS papel_cidadao;
    `);

    // Remover coluna CPF da tabela composicao_familiar (adicionada para validação de papéis)
    await queryRunner.query(`
      ALTER TABLE composicao_familiar DROP COLUMN IF EXISTS cpf;
    `);

    // Remover enum de tipo de papel
    await queryRunner.query(`
      DROP TYPE IF EXISTS tipo_papel_enum;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar enum de tipo de papel
    await queryRunner.query(`
      CREATE TYPE tipo_papel_enum AS ENUM (
        'beneficiario', 'requerente', 'representante_legal'
      );
    `);

    // Recriar tabela papel_cidadao
    await queryRunner.query(`
      CREATE TABLE papel_cidadao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cidadao_id UUID NOT NULL,
        composicao_familiar_id UUID,
        tipo_papel tipo_papel_enum NOT NULL,
        metadados JSONB,
        ativo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        removed_at TIMESTAMP,
        CONSTRAINT UK_papel_cidadao_cidadao_tipo UNIQUE (cidadao_id, tipo_papel)
      );
    `);

    // Recriar índices para papel_cidadao
    await queryRunner.query(`
      CREATE INDEX IDX_papel_cidadao_cidadao ON papel_cidadao (cidadao_id);
      CREATE INDEX IDX_papel_cidadao_tipo ON papel_cidadao (tipo_papel);
      CREATE INDEX IDX_papel_cidadao_metadados ON papel_cidadao USING GIN (metadados);
    `);

    // Recriar tabela regra_conflito_papel
    await queryRunner.query(`
      CREATE TABLE regra_conflito_papel (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        papel_origem_id UUID NOT NULL,
        papel_destino_id UUID NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        created_by UUID,
        updated_by UUID
      );
    `);

    // Recriar tabela historico_conversao_papel
    await queryRunner.query(`
      CREATE TABLE historico_conversao_papel (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cidadao_id UUID NOT NULL,
        papel_anterior tipo_papel_enum NOT NULL,
        papel_novo tipo_papel_enum NOT NULL,
        composicao_familiar_id UUID,
        usuario_id UUID NOT NULL,
        justificativa TEXT NOT NULL,
        notificacao_enviada BOOLEAN DEFAULT FALSE,
        tecnico_notificado_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_historico_conversao_papel_cidadao
          FOREIGN KEY (cidadao_id)
          REFERENCES cidadao(id)
          ON DELETE CASCADE
      );
    `);

    // Adicionar coluna CPF na tabela composicao_familiar
    await queryRunner.query(`
      ALTER TABLE composicao_familiar ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
    `);

    // Recriar constraints e triggers (simplificado para rollback)
    await queryRunner.query(`
      ALTER TABLE papel_cidadao ADD CONSTRAINT FK_papel_cidadao_cidadao
        FOREIGN KEY (cidadao_id) REFERENCES cidadao(id) ON DELETE CASCADE;
      
      ALTER TABLE papel_cidadao ADD CONSTRAINT FK_papel_cidadao_composicao_familiar
        FOREIGN KEY (composicao_familiar_id) REFERENCES composicao_familiar(id) ON DELETE SET NULL;
    `);
  }
}