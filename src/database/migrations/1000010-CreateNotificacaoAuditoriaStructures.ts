import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificacaoAuditoriaStructures1000010 implements MigrationInterface {
  name = 'CreateNotificacaoAuditoriaStructures20250512122600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipo de notificação
    await queryRunner.query(`
      CREATE TYPE "tipo_notificacao_enum" AS ENUM ('sistema', 'pendencia', 'alerta', 'informativo');
    `);

    // Criar enum para status de notificação
    await queryRunner.query(`
      CREATE TYPE "status_notificacao_enum" AS ENUM ('nao_lida', 'lida', 'arquivada');
    `);

    // Criar enum para tipo de operação de auditoria
    await queryRunner.query(`
      CREATE TYPE "tipo_operacao_enum" AS ENUM ('criacao', 'atualizacao', 'exclusao', 'consulta', 'login', 'logout', 'download', 'upload', 'alteracao_senha', 'outro');
    `);

    // Criar tabela de notificações
    await queryRunner.query(`
      CREATE TABLE "notificacao" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo" tipo_notificacao_enum NOT NULL,
        "titulo" VARCHAR(255) NOT NULL,
        "mensagem" TEXT NOT NULL,
        "usuario_id" UUID NOT NULL,
        "status" status_notificacao_enum NOT NULL DEFAULT 'nao_lida',
        "data_leitura" TIMESTAMP,
        "link" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_notificacao_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE CASCADE
      );
    `);

    // Criar tabela de log de auditoria
    await queryRunner.query(`
      CREATE TABLE "log_auditoria" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "usuario_id" UUID NOT NULL,
        "tipo_operacao" tipo_operacao_enum NOT NULL,
        "tabela" VARCHAR(255) NOT NULL,
        "registro_id" UUID NOT NULL,
        "dados_anteriores" JSONB,
        "dados_novos" JSONB,
        "ip_address" VARCHAR(45),
        "user_agent" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_log_auditoria_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id")
      );
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX "idx_notificacao_usuario" ON "notificacao"("usuario_id");
      CREATE INDEX "idx_notificacao_tipo" ON "notificacao"("tipo");
      CREATE INDEX "idx_notificacao_status" ON "notificacao"("status");
      CREATE INDEX "idx_notificacao_data_criacao" ON "notificacao"("created_at");
      
      CREATE INDEX "idx_log_auditoria_usuario" ON "log_auditoria"("usuario_id");
      CREATE INDEX "idx_log_auditoria_tipo_operacao" ON "log_auditoria"("tipo_operacao");
      CREATE INDEX "idx_log_auditoria_tabela" ON "log_auditoria"("tabela");
      CREATE INDEX "idx_log_auditoria_registro" ON "log_auditoria"("registro_id");
      CREATE INDEX "idx_log_auditoria_data" ON "log_auditoria"("created_at");
    `);

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_log_auditoria_data";
      DROP INDEX IF EXISTS "idx_log_auditoria_registro";
      DROP INDEX IF EXISTS "idx_log_auditoria_tabela";
      DROP INDEX IF EXISTS "idx_log_auditoria_tipo_operacao";
      DROP INDEX IF EXISTS "idx_log_auditoria_usuario";
      
      DROP INDEX IF EXISTS "idx_notificacao_data_criacao";
      DROP INDEX IF EXISTS "idx_notificacao_status";
      DROP INDEX IF EXISTS "idx_notificacao_tipo";
      DROP INDEX IF EXISTS "idx_notificacao_usuario";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "log_auditoria_particionado" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "log_auditoria";');
    await queryRunner.query('DROP TABLE IF EXISTS "notificacao";');

    // Remover enums
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_operacao_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "status_notificacao_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_notificacao_enum";');
  }
}
}