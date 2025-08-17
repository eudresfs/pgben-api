import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPerfilAutoAprovacaoToArray1755347900000 implements MigrationInterface {
  name = 'AlterPerfilAutoAprovacaoToArray1755347900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backup dos dados existentes
    await queryRunner.query(`
      CREATE TEMP TABLE temp_perfis_backup AS 
      SELECT id, perfil_auto_aprovacao 
      FROM acoes_aprovacao 
      WHERE perfil_auto_aprovacao IS NOT NULL
    `);

    // Alterar o tipo da coluna para array de texto
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      ALTER COLUMN "perfil_auto_aprovacao" TYPE TEXT[] 
      USING CASE 
        WHEN "perfil_auto_aprovacao" IS NULL THEN NULL
        ELSE ARRAY["perfil_auto_aprovacao"]
      END
    `);

    // Atualizar o comentário da coluna
    await queryRunner.query(`
      COMMENT ON COLUMN "acoes_aprovacao"."perfil_auto_aprovacao" IS 
      'Lista de perfis necessários para autoaprovação (usado com AUTOAPROVACAO_PERFIL)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter para varchar, pegando apenas o primeiro elemento do array
    await queryRunner.query(`
      ALTER TABLE "acoes_aprovacao" 
      ALTER COLUMN "perfil_auto_aprovacao" TYPE VARCHAR(50) 
      USING CASE 
        WHEN "perfil_auto_aprovacao" IS NULL THEN NULL
        WHEN array_length("perfil_auto_aprovacao", 1) > 0 THEN "perfil_auto_aprovacao"[1]
        ELSE NULL
      END
    `);

    // Restaurar o comentário original
    await queryRunner.query(`
      COMMENT ON COLUMN "acoes_aprovacao"."perfil_auto_aprovacao" IS 
      'Perfil necessário para autoaprovação (usado com AUTOAPROVACAO_PERFIL)'
    `);
  }
}