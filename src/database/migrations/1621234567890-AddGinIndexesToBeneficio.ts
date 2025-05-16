import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar índices GIN aos campos JSON do módulo de benefício
 * 
 * Os índices GIN (Generalized Inverted Index) melhoram significativamente a performance
 * de consultas em campos JSONB, permitindo buscas eficientes por chaves e valores.
 */
export class AddGinIndexesToBeneficio1621234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice GIN para critérios de elegibilidade
    await queryRunner.query(
      `CREATE INDEX "IDX_tipo_beneficio_criterios" ON "tipos_beneficio" USING GIN ("criterios_elegibilidade" jsonb_path_ops)`
    );

    // Índice GIN para validações de requisitos
    await queryRunner.query(
      `CREATE INDEX "IDX_requisito_documento_validacoes" ON "requisitos_documento" USING GIN ("validacoes" jsonb_path_ops)`
    );

    // Índice GIN para validações de campos dinâmicos
    await queryRunner.query(
      `CREATE INDEX "IDX_campo_dinamico_validacoes" ON "campos_dinamicos_beneficio" USING GIN ("validacoes" jsonb_path_ops)`
    );

    // Índice GIN para schema de versões
    await queryRunner.query(
      `CREATE INDEX "IDX_versao_schema_schema" ON "versoes_schema_beneficio" USING GIN ("schema" jsonb_path_ops)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tipo_beneficio_criterios"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisito_documento_validacoes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campo_dinamico_validacoes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versao_schema_schema"`);
  }
}
