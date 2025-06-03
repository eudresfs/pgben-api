import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado a processos judiciais
 * 
 * Esta migration cria as tabelas e restrições para processos judiciais e determinações judiciais,
 * que são necessárias antes da criação da tabela de solicitação.
 * 
 * @author Engenheiro de Dados
 * @date 26/05/2025
 */
export class CreateProcessoJudicialSchema1704067219000 implements MigrationInterface {
  name = 'CreateProcessoJudicialSchema1704067219000';

  /**
   * Cria as estruturas relacionadas a processos judiciais
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateProcessoJudicialSchema...');
    
    // Criar enum para status do processo judicial
    await queryRunner.query(`
      CREATE TYPE "public"."status_processo_judicial_enum" AS ENUM(
        'aberto', 'em_andamento', 'suspenso', 'concluido', 'arquivado'
      );
    `);
    
    // Criar enum para tipo de determinação judicial
    await queryRunner.query(`
      CREATE TYPE "public"."tipo_determinacao_judicial_enum" AS ENUM(
        'concessao', 'suspensao', 'cancelamento', 'alteracao', 'outro'
      );
    `);
    
    // Tabela de processo judicial
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processo_judicial" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "numero_processo" varchar(50) NOT NULL,
        "vara_judicial" varchar(255) NOT NULL,
        "comarca" varchar(255) NOT NULL,
        "juiz" varchar(255),
        "status" "status_processo_judicial_enum" NOT NULL DEFAULT 'aberto',
        "objeto" text NOT NULL,
        "data_distribuicao" date NOT NULL,
        "data_conclusao" date,
        "observacao" text,
        "cidadao_id" uuid,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_processo_judicial" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_processo_judicial_numero" UNIQUE ("numero_processo")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_processo_judicial_numero" ON "processo_judicial" ("numero_processo");
      CREATE INDEX IF NOT EXISTS "IDX_processo_judicial_vara" ON "processo_judicial" ("vara_judicial");
      CREATE INDEX IF NOT EXISTS "IDX_processo_judicial_comarca" ON "processo_judicial" ("comarca");
      CREATE INDEX IF NOT EXISTS "IDX_processo_judicial_status" ON "processo_judicial" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_processo_judicial_cidadao" ON "processo_judicial" ("cidadao_id");
    `);
    
    // Tabela de determinação judicial
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "determinacao_judicial" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "processo_judicial_id" uuid NOT NULL,
        "solicitacao_id" uuid,
        "cidadao_id" uuid,
        "numero_processo" varchar(50) NOT NULL,
        "numero_determinacao" varchar(255) NOT NULL,
        "tipo" "tipo_determinacao_judicial_enum" NOT NULL DEFAULT 'outro',
        "orgao_judicial" varchar(100),
        "comarca" varchar(100),
        "juiz" varchar(100),
        "descricao" text NOT NULL,
        "data_determinacao" TIMESTAMP WITH TIME ZONE NOT NULL,
        "data_prazo" TIMESTAMP WITH TIME ZONE,
        "cumprida" boolean NOT NULL DEFAULT false,
        "data_cumprimento" TIMESTAMP WITH TIME ZONE,
        "observacao_cumprimento" text,
        "documento_url" varchar(255),
        "ativo" boolean NOT NULL DEFAULT true,
        "usuario_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_determinacao_judicial" PRIMARY KEY ("id")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_determinacao_processo" ON "determinacao_judicial" ("processo_judicial_id");
      CREATE INDEX IF NOT EXISTS "IDX_determinacao_solicitacao" ON "determinacao_judicial" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_determinacao_cidadao" ON "determinacao_judicial" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_determinacao_numero_processo" ON "determinacao_judicial" ("numero_processo");
      CREATE INDEX IF NOT EXISTS "IDX_determinacao_tipo" ON "determinacao_judicial" ("tipo");
    `);
    
    // Chave estrangeira
    await queryRunner.query(`
      ALTER TABLE "determinacao_judicial" ADD CONSTRAINT "FK_determinacao_processo"
      FOREIGN KEY ("processo_judicial_id") REFERENCES "processo_judicial" ("id") ON DELETE RESTRICT;
    `);
    
    // Triggers para atualização automática de timestamp
    await queryRunner.query(`
      CREATE TRIGGER trigger_processo_judicial_update_timestamp
        BEFORE UPDATE ON "processo_judicial"
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
        
      CREATE TRIGGER trigger_determinacao_judicial_update_timestamp
        BEFORE UPDATE ON "determinacao_judicial"
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    `);
    
    console.log('Migration CreateProcessoJudicialSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateProcessoJudicialSchema...');
    
    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_determinacao_judicial_update_timestamp ON "determinacao_judicial";
      DROP TRIGGER IF EXISTS trigger_processo_judicial_update_timestamp ON "processo_judicial";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "determinacao_judicial" DROP CONSTRAINT IF EXISTS "FK_determinacao_processo";
    `);
    
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_determinacao_tipo";
      DROP INDEX IF EXISTS "IDX_determinacao_numero_processo";
      DROP INDEX IF EXISTS "IDX_determinacao_cidadao";
      DROP INDEX IF EXISTS "IDX_determinacao_solicitacao";
      DROP INDEX IF EXISTS "IDX_determinacao_processo";
      DROP INDEX IF EXISTS "IDX_processo_judicial_cidadao";
      DROP INDEX IF EXISTS "IDX_processo_judicial_status";
      DROP INDEX IF EXISTS "IDX_processo_judicial_comarca";
      DROP INDEX IF EXISTS "IDX_processo_judicial_vara";
      DROP INDEX IF EXISTS "IDX_processo_judicial_numero";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "determinacao_judicial";
      DROP TABLE IF EXISTS "processo_judicial";
    `);
    
    // Remover enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."tipo_determinacao_judicial_enum";
      DROP TYPE IF EXISTS "public"."status_processo_judicial_enum";
    `);
    
    console.log('Migration CreateProcessoJudicialSchema revertida com sucesso.');
  }
}
