import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para atualizar o schema de notificações
 *
 * Esta migration adiciona colunas necessárias à tabela de notificações
 * para compatibilidade com a entidade NotificacaoSistema.
 *
 * @author Engenheiro de Dados
 * @date 20/05/2025
 */
export class UpdateNotificacaoSchema1704067244000
  implements MigrationInterface
{
  name = 'UpdateNotificacaoSchema1704067244000';

  /**
   * Adiciona colunas necessárias na tabela de notificações
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1130000-UpdateNotificacaoSchema...');

    // Verificar se a tabela existe
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notificacoes_sistema'
      );
    `);

    if (tableExists[0].exists) {
      // Verificar se as colunas já existem
      const tentativasEntregaExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'tentativas_entrega'
        );
      `);

      if (!tentativasEntregaExists[0].exists) {
        console.log('Adicionando coluna tentativas_entrega...');
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          ADD COLUMN IF NOT EXISTS "tentativas_entrega" jsonb;
        `);
      }

      const dadosEnvioExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'dados_envio'
        );
      `);

      if (!dadosEnvioExists[0].exists) {
        console.log('Adicionando coluna dados_envio...');
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          ADD COLUMN IF NOT EXISTS "dados_envio" jsonb;
        `);
      }

      const numeroTentativasExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'numero_tentativas'
        );
      `);

      if (!numeroTentativasExists[0].exists) {
        console.log('Adicionando coluna numero_tentativas...');
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          ADD COLUMN IF NOT EXISTS "numero_tentativas" integer NOT NULL DEFAULT 0;
        `);
      }

      const dataEntregaExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'data_entrega'
        );
      `);

      if (!dataEntregaExists[0].exists) {
        console.log('Adicionando coluna data_entrega...');
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          ADD COLUMN IF NOT EXISTS "data_entrega" timestamp without time zone;
        `);
      }

      const dataEnvioExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'data_envio'
        );
      `);

      if (!dataEnvioExists[0].exists) {
        console.log('Adicionando coluna data_envio...');
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          ADD COLUMN IF NOT EXISTS "data_envio" timestamp without time zone;
        `);
      }

      console.log('Tabela notificacoes_sistema atualizada com sucesso.');
    } else {
      console.log(
        'Tabela notificacoes_sistema não existe, pulando atualização.',
      );
    }

    console.log(
      'Migration 1130000-UpdateNotificacaoSchema executada com sucesso.',
    );
  }

  /**
   * Reverte as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1130000-UpdateNotificacaoSchema...');

    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notificacoes_sistema'
      );
    `);

    if (tableExists[0].exists) {
      // Remover colunas adicionadas
      await queryRunner.query(`
        ALTER TABLE "notificacoes_sistema" 
        DROP COLUMN IF EXISTS "tentativas_entrega",
        DROP COLUMN IF EXISTS "dados_envio",
        DROP COLUMN IF EXISTS "numero_tentativas",
        DROP COLUMN IF EXISTS "data_entrega",
        DROP COLUMN IF EXISTS "data_envio";
      `);

      // Reverter renomeação de colunas
      const criadoEmExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'criado_em'
        );
      `);

      if (criadoEmExists[0].exists) {
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          RENAME COLUMN "criado_em" TO "created_at";
        `);
      }

      const atualizadoEmExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notificacoes_sistema' AND column_name = 'atualizado_em'
        );
      `);

      if (atualizadoEmExists[0].exists) {
        await queryRunner.query(`
          ALTER TABLE "notificacoes_sistema" 
          RENAME COLUMN "atualizado_em" TO "updated_at";
        `);
      }

      console.log('Tabela notificacoes_sistema revertida com sucesso.');
    }

    console.log(
      'Migration 1130000-UpdateNotificacaoSchema revertida com sucesso.',
    );
  }
}
