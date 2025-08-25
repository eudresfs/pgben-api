import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para alterar a coluna 'ativo' para 'status' nas tabelas do módulo de aprovação
 * Converte valores boolean para enum Status (ATIVO/INATIVO)
 */
export class ChangeAtivoToStatusInAprovacao1755891500000 implements MigrationInterface {
  name = 'ChangeAtivoToStatusInAprovacao1755891500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum Status se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "status_enum" AS ENUM('ATIVO', 'INATIVO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Alterar tabela acoes_aprovacao - verificar se coluna status já existe
    const statusColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'acoes_aprovacao' AND column_name = 'status'
    `);
    
    if (statusColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "acoes_aprovacao" 
        ADD COLUMN "status" "status_enum" DEFAULT 'ATIVO'
      `);
    }
    
    // Migrar dados: true -> ATIVO, false -> INATIVO (apenas se coluna ativo existir)
    const ativoColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'acoes_aprovacao' AND column_name = 'ativo'
    `);
    
    if (ativoColumnExists.length > 0) {
      await queryRunner.query(`
        UPDATE "acoes_aprovacao" 
        SET "status" = CASE 
          WHEN "ativo" = true THEN 'ATIVO'::"status_enum"
          ELSE 'INATIVO'::"status_enum"
        END
      `);
    }
    
    // Tornar coluna status NOT NULL
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      ALTER COLUMN "status" SET NOT NULL
    `);
    
    // Remover coluna ativo (apenas se existir)
    if (ativoColumnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "acoes_aprovacao" 
        DROP COLUMN "ativo"
      `);
    }

    // Alterar tabela configuracao_aprovadores - verificar se coluna status já existe
    const statusColumnExistsConfig = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'configuracao_aprovadores' AND column_name = 'status'
    `);
    
    if (statusColumnExistsConfig.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "configuracao_aprovadores" 
        ADD COLUMN "status" "status_enum" DEFAULT 'ATIVO'
      `);
    }
    
    // Migrar dados: true -> ATIVO, false -> INATIVO (apenas se coluna ativo existir)
    const ativoColumnExistsConfig = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'configuracao_aprovadores' AND column_name = 'ativo'
    `);
    
    if (ativoColumnExistsConfig.length > 0) {
      await queryRunner.query(`
        UPDATE "configuracao_aprovadores" 
        SET "status" = CASE 
          WHEN "ativo" = true THEN 'ATIVO'::"status_enum"
          ELSE 'INATIVO'::"status_enum"
        END
      `);
    }
    
    // Tornar coluna status NOT NULL
    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      ALTER COLUMN "status" SET NOT NULL
    `);
    
    // Remover coluna ativo (apenas se existir)
    if (ativoColumnExistsConfig.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "configuracao_aprovadores" 
        DROP COLUMN "ativo"
      `);
    }

    // Alterar tabela solicitacao_aprovadores - verificar se coluna status já existe
    const statusColumnExistsSolic = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'solicitacao_aprovadores' AND column_name = 'status'
    `);
    
    if (statusColumnExistsSolic.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "solicitacao_aprovadores" 
        ADD COLUMN "status" "status_enum" DEFAULT 'ATIVO'
      `);
    }
    
    // Migrar dados: true -> ATIVO, false -> INATIVO (apenas se coluna ativo existir)
    const ativoColumnExistsSolic = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'solicitacao_aprovadores' AND column_name = 'ativo'
    `);
    
    if (ativoColumnExistsSolic.length > 0) {
      await queryRunner.query(`
        UPDATE "solicitacao_aprovadores" 
        SET "status" = CASE 
          WHEN "ativo" = true THEN 'ATIVO'::"status_enum"
          ELSE 'INATIVO'::"status_enum"
        END
      `);
    }
    
    // Tornar coluna status NOT NULL
    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      ALTER COLUMN "status" SET NOT NULL
    `);
    
    // Remover coluna ativo (apenas se existir)
    if (ativoColumnExistsSolic.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "solicitacao_aprovadores" 
        DROP COLUMN "ativo"
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter tabela acoes_aprovacao
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      ADD COLUMN "ativo" boolean DEFAULT true
    `);
    
    // Migrar dados de volta: ATIVO -> true, INATIVO -> false
    await queryRunner.query(`
      UPDATE "acoes_aprovacao" 
      SET "ativo" = CASE 
        WHEN "status" = 'ATIVO' THEN true
        ELSE false
      END
    `);
    
    // Tornar coluna ativo NOT NULL
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      ALTER COLUMN "ativo" SET NOT NULL
    `);
    
    // Remover coluna status
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      DROP COLUMN "status"
    `);

    // Reverter tabela configuracao_aprovadores
    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      ADD COLUMN "ativo" boolean DEFAULT true
    `);
    
    // Migrar dados de volta: ATIVO -> true, INATIVO -> false
    await queryRunner.query(`
      UPDATE "configuracao_aprovadores" 
      SET "ativo" = CASE 
        WHEN "status" = 'ATIVO' THEN true
        ELSE false
      END
    `);
    
    // Tornar coluna ativo NOT NULL
    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      ALTER COLUMN "ativo" SET NOT NULL
    `);
    
    // Remover coluna status
    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      DROP COLUMN "status"
    `);

    // Reverter tabela solicitacao_aprovadores
    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      ADD COLUMN "ativo" boolean DEFAULT true
    `);
    
    // Migrar dados de volta: ATIVO -> true, INATIVO -> false
    await queryRunner.query(`
      UPDATE "solicitacao_aprovadores" 
      SET "ativo" = CASE 
        WHEN "status" = 'ATIVO' THEN true
        ELSE false
      END
    `);
    
    // Tornar coluna ativo NOT NULL
    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      ALTER COLUMN "ativo" SET NOT NULL
    `);
    
    // Remover coluna status
    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      DROP COLUMN "status"
    `);
  }
}