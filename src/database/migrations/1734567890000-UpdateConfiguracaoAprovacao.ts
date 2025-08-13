import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConfiguracaoAprovacao1734567890000 implements MigrationInterface {
  name = 'UpdateConfiguracaoAprovacao1734567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar novas colunas necessárias
    await queryRunner.query(`
      ALTER TABLE "configuracoes_aprovacao" 
      ADD COLUMN IF NOT EXISTS "nome" varchar(200),
      ADD COLUMN IF NOT EXISTS "descricao" text,
      ADD COLUMN IF NOT EXISTS "status" "status_configuracao_aprovacao_enum" DEFAULT 'ativa',
      ADD COLUMN IF NOT EXISTS "perfil_solicitante" varchar(100),
      ADD COLUMN IF NOT EXISTS "unidade" varchar(100),
      ADD COLUMN IF NOT EXISTS "prioridade" "prioridade_aprovacao_enum" DEFAULT 'normal',
      ADD COLUMN IF NOT EXISTS "max_aprovacoes" integer,
      ADD COLUMN IF NOT EXISTS "tempo_lembrete_horas" integer DEFAULT 4,
      ADD COLUMN IF NOT EXISTS "permite_aprovacao_paralela" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "requer_justificativa_aprovacao" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "requer_justificativa_rejeicao" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "valor_minimo" decimal(15,2),
      ADD COLUMN IF NOT EXISTS "valor_maximo" decimal(15,2),
      ADD COLUMN IF NOT EXISTS "condicoes_adicionais" jsonb,
      ADD COLUMN IF NOT EXISTS "configuracao_estrategia" jsonb,
      ADD COLUMN IF NOT EXISTS "canais_notificacao" text[],
      ADD COLUMN IF NOT EXISTS "template_notificacao" varchar(100),
      ADD COLUMN IF NOT EXISTS "horario_funcionamento" jsonb,
      ADD COLUMN IF NOT EXISTS "feriados_considerados" text[],
      ADD COLUMN IF NOT EXISTS "ordem_prioridade" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "data_inicio_vigencia" timestamp,
      ADD COLUMN IF NOT EXISTS "data_fim_vigencia" timestamp,
      ADD COLUMN IF NOT EXISTS "observacoes" text;
    `);

    // Verificar se a coluna estrategia_aprovacao existe antes de renomear
    const hasEstrategiaAprovacao = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'configuracoes_aprovacao' AND column_name = 'estrategia_aprovacao';
    `);
    
    if (hasEstrategiaAprovacao.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "configuracoes_aprovacao" 
        RENAME COLUMN "estrategia_aprovacao" TO "estrategia";
      `);
    }

    // Atualizar valores padrão para registros existentes
    await queryRunner.query(`
      UPDATE "configuracoes_aprovacao" 
      SET 
        "nome" = 'Configuração ' || "id",
        "status" = 'ativa',
        "prioridade" = 'normal',
        "tempo_lembrete_horas" = 4,
        "permite_aprovacao_paralela" = true,
        "requer_justificativa_aprovacao" = false,
        "requer_justificativa_rejeicao" = true,
        "ordem_prioridade" = 0
      WHERE "nome" IS NULL;
    `);

    // Tornar a coluna nome obrigatória
    await queryRunner.query(`
      ALTER TABLE "configuracoes_aprovacao" 
      ALTER COLUMN "nome" SET NOT NULL;
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_config_aprovacao_acao_perfil_status" 
      ON "configuracoes_aprovacao" ("acao_critica_id", "perfil_solicitante", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_config_aprovacao_status_ativa" 
      ON "configuracoes_aprovacao" ("status", "ativa");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_config_aprovacao_prioridade" 
      ON "configuracoes_aprovacao" ("prioridade");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_config_aprovacao_prioridade";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_config_aprovacao_status_ativa";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_config_aprovacao_acao_perfil_status";`);

    // Verificar se a coluna estrategia existe antes de renomear de volta
    const hasEstrategia = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'configuracoes_aprovacao' AND column_name = 'estrategia';
    `);
    
    if (hasEstrategia.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "configuracoes_aprovacao" 
        RENAME COLUMN "estrategia" TO "estrategia_aprovacao";
      `);
    }

    // Remover colunas adicionadas
    await queryRunner.query(`
      ALTER TABLE "configuracoes_aprovacao" 
      DROP COLUMN IF EXISTS "observacoes",
      DROP COLUMN IF EXISTS "data_fim_vigencia",
      DROP COLUMN IF EXISTS "data_inicio_vigencia",
      DROP COLUMN IF EXISTS "ordem_prioridade",
      DROP COLUMN IF EXISTS "feriados_considerados",
      DROP COLUMN IF EXISTS "horario_funcionamento",
      DROP COLUMN IF EXISTS "template_notificacao",
      DROP COLUMN IF EXISTS "canais_notificacao",
      DROP COLUMN IF EXISTS "configuracao_estrategia",
      DROP COLUMN IF EXISTS "condicoes_adicionais",
      DROP COLUMN IF EXISTS "valor_maximo",
      DROP COLUMN IF EXISTS "valor_minimo",
      DROP COLUMN IF EXISTS "requer_justificativa_rejeicao",
      DROP COLUMN IF EXISTS "requer_justificativa_aprovacao",
      DROP COLUMN IF EXISTS "permite_aprovacao_paralela",
      DROP COLUMN IF EXISTS "tempo_lembrete_horas",
      DROP COLUMN IF EXISTS "max_aprovacoes",
      DROP COLUMN IF EXISTS "prioridade",
      DROP COLUMN IF EXISTS "unidade",
      DROP COLUMN IF EXISTS "perfil_solicitante",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "descricao",
      DROP COLUMN IF EXISTS "nome";
    `);
  }
}