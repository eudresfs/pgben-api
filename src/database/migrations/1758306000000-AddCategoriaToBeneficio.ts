import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration para adicionar coluna categoria na tabela tipo_beneficio
 * 
 * Esta migration adiciona a coluna categoria que permite classificar
 * os benefícios em diferentes categorias como NATALIDADE, EMERGENCIAL,
 * ASSISTENCIAL, HABITACIONAL, FUNERAL e OUTROS.
 */
export class AddCategoriaToBeneficio1758306000000 implements MigrationInterface {
  name = 'AddCategoriaToBeneficio1758306000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para categoria de benefício se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "categoria_beneficio_enum" AS ENUM (
          'natalidade',
          'morte', 
          'calamidade_publica',
          'vulnerabilidade_temporaria',
          'outro'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Adicionar coluna categoria na tabela tipo_beneficio
    await queryRunner.addColumn(
      'tipo_beneficio',
      new TableColumn({
        name: 'categoria',
        type: 'categoria_beneficio_enum',
        isNullable: true,
        comment: 'Categoria do benefício para classificação e organização',
      }),
    );

    // Criar índice para melhorar performance de consultas por categoria
    await queryRunner.query(`
      CREATE INDEX "IDX_tipo_beneficio_categoria" 
      ON "tipo_beneficio" ("categoria") 
      WHERE "categoria" IS NOT NULL;
    `);

    // Atualizar benefícios existentes com categorias padrão baseado no nome
    await queryRunner.query(`
      UPDATE tipo_beneficio 
      SET categoria = CASE 
        WHEN codigo = 'natalidade' THEN 'natalidade'::categoria_beneficio_enum
        WHEN codigo = 'calamidade' THEN 'calamidade_publica'::categoria_beneficio_enum
        WHEN codigo = 'aluguel-social' or codigo = 'cesta-basica' THEN 'vulnerabilidade_temporaria'::categoria_beneficio_enum
        WHEN codigo = 'ataude'  THEN 'morte'::categoria_beneficio_enum
        ELSE 'outro'::categoria_beneficio_enum
      END
      WHERE categoria IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tipo_beneficio_categoria";`);

    // Remover coluna categoria
    await queryRunner.dropColumn('tipo_beneficio', 'categoria');

    // Verificar se o enum ainda é usado em outras tabelas antes de removê-lo
    const enumUsage = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns 
      WHERE udt_name = 'categoria_beneficio_enum'
      AND table_schema = 'public';
    `);

    // Se não há mais uso do enum, removê-lo
    if (enumUsage[0].count === '0') {
      await queryRunner.query(`DROP TYPE IF EXISTS "categoria_beneficio_enum";`);
    }
  }
}