import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para atualizar a estrutura da tabela dados_natalidade
 *
 * Adiciona:
 * - Enum TipoContextoNatalidade para diferenciar contextos pré-natal e pós-natal
 * - Campos específicos para contexto pós-natal (data_nascimento, nome_recem_nascido, etc.)
 * - Ajustes nos campos existentes para alinhamento com a entidade
 *
 * Esta migration alinha a estrutura do banco de dados com a entidade DadosNatalidade,
 * permitindo o uso completo dos contextos pré-natal e pós-natal do benefício de Auxílio Natalidade.
 */
export class UpdateDadosNatalidadeSchema1750950000000
  implements MigrationInterface
{
  name = 'UpdateDadosNatalidadeSchema1750950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enum para tipo de contexto de natalidade
    await queryRunner.query(`
      CREATE TYPE "tipo_contexto_natalidade_enum" AS ENUM (
        'pre_natal',
        'pos_natal'
      )
    `);

    // 2. Adicionar coluna tipo_contexto com valor padrão 'pre_natal'
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "tipo_contexto" "tipo_contexto_natalidade_enum" 
      NOT NULL DEFAULT 'pre_natal'
    `);

    // 3. Adicionar campos específicos para contexto pós-natal
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "data_nascimento" date
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "nome_recem_nascido" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "numero_certidao_nascimento" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "cartorio_registro" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ADD COLUMN "peso_nascimento" decimal(5,2)
    `);

    // 4. Ajustar campo realiza_pre_natal para ter valor padrão false (se necessário)
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "realiza_pre_natal" SET DEFAULT false
    `);

    // 5. Ajustar campo quantidade_filhos para ser nullable
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "quantidade_filhos" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "quantidade_filhos" DROP NOT NULL
    `);

    // 6. Criar índice para tipo_contexto para otimizar consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_dados_natalidade_tipo_contexto" 
      ON "dados_natalidade" ("tipo_contexto")
    `);

    // 7. Criar índice composto para consultas por solicitacao_id e tipo_contexto
    await queryRunner.query(`
      CREATE INDEX "IDX_dados_natalidade_solicitacao_contexto" 
      ON "dados_natalidade" ("solicitacao_id", "tipo_contexto")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover índices criados
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dados_natalidade_tipo_contexto"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dados_natalidade_solicitacao_contexto"
    `);

    // 2. Reverter alterações no campo quantidade_filhos
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "quantidade_filhos" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "quantidade_filhos" SET DEFAULT 0
    `);

    // 3. Reverter alterações no campo realiza_pre_natal
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      ALTER COLUMN "realiza_pre_natal" DROP DEFAULT
    `);

    // 4. Remover campos específicos do contexto pós-natal
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "peso_nascimento"
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "cartorio_registro"
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "numero_certidao_nascimento"
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "nome_recem_nascido"
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "data_nascimento"
    `);

    // 5. Remover coluna tipo_contexto
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN IF EXISTS "tipo_contexto"
    `);

    // 6. Remover enum tipo_contexto_natalidade
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_contexto_natalidade_enum"
    `);
  }
}
