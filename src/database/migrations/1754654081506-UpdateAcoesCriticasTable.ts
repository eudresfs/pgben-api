import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAcoesCriticasTable1754654081506 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar enum TipoAcaoCritica se não existir
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_acao_critica_enum" AS ENUM (
                    'CANCELAMENTO_SOLICITACAO',
                    'SUSPENSAO_BENEFICIO',
                    'REATIVACAO_BENEFICIO',
                    'BLOQUEIO_USUARIO',
                    'DESBLOQUEIO_USUARIO',
                    'ALTERACAO_STATUS_PAGAMENTO',
                    'EXCLUSAO_BENEFICIARIO',
                    'ALTERACAO_PERMISSAO',
                    'EXCLUSAO_DOCUMENTO',
                    'CONFIGURACAO_SISTEMA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Adicionar colunas faltantes
        await queryRunner.query(`
            ALTER TABLE "acoes_criticas" 
            ADD COLUMN IF NOT EXISTS "tipo" "tipo_acao_critica_enum" NOT NULL DEFAULT 'CANCELAMENTO_SOLICITACAO',
            ADD COLUMN IF NOT EXISTS "controlador" varchar(100) NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "metodo" varchar(100) NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "requer_justificativa" boolean NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS "permite_anexos" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "tempo_limite_horas" integer NOT NULL DEFAULT 24,
            ADD COLUMN IF NOT EXISTS "permite_escalacao" boolean NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS "permite_delegacao" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "configuracao_adicional" jsonb,
            ADD COLUMN IF NOT EXISTS "template_notificacao" varchar(100),
            ADD COLUMN IF NOT EXISTS "campos_obrigatorios" jsonb,
            ADD COLUMN IF NOT EXISTS "regras_validacao" jsonb,
            ADD COLUMN IF NOT EXISTS "ordem" integer NOT NULL DEFAULT 0;
        `);

        // Remover colunas que não existem na entidade
        await queryRunner.query(`
            ALTER TABLE "acoes_criticas" 
            DROP COLUMN IF EXISTS "entidade_alvo",
            DROP COLUMN IF EXISTS "requer_aprovacao",
            DROP COLUMN IF EXISTS "metadados";
        `);

        // Criar índices
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_acoes_criticas_tipo_ativo" ON "acoes_criticas" ("tipo", "ativo");
        `);
        
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_acoes_criticas_codigo" ON "acoes_criticas" ("codigo");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover índices
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_tipo_ativo";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_codigo";`);

        // Adicionar colunas antigas de volta
        await queryRunner.query(`
            ALTER TABLE "acoes_criticas" 
            ADD COLUMN IF NOT EXISTS "entidade_alvo" varchar(100),
            ADD COLUMN IF NOT EXISTS "requer_aprovacao" boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS "metadados" jsonb;
        `);

        // Remover colunas adicionadas
        await queryRunner.query(`
            ALTER TABLE "acoes_criticas" 
            DROP COLUMN IF EXISTS "tipo",
            DROP COLUMN IF EXISTS "controlador",
            DROP COLUMN IF EXISTS "metodo",
            DROP COLUMN IF EXISTS "requer_justificativa",
            DROP COLUMN IF EXISTS "permite_anexos",
            DROP COLUMN IF EXISTS "tempo_limite_horas",
            DROP COLUMN IF EXISTS "permite_escalacao",
            DROP COLUMN IF EXISTS "permite_delegacao",
            DROP COLUMN IF EXISTS "configuracao_adicional",
            DROP COLUMN IF EXISTS "template_notificacao",
            DROP COLUMN IF EXISTS "campos_obrigatorios",
            DROP COLUMN IF EXISTS "regras_validacao",
            DROP COLUMN IF EXISTS "ordem";
        `);

        // Remover enum
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_acao_critica_enum";`);
    }

}
