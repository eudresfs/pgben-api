import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOptimizedIndexes1704067245000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Garantir que a extensão pg_trgm esteja disponível
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Índices GIN para campos específicos do objeto JSONB endereco
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_bairro ON cidadao USING GIN ((endereco->>'bairro') gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_cidade ON cidadao USING GIN ((endereco->>'cidade') gin_trgm_ops)`,
    );

    // Índices para campos de busca frequente com pg_trgm
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cidadao_nome_trgm ON cidadao USING GIN (nome gin_trgm_ops)`,
    );

    // Índices para campos usados em JOIN
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_composicao_familiar_cidadao_id ON composicao_familiar (cidadao_id)`,
    );

    // Índices para telefone (usado em buscas diretas)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cidadao_telefone ON cidadao (telefone)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover os índices criados
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cidadao_endereco_bairro`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cidadao_endereco_cidade`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cidadao_nome_trgm`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_composicao_familiar_cidadao_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cidadao_telefone`);

    // Não remove a extensão pg_trgm pois pode estar sendo usada por outros índices
  }
}
