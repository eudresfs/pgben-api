import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar coluna cidadao_id à tabela documentos
 * e corrigir inconsistências entre a entidade e o schema do banco
 * 
 * Esta migration resolve o problema onde a entidade Documento espera
 * uma coluna cidadao_id que não existe no banco de dados.
 * 
 * @author Sistema SEMTAS
 * @date 03/01/2025
 */
export class AddCidadaoIdToDocumentos1735862664427 implements MigrationInterface {
  name = 'AddCidadaoIdToDocumentos1735862664427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration AddCidadaoIdToDocumentos...');
    
    // 1. Adicionar coluna cidadao_id
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ADD COLUMN "cidadao_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);
    
    // 2. Tornar solicitacao_id nullable (conforme entidade)
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ALTER COLUMN "solicitacao_id" DROP NOT NULL;
    `);
    
    // 3. Renomear coluna usuario_upload para usuario_upload_id
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      RENAME COLUMN "usuario_upload" TO "usuario_upload_id";
    `);
    
    // 4. Renomear coluna usuario_verificacao para usuario_verificacao_id
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      RENAME COLUMN "usuario_verificacao" TO "usuario_verificacao_id";
    `);
    
    // 5. Adicionar colunas que estão na entidade mas não no banco
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ADD COLUMN "reutilizavel" boolean NOT NULL DEFAULT false;
    `);
    
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ADD COLUMN "hash_arquivo" character varying;
    `);
    
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ADD COLUMN "data_validade" date;
    `);
    
    // 6. Criar índices para as novas colunas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_CIDADAO" ON "documentos" ("cidadao_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_REUTILIZAVEL" ON "documentos" ("reutilizavel");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_HASH" ON "documentos" ("hash_arquivo");
    `);
    
    // 7. Adicionar foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ADD CONSTRAINT "FK_documentos_cidadao" 
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao"("id") ON DELETE CASCADE;
    `);
    
    // 8. Remover o valor padrão temporário da coluna cidadao_id
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ALTER COLUMN "cidadao_id" DROP DEFAULT;
    `);
    
    console.log('Migration AddCidadaoIdToDocumentos concluída com sucesso.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration AddCidadaoIdToDocumentos...');
    
    // Remover foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_cidadao";
    `);
    
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_DOCUMENTOS_CIDADAO";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_DOCUMENTOS_REUTILIZAVEL";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_DOCUMENTOS_HASH";
    `);
    
    // Remover colunas adicionadas
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP COLUMN IF EXISTS "data_validade";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP COLUMN IF EXISTS "hash_arquivo";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP COLUMN IF EXISTS "reutilizavel";
    `);
    
    // Reverter renomeação de colunas
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      RENAME COLUMN "usuario_verificacao_id" TO "usuario_verificacao";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      RENAME COLUMN "usuario_upload_id" TO "usuario_upload";
    `);
    
    // Tornar solicitacao_id NOT NULL novamente
    await queryRunner.query(`
      ALTER TABLE "documentos" 
      ALTER COLUMN "solicitacao_id" SET NOT NULL;
    `);
    
    // Remover coluna cidadao_id
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP COLUMN IF EXISTS "cidadao_id";
    `);
    
    console.log('Migration AddCidadaoIdToDocumentos revertida com sucesso.');
  }
}